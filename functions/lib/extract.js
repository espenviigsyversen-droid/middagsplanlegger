"use strict";
function decodeEntities(text) {
  const named = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", deg: "°", frac12: "½", frac14: "¼", frac34: "¾", ndash: "–", mdash: "—", hellip: "…", oslash: "ø", Oslash: "Ø", aring: "å", Aring: "Å", aelig: "æ", AElig: "Æ" };
  return String(text || "").replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (whole, entity) => {
    if (entity[0] !== "#") return named[entity] ?? whole;
    const code = entity[1].toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
    return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : " ";
  });
}
const clean = text => decodeEntities(String(text || "").replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
function flatten(value) {
  const result = [], pending = [value];
  while (pending.length) {
    const next = pending.pop();
    if (Array.isArray(next)) { for (let i = next.length - 1; i >= 0; i--) pending.push(next[i]); }
    else if (next && typeof next === "object") { result.push(next); if (next["@graph"]) pending.push(next["@graph"]); }
  }
  return result;
}
function instructions(value) {
  const result = [], pending = [value];
  while (pending.length && result.length < 40) {
    const next = pending.pop();
    if (typeof next === "string") { const text = clean(next); if (text) result.push(text); }
    else if (Array.isArray(next)) { for (let i = next.length - 1; i >= 0; i--) pending.push(next[i]); }
    else if (next && typeof next === "object") pending.push(next.itemListElement || next.text || next.name || "");
  }
  return result;
}
function durationMinutes(value) {
  const match = /^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i.exec(String(value || ""));
  return match ? Number(match[1] || 0) * 1440 + Number(match[2] || 0) * 60 + Number(match[3] || 0) + Number(match[4] || 0) / 60 : null;
}
function attributes(tag) {
  const attrs = {};
  for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) attrs[match[1].toLowerCase()] = decodeEntities(match[2] ?? match[3] ?? match[4]);
  return attrs;
}
function extractPage(html) {
  for (const script of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    if (attributes(script[1]).type?.toLowerCase() !== "application/ld+json") continue;
    let objects;
    try { objects = flatten(JSON.parse(script[2].replace(/^\s*<!--|-->\s*$/g, "").trim())); }
    catch { try { objects = flatten(JSON.parse(decodeEntities(script[2]))); } catch { continue; } }
    const recipe = objects.find(obj => (Array.isArray(obj["@type"]) ? obj["@type"] : [obj["@type"]]).some(type => type === "Recipe" || type === "https://schema.org/Recipe"));
    if (!recipe) continue;
    const cook = durationMinutes(recipe.cookTime), prep = durationMinutes(recipe.prepTime);
    const structured = { name: clean(recipe.name).slice(0, 120), description: clean(recipe.description).slice(0, 500),
      recipeYield: clean(Array.isArray(recipe.recipeYield) ? recipe.recipeYield.join(" ") : recipe.recipeYield).slice(0, 160),
      recipeIngredient: (Array.isArray(recipe.recipeIngredient) ? recipe.recipeIngredient : [recipe.recipeIngredient]).filter(v => typeof v === "string").slice(0, 60).map(v => clean(v).slice(0, 240)),
      recipeInstructions: instructions(recipe.recipeInstructions).slice(0, 40).map(v => v.slice(0, 800)),
      recipeCategory: clean(Array.isArray(recipe.recipeCategory) ? recipe.recipeCategory.join(", ") : recipe.recipeCategory).slice(0, 500),
      totalTime: clean(recipe.totalTime).slice(0, 64), cookTime: clean(recipe.cookTime).slice(0, 64), prepTime: clean(recipe.prepTime).slice(0, 64),
      totalMinutes: durationMinutes(recipe.totalTime) ?? (cook !== null || prep !== null ? (cook || 0) + (prep || 0) : null) };
    return { source: "jsonld", input: JSON.stringify(structured) };
  }
  const metaTitle = [...html.matchAll(/<meta\b[^>]*>/gi)].map(match => attributes(match[0])).find(attr => attr.property === "og:title")?.content;
  const title = clean(metaTitle || /<title\b[^>]*>([\s\S]*?)<\/title\s*>/i.exec(html)?.[1] || "");
  const stripped = html.replace(/<(script|style|nav|header|footer)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ").replace(/<!--[\s\S]*?-->/g, " ");
  return { source: "page-text", input: `${title}\n${clean(stripped)}`.slice(0, 12000) };
}
module.exports = { decodeEntities, durationMinutes, instructions, extractPage };
