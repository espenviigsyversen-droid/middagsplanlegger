"use strict";
const { isIP } = require("node:net");
const { fail } = require("./core.js");
function parsePublicUrl(value, { allowSocial = false, allowHttp = false } = {}) {
  let url;
  try { url = new URL(value); } catch { fail("INVALID_URL"); }
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!(url.protocol === "https:" || (allowHttp && url.protocol === "http:")) || url.username || url.password || (url.port && url.port !== "443")
    || !host || host.includes(":") || isIP(host) || !host.includes(".") || host === "localhost"
    || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) fail("INVALID_URL");
  if (!allowSocial && ["instagram.com", "facebook.com", "fb.watch", "tiktok.com"].some(domain => host === domain || host.endsWith(`.${domain}`))) fail("NEEDS_TEXT");
  url.hostname = host;
  url.hash = "";
  return url;
}
function isPublicAddress(address) {
  if (isIP(address) === 4) {
    const [a, b] = address.split(".").map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168) || (a === 169 && b === 254) || (a === 100 && b >= 64 && b <= 127)
      || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19)));
  }
  if (isIP(address) !== 6) return false;
  // Only global unicast IPv6; excludes mapped IPv4, loopback, ULA, link-local,
  // multicast and transition ranges that may tunnel to internal IPv4.
  const lower = address.toLowerCase();
  return /^[23][0-9a-f]{3}:/.test(lower) && !lower.startsWith("2002:")
    && !/^2001:(?:0*:|db8:)/.test(lower);
}
async function resolvePublicUrl(value, lookup, signal) {
  const url = parsePublicUrl(value);
  signal?.throwIfAborted();
  const addresses = await lookup(url.hostname, { all: true, verbatim: true });
  signal?.throwIfAborted();
  if (!addresses.length || addresses.some(record => !isPublicAddress(record.address))) fail("INVALID_URL");
  return { url, address: addresses[0] };
}
module.exports = { parsePublicUrl, isPublicAddress, resolvePublicUrl };
