"use strict";
const { hkdfSync, randomBytes, createCipheriv, createDecipheriv } = require("node:crypto");
const { fail } = require("./core.js");
const { abortable } = require("./transport.js");
const KEY_PATH = "families/familien/private/openaiKey";
const DEFAULT_MODEL = "gpt-5.6-luna";
function derivedKey(secret) {
  if (typeof secret !== "string" || !secret.length) throw new Error("Encryption secret missing");
  return Buffer.from(hkdfSync("sha256", secret, "middagsapp-openai-key-v1", "", 32));
}
function validateKeyInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).some(key => key !== "key")
    || typeof input.key !== "string" || input.key.length < 20 || input.key.length > 300
    || !input.key.startsWith("sk-") || /\s/.test(input.key)) fail("invalid-argument");
  return input.key;
}
function maskKey(key) { return `${key.slice(0, 4)}…${key.slice(-4)}`; }
function encryptedShape(record) {
  return record?.v === 1 && ["iv", "tag", "data"].every(field => typeof record[field] === "string"
    && /^[A-Za-z0-9+/]+={0,2}$/.test(record[field]) && Buffer.from(record[field], "base64").toString("base64") === record[field])
    && Buffer.from(record.iv, "base64").length === 12 && Buffer.from(record.tag, "base64").length === 16
    && Buffer.from(record.data, "base64").length >= 20 && Buffer.from(record.data, "base64").length <= 300;
}
function encryptKey(key, secret) {
  validateKeyInput({ key });
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", derivedKey(secret), iv);
  cipher.setAAD(Buffer.from(KEY_PATH));
  const data = Buffer.concat([cipher.update(key, "utf8"), cipher.final()]);
  return { v: 1, iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), data: data.toString("base64") };
}
function decryptKey(record, secret) {
  try {
    if (!encryptedShape(record)) return null;
    const cipher = createDecipheriv("aes-256-gcm", derivedKey(secret), Buffer.from(record.iv, "base64"));
    cipher.setAAD(Buffer.from(KEY_PATH)); cipher.setAuthTag(Buffer.from(record.tag, "base64"));
    const key = Buffer.concat([cipher.update(Buffer.from(record.data, "base64")), cipher.final()]).toString("utf8");
    return validateKeyInput({ key });
  } catch { return null; }
}
function sameKeyRecord(a, b) {
  return !!a && !!b && ["v", "iv", "tag", "data"].every(field => a[field] === b[field]);
}
function nextKeyUsage(previous = {}, now = Date.now()) {
  const calls = (Array.isArray(previous.calls) ? previous.calls : []).filter(stamp => Number.isFinite(stamp) && stamp > now - 600000);
  if (calls.length >= 10) fail("KEY_RATE_LIMITED");
  return { calls: [...calls, now] };
}
async function checkProviderKey(key, model = DEFAULT_MODEL, { fetchImpl = fetch, signal: parentSignal } = {}) {
  const signal = parentSignal ? AbortSignal.any([parentSignal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000);
  try {
    const response = await abortable(fetchImpl(`https://api.openai.com/v1/models/${encodeURIComponent(model)}`, {
      method: "GET", headers: { Authorization: `Bearer ${key}` }, signal,
    }), signal);
    // Provider messages are never read, returned or logged.
    try { if (response.body?.cancel) await abortable(response.body.cancel(), signal); }
    catch (error) { if (signal.aborted) throw error; }
    const diagnostic = { providerStatus: response.status };
    if (response.status === 200) return { ok: true, status: "connected", ...diagnostic };
    if ([401, 403].includes(response.status)) return { ok: false, code: "INVALID_API_KEY", status: "invalid", message: "OpenAI-nøkkelen er ugyldig eller har ikke tilgang.", ...diagnostic };
    if (response.status === 404) return { ok: false, code: "MODEL_UNAVAILABLE", status: "unavailable", message: `Nøkkelen har ikke tilgang til modellen ${model}.`, ...diagnostic };
    return { ok: false, code: "PROVIDER_UNAVAILABLE", status: "unavailable", message: "Kunne ikke kontakte OpenAI. Prøv igjen senere.", ...diagnostic };
  } catch {
    return { ok: false, code: "PROVIDER_UNAVAILABLE", status: "unavailable", message: "Kunne ikke kontakte OpenAI. Prøv igjen senere." };
  }
}
function publicKeyStatus(record, role, model = DEFAULT_MODEL) {
  const configured = !!encryptedShape(record);
  let updatedAt = null;
  try {
    const date = record?.updatedAt?.toDate ? record.updatedAt.toDate() : new Date(record?.updatedAt ?? NaN);
    if (Number.isFinite(date.getTime())) updatedAt = date.toISOString();
  } catch {}
  return { ok: true, configured,
    masked: configured && typeof record.masked === "string" && /^sk-[^\s]…[^\s]{4}$/.test(record.masked) ? record.masked : "",
    status: configured && ["connected", "invalid", "unavailable"].includes(record.status) ? record.status : "unavailable",
    updatedAt, canManage: role === "admin", model };
}
module.exports = { KEY_PATH, DEFAULT_MODEL, validateKeyInput, maskKey, encryptKey, decryptKey, sameKeyRecord, nextKeyUsage, checkProviderKey, publicKeyStatus };
