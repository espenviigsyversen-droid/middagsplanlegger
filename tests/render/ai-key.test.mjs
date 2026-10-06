import assert from "node:assert/strict";
import { renderAiKeyView, aiKeyStatusLabel } from "../../src/render/ai-key.js";
import { renderMealEditorView } from "../../src/render/meals.js";
import { renderSetupView } from "../../src/render/setup.js";
const escapeHtml = value => String(value ?? "").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
for (const isAdmin of [true, false]) for (const configured of [true, false]) {
  const status = { configured, status: "connected", masked: configured ? "sk-p…1234" : "", model: "gpt-6-luna" };
  const html = renderAiKeyView({ isAdmin, status, available: true, escapeHtml });
  assert.match(html, /AI og oppskriftsimport/); assert.match(html, /lagres kryptert/);
  assert.match(html, /Oppskriftstekst, nettsideinnhold og bilder sendes til OpenAI/);
  assert.match(html, /trykker Hent, Tolk tekst eller Tolk bilder/);
  assert.equal(html.includes("sk-p…1234"), configured);
  assert.equal(html.includes("data-ai-key-save"), isAdmin);
  assert.match(html, /Modell: gpt-6-luna/);
  assert.equal(html.includes("data-ai-model-input"), isAdmin);
  assert.equal(html.includes("data-ai-model-save"), isAdmin);
  if (isAdmin) {
    assert.match(html, /value="gpt-6-luna"/);
    assert.match(html, /Modellen byttes bare hvis den består en prøveimport\. Test bildeimport selv etter et bytte\./);
    if (!configured) assert.match(html, /data-ai-model-save disabled/);
  }
  if (isAdmin) { assert.match(html, /type="password" autocomplete="off"/); assert.doesNotMatch(html, /value="sk-/); }
  else { assert.match(html, /Bare administratorer/); assert.doesNotMatch(html, /data-ai-key-input|data-ai-key-test|data-ai-key-delete/); }
  const editor = renderMealEditorView({ meal: { title: "Fisk" }, aiKeyStatus: status, isAdmin, importAvailable: true, escapeHtml });
  assert.equal(editor.includes("data-import-fetch"), configured);
  if (!configured) {
    assert.match(editor, /Oppskriftsimport er ikke satt opp/);
    if (isAdmin) assert.match(editor, /data-open-ai-settings/); else assert.match(editor, /Be en administrator legge inn OpenAI-nøkkel/);
  }
}
const badEditor = renderMealEditorView({ meal: { title: "Fisk" }, aiKeyStatus: { configured: true, status: "invalid" }, importAvailable: true });
assert.match(badEditor, /OpenAI-nøkkelen virker ikke/); assert.doesNotMatch(badEditor, /data-import-fetch/);
for (const options of [{ available: false }, { available: true, busy: true }]) {
  const disabled = renderAiKeyView({ ...options, isAdmin: true, status: { configured: true }, escapeHtml });
  for (const action of ["save", "test", "delete"]) assert.match(disabled, new RegExp(`data-ai-key-${action} disabled`));
  assert.match(disabled, /data-ai-model-save disabled/);
}
assert.match(renderAiKeyView({ isAdmin: true, status: { model: "gpt-5.6-luna" }, modelValue: "candidate-model", available: true, busy: true, busyAction: "model", escapeHtml }), /value="candidate-model"/);
assert.match(renderAiKeyView({ busy: true, busyAction: "model" }), /Tester modellen med en prøveoppskrift … Det kan ta opptil et minutt\./);
assert.equal(aiKeyStatusLabel({ configured: true, status: "invalid" }), "Nøkkelen virker ikke");
assert.equal(aiKeyStatusLabel({ configured: true, status: "connected" }), "Tilkoblet");
assert.equal(aiKeyStatusLabel({ configured: true, status: "unavailable" }), "Kunne ikke kontrolleres");
assert.match(renderMealEditorView({ meal: { title: "Fisk" }, aiKeyStatus: { configured: true, status: "unavailable" }, importAvailable: true }), /data-import-fetch/);
assert.match(renderSetupView({ aiStatusSummary: "Tilkoblet" }), /AI og oppskriftsimport/);
assert.match(renderSetupView({ aiStatusSummary: "Tilkoblet" }), /Tilkoblet/);
console.log("AI settings and recipe import rendering tests ok");
