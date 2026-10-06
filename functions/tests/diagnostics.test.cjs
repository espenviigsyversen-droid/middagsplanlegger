"use strict";
const assert = require("node:assert/strict");
const { runImport } = require("../lib/import.js");
const { interpretRecipe } = require("../lib/ai.js");
const { fail } = require("../lib/core.js");
const request = { auth: { token: { email: "member@example.com", email_verified: true } },
  data: { mode: "text", text: "Ingredienser: 1 dl melk. Hell i glass.", categories: [], units: ["dl"] } };
const answer = JSON.stringify({ found: true, title: "Melk", baseServings: 1,
  ingredients: [{ name: "melk", amount: "1", unit: "dl" }], steps: ["Hell i glass."] });
function dependencies(extra = {}) {
  return { memberExists: async () => true, loadKey: async () => ({ key: "sk-key-from-storage-for-tests" }), consumeUsage: async () => ({ dailyCount: 1 }),
    fetchPage: () => assert.fail("Text mode must not fetch pages"), interpretRecipe: async () => answer, ...extra };
}
(async () => {
  for (const [status, error, expectedCode] of [
    [401, { code: "invalid_api_key" }, "invalid_api_key"],
    [403, { type: "permission_error" }, "permission_error"],
    [404, { code: "model_not_found" }, "model_not_found"],
    [404, { type: "invalid_request_error" }, "invalid_request_error"],
    [400, { code: "model_not_found", type: "invalid_request_error" }, "model_not_found"],
  ]) {
    const records = []; let calls = 0;
    const result = await runImport(request, dependencies({
      interpretRecipe: (input, setup, options) => interpretRecipe(input, setup, { ...options, key: "test-secret",
        fetchImpl: async () => { calls++; return { ok: false, status, json: async () => ({ error: { ...error, message: "PRIVATE_PROVIDER_MESSAGE" } }) }; } }),
      log: record => records.push(record),
    }));
    assert.equal(result.code, "AI_NOT_CONFIGURED");
    assert.equal(calls, 1, "Configuration errors must not retry");
    assert.equal(records[0].code, "AI_NOT_CONFIGURED");
    assert.equal(records[0].providerStatus, status);
    assert.equal("providerCode" in records[0], false, "Only HTTP status is logged under the new policy");
    assert.equal(JSON.stringify(records).includes("PRIVATE_PROVIDER_MESSAGE"), false);
    assert.equal(JSON.stringify(records).includes("test-secret"), false);
    assert.equal(JSON.stringify(records).includes(request.auth.token.email), false);
    assert.equal(JSON.stringify(records).includes(request.data.text), false);
    assert.equal("providerStatus" in result, false, "Diagnostics stay in logs");
  }
  const badBody = [];
  const badBodyResult = await runImport(request, dependencies({
    interpretRecipe: (input, setup, options) => interpretRecipe(input, setup, { ...options, key: "test",
      fetchImpl: async () => ({ ok: false, status: 401, json: async () => { throw new SyntaxError("PRIVATE_PARSE_MESSAGE"); } }) }),
    log: record => badBody.push(record),
  }));
  assert.equal(badBodyResult.code, "AI_NOT_CONFIGURED");
  assert.equal(badBody[0].providerStatus, 401);
  assert.equal(JSON.stringify(badBody).includes("PRIVATE_PARSE_MESSAGE"), false);

  const retries = []; let calls = 0;
  const retried = await runImport(request, dependencies({
    interpretRecipe: (input, setup, options) => interpretRecipe(input, setup, { ...options, key: "test",
      fetchImpl: async () => { calls++; return { ok: false, status: 503, json: async () => ({ error: { code: "server_error", message: "PRIVATE_RETRY_MESSAGE" } }) }; } }),
    log: record => retries.push(record),
  }));
  assert.equal(retried.code, "AI_UNAVAILABLE"); assert.equal(calls, 2);
  assert.equal(retries[0].providerStatus, 503); assert.equal("providerCode" in retries[0], false);
  assert.equal(JSON.stringify(retries).includes("PRIVATE_RETRY_MESSAGE"), false);

  const timeoutLogs = [], timeout = new AbortController();
  const timedOut = await runImport(request, dependencies({
    interpretRecipe: (input, setup, options) => interpretRecipe(input, setup, { ...options, signal: timeout.signal, key: "test",
      fetchImpl: async () => { timeout.abort(Object.assign(new Error("PRIVATE_TIMEOUT_MESSAGE"), { name: "TimeoutError" })); return new Promise(() => {}); } }),
    log: record => timeoutLogs.push(record),
  }));
  assert.equal(timedOut.code, "AI_UNAVAILABLE"); assert.equal("providerCode" in timeoutLogs[0], false);
  assert.equal(JSON.stringify(timeoutLogs).includes("PRIVATE_TIMEOUT_MESSAGE"), false);

  const successful = await runImport(request, dependencies({ log: () => { throw new Error("Log failed"); } }));
  assert.equal(successful.ok, true);
  const rejectedLog = await runImport(request, dependencies({ log: async () => { throw new Error("Async log failed"); } }));
  assert.equal(rejectedLog.ok, true);
  const expectedFailure = await runImport(request, dependencies({ interpretRecipe: async () => fail("NOT_A_RECIPE"), log: () => { throw new Error("Log failed"); } }));
  assert.equal(expectedFailure.code, "NOT_A_RECIPE");
  await assert.rejects(runImport({ ...request, auth: null }, dependencies({ log: () => { throw new Error("Log failed"); } })), error => error.code === "unauthenticated");

  for (const error of [new TypeError("PRIVATE_INTERNAL_MESSAGE"), Object.assign(new Error("PRIVATE_INTERNAL_MESSAGE"), { code: "EIO" })]) {
    const records = [];
    const result = await runImport(request, dependencies({ consumeUsage: async () => { throw error; }, log: record => records.push(record) }));
    assert.equal(result.code, "AI_UNAVAILABLE");
    assert.equal(records[0].code, "INTERNAL"); assert.equal(records[0].errorName, error.name);
    assert.equal(records[0].errorCode, error.code);
    assert.equal("message" in records[0], false); assert.equal("errorMessage" in records[0], false);
    assert.equal(JSON.stringify(records).includes("PRIVATE_INTERNAL_MESSAGE"), false);
    assert.equal("errorName" in result, false);
  }
  const unexpectedAI = [];
  const aiFailure = await runImport(request, dependencies({
    interpretRecipe: (input, setup, options) => interpretRecipe(input, setup, { ...options, key: "test",
      fetchImpl: async () => { throw Object.assign(new TypeError("PRIVATE_FETCH_MESSAGE"), { code: "ENETDOWN" }); } }),
    log: record => unexpectedAI.push(record),
  }));
  assert.equal(aiFailure.code, "AI_UNAVAILABLE");
  assert.equal(unexpectedAI[0].code, "INTERNAL");
  assert.equal(unexpectedAI[0].errorName, "TypeError"); assert.equal(unexpectedAI[0].errorCode, "ENETDOWN");
  assert.equal(JSON.stringify(unexpectedAI).includes("PRIVATE_FETCH_MESSAGE"), false);
  for (const [response, reason] of [
    [{ status: "incomplete", output: [] }, "incomplete"],
    [{ output: [] }, "no_text"],
    [{ output: [{ type: "message", content: [{ type: "output_text", text: "not JSON" }] }] }, "no_json"],
    [{ output: [{ type: "message", content: [{ type: "output_text", text: '{"found":true,"ingredients":null,"steps":[]}' }] }] }, "shape"],
  ]) {
    const logs = [];
    const result = await runImport(request, dependencies({
      interpretRecipe: (input, setup, options) => interpretRecipe(input, setup, { ...options,
        fetchImpl: async () => ({ ok: true, json: async () => response }) }), log: record => logs.push(record),
    }));
    assert.equal(result.code, "AI_INVALID_RESPONSE"); assert.equal(logs[0].reason, reason);
    assert.equal(logs[0].source, "pasted-text"); assert.equal("reason" in result, false);
    assert.equal(JSON.stringify(logs).includes(request.data.text), false);
  }
  const unsafeReasonLogs = [];
  await runImport(request, dependencies({ interpretRecipe: () => fail("AI_INVALID_RESPONSE", "PRIVATE_REASON"), log: record => unsafeReasonLogs.push(record) }));
  assert.equal("reason" in unsafeReasonLogs[0], false);
  console.log("functions diagnostics tests ok (HTTP errors, timeout, internal errors and logger failures)");
})().catch(error => { console.error(error); process.exitCode = 1; });
