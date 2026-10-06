import assert from "node:assert/strict";
import { imageDimensions, prepareRecipeImage, recipeImagesForSend, IMAGE_ERROR_MESSAGE, IMAGE_LIMIT_MESSAGE } from "../../src/domain/image-prepare.js";

assert.deepEqual(imageDimensions(4000, 3000), { width: 2000, height: 1500 });
assert.deepEqual(imageDimensions(3000, 4000), { width: 1500, height: 2000 });
assert.deepEqual(imageDimensions(400, 300), { width: 400, height: 300 });
assert.throws(() => imageDimensions(0, 100), /Kunne ikke bruke/);

function fixture(sizes, width = 4000, height = 3000) {
  const calls = [], drawings = [];
  let closed = false;
  const decoded = { width, height, close: () => { closed = true; } };
  const canvas = { width: 0, height: 0,
    getContext: () => ({ fillRect() {}, drawImage: (image, _x, _y, w, h) => { assert.equal(image, decoded); drawings.push([w, h]); } }),
    toBlob: (done, type, quality) => {
      calls.push({ type, quality, width: canvas.width, height: canvas.height });
      done({ type, size: sizes.shift(), arrayBuffer: async () => Uint8Array.from([255, 216, 255, 42, 42]).buffer });
    },
  };
  return { calls, drawings, canvas, decoded, get closed() { return closed; }, options: { decode: async () => decoded, createCanvas: () => canvas } };
}
for (const [sizes, qualities, dimensions] of [
  [[1000000], [0.8], [[2000, 1500]]],
  [[1500000, 1300000], [0.8, 0.7], [[2000, 1500]]],
  [[1600000, 1500000, 1400000], [0.8, 0.7, 0.6], [[2000, 1500]]],
  [[1800000, 1700000, 1600000, 1200000], [0.8, 0.7, 0.6, 0.6], [[2000, 1500], [1600, 1200]]],
]) {
  const f = fixture([...sizes]); const result = await prepareRecipeImage({}, f.options);
  assert.deepEqual(result, { mediaType: "image/jpeg", data: "/9j/Kio=" });
  assert.deepEqual(f.calls.map(call => call.quality), qualities); assert.deepEqual(f.drawings, dimensions);
  assert.equal(f.closed, true); assert.equal(f.canvas.width, 0); assert.equal(f.canvas.height, 0);
}
const tooLarge = fixture([2000000, 1900000, 1800000, 1700000]);
await assert.rejects(prepareRecipeImage({}, tooLarge.options), error => error.message === IMAGE_ERROR_MESSAGE);
assert.equal(tooLarge.closed, true);
await assert.rejects(prepareRecipeImage({}, { decode: async () => { throw new Error("unreadable file"); } }), error => error.message === IMAGE_ERROR_MESSAGE);

// Default browser decoding requests EXIF orientation before sizing the canvas.
const oriented = fixture([1000], 3000, 4000);
globalThis.createImageBitmap = async (_file, options) => { assert.deepEqual(options, { imageOrientation: "from-image" }); return oriented.decoded; };
try {
  await prepareRecipeImage({}, { createCanvas: oriented.options.createCanvas });
  assert.deepEqual(oriented.drawings, [[1500, 2000]]);
} finally { delete globalThis.createImageBitmap; }

// Safari fallback uses its oriented image and revokes the temporary blob URL.
const createUrl = URL.createObjectURL, revokeUrl = URL.revokeObjectURL;
let revoked = false;
URL.createObjectURL = () => "blob:local-test"; URL.revokeObjectURL = url => { assert.equal(url, "blob:local-test"); revoked = true; };
globalThis.Image = class { naturalWidth = 3000; naturalHeight = 4000; set src(url) { assert.equal(url, "blob:local-test"); this.onload(); } };
const fallbackCanvas = { getContext: () => ({ fillRect() {}, drawImage: (image, _x, _y, w, h) => {
  assert.ok(image instanceof Image); assert.deepEqual([w, h], [1500, 2000]);
} }), toBlob: done => done(new Blob([Uint8Array.from([255, 216, 255])], { type: "image/jpeg" })) };
try { await prepareRecipeImage({}, { createCanvas: () => fallbackCanvas }); assert.equal(revoked, true); }
finally { URL.createObjectURL = createUrl; URL.revokeObjectURL = revokeUrl; delete globalThis.Image; }

const small = [{ mediaType: "image/jpeg", data: "/9j/Kio=" }];
assert.equal(await recipeImagesForSend(small), small);
await assert.rejects(recipeImagesForSend(Array(5).fill(small[0])), error => error.message === IMAGE_LIMIT_MESSAGE);
const large = Array.from({ length: 4 }, (_, index) => ({ mediaType: "image/jpeg", data: Buffer.alloc(1400000, index).toString("base64") }));
let count = 0;
const reduced = await recipeImagesForSend(large, { prepare: async (file, options) => {
  assert.equal(file.type, "image/jpeg"); assert.equal(options.maxBytes, 1312500);
  assert.equal(new Uint8Array(await file.arrayBuffer())[0], count++);
  return { mediaType: "image/jpeg", data: Buffer.alloc(options.maxBytes).toString("base64") };
} });
assert.equal(reduced.reduce((total, image) => total + image.data.length, 0), 7000000);
assert.equal(count, 4);
await assert.rejects(recipeImagesForSend(large, { prepare: async () => large[0] }), error => error.message === IMAGE_ERROR_MESSAGE);
console.log("image preparation tests ok (canvas, EXIF and size stubs; no network)");
