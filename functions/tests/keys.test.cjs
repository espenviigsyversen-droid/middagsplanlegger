"use strict";
const assert = require("node:assert/strict");
const { encryptKey, decryptKey, maskKey, validateKeyInput, nextKeyUsage, checkProviderKey, sameKeyRecord, publicKeyStatus } = require("../lib/keys.js");
const key = "sk-proj-test-key-never-log-12345678", secret = "a".repeat(64);
const record = encryptKey(key, secret);
assert.equal(decryptKey(record, secret), key);
assert.equal(decryptKey(record, "b".repeat(64)), null);
assert.equal(decryptKey({ ...record, tag: Buffer.alloc(16).toString("base64") }, secret), null);
assert.equal(decryptKey({ ...record, data: Buffer.alloc(30).toString("base64") }, secret), null);
assert.equal(decryptKey({ ...record, v: 2 }, secret), null);
assert.equal(decryptKey({ ...record, iv: "bad" }, secret), null);
assert.notEqual(encryptKey(key, secret).iv, record.iv);
assert.equal(maskKey(key), "sk-p…5678"); assert.equal(maskKey(key).replace("…", "").length, 8);
assert.equal(sameKeyRecord(record, { ...record, status: "invalid" }), true);
assert.equal(sameKeyRecord(record, encryptKey(key, secret)), false);
for (const input of [{ key: "bad" }, { key: key + " " }, { key: "sk-" + "x".repeat(298) }, { key, unknown: true }, [], null]) {
  assert.throws(() => validateKeyInput(input), error => error.code === "invalid-argument");
}
let usage = {};
for (let i = 0; i < 10; i++) usage = nextKeyUsage(usage, 1000000);
assert.throws(() => nextKeyUsage(usage, 1000001), error => error.code === "KEY_RATE_LIMITED");
assert.equal(nextKeyUsage(usage, 1600000).calls.length, 1);
const publicStatus = publicKeyStatus({ ...record, masked: key, status: "connected", updatedAt: new Date(0), updatedBy: "private@email" }, "member");
assert.equal(publicStatus.masked, ""); assert.equal(publicStatus.canManage, false);
assert.equal(publicStatus.updatedAt, "1970-01-01T00:00:00.000Z");
assert.equal(JSON.stringify(publicStatus).includes(key), false);
assert.equal("data" in publicStatus, false); assert.equal("updatedBy" in publicStatus, false);
(async () => {
  for (const [status, expected] of [[200, undefined], [401, "INVALID_API_KEY"], [403, "INVALID_API_KEY"], [404, "MODEL_UNAVAILABLE"], [429, "PROVIDER_UNAVAILABLE"], [500, "PROVIDER_UNAVAILABLE"]]) {
    const result = await checkProviderKey(key, "test-model", { fetchImpl: async (url, config) => {
      assert.equal(url, "https://api.openai.com/v1/models/test-model"); assert.equal(config.method, "GET");
      assert.equal(config.headers.Authorization, `Bearer ${key}`); assert.ok(config.signal);
      return { status, json: () => assert.fail("Provider error messages must not be read"), body: { cancel: async () => {} } };
    } });
    assert.equal(result.ok, status === 200); assert.equal(result.code, expected); assert.equal(result.providerStatus, status);
    if (status === 404) assert.match(result.message, /test-model/);
    assert.equal(JSON.stringify(result).includes(key), false);
  }
  const controller = new AbortController();
  const timedOut = await checkProviderKey(key, "test", { signal: controller.signal, fetchImpl: async () => {
    controller.abort(new DOMException("Private key must not leak", "TimeoutError")); return new Promise(() => {});
  } });
  assert.equal(timedOut.code, "PROVIDER_UNAVAILABLE");
  console.log("key encryption, format, masking, quota and provider tests ok (no network)");
})().catch(error => { console.error(error); process.exitCode = 1; });
