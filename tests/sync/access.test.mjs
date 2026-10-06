import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stateForProject, offlineMemberMatches, normalizeMemberEmail, mayEditMember, writeMember,
  createAccessSession, loginErrorMessage } from "../../src/sync/access.js";

const defaults = { meals: [], family: { name: "Familien" }, shoppingList: { items: [] }, pendingLocalSync: false, clientUpdatedAt: 0 };
const old = { ...defaults, projectId: "old", meals: [{ id: "old" }], pendingLocalSync: true };
assert.deepEqual(stateForProject(old, defaults, "new"), { ...defaults, projectId: "new" });
assert.deepEqual(stateForProject({ ...old, projectId: "new" }, defaults, "new").meals, old.meals);
assert.deepEqual(stateForProject({ meals: old.meals }, defaults, "new").meals, []);
assert.equal(normalizeMemberEmail(" ADULT@Example.COM "), "adult@example.com");
assert.throws(() => normalizeMemberEmail("no-email"));
assert.equal(mayEditMember("admin", "me@example.com", "ME@example.com"), false);
assert.equal(mayEditMember("member", "me@example.com", "other@example.com"), false);
assert.equal(mayEditMember("admin", "me@example.com", "other@example.com"), true);
assert.equal(loginErrorMessage({ code: "auth/popup-closed-by-user" }), "");
assert.match(loginErrorMessage({ code: "auth/popup-blocked" }), /blokkert/);
assert.match(loginErrorMessage({ code: "auth/network-request-failed" }), /nettforbindelsen/);
const user = { uid: "u1", email: "me@example.com", emailVerified: true };
const offlineFlag = { projectId: "new", familyId: "familien", uid: user.uid, email: user.email, role: "admin", initialized: true, minAppVersion: 95 };
assert.equal(offlineMemberMatches(offlineFlag, { projectId: "new", familyId: "familien", user }), true);
assert.equal(offlineMemberMatches(offlineFlag, { projectId: "old", familyId: "familien", user }), false);
assert.equal(offlineMemberMatches(offlineFlag, { projectId: "new", familyId: "other", user }), false);
assert.equal(offlineMemberMatches(offlineFlag, { projectId: "new", familyId: "familien", user: { ...user, uid: "u2" } }), false);

function makeSession({ role = "admin", meta = { initializedAt: "server", minAppVersion: 95 }, failure, flag = null, appVersion = 95, updateFailure } = {}) {
  const screens = [], calls = [], unsubs = [];
  let offline = flag, watch;
  const api = {
    doc: (ref, id) => `${ref}/${id}`,
    getDocFromServer: async ref => {
      calls.push(["read", ref]);
      if (failure) throw failure;
      return ref === "meta" ? { exists: () => !!meta, data: () => meta } : { exists: () => !!role, data: () => ({ role }) };
    },
    onSnapshot: (ref, options, callback) => { calls.push(["watch", ref]); watch = callback; return () => unsubs.push(ref); },
    updateDoc: async (ref, data) => { calls.push(["update", ref, data]); if (updateFailure) throw updateFailure; },
  };
  const session = createAccessSession({ api, refs: { meta: "meta", members: "members" }, projectId: "new", familyId: "familien", appVersion,
    readOffline: () => offline, writeOffline: flag => { offline = flag; }, clearOffline: () => { offline = null; },
    onScreen: screen => screens.push(screen), onReady: async args => calls.push(["ready", args]), onStop: () => calls.push(["stop"]),
  });
  return { session, screens, calls, unsubs, api, flag: () => offline,
    snapshot: data => watch({ exists: () => !!data, data: () => data, metadata: { fromCache: false } }) };
}
for (const [config, input, expected] of [
  [{}, null, "login"], [{ role: null }, user, "denied"], [{ failure: { code: "permission-denied" } }, user, "denied"],
  [{ meta: null }, user, "setup"], [{ meta: null, role: "member" }, user, "setup"],
  [{ meta: { initializedAt: "server", minAppVersion: 96 } }, user, "update"], [{}, user, "ready"],
  [{ failure: { code: "unavailable" }, flag: offlineFlag }, user, "ready"], [{ failure: { code: "unavailable" } }, user, "login"],
  [{}, { ...user, emailVerified: false }, "denied"],
]) {
  const run = makeSession(config); await run.session.start(input);
  assert.equal(run.screens.at(-1).kind, expected);
  if (expected !== "ready" || config.failure) assert.equal(run.calls.some(c => c[0] === "ready"), false);
  if (expected === "denied" || input === null) assert.equal(run.flag(), null);
  if (config.failure?.code === "unavailable" && config.flag) assert.equal(run.screens.at(-1).offline, true);
}
const ready = makeSession(); await ready.session.start(user);
assert.equal(ready.flag().uid, user.uid);
const readyValidity = ready.calls.find(c => c[0] === "ready")[1].valid;
ready.snapshot({ initializedAt: "server", minAppVersion: 96 });
assert.equal(ready.screens.at(-1).kind, "update");
assert.equal(readyValidity(), false);
assert.deepEqual(ready.unsubs, ["meta"]);
assert.equal(ready.flag(), null);
const race = makeSession();
let finish;
race.api.getDocFromServer = () => new Promise(resolve => { finish = resolve; });
const waiting = race.session.start(user);
await race.session.start(null);
finish({ exists: () => true, data: () => ({ role: "admin" }) });
await waiting;
assert.equal(race.screens.at(-1).kind, "login");
assert.equal(race.calls.some(c => c[0] === "ready"), false);

