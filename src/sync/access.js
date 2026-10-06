import { WEEK_SYNC_FIELDS } from "./state.js";
import { REQUIRED_MIN_APP_VERSION } from "./version.js";

export function stateForProject(saved, defaults, projectId) {
  const clean = structuredClone(defaults);
  if (!saved || saved.projectId !== projectId) return { ...clean, projectId };
  return { ...clean, ...saved, projectId };
}

export function normalizeMemberEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  if (!/^[^\s/@]+@[^\s/@]+$/.test(email)) throw new Error("Skriv en gyldig e-postadresse.");
  return email;
}

export function mayEditMember(role, ownEmail, targetEmail) {
  return role === "admin" && normalizeMemberEmail(ownEmail) !== normalizeMemberEmail(targetEmail);
}

export function offlineMemberMatches(flag, { projectId, familyId, user }) {
  return Boolean(flag?.uid && flag.projectId === projectId && flag.familyId === familyId
    && flag.initialized && (!user || (flag.uid === user.uid && flag.email === String(user.email || "").toLowerCase())));
}

export function isNetworkError(error) {
  return ["unavailable", "deadline-exceeded", "auth/network-request-failed"].includes(error?.code)
    || /Failed to fetch|dynamically imported module|Load failed|network/i.test(error?.message || "");
}

export function loginErrorMessage(error) {
  if (["auth/popup-closed-by-user", "auth/cancelled-popup-request"].includes(error?.code)) return "";
  if (error?.code === "auth/popup-blocked") return "Innloggingsvinduet ble blokkert. Tillat popup-vinduer og trykk Logg inn med Google på nytt.";
  if (isNetworkError(error)) return "Kunne ikke koble til Google. Sjekk nettforbindelsen og prøv igjen.";
  return "Innloggingen mislyktes. Prøv igjen. Kontroller at Google-innlogging er aktivert for appens adresse.";
}

export async function writeMember({ api, refs, role, ownEmail, email, memberRole, remove = false, valid = () => true }) {
  const target = normalizeMemberEmail(email);
  if (!mayEditMember(role, ownEmail, target)) throw new Error("Du kan ikke endre din egen rad eller administrere medlemmer uten administratorrolle.");
  if (!["admin", "member"].includes(memberRole) && !remove) throw new Error("Ugyldig rolle.");
  const ref = api.doc(refs.members, target);
  if (!valid()) throw new Error("Kontoen ble endret. Prøv igjen.");
  if (remove) return api.deleteDoc(ref);
  const existing = await api.getDocFromServer(ref);
  if (!valid()) throw new Error("Kontoen ble endret. Prøv igjen.");
  if (existing.exists()) return api.updateDoc(ref, { role: memberRole });
  return api.setDoc(ref, { role: memberRole, addedAt: api.serverTimestamp(), addedBy: normalizeMemberEmail(ownEmail) });
}

// Keep auth/UI fields out of the domain payload and never import old project data.
export const PROJECT_DOMAIN_KEYS = ["family", "mealPreferences", "meals", "metadata",
  ...WEEK_SYNC_FIELDS, "shoppingList", "clientUpdatedAt", "pendingLocalSync"];

export function createAccessSession(options) {
  const { api, refs, projectId, familyId, appVersion, readOffline, writeOffline,
    clearOffline, onScreen, onReady, onStop } = options;
  let generation = 0;
  let subscriptions = [];

  function stop() {
    generation += 1;
    for (const unsubscribe of subscriptions.splice(0)) unsubscribe?.();
    onStop();
  }

  function offline(user, valid) {
    const flag = readOffline();
    if (!offlineMemberMatches(flag, { projectId, familyId, user })) {
      onScreen({ kind: "login", message: "Krever nett første gang", user });
      return;
    }
    if (Number(flag.minAppVersion || 0) > appVersion) {
      onScreen({ kind: "update", user });
      return;
    }
    onScreen({ kind: "ready", user: user || { uid: flag.uid, email: flag.email }, role: flag.role, offline: true });
    // No listeners or writes while access/setup cannot be verified online.
  }

  async function start(user) {
    stop();
    const token = generation;
    const valid = () => token === generation;
    if (!user) {
      clearOffline();
      onScreen({ kind: "login", message: "" });
      return;
    }
    onScreen({ kind: "checking", user });
    if (!user.email || !user.emailVerified) {
      clearOffline();
      onScreen({ kind: "denied", user });
      return;
    }
    let role;
    try {
      const ownRef = api.doc(refs.members, normalizeMemberEmail(user.email));
      const member = await api.getDocFromServer(ownRef);
      if (!valid()) return;
      role = member.exists() ? member.data().role : null;
      if (!["admin", "member"].includes(role)) {
        clearOffline(); onScreen({ kind: "denied", user }); return;
      }
      const snapshot = await api.getDocFromServer(refs.meta);
      if (!valid()) return;
      const meta = snapshot.exists() ? snapshot.data() : {};
      if (Number(meta.minAppVersion || 0) > appVersion) {
        clearOffline(); onScreen({ kind: "update", user, role }); return;
      }
      if (!meta.initializedAt) {
        clearOffline(); onScreen({ kind: "setup", user, role }); return;
      }
      // One best-effort update per startup; only admins can write app/meta.
      if (role === "admin" && appVersion >= REQUIRED_MIN_APP_VERSION && Number(meta.minAppVersion || 0) < REQUIRED_MIN_APP_VERSION) {
        try {
          await api.updateDoc(refs.meta, { minAppVersion: REQUIRED_MIN_APP_VERSION });
          if (!valid()) return;
          meta.minAppVersion = REQUIRED_MIN_APP_VERSION;
        } catch { /* Retry at the next startup; ordinary access remains available. */ }
        if (!valid()) return;
      }
      writeOffline({ projectId, familyId, uid: user.uid, email: normalizeMemberEmail(user.email), role,
        initialized: true, minAppVersion: Number(meta.minAppVersion || 0) });
      const guard = (next) => {
        if (!valid() || next.metadata?.fromCache) return;
        const data = next.exists() ? next.data() : {};
        if (Number(data.minAppVersion || 0) > appVersion || !data.initializedAt) {
          stop(); clearOffline();
          onScreen({ kind: Number(data.minAppVersion || 0) > appVersion ? "update" : "setup", user, role });
        }
      };
      const unsubscribe = api.onSnapshot(refs.meta, { includeMetadataChanges: true }, guard, (error) => {
        if (!valid()) return;
        stop();
        if (error.code === "permission-denied") {
          clearOffline(); onScreen({ kind: "denied", user });
        } else if (isNetworkError(error)) offline(user, valid);
        else onScreen({ kind: "error", user, message: "Kunne ikke kontrollere appversjonen. Prøv igjen." });
      });
      if (!valid()) { unsubscribe?.(); return; }
      subscriptions.push(unsubscribe);
      onScreen({ kind: "ready", user, role, offline: false });
      await onReady({ user, role, valid });
    } catch (error) {
      if (!valid()) return;
      stop();
      if (error.code === "permission-denied") {
        clearOffline(); onScreen({ kind: "denied", user });
      } else if (isNetworkError(error)) offline(user, valid);
      else onScreen({ kind: "error", user, message: "Kunne ikke kontrollere tilgang og oppsett. Prøv igjen." });
    }
  }

  return { start, stop, offline: (user) => { stop(); offline(user); } };
}
