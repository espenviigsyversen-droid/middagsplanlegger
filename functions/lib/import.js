"use strict";
const { validateInput, requireMember, normalizeRecipe, messages, ImportError, fail, safeErrorFields } = require("./core.js");
const { parsePublicUrl } = require("./addresses.js");
const { extractPage } = require("./extract.js");
const { abortable } = require("./transport.js");
async function runImport(request, deps) {
  const started = Date.now();
  const signal = AbortSignal.timeout(58000);
  let code = "OK", providerStatus, loaded, internalError = {};
  try {
    await abortable(requireMember(request.auth, deps.memberExists), signal);
    const input = validateInput(request.data);
    loaded = await abortable(deps.loadKey(), signal);
    if (!loaded?.key) fail("AI_NOT_CONFIGURED");
    const usage = await abortable(deps.consumeUsage(), signal);
    let source = "pasted-text", text = input.text, recipeUrl = input.sourceUrl || "";
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
      } });
    const result = normalizeRecipe(response, { categories: input.categories, units: input.units, recipeUrl });
    return { ok: true, ...result, source, remainingToday: 40 - usage.dailyCount };
  } catch (error) {
    const responseCode = error instanceof ImportError ? error.code : "AI_UNAVAILABLE";
    code = error instanceof ImportError ? error.code : "INTERNAL";
    if (code === "INTERNAL") internalError = safeErrorFields(error);
    if (loaded && [401, 403].includes(providerStatus)) {
      try { await abortable(deps.markKeyInvalid(loaded.record), signal); } catch {}
    }
    if (["unauthenticated", "permission-denied", "invalid-argument"].includes(responseCode)) throw error;
    return { ok: false, code: responseCode, message: messages[responseCode] };
  } finally {
    try {
      await deps.log?.({ functionName: "importRecipe", code, durationMs: Date.now() - started,
        ...(Number.isInteger(providerStatus) ? { providerStatus } : {}), ...internalError });
    } catch {
      // Logging is best effort and must never override the import result.
    }
  }
}
module.exports = { runImport };
