"use strict";
const https = require("node:https");
const dns = require("node:dns/promises");
const { resolvePublicUrl } = require("./addresses.js");
const { fail, ImportError } = require("./core.js");
function abortable(promise, signal) {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener("abort", abort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
  });
}
function requestPage({ url, address }, signal, get = https.get) {
  // Pin the validated DNS result to the socket; a second DNS lookup would permit
  // rebinding. URL host is retained for Host and TLS hostname verification.
  return new Promise((resolve, reject) => {
    const request = get(url, { signal, agent: false, lookup: (_host, options, callback) => {
      callback(null, options.all ? [address] : address.address, address.family);
    }, headers: { Accept: "text/html", "Accept-Encoding": "identity", "User-Agent": "Middagsapp-RecipeImport/1.0" } }, response => {
      const status = response.statusCode;
      if ([301, 302, 303, 307, 308].includes(status)) {
        response.destroy(); resolve({ status, location: response.headers.location }); return;
      }
      if (status < 200 || status >= 300 || !/^text\/html(?:\s*;|$)/i.test(response.headers["content-type"] || "")) {
        response.destroy(); reject(new ImportError("FETCH_FAILED")); return;
      }
      if (Number(response.headers["content-length"]) > 1500000) { response.destroy(); reject(new ImportError("PAGE_TOO_LARGE")); return; }
      let bytes = 0; const parts = [];
      response.on("data", chunk => {
        bytes += chunk.length;
        if (bytes > 1500000) { response.destroy(); reject(new ImportError("PAGE_TOO_LARGE")); }
        else parts.push(chunk);
      });
      response.on("error", reject);
      response.on("end", () => resolve({ status, html: Buffer.concat(parts).toString("utf8") }));
    });
    request.on("error", reject);
  });
}
async function fetchPage(value, { lookup = dns.lookup, request = requestPage, signal: parentSignal } = {}) {
  const signal = parentSignal ? AbortSignal.any([parentSignal, AbortSignal.timeout(10000)]) : AbortSignal.timeout(10000);
  try {
    let current = value;
    for (let redirects = 0; redirects <= 3; redirects++) {
      const target = await abortable(resolvePublicUrl(current, lookup, signal), signal);
      const response = await abortable(request(target, signal), signal);
      if (response.html !== undefined) return { html: response.html, url: target.url.href };
      if (!response.location || redirects === 3) fail("FETCH_FAILED");
      current = new URL(response.location, target.url).href;
    }
  } catch (error) {
    if (error instanceof ImportError) throw error;
    fail("FETCH_FAILED");
  }
}
module.exports = { abortable, requestPage, fetchPage };