const writes = [];
const memberApi = { doc: (ref, id) => `${ref}/${id}`, getDocFromServer: async () => ({ exists: () => false }),
  serverTimestamp: () => "server", setDoc: async (...args) => writes.push(args), updateDoc: async (...args) => writes.push(args), deleteDoc: async (...args) => writes.push(args) };
const memberArgs = { api: memberApi, refs: { members: "members" }, role: "admin", ownEmail: user.email, email: " OTHER@Example.com ", memberRole: "member" };
await writeMember(memberArgs);
assert.deepEqual(writes[0], ["members/other@example.com", { role: "member", addedAt: "server", addedBy: user.email }]);
await assert.rejects(writeMember({ ...memberArgs, email: user.email }));
await assert.rejects(writeMember({ ...memberArgs, role: "member" }));
await assert.rejects(writeMember({ ...memberArgs, valid: () => false }));
assert.equal(writes.length, 1);

for (const path of ["../../app.js", "../../src/sync/firebase.js"]) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  for (const forbidden of ["signInAnonymously", "writeBatch", "migrateLegacyStateIfNeeded", "remoteSplitStateExists", "legacyState", "home-tasks-app-18de3"]) assert.equal(source.includes(forbidden), false, forbidden);
}
console.log("access tests ok");
const v101Admin = makeSession({ appVersion: 101 }); await v101Admin.session.start(user);
assert.deepEqual(v101Admin.calls.filter(call => call[0] === "update"), [["update", "meta", { minAppVersion: 101 }]]);
assert.equal(v101Admin.flag().minAppVersion, 101); assert.equal(v101Admin.screens.at(-1).kind, "ready");
const currentAdmin = makeSession({ appVersion: 101, meta: { initializedAt: 1, minAppVersion: 101 } }); await currentAdmin.session.start(user);
assert.equal(currentAdmin.calls.some(call => call[0] === "update"), false);
const v101Member = makeSession({ appVersion: 101, role: "member" }); await v101Member.session.start(user);
assert.equal(v101Member.calls.some(call => call[0] === "update"), false);
const oldClient = makeSession({ appVersion: 100, meta: { initializedAt: 1, minAppVersion: 101 } }); await oldClient.session.start(user);
assert.equal(oldClient.screens.at(-1).kind, "update");
const failedRaise = makeSession({ appVersion: 101, updateFailure: new Error("failed") });
await failedRaise.session.start(user); assert.equal(failedRaise.screens.at(-1).kind, "ready");
assert.equal(failedRaise.screens.at(-1).message, undefined);
await failedRaise.session.start(user); assert.equal(failedRaise.calls.filter(call => call[0] === "update").length, 2);
