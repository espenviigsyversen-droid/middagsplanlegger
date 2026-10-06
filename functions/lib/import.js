"use strict";
const { validateInput, requireMember, normalizeRecipe, messages, ImportError, fail, safeErrorFields } = require("./core.js");
const { parsePublicUrl } = require("./addresses.js");
const { extractPage } = require("./extract.js");
const { abortable } = require("./transport.js");
async function runImport(request, deps) {
  const started = Date.now();
  const signal = AbortSignal.timeout(115000);
  let code = "OK", providerStatus, providerCode, imageCount, loaded, source, reason, internalError = {};
  try {
    await abortable(requireMember(request.auth, deps.memberExists), signal);
    const input = validateInput(request.data);
    if (input.mode === "image") { source = "image"; imageCount = input.images.length; }
    loaded = await abortable(deps.loadKey(), signal);
    if (!loaded?.key) fail("AI_NOT_CONFIGURED");
    const usage = await abortable(deps.consumeUsage(), signal);
    if (input.mode === "text") source = "pasted-text";
    let text = input.mode === "image" ? input.images : input.text, recipeUrl = input.sourceUrl || "";
    if (recipeUrl) recipeUrl = parsePublicUrl(recipeUrl, { allowSocial: true, allowHttp: true }).href;
    if (input.mode === "url") {
      const target = parsePublicUrl(input.url);
      const page = await deps.fetchPage(target.href, { signal });
      const extracted = extractPage(page.html);
      source = extracted.source; text = extracted.input; recipeUrl = input.url;
    }
    const response = await deps.interpretRecipe(text, input, { signal, key: loaded.key,
      onDiagnostic: value => {
        if (Number.isInteger(value.providerStatus)) providerStatus = value.providerStatus;
        if (typeof value.providerCode === "string" && /^[a-z0-9_]{1,40}$/.test(value.providerCode)
          && value.providerCode.trim() === value.providerCode) providerCode = value.providerCode;
      } });
    const result = normalizeRecipe(response, { categories: input.categories, units: input.units, recipeUrl });
    if (input.mode === "image") result.warnings.push("Tolket fra bilde. Kontroller mengder og ingredienser ekstra nøye.");
    return { ok: true, ...result, source, remainingToday: 40 - usage.dailyCount };
  } catch (error) {
    const responseCode = error instanceof ImportError ? error.code : "AI_UNAVAILABLE";
    code = error instanceof ImportError ? error.code : "INTERNAL";
    if (code === "AI_INVALID_RESPONSE" && ["incomplete", "no_text", "no_json", "shape"].includes(error.reason)) reason = error.reason;
    if (code === "INTERNAL") internalError = safeErrorFields(error);
    if (loaded && [401, 403].includes(providerStatus)) {
      try { await abortable(deps.markKeyInvalid(loaded.record), signal); } catch {}
    }
    if (["unauthenticated", "permission-denied", "invalid-argument"].includes(responseCode)) throw error;
    return { ok: false, code: responseCode, message: messages[responseCode] };
  } finally {
    try {
      await deps.log?.({ functionName: "importRecipe", code, durationMs: Date.now() - started,
        ...(source ? { source } : {}), ...(reason ? { reason } : {}),
        ...(imageCount ? { imageCount } : {}), ...(providerCode ? { providerCode } : {}),
        ...(Number.isInteger(providerStatus) ? { providerStatus } : {}), ...internalError });
    } catch {
      // Logging is best effort and must never override the import result.
    }
  }
}
module.exports = { runImport };
