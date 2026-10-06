"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
let aiCalls = 0, aiFailure = "", secretReads = 0;
const exported = {}, secrets = [];
const keys = require("../lib/keys.js");
const rawKey = "sk-proj-key-from-storage-1234";
const logs = [], records = new Map([["families/familien/members/member@example.com", { role: "member" }]]);
records.set(keys.KEY_PATH, { ...keys.encryptKey(rawKey, "test-secret"), masked: keys.maskKey(rawKey), status: "connected" });
const db = { doc: id => ({ id, get: async () => ({ exists: records.has(id), data: () => records.get(id) }) }),
  runTransaction: callback => callback({ get: ref => ref.get(), set: (ref, data) => { records.set(ref.id, data); }, update: (ref, data) => records.set(ref.id, { ...records.get(ref.id), ...data }) }) };
class HttpsError extends Error { constructor(code, message) { super(message); this.code = code; } }
const modules = {
  "firebase-functions/v2/https": { HttpsError, onCall: (config, callback) => { callback.options = config; return callback; } },
  "firebase-functions/params": { defineSecret: name => { secrets.push(name); return { name, value: () => { secretReads++; return "test-secret"; } }; } },
  "firebase-functions/logger": { info: (_label, record) => logs.push(record) },
  "firebase-admin/app": { initializeApp() {} }, "firebase-admin/firestore": { getFirestore: () => db, FieldValue: { serverTimestamp: () => new Date(0) } },
  "./lib/models.js": require("../lib/models.js"), "./lib/import.js": require("../lib/import.js"), "./lib/core.js": require("../lib/core.js"),
  "./lib/keys.js": keys, "./lib/key-service.js": require("../lib/key-service.js"),
  "./lib/transport.js": { fetchPage: () => assert.fail("Text mode must not fetch") },
  "./lib/ai.js": { interpretRecipe: async (_input, _setup, config) => {
    aiCalls++; assert.equal(config.key, rawKey); assert.equal(config.model, "gpt-6-luna");
    if (aiFailure) {
      if (aiFailure === "replace") records.set(keys.KEY_PATH, { ...keys.encryptKey(rawKey, "test-secret"), status: "connected" });
      if (aiFailure === "delete") records.delete(keys.KEY_PATH);
      config.onDiagnostic({ providerStatus: 401, providerCode: "invalid_api_key" });
      require("../lib/core.js").fail("AI_NOT_CONFIGURED");
    }
    return JSON.stringify({ found: true, title: "Melk", ingredients: [], steps: ["Hell melk i glass."], baseServings: 4 });
  } },
};
const source = fs.readFileSync(path.join(__dirname, "../index.js"), "utf8");
vm.runInNewContext(source, { require: name => { assert.ok(modules[name], name); return modules[name]; }, exports: exported, process: { env: {} } });
const handler = exported.importRecipe, options = handler.options;
assert.equal(options.region, "europe-west1"); assert.equal(options.timeoutSeconds, 120);
assert.equal(options.memory, "512MiB"); assert.equal(options.maxInstances, 3); assert.equal(options.enforceAppCheck, false);
assert.equal(options.secrets[0].name, "KEY_ENCRYPTION_SECRET");
assert.deepEqual(secrets, ["KEY_ENCRYPTION_SECRET"]);
assert.equal(Object.keys(exported).length, 6);
assert.equal(exported.aiModelSave.options.timeoutSeconds, 90);
assert.equal(exported.aiModelSave.options.region, "europe-west1");
assert.equal(exported.aiModelSave.options.maxInstances, 3);
assert.equal(exported.aiModelSave.options.secrets[0].name, "KEY_ENCRYPTION_SECRET");
for (const action of ["Status", "Save", "Test", "Delete"]) {
  const config = exported[`aiKey${action}`].options;
  assert.equal(config.region, "europe-west1"); assert.equal(config.timeoutSeconds, 30); assert.equal(config.maxInstances, 3);
  assert.equal(!!config.secrets, ["Save", "Test"].includes(action));
}
assert.equal(source.includes("OPENAI_API_KEY"), false);
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "../package.json"), "utf8"));
assert.equal(pkg.engines.node, "22"); assert.deepEqual(Object.keys(pkg.dependencies).sort(), ["firebase-admin", "firebase-functions"]);
(async () => {
  const data = { mode: "text", text: "Dette er en lang nok oppskriftstekst", categories: [], units: [] };
  await assert.rejects(handler({ data }), error => error instanceof HttpsError && error.code === "unauthenticated");
  await assert.rejects(handler({ auth: { token: { email: "member@example.com", email_verified: false } }, data }), error => error.code === "unauthenticated");
  await assert.rejects(handler({ auth: { token: { email: "unknown@example.com", email_verified: true } }, data }), error => error.code === "permission-denied");
  await assert.rejects(handler({ auth: { token: { email: "member@example.com", email_verified: true } }, data: {} }), error => error.code === "invalid-argument" && error.message === "Ugyldig forespørsel.");
  const request = { auth: { token: { email: "Member@Example.com", email_verified: true } }, data };
  await assert.rejects(exported.aiModelSave({ data: {} }), error => error.code === "unauthenticated");
  await assert.rejects(exported.aiModelSave({ auth: request.auth, data: { model: "gpt-6-luna" } }), error => error.code === "permission-denied");
  records.set("families/familien/private/aiConfig", { model: "gpt-6-luna" });
  for (const action of ["Save", "Test", "Delete"]) await assert.rejects(exported[`aiKey${action}`]({ auth: request.auth, data: {} }), error => error.code === "permission-denied");
  const status = await exported.aiKeyStatus({ auth: request.auth });
  assert.equal(status.model, "gpt-6-luna");
  assert.equal(secretReads, 0, "Status and rejected non-admin requests do not access the encryption secret");
  assert.equal(status.configured, true); assert.equal(status.canManage, false); assert.equal("data" in status, false);
  for (let i = 0; i < 20; i++) assert.equal((await handler(request)).ok, true);
  assert.equal(aiCalls, 20);
  assert.equal((await handler(request)).code, "RATE_LIMITED"); assert.equal(aiCalls, 20);
  const usageId = "families/familien/private/importUsage";
  assert.equal(records.get(usageId).dailyCount, 20);
  records.set(usageId, { day: new Date().toISOString().slice(0, 10), dailyCount: 150, calls: [] });
  assert.equal((await handler(request)).code, "DAILY_LIMIT"); assert.equal(aiCalls, 20);
  for (const failure of ["invalid", "replace", "delete"]) {
    records.set(keys.KEY_PATH, { ...keys.encryptKey(rawKey, "test-secret"), status: "connected" });
    records.delete(usageId); aiFailure = failure;
    assert.equal((await handler(request)).code, "AI_NOT_CONFIGURED");
    if (failure === "invalid") assert.equal(records.get(keys.KEY_PATH).status, "invalid");
    if (failure === "replace") assert.equal(records.get(keys.KEY_PATH).status, "connected");
    if (failure === "delete") assert.equal(records.has(keys.KEY_PATH), false, "Late invalidation must not recreate a deleted key");
  }
  records.delete(usageId);
  assert.equal((await handler(request)).code, "AI_NOT_CONFIGURED");
  assert.equal(records.has(usageId), false, "Missing key must not consume quota");
  records.set(keys.KEY_PATH, { ...keys.encryptKey(rawKey, "wrong-secret"), status: "connected" });
  assert.equal((await handler(request)).code, "AI_NOT_CONFIGURED"); assert.equal(records.has(usageId), false);
  assert.equal(records.get(keys.KEY_PATH).status, "invalid");
  assert.equal(JSON.stringify(logs).includes("test-secret"), false);
  assert.equal(JSON.stringify([logs, status]).includes(rawKey), false);
  assert.equal(JSON.stringify(logs).includes("example.com"), false);
  assert.equal(JSON.stringify(logs).includes(data.text), false);
  console.log("functions index adapter tests ok (Admin and Functions SDK stubs)");
})().catch(error => { console.error(error); process.exitCode = 1; });
