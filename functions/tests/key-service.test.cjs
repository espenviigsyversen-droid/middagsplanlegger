"use strict";
const assert = require("node:assert/strict");
const { runKeyAction } = require("../lib/key-service.js");
const { encryptKey, decryptKey, checkProviderKey, nextKeyUsage } = require("../lib/keys.js");
const { runImport } = require("../lib/import.js");
const { interpretRecipe } = require("../lib/ai.js");
const key = "sk-proj-PRIVATE-KEY-IN-TESTS-1234", secret = "c".repeat(64);
const auth = { token: { email: "Admin@Example.com", email_verified: true } };
function fixture({ role = "admin", status = 200, timeout = false } = {}) {
  let record = null, usage = {}, checks = 0, writes = 0, deletes = 0;
  const logs = [];
  const deps = {
    getMember: async email => { assert.equal(email, "admin@example.com"); return { role }; },
    getKey: async () => record, saveKey: async value => { writes++; record = value; },
    deleteKey: async () => { deletes++; record = null; },
    updateKeyStatus: async (_tested, value) => { writes++; record = { ...record, status: value, checkedAt: new Date(0) }; },
    consumeKeyUsage: async () => { usage = nextKeyUsage(usage); }, encryptionSecret: () => secret,
    serverTimestamp: () => new Date(0), log: value => logs.push(value),
    checkKey: (raw, model, config) => checkProviderKey(raw, model, { ...config, fetchImpl: async () => {
      checks++; assert.equal(raw, key);
      if (timeout) throw new DOMException(key, "TimeoutError");
      return { status, body: { cancel: async () => {} } };
    } }),
  };
  return { deps, logs, record: () => record, counts: () => ({ checks, writes, deletes, usage: usage.calls?.length || 0 }), seed: value => { record = value; } };
}
(async () => {
  const responses = [];
  for (const [status, expected] of [[200, undefined], [401, "INVALID_API_KEY"], [403, "INVALID_API_KEY"], [404, "MODEL_UNAVAILABLE"], [500, "PROVIDER_UNAVAILABLE"]]) {
    const f = fixture({ status });
    const result = await runKeyAction("save", { auth, data: { key } }, f.deps); responses.push(result);
    assert.equal(result.ok, status === 200); assert.equal(result.code, expected);
    assert.equal(f.counts().writes, status === 200 ? 1 : 0);
    assert.equal(f.logs[0].providerStatus, status);
    if (status === 200) {
      const stored = f.record(); assert.equal(decryptKey(stored, secret), key);
      assert.equal(JSON.stringify(stored).includes(key), false); assert.equal(stored.updatedBy, "admin@example.com");
      assert.equal(stored.status, "connected"); assert.equal(result.masked, "sk-p…1234");
      assert.equal(result.canManage, true); assert.equal("iv" in result, false);
    }
    assert.equal(JSON.stringify([result, f.logs]).includes(key), false);
    assert.ok(f.logs.every(log => Object.keys(log).every(field => ["functionName", "code", "durationMs", "providerStatus"].includes(field))));
  }
  const timeout = fixture({ timeout: true });
  assert.equal((await runKeyAction("save", { auth, data: { key } }, timeout.deps)).code, "PROVIDER_UNAVAILABLE");
  assert.equal(timeout.counts().writes, 0); assert.equal(JSON.stringify(timeout.logs).includes(key), false);
  const invalid = fixture();
  await assert.rejects(runKeyAction("save", { auth, data: { key: "no" } }, invalid.deps), e => e.code === "invalid-argument");
  await assert.rejects(runKeyAction("save", { auth, data: { key, other: true } }, invalid.deps), e => e.code === "invalid-argument");
  assert.equal(invalid.counts().usage, 0); assert.equal(invalid.counts().checks, 0);
  const member = fixture({ role: "member" });
  for (const action of ["save", "test", "delete"]) await assert.rejects(runKeyAction(action, { auth, data: { key } }, member.deps), e => e.code === "permission-denied");
  assert.equal((await runKeyAction("status", { auth }, member.deps)).canManage, false);
  assert.deepEqual(member.counts(), { checks: 0, writes: 0, deletes: 0, usage: 0 });
  await assert.rejects(runKeyAction("status", {}, member.deps), e => e.code === "unauthenticated");
  await assert.rejects(runKeyAction("status", { auth: { token: { email: "admin@example.com", email_verified: false } } }, member.deps), e => e.code === "unauthenticated");
  await assert.rejects(runKeyAction("status", { auth }, { ...member.deps, getMember: async () => null }), e => e.code === "permission-denied");
  const tested = fixture({ status: 401 }); tested.seed({ ...encryptKey(key, secret), status: "connected", masked: "sk-p…1234" });
  const testResult = await runKeyAction("test", { auth }, tested.deps);
  assert.equal(testResult.ok, true); assert.equal(testResult.status, "invalid"); assert.match(testResult.message, /ugyldig/);
  assert.equal(tested.record().status, "invalid"); assert.ok(tested.record().checkedAt);
  const deleted = await runKeyAction("delete", { auth }, tested.deps);
  assert.equal(deleted.configured, false); assert.equal(tested.record(), null);
  const broken = fixture(); broken.seed({ ...encryptKey(key, secret), tag: "bad" });
  assert.equal((await runKeyAction("test", { auth }, broken.deps)).code, "AI_NOT_CONFIGURED");
  assert.equal(broken.counts().checks, 0);
  const limited = fixture();
  for (let i = 0; i < 10; i++) assert.equal((await runKeyAction(i % 2 ? "test" : "save", { auth, ...(i % 2 ? {} : { data: { key } }) }, limited.deps)).ok, true);
  assert.equal((await runKeyAction("save", { auth, data: { key } }, limited.deps)).code, "KEY_RATE_LIMITED");
  assert.equal(limited.counts().checks, 10);
  const loggerFail = fixture(); assert.equal((await runKeyAction("save", { auth, data: { key } }, { ...loggerFail.deps, log: () => { throw new Error(key); } })).ok, true);
  // Stored-key lookup precedes quota; invalid provider auth updates only key status.
  const data = { mode: "text", text: "Dette er en oppskriftstekst som er lang nok", categories: [], units: [] };
  let usageCount = 0, invalidCount = 0; const logs = [];
  const importDeps = { memberExists: async () => true, loadKey: async () => null, consumeUsage: async () => { usageCount++; return { dailyCount: 1 }; },
    interpretRecipe: () => assert.fail("No key must not call provider"), log: log => logs.push(log) };
  assert.equal((await runImport({ auth, data }, importDeps)).code, "AI_NOT_CONFIGURED"); assert.equal(usageCount, 0);
  const record = encryptKey(key, secret);
  const badImport = await runImport({ auth, data }, { ...importDeps, loadKey: async () => ({ key: decryptKey(record, secret), record }),
    markKeyInvalid: async value => { assert.equal(value, record); invalidCount++; },
    interpretRecipe: (input, setup, options) => { assert.equal(options.key, key); return interpretRecipe(input, setup, { ...options, fetchImpl: async () => ({ status: 401 }) }); },
  });
  assert.equal(badImport.code, "AI_NOT_CONFIGURED"); assert.equal(usageCount, 1); assert.equal(invalidCount, 1);
  assert.equal(JSON.stringify([responses, logs]).includes(key), false);
  console.log("key service and stored-key import tests ok (stubs, no network)");
})().catch(error => { console.error(error); process.exitCode = 1; });
