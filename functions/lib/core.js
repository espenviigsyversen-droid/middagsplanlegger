"use strict";
const messages = {
  NEEDS_TEXT: "Instagram og Facebook kan ikke hentes automatisk. Kopier bildeteksten og lim den inn her.",
  NOT_A_RECIPE: "Fant ingen oppskrift i teksten.", INVALID_URL: "Lenken må være en offentlig https-adresse.",
  FETCH_FAILED: "Kunne ikke hente siden. Prøv å lime inn oppskriftsteksten i stedet.",
  PAGE_TOO_LARGE: "Siden er for stor. Lim inn oppskriftsteksten i stedet.",
  RATE_LIMITED: "Familien har brukt 10 importer på 10 minutter. Vent litt og prøv igjen.",
  DAILY_LIMIT: "Familien har brukt dagens 40 importer. Prøv igjen i morgen.",
  AI_NOT_CONFIGURED: "Oppskriftsimport er ikke satt opp. En administrator må legge inn OpenAI-nøkkel under Innstillinger.",
  KEY_RATE_LIMITED: "Familien har kontrollert nøkkelen 10 ganger på 10 minutter. Vent litt og prøv igjen.",
  AI_UNAVAILABLE: "Oppskriftsimport er midlertidig utilgjengelig. Prøv igjen senere.",
  AI_INVALID_RESPONSE: "Kunne ikke tolke oppskriften. Prøv å lime inn tydeligere tekst.",
};
class ImportError extends Error {
  constructor(code, reason) { super(messages[code] || "Ugyldig forespørsel."); this.code = code; this.reason = reason; }
}
const fail = (code, reason) => { throw new ImportError(code, reason); };
function safeErrorFields(error) {
  const fields = {};
  try {
    const name = error?.name, code = error?.code;
    if (typeof name === "string" && /^[A-Za-z]{1,40}$/.test(name)) fields.errorName = name;
    if (Number.isInteger(code) || (typeof code === "string" && /^[A-Za-z0-9_\/-]{1,40}$/.test(code) && !code.startsWith("sk-"))) fields.errorCode = code;
  } catch {}
  return fields;
}
const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
function validateInput(data) {
  const bad = () => fail("invalid-argument");
  if (!object(data) || !["url", "text"].includes(data.mode)) bad();
  const fields = data.mode === "url" ? ["mode", "url", "categories", "units"] : ["mode", "text", "sourceUrl", "categories", "units"];
  if (Object.keys(data).some(key => !fields.includes(key))) bad();
  if (!Array.isArray(data.categories) || data.categories.length > 30 || !Array.isArray(data.units) || data.units.length > 40) bad();
  for (const category of data.categories) {
    if (!object(category) || Object.keys(category).some(k => !["key", "label"].includes(k))
      || typeof category.key !== "string" || !category.key.trim() || category.key.length > 80
      || typeof category.label !== "string" || !category.label.trim() || category.label.length > 120) bad();
  }
  if (data.units.some(unit => typeof unit !== "string" || unit.length > 40)) bad();
  if (data.mode === "url" && (typeof data.url !== "string" || !data.url.trim() || data.url.length > 2000)) bad();
  if (data.mode === "text" && (typeof data.text !== "string" || data.text.trim().length < 20 || data.text.length > 20000)) bad();
  if (data.sourceUrl !== undefined && (typeof data.sourceUrl !== "string" || data.sourceUrl.length > 2000)) bad();
  return { ...data, ...(data.url ? { url: data.url.trim() } : {}), ...(data.sourceUrl ? { sourceUrl: data.sourceUrl.trim() } : {}) };
}
async function requireMember(auth, exists) {
  if (!auth || typeof auth.token?.email !== "string" || !auth.token.email.trim() || auth.token.email_verified !== true) fail("unauthenticated");
  const email = auth.token.email.toLowerCase();
  if (email.includes("/") || !await exists(email)) fail("permission-denied");
}
function nextUsage(previous = {}, now = Date.now()) {
  const day = new Date(now).toISOString().slice(0, 10);
  const dailyCount = previous.day === day ? Math.max(0, Number(previous.dailyCount) || 0) : 0;
  if (dailyCount >= 40) fail("DAILY_LIMIT");
  const calls = (Array.isArray(previous.calls) ? previous.calls : []).filter(stamp => Number.isFinite(stamp) && stamp > now - 600000);
  if (calls.length >= 10) fail("RATE_LIMITED");
  return { day, dailyCount: dailyCount + 1, calls: [...calls, now] };
}
function extractJson(text) {
  if (typeof text !== "string" || !text.trim()) fail("AI_INVALID_RESPONSE", "no_text");
  let wrongShape = false;
  // Balanced JSON objects, respecting escaped quotes and braces inside strings.
  for (let start = text.indexOf("{"); start !== -1; start = text.indexOf("{", start + 1)) {
    let depth = 0, quoted = false, escaped = false;
    for (let i = start; i < text.length; i++) {
      const char = text[i];
      if (quoted) { if (escaped) escaped = false; else if (char === "\\") escaped = true; else if (char === '"') quoted = false; }
      else if (char === '"') quoted = true;
      else if (char === "{") depth++;
      else if (char === "}" && --depth === 0) {
        try {
          const parsed = JSON.parse(text.slice(start, i + 1));
          if (object(parsed) && typeof parsed.found === "boolean") return parsed;
          wrongShape = true;
        } catch {}
        break;
      }
    }
  }
  fail("AI_INVALID_RESPONSE", wrongShape ? "shape" : "no_json");
}
const trimmed = (value, max) => typeof value === "string" ? value.trim().slice(0, max) : "";
function normalizeAmount(value) {
  if (typeof value !== "string") return "";
  const text = value.trim().replace(/–/g, "-").replace(/[½¼¾]/g, char => ({ "½": "1/2", "¼": "1/4", "¾": "3/4" })[char]);
  const number = "(?:\\d+ +\\d+ *\\/ *\\d+|\\d+(?:[.,]\\d+)?(?: *\\/ *\\d+(?:[.,]\\d+)?)?)";
  if (text.length > 12 || !new RegExp(`^${number}(?: *- *${number})?$`).test(text)) return "";
  const parts = text.split("-").map(part => {
    const fraction = part.trim().replace(",", ".").split("/");
    const mixed = fraction[0].trim().split(/\s+/);
    return (mixed.length === 2 ? Number(mixed[0]) : 0) + Number(mixed.at(-1)) / (fraction.length === 2 ? Number(fraction[1]) : 1);
  });
  if (parts.some(part => !Number.isFinite(part)) || (parts.length === 2 && parts[0] > parts[1])) return "";
  return text;
}
function normalizeDescription(value, title) {
  const description = (typeof value === "string" ? value : "")
    .replace(/[\p{Extended_Pictographic}\p{Emoji_Presentation}\p{Emoji_Modifier}\uFE0F\u200D\u20E3]/gu, "")
    .replace(/#[\p{L}\p{N}_]+/gu, "").replace(/\s+/g, " ").trim().slice(0, 500);
  const comparable = text => text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  return comparable(description) === comparable(title) ? "" : description;
}
function normalizeRecipe(text, { categories, units, recipeUrl = "" }) {
  const data = extractJson(text);
  if (data.found === false) fail("NOT_A_RECIPE");
  const title = trimmed(data.title, 120);
  if (data.found !== true || !Array.isArray(data.ingredients) || !Array.isArray(data.steps)) fail("AI_INVALID_RESPONSE", "shape");
  const warnings = [];
  const servingsKnown = Number.isInteger(data.baseServings) && data.baseServings >= 1 && data.baseServings <= 30;
  if (!servingsKnown) warnings.push("Fant ikke antall porsjoner. Kontroller feltet Porsjoner.");
  const ingredients = data.ingredients.slice(0, 60).map(item => {
    if (!object(item)) return null;
    let name = trimmed(item.name, 80), unit = trimmed(item.unit, 40);
    if (!name) return null;
    if (!units.includes(unit)) { name = `${unit} ${name}`.trim().slice(0, 80); unit = ""; }
    const amount = normalizeAmount(item.amount);
    const group = trimmed(item.group, 60);
    return { name, unit: amount ? unit : "", amount, ...(group ? { group } : {}) };
  }).filter(Boolean);
  if (new Set(ingredients.map(item => item.group || "")).size === 1) for (const item of ingredients) delete item.group;
  const steps = data.steps.slice(0, 40).map(step => trimmed(step, 800)).filter(Boolean);
  if (!ingredients.length && !steps.length) fail("NOT_A_RECIPE");
  if (!ingredients.length) warnings.push("Ingen ingredienser funnet.");
  if (!steps.length) warnings.push("Ingen fremgangsmåte funnet.");
  if (data.translated === true) warnings.push("Oversatt til norsk.");
  const minutes = typeof data.totalMinutes === "number" && Number.isFinite(data.totalMinutes) && data.totalMinutes > 0 ? data.totalMinutes : null;
  const keys = new Set(categories.map(category => category.key));
  return { recipe: { title, description: normalizeDescription(data.description, title), baseServings: servingsKnown ? data.baseServings : 4, servingsKnown,
    ingredients, steps, prepTime: minutes === null ? "" : minutes < 30 ? "quick" : minutes <= 60 ? "medium" : "long",
    categories: [...new Set(Array.isArray(data.categories) ? data.categories.filter(key => keys.has(key)) : [])].slice(0, 3), recipeUrl }, warnings };
}
module.exports = { ImportError, fail, messages, validateInput, requireMember, nextUsage, extractJson, normalizeRecipe, safeErrorFields };
