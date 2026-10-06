"use strict";
const assert = require("node:assert/strict");
const { runImport } = require("../lib/import.js");
const { runKeyAction } = require("../lib/key-service.js");
const { ImportError } = require("../lib/core.js");
const auth = { token: { email: "member@example.com", email_verified: true } };
const data = { mode: "text", text: "Oppskriftstekst som er lang nok", categories: [], units: [] };
const variants = [
  ["TypeError", "EIO", { errorName: "TypeError", errorCode: "EIO" }],
  ["Error", "auth/network-error", { errorName: "Error", errorCode: "auth/network-error" }],
  ["Error", 500, { errorName: "Error", errorCode: 500 }],
  ["Error", 1.5, { errorName: "Error" }],
  ["Error", Infinity, { errorName: "Error" }],
  ["A".repeat(40), "C".repeat(40), { errorName: "A".repeat(40), errorCode: "C".repeat(40) }],
  ["sk-PRIVATE_KEY", "sk-PRIVATE_KEY", {}],
  ["A".repeat(41), "C".repeat(41), {}],
  ["Bad.Name", "has spaces", {}],
  ["Error\n", "C\n", {}],
  ["Name123", "a@email", {}],
];
(async () => {
  for (const [name, code, expected] of variants) for (const action of ["import", "key"]) {
    const logs = [];
    const error = Object.assign(new Error("PRIVATE_MESSAGE"), { name, code, extra: "PRIVATE_EXTRA" });
    const result = action === "import" ? await runImport({ auth, data }, {
      memberExists: async () => true, loadKey: async () => ({ key: "sk-test-key-never-logged" }),
      consumeUsage: async () => { throw error; }, log: record => logs.push(record),
    }) : await runKeyAction("status", { auth }, {
      getMember: async () => ({ role: "member" }), getKey: async () => { throw error; }, log: record => logs.push(record),
    });
    assert.equal(result.ok, false); assert.equal(logs[0].code, "INTERNAL");
    assert.deepEqual(Object.fromEntries(Object.entries(logs[0]).filter(([key]) => key.startsWith("error"))), expected);
    assert.ok(Object.keys(logs[0]).every(key => ["functionName", "code", "durationMs", "providerStatus", "errorName", "errorCode"].includes(key)));
    assert.equal(JSON.stringify(logs).includes("PRIVATE_MESSAGE"), false); assert.equal(JSON.stringify(logs).includes("PRIVATE_EXTRA"), false);
    assert.equal(JSON.stringify(logs).includes("sk-PRIVATE_KEY"), false);
  }
  for (const action of ["import", "key"]) {
    const logs = [], error = Object.assign(new ImportError("AI_NOT_CONFIGURED"), { name: "SafeName" });
    const thrower = async () => { throw error; };
    if (action === "import") await runImport({ auth, data }, { memberExists: async () => true, loadKey: thrower, log: value => logs.push(value) });
    else await runKeyAction("status", { auth }, { getMember: async () => ({ role: "member" }), getKey: thrower, log: value => logs.push(value) });
    assert.equal(logs[0].code, "AI_NOT_CONFIGURED"); assert.equal("errorName" in logs[0], false); assert.equal("errorCode" in logs[0], false);
  }
  console.log("INTERNAL log allowlist tests ok (both server flows, no secrets or message/stack)");
})().catch(error => { console.error(error); process.exitCode = 1; });
