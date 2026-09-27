// Server-side image checks. The client re-encodes every photo to a resized JPEG
// (which already drops EXIF), but the server never relies on that: it verifies the
// bytes really are a well-formed JPEG and strips metadata segments before the image
// is forwarded to the AI provider. Images are never stored.

const DATA_URL_PREFIX = "data:image/jpeg;base64,";

/** APP1 (EXIF/XMP, incl. GPS), APP13 (IPTC/Photoshop), COM (comments). */
const STRIPPED_MARKERS = new Set([0xe1, 0xed, 0xfe]);

function decodeBase64(b64: string): Uint8Array | null {
  try {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

function encodeBase64(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

/** Returns the JPEG without metadata segments, or null if it is not a well-formed JPEG. */
export function stripJpegMetadata(bytes: Uint8Array): Uint8Array | null {
  const at = (i: number): number => bytes[i] ?? -1;
  if (bytes.length < 4 || at(0) !== 0xff || at(1) !== 0xd8) return null;
  const parts: Uint8Array[] = [bytes.subarray(0, 2)];
  let pos = 2;
  while (pos < bytes.length) {
    if (at(pos) !== 0xff) return null;
    let markerPos = pos + 1;
    while (markerPos < bytes.length && at(markerPos) === 0xff) markerPos++; // fill bytes
    if (markerPos >= bytes.length) return null;
    const marker = at(markerPos);
    if (marker === 0xda) {
      // Start of scan: entropy-coded data follows; keep the remainder verbatim.
      parts.push(bytes.subarray(pos));
      break;
    }
    if (marker === 0xd9) return null; // end of image before any scan data
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      parts.push(bytes.subarray(pos, markerPos + 1));
      pos = markerPos + 1;
      continue;
    }
    if (markerPos + 2 >= bytes.length) return null;
    const length = (at(markerPos + 1) << 8) | at(markerPos + 2);
    const end = markerPos + 1 + length;
    if (length < 2 || end > bytes.length) return null;
    if (!STRIPPED_MARKERS.has(marker)) parts.push(bytes.subarray(pos, end));
    pos = end;
  }
  if (pos >= bytes.length) return null; // never reached scan data
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

/** Validates a JPEG data URL and returns a metadata-free copy, or null if invalid. */
export function sanitizeJpegDataUrl(dataUrl: string): string | null {
  if (!dataUrl.startsWith(DATA_URL_PREFIX)) return null;
  const bytes = decodeBase64(dataUrl.slice(DATA_URL_PREFIX.length));
  if (!bytes || bytes.length < 128) return null;
  const clean = stripJpegMetadata(bytes);
  return clean ? DATA_URL_PREFIX + encodeBase64(clean) : null;
}
