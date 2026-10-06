"use strict";
const { requireMember, normalizeRecipe, ImportError, fail, messages, safeErrorFields } = require("./core.js");
const { DEFAULT_MODEL, decryptKey, publicKeyStatus } = require("./keys.js");
const { abortable } = require("./transport.js");
const CONFIG_PATH = "families/familien/private/aiConfig";
const validModel = value => typeof value === "string" && /^[a-z0-9][a-z0-9._-]{2,60}$/.test(value) && value.trim() === value;
const selectModel = (record, env = process.env) => validModel(record?.model) ? record.model : env.OPENAI_RECIPE_MODEL || DEFAULT_MODEL;
const modelForMode = (model, mode, env = process.env) => mode === "image" && env.OPENAI_RECIPE_IMAGE_MODEL ? env.OPENAI_RECIPE_IMAGE_MODEL : model;
const TEST_RECIPE = `Prøvemiddag med potet og gulrot
Porsjoner: 4
600 g potet
300 g gulrot
2 ss olje
1 ts salt
2 dl vann
1. Skrell potet og gulrot og skjær dem i små biter.
2. Varm oljen i en gryte, tilsett grønnsakene og rør i to minutter.
3. Tilsett vann og salt. Kok under lokk til grønnsakene er møre.`;
const TEST_SETUP = { mode: "text", categories: [], units: ["g", "ss", "ts", "dl"] };
async function runModelSave(request, deps) {
  const started = Date.now(), signal = AbortSignal.timeout(88000);
  let model, record, code = "OK", providerStatus, providerCode, reason, internalError = {};
  const diagnostic = value => {
    if (Number.isInteger(value.providerStatus)) providerStatus = value.providerStatus;
    if (typeof value.providerCode === "string" && /^[a-z0-9_]{1,40}$/.test(value.providerCode) && value.providerCode.trim() === value.providerCode) providerCode = value.providerCode;
  };
  try {
    let member;
    await abortable(requireMember(request.auth, async email => { member = await deps.getMember(email); return !!member; }), signal);
    if (member.role !== "admin") fail("permission-denied");
    const data = request.data;
    if (!data || typeof data !== "object" || Array.isArray(data) || Object.keys(data).some(key => key !== "model") || !validModel(data.model)) fail("invalid-argument");
    model = data.model;
    record = await abortable(deps.getKey(), signal);
    const key = decryptKey(record, deps.encryptionSecret());
    if (!key) fail("AI_NOT_CONFIGURED");
    await abortable(deps.consumeKeyUsage(), signal);
    const check = await abortable(deps.checkKey(key, model, { signal }), signal);
    diagnostic(check);
    if (!check.ok) {
      code = check.code;
      if ([401, 403].includes(providerStatus)) await abortable(deps.updateKeyStatus(record, "invalid"), signal);
      return { ok: false, code, message: check.message };
    }
    let result;
    try {
      const response = await abortable(deps.interpretRecipe(TEST_RECIPE, TEST_SETUP, { key, model, signal, onDiagnostic: diagnostic }), signal);
      result = normalizeRecipe(response, TEST_SETUP).recipe;
    } catch (error) {
      if (error instanceof ImportError && ["NOT_A_RECIPE", "AI_INVALID_RESPONSE"].includes(error.code)) fail("MODEL_TEST_FAILED", error.reason);
      throw error;
    }
    if (result.ingredients.length < 4 || result.ingredients.filter(item => item.amount).length < 3 || result.steps.length < 2) fail("MODEL_TEST_FAILED");
    signal.throwIfAborted();
    await abortable(deps.saveConfig({ model, updatedAt: deps.serverTimestamp(), updatedBy: request.auth.token.email.toLowerCase() }), signal);
    return publicKeyStatus(record, "admin", model);
  } catch (error) {
    code = error instanceof ImportError ? error.code : "INTERNAL";
    if (code === "INTERNAL") internalError = safeErrorFields(error);
    if (["incomplete", "no_text", "no_json", "shape"].includes(error?.reason)) reason = error.reason;
    if (record && [401, 403].includes(providerStatus)) {
      try { await abortable(deps.updateKeyStatus(record, "invalid"), signal); } catch {}
      code = "INVALID_API_KEY";
    } else if (providerStatus === 404 || providerCode === "model_not_found") code = "MODEL_UNAVAILABLE";
    if (["unauthenticated", "permission-denied", "invalid-argument"].includes(code)) throw error;
    return { ok: false, code: code === "INTERNAL" ? "PROVIDER_UNAVAILABLE" : code,
      message: code === "INVALID_API_KEY" ? "OpenAI-nøkkelen er ugyldig eller har ikke tilgang."
        : code === "MODEL_UNAVAILABLE" ? `Nøkkelen har ikke tilgang til modellen ${model}.`
          : messages[code] || "Kunne ikke kontrollere OpenAI-tilkoblingen. Prøv igjen senere." };
  } finally {
    try { await deps.log?.({ functionName: "aiModelSave", code, durationMs: Date.now() - started,
      ...(validModel(model) ? { model } : {}), ...(Number.isInteger(providerStatus) ? { providerStatus } : {}),
      ...(providerCode ? { providerCode } : {}), ...(reason ? { reason } : {}), ...(code === "INTERNAL" ? internalError : {}) }); } catch {}
  }
}
module.exports = { CONFIG_PATH, validModel, selectModel, modelForMode, TEST_RECIPE, TEST_SETUP, runModelSave };
