import assert from "node:assert/strict";
import { createAiKeyClient, sanitizeAiKeyStatus } from "../../src/sync/ai-key.js";
const key = "sk-proj-client-PRIVATE-KEY-1234", input = { value: key }, requests = [];
let loads = 0, response = { ok: true, configured: true, masked: "sk-p…1234", status: "connected", canManage: true, model: "test", key, data: key };
const client = createAiKeyClient({ firebaseApp: "app", sdkVersion: "sdk", online: () => true, loadSdk: async version => {
  loads++; assert.equal(version, "sdk"); return {
    getFunctions: (app, region) => { assert.equal(app, "app"); assert.equal(region, "europe-west1"); return "functions"; },
    httpsCallable: (functions, name, config) => {
      assert.equal(functions, "functions"); assert.equal(config.timeout, name === "aiModelSave" ? 100000 : 35000);
      return async data => { requests.push({ name, data }); if (response instanceof Error) throw response; return { data: response }; };
    },
  };
} });
input.value = `  ${key}\n`;
const pending = client.saveFromInput(input);
assert.equal(input.value, "", "The input is cleared synchronously, including during SDK loading");
const result = await pending;
assert.equal(requests[0].name, "aiKeySave"); assert.deepEqual(requests[0].data, { key });
assert.equal(JSON.stringify(result).includes(key), false);
assert.equal(result.masked, "sk-p…1234"); assert.equal("key" in result, false); assert.equal("data" in result, false);
for (const [method, name] of [["status", "aiKeyStatus"], ["test", "aiKeyTest"], ["delete", "aiKeyDelete"]]) {
  assert.equal((await client[method]()).ok, true); assert.equal(requests.at(-1).name, name); assert.deepEqual(requests.at(-1).data, {});
}
assert.equal(loads, 1);
response = { ok: false, code: "INVALID_API_KEY", message: "Nøkkelen er ugyldig" };
input.value = key; assert.equal((await client.saveFromInput(input)).message, response.message); assert.equal(input.value, "");
response = new Error(key); assert.equal(JSON.stringify(await client.test()).includes(key), false);
for (const value of ["", " \n ", "bad-format", "sk-" + "a".repeat(16), "sk-" + "a".repeat(298), "sk-" + "x ".repeat(20)]) {
  const count = requests.length;
  input.value = value; const failed = client.saveFromInput(input); assert.equal(input.value, "");
  const result = await failed; assert.equal(result.ok, false); assert.equal(result.code, "KEY_FORMAT");
  assert.equal(result.message, value.trim() ? "Nøkkelen ser ikke riktig ut. Den skal starte med sk- og ikke inneholde mellomrom." : "Lim inn nøkkelen først.");
  assert.equal(requests.length, count);
}
for (const code of ["functions/invalid-argument", "functions/unauthenticated", "functions/permission-denied", "functions/unavailable"]) {
  response = Object.assign(new Error(key), { code });
  const result = await client.test();
  assert.equal(result.message, code === "functions/invalid-argument"
    ? "Nøkkelen ser ikke riktig ut. Den skal starte med sk- og ikke inneholde mellomrom."
    : ["functions/unauthenticated", "functions/permission-denied"].includes(code)
      ? "Innlogging eller tilgang mangler. Logg inn på nytt og prøv igjen."
      : "Kunne ikke kontakte serveren. Sjekk innlogging og nettforbindelse og prøv igjen.");
  assert.equal(JSON.stringify(result).includes(key), false);
}
const offline = createAiKeyClient({ online: () => false, loadSdk: () => assert.fail("No SDK offline") });
input.value = key; const off = offline.saveFromInput(input); assert.equal(input.value, ""); assert.equal((await off).code, "OFFLINE");
assert.equal(sanitizeAiKeyStatus({ configured: true, masked: key, key }).masked, "");
response = { ok: true, configured: true, model: "gpt-6-luna" };
assert.equal((await client.saveModel("  gpt-6-luna\n")).model, "gpt-6-luna");
assert.deepEqual(requests.at(-1), { name: "aiModelSave", data: { model: "gpt-6-luna" } });
for (const value of ["", "ab", "GPT-6-luna", "two models", "a".repeat(62), "a/b"]) {
  const count = requests.length;
  const result = await client.saveModel(value);
  assert.equal(result.code, "MODEL_FORMAT");
  assert.equal(result.message, "Modellnavnet ser ikke riktig ut. Eksempel: gpt-6-luna.");
  assert.equal(requests.length, count);
}
response = Object.assign(new Error(key), { code: "functions/invalid-argument" });
assert.equal((await client.saveModel("gpt-6-luna")).message, "Modellnavnet ser ikke riktig ut. Eksempel: gpt-6-luna.");
response = { ok: false, code: "MODEL_TEST_FAILED", message: "Modellen besto ikke prøveimporten. Modellen er ikke byttet." };
assert.equal((await client.saveModel("gpt-6-luna")).message, response.message);
assert.equal((await offline.saveModel("gpt-6-luna")).code, "OFFLINE");
assert.equal(loads, 1);
console.log("AI key client tests ok (SDK stubs and synchronous input clearing)");
