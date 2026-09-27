// Prepares real phone photos the same way the app does in the browser
// (src/lib/pantry/image-client.ts): honour EXIF orientation, fit within 1280px,
// flatten transparency, re-encode as JPEG (which drops EXIF/GPS), shrink until it
// fits the server's per-image limit. The server-side sanitiser is then applied too.
import fs from "node:fs";
import sharp from "sharp";
import { sanitizeJpegDataUrl } from "../src/lib/pantry/image-validation";
import { LIMITS } from "../src/lib/pantry/schemas";

const TARGET_CHARS = Math.floor(LIMITS.maxImageDataUrlChars * 0.9);

export type PreparedImage = {
  dataUrl: string;
  width: number;
  height: number;
  bytesIn: number;
  bytesOut: number;
};

export async function prepareEvalImage(file: string): Promise<PreparedImage> {
  await sharp(file, { failOn: "error" }).metadata(); // throws early on unreadable files
  let edge = 1280;
  for (let pass = 0; pass < 3; pass++) {
    for (const quality of [82, 70, 55]) {
      const { data, info } = await sharp(file)
        .rotate()
        .resize({ width: edge, height: edge, fit: "inside", withoutEnlargement: true })
        .flatten({ background: "#ffffff" })
        .jpeg({ quality })
        .toBuffer({ resolveWithObject: true });
      const raw = `data:image/jpeg;base64,${data.toString("base64")}`;
      if (raw.length > TARGET_CHARS) continue;
      const dataUrl = sanitizeJpegDataUrl(raw);
      if (!dataUrl) throw new Error("re-encoded image failed server validation");
      return {
        dataUrl,
        width: info.width,
        height: info.height,
        bytesIn: fs.statSync(file).size,
        bytesOut: data.length,
      };
    }
    edge = Math.round(edge * 0.75);
  }
  throw new Error("could not shrink image under the upload limit");
}
