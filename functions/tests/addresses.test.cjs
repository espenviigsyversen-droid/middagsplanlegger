"use strict";
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { parsePublicUrl, isPublicAddress, resolvePublicUrl } = require("../lib/addresses.js");
const { fetchPage, requestPage } = require("../lib/transport.js");
for (const value of ["http://example.com", "https://127.0.0.1", "https://[::1]", "https://localhost", "https://a.local", "https://a.internal", "https://2130706433", "https://0x7f000001", "https://user:pw@example.com", "https://example.com:8080"]) assert.throws(() => parsePublicUrl(value), e => e.code === "INVALID_URL");
for (const host of ["instagram.com", "m.facebook.com", "fb.watch", "x.tiktok.com", "instagram.com."]) assert.throws(() => parsePublicUrl(`https://${host}/recipe`), e => e.code === "NEEDS_TEXT");
assert.equal(parsePublicUrl("https://instagram.com/post", { allowSocial: true }).hostname, "instagram.com");
for (const ip of ["10.0.0.1", "172.16.0.1", "172.31.255.255", "192.168.1.1", "127.0.0.1", "169.254.1.1", "::1", "fc00::1", "fdff::1", "fe80::1", "::ffff:10.0.0.1", "2002:0a00:0001::1", "2::1"]) assert.equal(isPublicAddress(ip), false, ip);
for (const ip of ["8.8.8.8", "172.32.0.1", "2606:4700:4700::1111"]) assert.equal(isPublicAddress(ip), true, ip);
(async () => {
  await assert.rejects(resolvePublicUrl("https://example.com", async () => [{ address: "8.8.8.8", family: 4 }, { address: "10.1.1.1", family: 4 }]), e => e.code === "INVALID_URL");
  let requests = 0;
  await assert.rejects(fetchPage("https://example.com", { lookup: async host => [{ address: host === "example.com" ? "8.8.8.8" : "192.168.1.1", family: 4 }],
    request: async () => { requests++; return { status: 302, location: "https://private.example.com/" }; } }), e => e.code === "INVALID_URL");
  assert.equal(requests, 1, "Private redirect is rejected before opening a socket");
  const lookedUp = [];
  const fetched = await fetchPage("https://example.com/start", { lookup: async host => { lookedUp.push(host); return [{ address: "8.8.8.8", family: 4 }]; },
    request: async target => target.url.pathname === "/start" ? { status: 302, location: "/finish" } : { status: 200, html: "ok" } });
  assert.equal(fetched.html, "ok"); assert.equal(lookedUp.length, 2);
  requests = 0;
  await assert.rejects(fetchPage("https://example.com", { lookup: async () => [{ address: "8.8.8.8", family: 4 }], request: async () => { requests++; return { status: 302, location: "/again" }; } }), e => e.code === "FETCH_FAILED");
  assert.equal(requests, 4);
  const controller = new AbortController();
  const waiting = fetchPage("https://example.com", { signal: controller.signal, lookup: () => new Promise(() => {}), request: () => assert.fail("DNS timeout must not start request") });
  controller.abort();
  await assert.rejects(waiting, error => error.code === "FETCH_FAILED");
  const target = { url: new URL("https://example.com"), address: { address: "8.8.8.8", family: 4 } };
  function fakeGet({ contentType = "text/html", length, chunks = [] }) {
    return (_url, options, callback) => {
      options.lookup("example.com", {}, (_error, address) => assert.equal(address, "8.8.8.8"));
      const request = new EventEmitter(), response = new EventEmitter();
      response.statusCode = 200; response.headers = { "content-type": contentType, "content-length": length }; response.destroy = () => {};
      queueMicrotask(() => { callback(response); chunks.forEach(chunk => response.emit("data", chunk)); response.emit("end"); });
      return request;
    };
  }
  assert.equal((await requestPage(target, new AbortController().signal, fakeGet({ chunks: [Buffer.from("html")] }))).html, "html");
  await assert.rejects(requestPage(target, new AbortController().signal, fakeGet({ length: 1500001 })), e => e.code === "PAGE_TOO_LARGE");
  await assert.rejects(requestPage(target, new AbortController().signal, fakeGet({ chunks: [Buffer.alloc(1500001)] })), e => e.code === "PAGE_TOO_LARGE");
  await assert.rejects(requestPage(target, new AbortController().signal, fakeGet({ contentType: "application/json" })), e => e.code === "FETCH_FAILED");
  console.log("functions address and fetch tests ok (stubbed DNS and sockets)");
})().catch(error => { console.error(error); process.exitCode = 1; });
