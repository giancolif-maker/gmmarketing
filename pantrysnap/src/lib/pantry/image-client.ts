// Browser-side photo preparation: decode (honouring EXIF orientation), downscale,
// and re-encode as JPEG. Re-encoding through a canvas drops all metadata (GPS,
// camera info), and keeps uploads small enough for mobile networks.
import { LIMITS } from "./schemas";

export const ACCEPTED_IMAGE_TYPES = "image/jpeg,image/png,image/webp,image/heic,image/heif";

/** Refuse to even decode files bigger than this (protects low-memory phones). */
const MAX_INPUT_BYTES = 30 * 1024 * 1024;
const MAX_EDGE = 1280;
const MIN_EDGE = 32;
const TARGET_CHARS = Math.floor(LIMITS.maxImageDataUrlChars * 0.9);

export class ImagePrepError extends Error {
  constructor(readonly code: "INVALID_IMAGE" | "IMAGE_TOO_LARGE") {
    super(code);
  }
}

type Decoded = { source: CanvasImageSource; width: number; height: number; close: () => void };

async function decode(file: File): Promise<Decoded> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        close: () => bitmap.close(),
      };
    } catch {
      // fall through to <img>, which some browsers (e.g. Safari for HEIC) decode more broadly
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => {} };
  } catch {
    throw new ImagePrepError("INVALID_IMAGE");
  } finally {
    // The decoded <img> keeps its pixels; the object URL is no longer needed.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

function toDataUrl(canvas: HTMLCanvasElement, quality: number): string {
  return canvas.toDataURL("image/jpeg", quality);
}

export async function prepareImage(file: File): Promise<string> {
  if (file.size > MAX_INPUT_BYTES) throw new ImagePrepError("IMAGE_TOO_LARGE");
  if (file.type && !file.type.startsWith("image/")) throw new ImagePrepError("INVALID_IMAGE");

  const decoded = await decode(file);
  try {
    if (decoded.width < MIN_EDGE || decoded.height < MIN_EDGE) {
      throw new ImagePrepError("INVALID_IMAGE");
    }
    let edge = MAX_EDGE;
    for (let pass = 0; pass < 3; pass++) {
      const scale = Math.min(1, edge / Math.max(decoded.width, decoded.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(decoded.width * scale));
      canvas.height = Math.max(1, Math.round(decoded.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new ImagePrepError("INVALID_IMAGE");
      ctx.fillStyle = "#fff"; // flatten transparency
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(decoded.source, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.82, 0.7, 0.55]) {
        const url = toDataUrl(canvas, quality);
        if (!url.startsWith("data:image/jpeg")) throw new ImagePrepError("INVALID_IMAGE");
        if (url.length <= TARGET_CHARS) return url;
      }
      edge = Math.round(edge * 0.75);
    }
    throw new ImagePrepError("IMAGE_TOO_LARGE");
  } finally {
    decoded.close();
  }
}
