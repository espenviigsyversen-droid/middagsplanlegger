"use strict";
const { requireMember, fail, ImportError, messages, safeErrorFields } = require("./core.js");
const { validateKeyInput, maskKey, encryptKey, decryptKey, publicKeyStatus } = require("./keys.js");
const { abortable } = require("./transport.js");
const { selectModel } = require("./models.js");
async function runKeyAction(action, request, deps) {
  const started = Date.now(), signal = AbortSignal.timeout(28000);
  let model;
  let code = "OK", providerStatus, internalError = {};
  try {
    let member;
    await abortable(requireMember(request.auth, async email => { member = await deps.getMember(email); return !!member; }), signal);
    const role = member.role, email = request.auth.token.email.toLowerCase();
    if (action !== "status" && role !== "admin") fail("permission-denied");
    const key = action === "save" ? validateKeyInput(request.data) : null;
    if (action !== "save" && request.data !== undefined && request.data !== null
      && (typeof request.data !== "object" || Array.isArray(request.data) || Object.keys(request.data).length)) fail("invalid-argument");
    model = deps.getModel ? await abortable(deps.getModel(), signal) : deps.model || selectModel(null);
    if (action === "status") return publicKeyStatus(await abortable(deps.getKey(), signal), role, model);
    if (action === "delete") {
      await abortable(deps.deleteKey(), signal);
      return publicKeyStatus(null, role, model);
    }
    const record = action === "test" ? await abortable(deps.getKey(), signal) : null;
    const clearKey = key || decryptKey(record, deps.encryptionSecret());
    if (!clearKey) {
      if (record) { try { await abortable(deps.updateKeyStatus(record, "invalid"), signal); } catch {} }
      fail("AI_NOT_CONFIGURED");
    }
    await abortable(deps.consumeKeyUsage(), signal);
    const check = await abortable(deps.checkKey(clearKey, model, { signal }), signal);
    providerStatus = check.providerStatus;
    if (action === "test") {
      await abortable(deps.updateKeyStatus(record, check.status), signal);
      code = check.ok ? "OK" : check.code;
      const status = publicKeyStatus(await abortable(deps.getKey(), signal), role, model);
      return { ...status, ...(!check.ok ? { message: check.message, code: check.code } : {}) };
    }
    if (!check.ok) { code = check.code; return { ok: false, code: check.code, message: check.message }; }
    const stamp = deps.serverTimestamp();
    await abortable(deps.saveKey({ ...encryptKey(clearKey, deps.encryptionSecret()), masked: maskKey(clearKey),
      status: "connected", updatedAt: stamp, updatedBy: email, checkedAt: stamp }), signal);
    return publicKeyStatus(await abortable(deps.getKey(), signal), role, model);
  } catch (error) {
    code = error instanceof ImportError ? error.code : "INTERNAL";
    if (code === "INTERNAL") internalError = safeErrorFields(error);
    if (["unauthenticated", "permission-denied", "invalid-argument"].includes(code)) throw error;
    return { ok: false, code: code === "INTERNAL" ? "PROVIDER_UNAVAILABLE" : code,
      message: messages[code] || "Kunne ikke kontrollere OpenAI-tilkoblingen. Prøv igjen senere." };
  } finally {
    try { await deps.log?.({ functionName: `aiKey${action[0].toUpperCase()}${action.slice(1)}`, code,
      durationMs: Date.now() - started, ...(Number.isInteger(providerStatus) ? { providerStatus } : {}), ...internalError }); } catch {}
  }
}
module.exports = { runKeyAction };
