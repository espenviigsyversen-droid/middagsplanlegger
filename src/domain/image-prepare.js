export const IMAGE_ERROR_MESSAGE = "Kunne ikke bruke bildet. Prøv et annet bilde eller et skjermbilde.";
export const IMAGE_LIMIT_MESSAGE = "Du kan bruke inntil fire bilder per oppskrift.";

export function imageDimensions(width, height, longestSide = 2000) {
  if (!(width > 0 && height > 0 && Number.isFinite(width) && Number.isFinite(height))) throw new Error(IMAGE_ERROR_MESSAGE);
  const scale = Math.min(1, longestSide / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

async function decodeImage(file) {
  if (globalThis.createImageBitmap) {
    try { return await createImageBitmap(file, { imageOrientation: "from-image" }); } catch {}
  }
  // Browser image decoding also applies EXIF orientation; useful for Safari fallback.
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve; image.onerror = reject; image.src = url;
    });
    return { width: image.naturalWidth, height: image.naturalHeight, image };
  } finally { URL.revokeObjectURL(url); }
}

const jpegBlob = (canvas, quality) => new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", quality));
async function base64(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer()), chunks = [];
  for (let offset = 0; offset < bytes.length; offset += 8192) chunks.push(String.fromCharCode(...bytes.subarray(offset, offset + 8192)));
  return btoa(chunks.join(""));
}

export async function prepareRecipeImage(file, { decode = decodeImage, createCanvas = () => document.createElement("canvas"), maxBytes = 1400000 } = {}) {
  let decoded, canvas;
  try {
    decoded = await decode(file);
    canvas = createCanvas();
    const context = canvas.getContext("2d");
    if (!context) throw new Error();
    const draw = longestSide => {
      Object.assign(canvas, imageDimensions(decoded.width, decoded.height, longestSide));
      // Transparent screenshots get a white background when converted to JPEG.
      context.fillStyle = "#fff"; context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(decoded.image || decoded, 0, 0, canvas.width, canvas.height);
    };
    draw(2000);
    let blob;
    for (const quality of [0.8, 0.7, 0.6]) {
      blob = await jpegBlob(canvas, quality);
      if (!blob || blob.type !== "image/jpeg") throw new Error();
      if (blob.size <= maxBytes) break;
    }
    if (blob.size > maxBytes) { draw(1600); blob = await jpegBlob(canvas, 0.6); }
    if (!blob || blob.type !== "image/jpeg" || blob.size > maxBytes) throw new Error();
    return { mediaType: "image/jpeg", data: await base64(blob) };
  } catch { throw new Error(IMAGE_ERROR_MESSAGE); }
  finally {
    decoded?.close?.();
    if (canvas) { canvas.width = 0; canvas.height = 0; }
  }
}

export async function recipeImagesForSend(images, { prepare = prepareRecipeImage } = {}) {
  if (images.length > 4) throw new Error(IMAGE_LIMIT_MESSAGE);
  if (images.reduce((total, image) => total + image.data.length, 0) <= 7000000) return images;
  // Four JPEGs of 1.4 MB can exceed the separate base64 sum limit. Recompress in memory.
  const maxBytes = Math.floor(7000000 / (images.length * 4)) * 3;
  const result = [];
  for (const image of images) {
    const bytes = Uint8Array.from(atob(image.data), char => char.charCodeAt(0));
    result.push(await prepare(new Blob([bytes], { type: "image/jpeg" }), { maxBytes }));
  }
  if (result.reduce((total, image) => total + image.data.length, 0) > 7000000) throw new Error(IMAGE_ERROR_MESSAGE);
  return result;
}
