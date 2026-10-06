import assert from "node:assert/strict";
import { createRecipeImporter } from "../../src/sync/recipe-import.js";
const firebaseApp = { name: "test" };
const urlInput = { mode: "url", url: "https://example.com/recipe" };
const textInput = { mode: "text", text: "Oppskriftstekst som er lang nok." };
let sdkLoads = 0, requests = [], timeouts = [], data = { ok: true, recipe: { title: "Fisk" } };
const importer = createRecipeImporter({ firebaseApp, sdkVersion: "test-version", online: () => true,
  loadSdk: async version => {
    sdkLoads++; assert.equal(version, "test-version");
    return { getFunctions: (app, region) => { assert.equal(app, firebaseApp); assert.equal(region, "europe-west1"); return "functions"; },
      httpsCallable: (functions, name, options) => {
        assert.equal(functions, "functions"); assert.equal(name, "importRecipe"); timeouts.push(options.timeout);
        return async input => { requests.push(input); if (data instanceof Error) throw data; return { data }; };
      } };
  } });
for (const input of [{ mode: "url", url: "   " }, { mode: "text", text: "kort" }, { mode: "text", text: "  " + "x".repeat(19) + "  " }]) {
  const result = await importer(input);
  assert.equal(result.message, input.mode === "url" ? "Lim inn en lenke først." : "Lim inn oppskriftsteksten først.");
  assert.equal(sdkLoads, 0); assert.equal(requests.length, 0);
}
assert.deepEqual(await importer(urlInput), data);
data = { ok: false, code: "NEEDS_TEXT", message: "Lim inn tekst" };
assert.equal((await importer(urlInput)).code, "NEEDS_TEXT");
data = { ok: false, code: "NOT_A_RECIPE", message: "Fant ingen oppskrift" };
assert.equal((await importer(textInput)).message, data.message);
data = Object.assign(new Error("SDK error"), { code: "functions/permission-denied" });
assert.match((await importer(urlInput)).message, /tilgang/);
assert.equal(sdkLoads, 1); assert.equal(requests.length, 4);
data = Object.assign(new Error("SDK error"), { code: "functions/invalid-argument" });
assert.equal((await importer(urlInput)).message, "Kunne ikke bruke lenken eller teksten. Sjekk lenken, eller lim inn mer av oppskriftsteksten.");
const offline = createRecipeImporter({ firebaseApp, online: () => false, loadSdk: () => assert.fail("Offline must not load SDK") });
assert.equal((await offline({})).code, "OFFLINE");
const imageInput = { mode: "image", images: [{ mediaType: "image/jpeg", data: "/9j/Kio=" }] };
const requestCount = requests.length;
assert.equal((await importer({ mode: "image", images: [] })).message, "Velg minst ett bilde først.");
assert.equal(requests.length, requestCount);
data = { ok: true, recipe: { title: "Bilde" } };
assert.deepEqual(await importer(imageInput), data);
assert.equal(requests.at(-1), imageInput);
assert.deepEqual(timeouts, [70000, 130000]);
await importer(imageInput); await importer(textInput);
assert.equal(sdkLoads, 1); assert.deepEqual(timeouts, [70000, 130000]);
data = Object.assign(new Error("SDK error"), { code: "functions/invalid-argument" });
assert.match((await importer(imageInput)).message, /bildene/);
assert.equal((await offline(imageInput)).code, "OFFLINE");
console.log("recipe import client tests ok (SDK stubs)");
