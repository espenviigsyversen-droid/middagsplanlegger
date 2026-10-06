import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

// Execute the actual app with local SDK and DOM stubs. No CDN or database calls.
const appUrl = new URL("../../app.js", import.meta.url);
let source = await readFile(appUrl, "utf8");
const imports = /import\s+(\{[\s\S]*?\})\s+from\s+"([^"]+)";/g;
const bindings = {};
for (const match of source.matchAll(imports)) {
  const module = await import(new URL(match[2], appUrl));
  for (const entry of match[1].slice(1, -1).split(",").filter(item => item.trim())) {
    const [name, alias = name] = entry.trim().split(/\s+as\s+/);
    bindings[alias] = module[name];
  }
}
source = source.replace(imports, "").replace(/render\(\);\s*initFirebaseSync\(\);\s*$/, "");
const user = { uid: "test-user", email: "admin@example.com", emailVerified: true };
const projectId = "middagsplanlegger-6db4e";
function fixture({ role = "admin", meta = { initializedAt: 1, minAppVersion: 95 }, online = true, stored = {} } = {}) {
  const storage = new Map(Object.entries(stored).map(([k, v]) => [k, JSON.stringify(v)]));
  const watchers = [], writes = [], timers = new Map(), cleared = [];
  let options, signedOut = 0, popupCalls = 0, timerId = 0, loadingHidden = false;
  const app = { innerHTML: "", querySelector: () => null, querySelectorAll: () => [] };
  const loader = { classList: { add() { loadingHidden = true; } }, remove() {} };
  const refs = Object.fromEntries(["meta", "members", "profile", "preferences", "metadata", "shopping", "shoppingItems", "meals", "weeks"].map(k => [k, k]));
  const api = {
    doc: (ref, id) => `${ref}/${id}`, serverTimestamp: () => "server",
    getDocFromServer: async ref => ({ exists: () => Boolean(ref === "meta" ? meta : role), data: () => ref === "meta" ? meta : { role } }),
    getDocsFromServer: async () => ({ docs: [] }),
    getDoc: async () => ({ exists: () => true, data: () => ({ clientUpdatedAt: 0 }) }),
    setDoc: async (...args) => writes.push(args), updateDoc: async (...args) => writes.push(args), deleteDoc: async (...args) => writes.push(args),
    onSnapshot: (ref, ...args) => {
      const callback = args.find(arg => typeof arg === "function");
      const watch = { ref, callback, stopped: false }; watchers.push(watch);
      return () => { watch.stopped = true; };
    },
  };
  const connection = { refs, firestoreApi: api, signOut: async () => { signedOut++; }, signIn: async () => { popupCalls++; return { user }; } };
  const context = vm.createContext({ ...bindings, structuredClone, Date, Blob, File, console,
    navigator: { onLine: online }, CSS: { escape: String },
    window: { addEventListener() {}, scrollTo() {}, scrollY: 0 },
    document: { querySelector: selector => selector === "#app" ? app : selector === "#app-loading-screen" ? loader : null,
      addEventListener() {}, body: { classList: { contains: () => false, add() {}, remove() {} }, style: {} } },
    localStorage: { getItem: k => storage.get(k), setItem: (k, v) => storage.set(k, v), removeItem: k => storage.delete(k) },
    setTimeout: callback => { const id = ++timerId; timers.set(id, callback); return id; },
    clearTimeout: id => { timers.delete(id); cleared.push(id); },
    initFirebaseClient: async opts => { options = opts; return connection; },
  });
  vm.runInContext(source, context);
  const run = code => vm.runInContext(code, context);
  return { run, context, app, storage, watchers, writes, timers, cleared, api,
    auth: async value => options.onAuthReady({ ...connection, user: value }),
    loadingHidden: () => loadingHidden, signedOut: () => signedOut, popupCalls: () => popupCalls };
}

const checking = fixture(); checking.run("render()");
assert.match(checking.app.innerHTML, /Kontrollerer innlogging/);
assert.equal(checking.loadingHidden(), false);
await checking.run("initFirebaseSync()");
assert.equal(checking.popupCalls(), 0);
await checking.auth(null);
assert.match(checking.app.innerHTML, /Logg inn med Google/);
assert.equal(checking.loadingHidden(), true);
assert.doesNotMatch(checking.app.innerHTML, /nav-button|data-shopping-input/);
assert.equal(checking.watchers.length, 0);

for (const [config, kind, text] of [
  [{ role: null }, "denied", /Du har ikke tilgang ennå/],
  [{ meta: null }, "setup", /data-restore-file/],
  [{ meta: null, role: "member" }, "setup", /En administrator må gjøre det først/],
  [{ meta: { initializedAt: 1, minAppVersion: 101 } }, "update", /Appen må oppdateres/],
]) {
  const f = fixture(config); await f.run("initFirebaseSync()"); await f.auth(user);
  assert.equal(f.run("accessState.kind"), kind);
  assert.match(f.app.innerHTML, text);
  assert.equal(f.watchers.length, 0);
  assert.equal(f.writes.length, 0);
  assert.doesNotMatch(f.app.innerHTML, /nav-button/);
  if (config.role === "member") {
    await f.run("restoreDatabase(emptySetupBackup())");
    assert.equal(f.writes.length, 0, "A regular member never writes app/meta, even through a direct handler call");
    assert.doesNotMatch(f.app.innerHTML, /data-restore-file/);
  }
}

