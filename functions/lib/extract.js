"use strict";
function decodeEntities(text) {
  const named = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", deg: "°", frac12: "½", frac14: "¼", frac34: "¾", ndash: "–", mdash: "—", hellip: "…", oslash: "ø", Oslash: "Ø", aring: "å", Aring: "Å", aelig: "æ", AElig: "Æ" };
  return String(text || "").replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (whole, entity) => {
    if (entity[0] !== "#") return named[entity] ?? whole;
    const code = entity[1].toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
    return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : " ";
  });
}
// Each character is scanned at most once, including malformed/unclosed tags.
function* tags(html) {
  const lower = html.replace(/[A-Z]/g, char => char.toLowerCase());
  let cursor = 0;
  while (cursor < html.length) {
    const start = html.indexOf("<", cursor);
    if (start === -1) { yield { text: html.slice(cursor) }; break; }
    if (start > cursor) yield { text: html.slice(cursor, start) };
    if (!/[a-z/!?]/i.test(html[start + 1] || "")) { yield { text: "<" }; cursor = start + 1; continue; }
    if (html.startsWith("<!--", start)) {
      const end = html.indexOf("-->", start + 4);
      cursor = end === -1 ? html.length : end + 3;
      continue;
    }
    let end = start + 1, quote = "";
    for (; end < html.length; end++) {
      const char = html[end];
      if (quote) { if (char === quote) quote = ""; }
      else if (char === '"' || char === "'") quote = char;
      else if (char === ">") break;
    }
    if (end === html.length) break;
    const raw = html.slice(start, end + 1);
    const match = /^<\s*(\/?)\s*([a-z][\w:-]*)\b/i.exec(raw);
    yield { raw, name: match?.[2].toLowerCase(), closing: match?.[1] === "/", start, end: end + 1 };
    cursor = end + 1;
    // Script/style contents are raw text, not HTML tags.
    if (!match?.[1] && ["script", "style"].includes(match?.[2].toLowerCase())) {
      const close = lower.indexOf(`</${match[2].toLowerCase()}`, cursor);
      yield { text: html.slice(cursor, close === -1 ? html.length : close) };
      cursor = close === -1 ? html.length : close;
    }
  }
}
const whitespace = text => decodeEntities(text).replace(/\s+/g, " ").trim();
const clean = text => whitespace([...tags(String(text || ""))].map(token => token.text || " ").join(" "));
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
  let cursor = 0;
  while (cursor < tag.length) {
    if (!/[\w:-]/.test(tag[cursor])) { cursor++; continue; }
    const start = cursor;
    while (cursor < tag.length && /[\w:-]/.test(tag[cursor])) cursor++;
    const name = tag.slice(start, cursor).toLowerCase();
    while (/\s/.test(tag[cursor] || "")) cursor++;
    if (tag[cursor] !== "=") continue;
    cursor++;
    while (/\s/.test(tag[cursor] || "")) cursor++;
    const quote = ['"', "'"].includes(tag[cursor]) ? tag[cursor++] : "";
    const valueStart = cursor;
    while (cursor < tag.length && (quote ? tag[cursor] !== quote : !/[\s>]/.test(tag[cursor]))) cursor++;
    attrs[name] = decodeEntities(tag.slice(valueStart, cursor));
    if (quote && cursor < tag.length) cursor++;
  }
  return attrs;
}
function scanPage(html, keepNavigation = false) {
  const removed = new Set(["script", "style", "select", "datalist", "noscript", "svg", "template", "iframe"]);
  const parts = [], scripts = [];
  let blockedName = "", blockedDepth = 0;
  let contentDepth = 0;
  let mainStart, mainEnd, title = "", metaTitle = "", inTitle = false, jsonScript = false, scriptText = [];
  for (const token of tags(html)) {
    if (token.text !== undefined) {
      if (jsonScript) scriptText.push(token.text);
      if (!blockedDepth) { parts.push(token.text); if (inTitle) title += token.text; }
      continue;
    }
    if (token.name === "script") {
      if (token.closing) { if (jsonScript) scripts.push(scriptText.join("")); jsonScript = false; }
      else { jsonScript = attributes(token.raw).type?.toLowerCase() === "application/ld+json"; scriptText = []; }
    }
    const removeNavigation = !keepNavigation && (token.name === "nav" || (["header", "footer"].includes(token.name) && !contentDepth));
    if (removed.has(token.name) || removeNavigation) {
      if (token.closing && blockedDepth && token.name === blockedName) blockedDepth--;
      else if (!token.closing && !/\/\s*>$/.test(token.raw)) {
        if (!blockedDepth) blockedName = token.name;
        if (token.name === blockedName) blockedDepth++;
      }
      parts.push(" ");
      continue;
    }
    if (blockedDepth) continue;
    if (["main", "article"].includes(token.name)) contentDepth = Math.max(0, contentDepth + (token.closing ? -1 : 1));
    if (token.name === "main") {
      if (!token.closing && mainStart === undefined) mainStart = parts.length;
      if (token.closing) mainEnd = parts.length;
    }
    if (token.name === "title") inTitle = !token.closing;
    if (token.name === "meta" && !metaTitle) {
      const attrs = attributes(token.raw);
      if (attrs.property?.toLowerCase() === "og:title") metaTitle = attrs.content || "";
    }
    parts.push(" ");
  }
  const all = whitespace(parts.join(" "));
  const main = mainStart !== undefined && mainEnd !== undefined ? whitespace(parts.slice(mainStart, mainEnd).join(" ")) : "";
  return { scripts, title: clean(metaTitle || title).slice(0, 500), text: main.length >= 500 ? main : all };
}
function recipeWindow(text, limit) {
  if (text.length <= limit) return text;
  const signals = /(?<![\d.,/])(?:\d+(?:[.,]\d+)?(?:\s*\/\s*\d+)?|[½¼¾])\s*(?:kg|ml|cl|dl|ss|ts|stk|pk|boks|cups?|tbsp|tsp|oz|lb|g|l)\b|\b(?:ingredienser|fremgangsmåte|slik gjør du|ingredients|instructions|method|directions)\b/gi;
  const matches = [...text.matchAll(signals)];
  let right = 0, best = 0, chosen = 0;
  for (let left = 0; left < matches.length; left++) {
    const start = Math.min(text.length - limit, matches[left].index);
    while (right < matches.length && matches[right].index + matches[right][0].length <= start + limit) right++;
    const score = right - left;
    if (score > best) {
      best = score;
      const last = matches[right - 1];
      const earliest = last.index + last[0].length - limit;
      chosen = Math.min(text.length - limit, Math.max(0, earliest, matches[left].index - 500));
    }
  }
  return text.slice(chosen, chosen + limit);
}
function boundedStructured(structured, limit) {
  // Preserve valid JSON and whole entries; never truncate a serialized object.
  const result = { ...structured, recipeIngredient: [], recipeInstructions: structured.recipeInstructions.slice(0, 1) };
  for (const field of ["recipeIngredient", "recipeInstructions"]) {
    for (const entry of field === "recipeInstructions" ? structured[field].slice(1) : structured[field]) {
      result[field].push(entry);
      if (JSON.stringify(result).length > limit) { result[field].pop(); break; }
    }
  }
  return result;
}
function extractPage(html) {
  const raw = String(html || "");
  let page = scanPage(raw);
  if (page.text.length < 500) page = scanPage(raw, true);
  const pageText = `${page.title}\n${recipeWindow(page.text, 16000 - page.title.length - 1)}`;
  for (const script of page.scripts) {
    let objects;
    try { objects = flatten(JSON.parse(script.replace(/^\s*<!--|-->\s*$/g, "").trim())); }
    catch { try { objects = flatten(JSON.parse(decodeEntities(script))); } catch { continue; } }
    const recipe = objects.find(obj => (Array.isArray(obj["@type"]) ? obj["@type"] : [obj["@type"]]).some(type => type === "Recipe" || type === "https://schema.org/Recipe"));
    if (!recipe) continue;
    const cook = durationMinutes(recipe.cookTime), prep = durationMinutes(recipe.prepTime);
    const structured = { name: clean(recipe.name).slice(0, 120), description: clean(recipe.description).slice(0, 500),
      recipeYield: clean(Array.isArray(recipe.recipeYield) ? recipe.recipeYield.join(" ") : recipe.recipeYield).slice(0, 160),
      recipeIngredient: (Array.isArray(recipe.recipeIngredient) ? recipe.recipeIngredient : [recipe.recipeIngredient]).filter(v => typeof v === "string").slice(0, 60).map(v => clean(v).slice(0, typeof recipe.recipeIngredient === "string" ? 2000 : 240)).filter(Boolean),
      recipeInstructions: instructions(recipe.recipeInstructions).slice(0, 40).map(v => v.slice(0, 800)),
      recipeCategory: clean(Array.isArray(recipe.recipeCategory) ? recipe.recipeCategory.join(", ") : recipe.recipeCategory).slice(0, 500),
      totalTime: clean(recipe.totalTime).slice(0, 64), cookTime: clean(recipe.cookTime).slice(0, 64), prepTime: clean(recipe.prepTime).slice(0, 64),
      totalMinutes: durationMinutes(recipe.totalTime) ?? (cook !== null || prep !== null ? (cook || 0) + (prep || 0) : null) };
    const measured = structured.recipeIngredient.filter(value => /[\d½¼¾]/.test(value)).length;
    if (structured.recipeIngredient.length >= 2 && measured >= structured.recipeIngredient.length / 2 && structured.recipeInstructions.length) {
      return { source: "jsonld", input: JSON.stringify(boundedStructured(structured, 20000)) };
    }
    const combined = { structured: boundedStructured(structured, 6000), pageText };
    // JSON escaping also counts toward the AI input ceiling.
    let low = 0, high = pageText.length;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      combined.pageText = pageText.slice(0, mid);
      if (JSON.stringify(combined).length <= 20000) low = mid; else high = mid - 1;
    }
    combined.pageText = pageText.slice(0, low);
    return { source: "jsonld+page-text", input: JSON.stringify(combined) };
  }
  return { source: "page-text", input: pageText };
}
module.exports = { decodeEntities, durationMinutes, instructions, extractPage };
