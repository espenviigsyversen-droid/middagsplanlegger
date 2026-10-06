"use strict";
const assert = require("node:assert/strict");
const { runImport } = require("../lib/import.js");
const { interpretRecipe } = require("../lib/ai.js");
const { fail } = require("../lib/core.js");
const auth = { token: { email: "admin@example.com", email_verified: true } };
const data = { mode: "text", text: "Ingredienser: 1 dl melk. Hell i glass.", categories: [], units: ["", "dl"] };
const answer = JSON.stringify({ found: true, title: "Melk", baseServings: 1, ingredients: [{ name: "melk", amount: "1", unit: "dl" }], steps: ["Hell i glass."], totalMinutes: 1 });
(async () => {
  const events = [], logs = [];
  const deps = { memberExists: async () => { events.push("member"); return true; },
    loadKey: async () => { events.push("key"); return { key: "sk-test-key-from-storage" }; },
    consumeUsage: async () => { events.push("usage"); return { dailyCount: 1 }; },
    fetchPage: async () => { events.push("fetch"); return { html: '<script type="application/ld+json">{"@type":"Recipe","name":"Melk"}</script>' }; },
    interpretRecipe: async () => { events.push("ai"); return answer; }, log: record => logs.push(record) };
  await assert.rejects(runImport({ auth, data: { ...data, mode: "url", text: undefined, url: "https://example.com/recipe" } }, deps), e => e.code === "invalid-argument");
  assert.deepEqual(events, ["member"]);
  events.length = 0;
  const urlInput = { mode: "url", url: "https://example.com/recipe", categories: [], units: ["", "dl"] };
  const imported = await runImport({ auth, data: urlInput }, deps);
  assert.deepEqual(events, ["member", "key", "usage", "fetch", "ai"]);
  assert.equal(imported.source, "jsonld+page-text"); assert.equal(imported.remainingToday, 39);
  assert.equal(logs.at(-1).source, "jsonld+page-text");
  events.length = 0;
  const social = await runImport({ auth, data: { ...urlInput, url: "https://instagram.com/post" } }, deps);
  assert.equal(social.code, "NEEDS_TEXT"); assert.deepEqual(events, ["member", "key", "usage"]);
  const pasted = await runImport({ auth, data: { ...data, sourceUrl: "https://instagram.com/post" } }, deps);
  assert.equal(pasted.ok, true); assert.equal(pasted.source, "pasted-text"); assert.equal(pasted.recipe.recipeUrl, "https://instagram.com/post");
  const limited = await runImport({ auth, data }, { ...deps, consumeUsage: async () => fail("DAILY_LIMIT"), interpretRecipe: () => assert.fail("must not call AI") });
  assert.equal(limited.code, "DAILY_LIMIT");
  await assert.rejects(runImport({ auth: null, data }, deps), e => e.code === "unauthenticated");
  assert.equal(JSON.stringify(logs).includes(auth.token.email), false);
  assert.equal(JSON.stringify(logs).includes(data.text), false);
  assert.ok(logs.every(log => Object.keys(log).every(key => ["functionName", "code", "durationMs", "providerStatus", "source"].includes(key))));
  let calls = 0, firstSignal;
  const output = await interpretRecipe(data.text, data, { key: "test-secret", fetchImpl: async (_url, options) => {
    calls++; if (!firstSignal) firstSignal = options.signal; else assert.equal(options.signal, firstSignal, "One shared 45-second budget across both attempts");
    const body = JSON.parse(options.body); assert.equal(body.store, false); assert.equal(body.model, "gpt-5.6-luna"); assert.equal(body.max_output_tokens, 8000);
    assert.match(body.instructions, /structured og pageText/); assert.match(body.instructions, /ellers tom streng/);
    assert.match(body.instructions, /"group":""/); assert.match(body.instructions, /recipeYield/);
    assert.match(body.instructions, /Ikke gjenta tittelen/); assert.match(body.instructions, /Mengdeord uten tall/);
    if (calls === 1) return { status: 429, body: { cancel: async () => {} } };
    return { ok: true, status: 200, json: async () => ({ output: [{ type: "message", content: [{ type: "output_text", text: answer }] }], usage: { input_tokens: 10, output_tokens: 20 } }) };
  } });
  assert.equal(output, answer); assert.equal(calls, 2);
  await assert.rejects(interpretRecipe("x", data, { key: "", fetchImpl: () => assert.fail("not configured") }), e => e.code === "AI_NOT_CONFIGURED");
  calls = 0;
  await assert.rejects(interpretRecipe("x", data, { key: "test", fetchImpl: async () => { calls++; return { status: 500 }; } }), e => e.code === "AI_UNAVAILABLE");
  assert.equal(calls, 2);
  const controller = new AbortController();
  await assert.rejects(interpretRecipe("x", data, { key: "test", signal: controller.signal, fetchImpl: async () => {
    controller.abort(); return { status: 429 };
  } }), e => e.code === "AI_UNAVAILABLE");
  console.log("functions import and AI tests ok (stubbed fetch)");
})().catch(error => { console.error(error); process.exitCode = 1; });