const ready = fixture(); await ready.run("initFirebaseSync()"); await ready.auth(user);
const minimum96 = fixture({ meta: { initializedAt: 1, minAppVersion: 96 } });
await minimum96.run("initFirebaseSync()"); await minimum96.auth(user);
assert.equal(minimum96.run("accessState.kind"), "ready");
assert.equal(ready.run("accessState.kind"), "ready");
assert.equal(ready.watchers.length, 7); // meta, shoppingItems, meals, and four domain scopes
assert.equal(ready.writes.length, 1, "Admin startup raises the minimum once, without uploading domain data");
assert.equal(ready.writes[0][0], "meta"); assert.equal(ready.writes[0][1].minAppVersion, 100);
assert.match(ready.app.innerHTML, /data-shopping-input/);
const regular = fixture({ role: "member" }); await regular.run("initFirebaseSync()"); await regular.auth(user);
regular.run('state.pendingLocalSync = true; state.clientUpdatedAt = 100;');
await regular.run('saveRemoteScopes(["profile"])');
assert.deepEqual(regular.writes.map(write => write[0]), ["profile"]);
assert.equal(regular.writes.some(write => write[0] === "meta"), false, "Regular member sync never writes app/meta");
ready.run('state.family.name = "Lokale data beholdes"; scheduleRemoteSave(700, ["profile"]);');
const queued = ready.run('remoteSaveTimers.profile');
const queuedCallback = ready.timers.get(queued);
await ready.run("signOutAccount()");
assert.equal(ready.signedOut(), 1);
assert.equal(ready.run("currentAuthUser"), null);
assert.equal(ready.run("state.family.name"), "Lokale data beholdes");
assert.equal(ready.storage.has("middagsapp-membership"), false);
assert.ok(ready.watchers.every(w => w.stopped));
assert.ok(ready.cleared.includes(queued));
await queuedCallback();
assert.equal(ready.writes.length, 1, "Cancelled timers remain inert; only the initial meta update was sent");
await ready.auth(user);
assert.equal(ready.watchers.filter(w => !w.stopped).length, 7);
ready.watchers.filter(w => !w.stopped).find(w => w.ref === "meta").callback({
  exists: () => true, data: () => ({ initializedAt: 1, minAppVersion: 101 }), metadata: { fromCache: false },
});
assert.ok(ready.watchers.every(w => w.stopped));
assert.match(ready.app.innerHTML, /Appen må oppdateres/);
assert.equal(ready.run("syncEnabled"), false);

// A remote read begun before logout must not submit a write afterwards.
const race = fixture(); await race.run("initFirebaseSync()"); await race.auth(user);
let resolveRead;
race.context.window.middagsplanGetDoc = () => new Promise(resolve => { resolveRead = resolve; });
race.run('state.pendingLocalSync = true; state.clientUpdatedAt = 100;');
const pendingWrite = race.run('saveRemoteScopes(["profile"])');
await race.run("signOutAccount()");
resolveRead({ exists: () => true, data: () => ({ clientUpdatedAt: 0 }) });
await pendingWrite;
assert.equal(race.writes.length, 1); assert.equal(race.writes[0][0], "meta");

const flag = { projectId, familyId: "familien", uid: user.uid, email: user.email, role: "admin", initialized: true, minAppVersion: 95 };
const offline = fixture({ online: false, stored: { "middagsapp-membership": flag } });
await offline.run("initFirebaseSync()");
assert.equal(offline.run("accessState.offline"), true);
assert.match(offline.app.innerHTML, /Lokal lagring/);
offline.run('setState({ shoppingList: { items: [{ id: "local", name: "Melk", amount: "1", unit: "", category: "other", checked: false, custom: true }], generatedForWeek: null } });');
assert.equal(offline.run("shoppingSyncStatus"), null);
assert.equal(offline.watchers.length, 0);
assert.equal(offline.writes.length, 0);
const firstOffline = fixture({ online: false }); await firstOffline.run("initFirebaseSync()");
assert.match(firstOffline.app.innerHTML, /Krever nett første gang/);
assert.doesNotMatch(firstOffline.app.innerHTML, /nav-button/);

const oldCache = { projectId: "old-project", family: { name: "Old" }, meals: [{ id: "old" }], plansByWeek: { "2026-10-05": { 0: "old" } }, shoppingList: { items: [{ id: "old" }] }, clientUpdatedAt: 100, pendingLocalSync: true };
for (const saved of [oldCache, { ...oldCache, projectId: undefined }]) {
  const f = fixture({ stored: { "middagsapp-state": saved } });
  assert.equal(f.run("state.meals.length"), 0);
  assert.equal(f.run("state.shoppingList.items.length"), 0);
  assert.equal(f.run("state.clientUpdatedAt"), 0);
  assert.equal(f.run("state.pendingLocalSync"), false);
  assert.equal(f.run('Object.values(state.plansByWeek).some(days => Object.values(days).includes("old"))'), false);
  f.run("saveState()");
  assert.equal(JSON.parse(f.storage.get("middagsapp-state")).projectId, projectId);
}
console.log("app access startup tests ok");
