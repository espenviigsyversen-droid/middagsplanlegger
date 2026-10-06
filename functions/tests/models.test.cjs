"use strict";
const assert = require("node:assert/strict");
const { validModel, selectModel, modelForMode, runModelSave, TEST_RECIPE } = require("../lib/models.js");
const { encryptKey, nextKeyUsage, checkProviderKey, DEFAULT_MODEL } = require("../lib/keys.js");
const { fail, IMPORT_DAILY_LIMIT } = require("../lib/core.js");
const { runImport } = require("../lib/import.js");
const { runKeyAction } = require("../lib/key-service.js");
const auth = { token: { email: "Admin@Example.com", email_verified: true } }, model = "gpt-6-luna";
const key = "sk-PRIVATE-MODEL-TEST-KEY-1234", secret = "encryption-secret-for-local-tests";
const good = { found: true, title: "Prøvemiddag", baseServings: 4,
  ingredients: ["potet", "gulrot", "olje", "salt", "vann"].map(name => ({ name, amount: "2", unit: "g" })), steps: ["Skrell", "Kok", "Server"] };
assert.equal(DEFAULT_MODEL, "gpt-5.6-luna");
assert.equal(selectModel({ model }, { OPENAI_RECIPE_MODEL: "env-model" }), model);
assert.equal(selectModel(null, { OPENAI_RECIPE_MODEL: "env-model" }), "env-model");
assert.equal(selectModel(null, {}), DEFAULT_MODEL);
for (const value of [null, "", "A-model", "two words", "abc\n", "x".repeat(62), key]) {
  assert.equal(validModel(value), false); assert.equal(selectModel({ model: value }, { OPENAI_RECIPE_MODEL: "env-model" }), "env-model");
}
assert.equal(validModel("a.b_c-2"), true); assert.equal(validModel("abc"), true); assert.equal(validModel("a".repeat(61)), true);
assert.equal(modelForMode(model, "image", { OPENAI_RECIPE_IMAGE_MODEL: "image-model" }), "image-model");
assert.equal(modelForMode(model, "image", {}), model); assert.equal(modelForMode(model, "text", { OPENAI_RECIPE_IMAGE_MODEL: "image-model" }), model);
assert.ok(TEST_RECIPE.split("\n").length >= 8 && TEST_RECIPE.split("\n").length <= 12);
function fixture({ role = "admin", status = 200, record = encryptKey(key, secret), answer = good } = {}) {
  let usage = {}, config = { model: "old-model" }; const logs = [], calls = [], writes = [], keyUpdates = [];
  const deps = { getMember: async () => role ? { role } : null, getKey: async () => record,
    encryptionSecret: () => secret, consumeKeyUsage: async () => { calls.push("quota"); usage = nextKeyUsage(usage); },
    checkKey: async (raw, candidate, options) => { calls.push("check"); assert.equal(raw, key); assert.equal(candidate, model);
      return checkProviderKey(raw, candidate, { ...options, fetchImpl: async () => ({ status }) }); },
    interpretRecipe: async (text, setup, options) => { calls.push("sample"); assert.equal(text, TEST_RECIPE); assert.equal(options.key, key);
      assert.equal(options.model, model); assert.equal(setup.mode, "text"); assert.ok(setup.units.includes("g")); return JSON.stringify(answer); },
    saveConfig: async data => { calls.push("save"); writes.push(data); config = data; },
    serverTimestamp: () => "stamp", updateKeyStatus: async (_record, value) => keyUpdates.push(value), log: data => logs.push(data),
  };
  return { deps, calls, writes, logs, keyUpdates, config: () => config };
}
const request = { auth, data: { model } };
(async () => {
  for (const [authValue, role, code] of [[null, "admin", "unauthenticated"], [{ token: { email: "a@b", email_verified: false } }, "admin", "unauthenticated"],
    [auth, null, "permission-denied"], [auth, "member", "permission-denied"]]) {
    const f = fixture({ role }); await assert.rejects(runModelSave({ ...request, auth: authValue }, f.deps), error => error.code === code);
    assert.equal(f.calls.length, 0); assert.equal(f.writes.length, 0);
  }
  for (const data of [null, [], {}, { model, extra: 1 }, { model: "bad model" }, { model: "abc\n" }, { model: key }]) {
    const f = fixture(); await assert.rejects(runModelSave({ auth, data }, f.deps), error => error.code === "invalid-argument");
    assert.equal(f.calls.length, 0); assert.equal("model" in f.logs[0], false);
  }
  for (const record of [null, encryptKey(key, "wrong secret")]) {
    const f = fixture({ record }); assert.equal((await runModelSave(request, f.deps)).code, "AI_NOT_CONFIGURED"); assert.equal(f.calls.length, 0);
  }
  for (const [status, code] of [[401, "INVALID_API_KEY"], [403, "INVALID_API_KEY"], [404, "MODEL_UNAVAILABLE"], [503, "PROVIDER_UNAVAILABLE"]]) {
    const f = fixture({ status }); assert.equal((await runModelSave(request, f.deps)).code, code); assert.equal(f.writes.length, 0);
    assert.deepEqual(f.keyUpdates, [401, 403].includes(status) ? ["invalid"] : []); assert.equal(f.logs[0].providerStatus, status);
  }
  const success = fixture(); const result = await runModelSave(request, success.deps);
  assert.equal(result.ok, true); assert.equal(result.model, model); assert.equal(result.configured, true);
  assert.deepEqual(success.calls, ["quota", "check", "sample", "save"]);
  assert.deepEqual(success.writes, [{ model, updatedAt: "stamp", updatedBy: "admin@example.com" }]);
  for (const answer of [{ ...good, ingredients: good.ingredients.slice(0, 3) }, { ...good, steps: ["Kok"] },
    { ...good, ingredients: good.ingredients.map((i, index) => ({ ...i, amount: index < 2 ? "2" : "" })) }, { found: false }]) {
    const f = fixture({ answer }); assert.equal((await runModelSave(request, f.deps)).code, "MODEL_TEST_FAILED"); assert.equal(f.writes.length, 0);
  }
  const boundary = fixture({ answer: { ...good, ingredients: good.ingredients.slice(0, 4).map((item, index) => ({ ...item, amount: index < 3 ? "2" : "" })), steps: good.steps.slice(0, 2) } });
  assert.equal((await runModelSave(request, boundary.deps)).ok, true);
  const limited = fixture(); for (let i = 0; i < 10; i++) assert.equal((await runModelSave(request, limited.deps)).ok, true);
  assert.equal((await runModelSave(request, limited.deps)).code, "KEY_RATE_LIMITED"); assert.equal(limited.writes.length, 10);
  for (const phase of ["getKey", "consumeKeyUsage", "checkKey", "interpretRecipe", "saveConfig"]) {
    const f = fixture(); f.deps[phase] = async () => { throw new TypeError("PRIVATE_ERROR_TEXT " + key); };
    assert.equal((await runModelSave(request, f.deps)).ok, false); assert.equal(f.writes.length, 0);
  }
  const invalidAnswer = fixture(); invalidAnswer.deps.interpretRecipe = async () => fail("AI_INVALID_RESPONSE", "no_json");
  assert.equal((await runModelSave(request, invalidAnswer.deps)).code, "MODEL_TEST_FAILED"); assert.equal(invalidAnswer.logs[0].reason, "no_json");
  const diagnostic = fixture(); diagnostic.deps.interpretRecipe = async (_text, _setup, options) => {
    options.onDiagnostic({ providerStatus: 401, providerCode: "invalid_api_key" }); fail("AI_NOT_CONFIGURED");
  };
  assert.equal((await runModelSave(request, diagnostic.deps)).code, "INVALID_API_KEY"); assert.equal(diagnostic.logs[0].providerCode, "invalid_api_key");
  assert.deepEqual(diagnostic.keyUpdates, ["invalid"]);
  const invalidDiagnostic = fixture(); invalidDiagnostic.deps.interpretRecipe = async (_text, _setup, options) => {
    options.onDiagnostic({ providerCode: key }); fail("AI_UNAVAILABLE");
  };
  await runModelSave(request, invalidDiagnostic.deps); assert.equal("providerCode" in invalidDiagnostic.logs[0], false);
  for (const f of [success, invalidAnswer, diagnostic, invalidDiagnostic]) {
    const serialized = JSON.stringify([f.logs, result]); assert.equal(serialized.includes(key), false); assert.equal(serialized.includes(TEST_RECIPE), false);
    assert.equal(serialized.includes("PRIVATE_ERROR_TEXT"), false); assert.equal(serialized.includes("admin@example.com"), false);
    assert.equal(f.logs[0].model, model);
  }
  // All consumers receive the selected model, and only import counts in the import quota.
  const consumer = fixture(); consumer.deps.getModel = async () => model;
  const status = await runKeyAction("status", { auth }, consumer.deps); assert.equal(status.model, model);
  const tested = await runKeyAction("test", { auth }, consumer.deps); assert.equal(tested.model, model);
  consumer.deps.saveKey = async record => { assert.ok(record.data); assert.equal(JSON.stringify(record).includes(key), false); };
  assert.equal((await runKeyAction("save", { auth, data: { key } }, consumer.deps)).model, model);
  let importQuota = 0;
  const imported = await runImport({ auth, data: { mode: "text", text: TEST_RECIPE, units: ["g"], categories: [] } }, {
    memberExists: async () => true, getModel: async () => model, loadKey: async () => ({ key }),
    consumeUsage: async () => { importQuota++; return { dailyCount: 123 }; },
    interpretRecipe: async (_text, _setup, options) => { assert.equal(options.model, model); return JSON.stringify(good); },
    log: record => { assert.equal(record.model, model); assert.equal(JSON.stringify(record).includes(TEST_RECIPE), false); },
  });
  assert.equal(imported.remainingToday, IMPORT_DAILY_LIMIT - 123); assert.equal(importQuota, 1);
  const invalidLog = [];
  await runImport({ auth, data: { mode: "text", text: TEST_RECIPE, units: [], categories: [] } }, {
    memberExists: async () => true, getModel: async () => "INVALID MODEL", loadKey: async () => ({ key }), consumeUsage: async () => ({ dailyCount: 1 }),
    interpretRecipe: async () => JSON.stringify(good), log: record => invalidLog.push(record),
  });
  assert.equal("model" in invalidLog[0], false);
  console.log("model selection and save tests ok (no network)");
})().catch(error => { console.error(error); process.exitCode = 1; });
