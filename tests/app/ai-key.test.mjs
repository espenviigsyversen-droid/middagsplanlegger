import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { createAiKeyClient } from "../../src/sync/ai-key.js";
const appUrl = new URL("../../app.js", import.meta.url);
let source = await readFile(appUrl, "utf8");
const imports = /import\s+(\{[\s\S]*?\})\s+from\s+"([^"]+)";/g;
const bindings = {};
for (const match of source.matchAll(imports)) {
  const module = await import(new URL(match[2], appUrl));
  for (const entry of match[1].slice(1, -1).split(",").filter(item => item.trim())) {
    const [name, alias = name] = entry.trim().split(/\s+as\s+/); bindings[alias] = module[name];
  }
}
source = source.replace(imports, "").replace(/render\(\);\s*initFirebaseSync\(\);\s*$/, "");
const key = "sk-proj-app-PRIVATE-KEY-1234";
function fixture({ role = "admin", online = true, confirm = true } = {}) {
  const storage = new Map(), requests = [], logs = [], buttons = new Map();
  const input = { value: "", addEventListener() {} };
  let html = "", result = { ok: true, configured: false, status: "unavailable", canManage: role === "admin", masked: "" }, finish;
  const app = {
    get innerHTML() { return html; }, set innerHTML(value) { html = value; input.value = ""; },
    querySelector: selector => selector === "[data-ai-key-input]" && html.includes("data-ai-key-input") ? input : buttons.get(selector) || null,
    querySelectorAll: () => [],
  };
  for (const selector of ["[data-ai-key-save]", "[data-ai-key-test]", "[data-ai-key-delete]", "[data-open-ai-settings]", "[data-ai-key-return-editor]"]) {
    buttons.set(selector, { events: {}, addEventListener(event, callback) { this.events[event] = callback; } });
  }
  const client = createAiKeyClient({ firebaseApp: {}, sdkVersion: "stub", online: () => online, loadSdk: async () => ({
    getFunctions: () => "stub", httpsCallable: (_functions, name) => async data => {
      requests.push({ name, data });
      if (name === "aiKeySave") return new Promise(resolve => { finish = value => resolve({ data: value }); });
      return { data: result };
    },
  }) });
  const context = vm.createContext({ ...bindings, structuredClone, Date, Blob, File, URL,
    console: { log: (...args) => logs.push(args), error: (...args) => logs.push(args), warn: (...args) => logs.push(args) },
    navigator: { onLine: online }, CSS: { escape: String },
    window: { addEventListener() {}, confirm: () => confirm, scrollTo() {} },
    document: { querySelector: selector => selector === "#app" ? app : null, addEventListener() {}, body: { classList: { contains: () => false, add() {}, remove() {} }, style: {} } },
    localStorage: { getItem: k => storage.get(k), setItem: (k, value) => storage.set(k, value), removeItem: k => storage.delete(k) },
    setTimeout() {}, clearTimeout() {}, createAiKeyClient: () => client,
  });
  vm.runInContext(source, context);
  const run = code => vm.runInContext(code, context);
  context.role = role;
  run('accessState = { kind: "ready", user: { uid: "user", email: "member@example.com" }, role, offline: false }; firebaseConnection = { firebaseApp: {} }; state.activeView = "ai-settings"; render();');
  return { run, app, context, input, requests, storage, logs, buttons, setResult: value => { result = value; }, finish: value => finish(value) };
}
const f = fixture(); await f.run("loadAiKeyStatus()");
assert.match(f.app.innerHTML, /Ikke satt opp/);
f.run("saveState()"); const original = new Map(f.storage);
f.input.value = key; f.run("render()"); assert.equal(f.input.value, key, "Unrelated renders keep the password only in the DOM");
const pending = f.run('runAiKeyAction("save")');
assert.equal(f.input.value, "", "Input cleared before await and render");
await new Promise(resolve => setImmediate(resolve));
assert.equal(f.requests.at(-1).name, "aiKeySave"); assert.equal(f.requests.at(-1).data.key, key);
assert.equal(f.run("JSON.stringify(state)").includes(key), false);
assert.equal(f.run("JSON.stringify(aiKeyUi)").includes(key), false);
assert.equal(JSON.stringify([...f.storage]).includes(key), false);
f.finish({ ok: true, configured: true, status: "connected", masked: "sk-p…1234", canManage: true, key, data: key }); await pending;
assert.match(f.app.innerHTML, /Tilkoblet/); assert.equal(f.app.innerHTML.includes(key), false);
assert.deepEqual(f.storage, original, "Key administration must not persist app state");
assert.equal(f.run("JSON.stringify(buildBackup({ data: syncPayload(), appVersion: APP_VERSION, familyId: FAMILY_ID }))").includes(key), false);
assert.equal(JSON.stringify(f.logs).includes(key), false);
f.run("navigator.onLine = false; refreshAiKeyNetworkUi()"); assert.match(f.app.innerHTML, /data-ai-key-save disabled/);
f.run("navigator.onLine = true; refreshAiKeyNetworkUi()"); await f.run("loadAiKeyStatus()");
f.setResult({ ok: true, configured: true, status: "invalid", masked: "sk-p…1234", canManage: true, message: "Nøkkelen er ugyldig" });
await f.run('runAiKeyAction("test")'); assert.match(f.app.innerHTML, /Nøkkelen er ugyldig/);
f.setResult({ ok: true, configured: false, status: "unavailable", masked: "", canManage: true });
await f.run('runAiKeyAction("delete")'); assert.match(f.app.innerHTML, /Nøkkelen er slettet/);
// Account/session changes clear the in-memory status and ignore late key-management replies.
const late = fixture(); await late.run("loadAiKeyStatus()"); late.input.value = key;
const oldSave = late.run('runAiKeyAction("save")'); await new Promise(resolve => setImmediate(resolve));
late.run('accessState = { kind: "login" }; render();');
late.finish({ ok: true, configured: true, status: "connected", masked: "sk-p…1234", canManage: true }); await oldSave;
assert.match(late.app.innerHTML, /Logg inn med Google/); assert.equal(late.run("aiKeyUi.status"), null); assert.equal(late.input.value, "");
const member = fixture({ role: "member" }); await member.run("loadAiKeyStatus()");
const before = member.requests.length;
for (const action of ["save", "test", "delete"]) await member.run(`runAiKeyAction("${action}")`);
assert.equal(member.requests.length, before); assert.match(member.app.innerHTML, /Bare administratorer/);
const offline = fixture({ online: false }); for (const action of ["save", "test", "delete"]) await offline.run(`runAiKeyAction("${action}")`);
assert.equal(offline.requests.length, 0); assert.match(offline.app.innerHTML, /data-ai-key-save disabled/);
const noDelete = fixture({ confirm: false }); await noDelete.run("loadAiKeyStatus()"); const count = noDelete.requests.length;
await noDelete.run('runAiKeyAction("delete")'); assert.equal(noDelete.requests.length, count);
// Opening key settings from the editor keeps the draft for the return button.
f.run('state.editingMealId = "new"; state.activeView = "meals"; state.draftMeal = { title: "Ulagret" }; state.draftIngredients = [{ name: "Fisk" }]; state.draftSteps = ["Stek"]; render();');
await f.run("loadAiKeyStatus()");
f.buttons.get("[data-open-ai-settings]").events.click(); await f.run("loadAiKeyStatus()");
assert.equal(f.run("state.draftMeal.title"), "Ulagret"); assert.equal(f.run("state.draftIngredients[0].name"), "Fisk");
f.buttons.get("[data-ai-key-return-editor]").events.click();
assert.equal(f.run("state.activeView"), "meals"); assert.equal(f.run("state.editingMealId"), "new"); assert.equal(f.run("state.draftMeal.title"), "Ulagret");
console.log("app AI key tests ok (DOM/SDK stubs, no key persistence or late replies)");
