import { describe, expect, it } from "vitest";
import { sanitizeJpegDataUrl, stripJpegMetadata } from "./image-validation";

const seg = (marker: number, payload: number[]) => {
  const len = payload.length + 2;
  return [0xff, marker, len >> 8, len & 0xff, ...payload];
};

// SOI, APP0 (JFIF), APP1 (EXIF with fake GPS text), COM, DQT, SOS + data, EOI
const gps = [...new TextEncoder().encode("Exif\0\0GPS 40.7128N 74.0060W")];
const jpeg = new Uint8Array([
  0xff,
  0xd8,
  ...seg(0xe0, [0x4a, 0x46, 0x49, 0x46, 0x00]),
  ...seg(0xe1, gps),
  ...seg(0xfe, [...new TextEncoder().encode("secret comment")]),
  ...seg(0xdb, new Array(65).fill(1)),
  ...seg(0xda, [0x01, 0x02, 0x03]),
  ...new Array(200).fill(0x55),
  0xff,
  0xd9,
]);

const toDataUrl = (bytes: Uint8Array) =>
  "data:image/jpeg;base64," + Buffer.from(bytes).toString("base64");

describe("stripJpegMetadata", () => {
  it("removes EXIF/APP1 and comments but keeps image data", () => {
    const out = stripJpegMetadata(jpeg)!;
    const text = Buffer.from(out).toString("latin1");
    expect(text).not.toContain("GPS");
    expect(text).not.toContain("secret comment");
    expect(text).toContain("JFIF");
    expect(out.length).toBe(jpeg.length - (gps.length + 4) - (14 + 4));
    expect(out[out.length - 1]).toBe(0xd9);
  });
  it("rejects non-JPEG and truncated data", () => {
    expect(stripJpegMetadata(new TextEncoder().encode("hello this is not a jpeg"))).toBeNull();
    expect(stripJpegMetadata(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBeNull();
    expect(stripJpegMetadata(jpeg.subarray(0, 30))).toBeNull();
  });
});

describe("sanitizeJpegDataUrl", () => {
  it("returns a clean data URL for a valid JPEG", () => {
    const out = sanitizeJpegDataUrl(toDataUrl(jpeg));
    expect(out).toMatch(/^data:image\/jpeg;base64,/);
    expect(Buffer.from(out!.split(",")[1]!, "base64").toString("latin1")).not.toContain("GPS");
  });
  it("rejects other types and garbage", () => {
    expect(sanitizeJpegDataUrl("data:image/png;base64,iVBORw0KGgo=")).toBeNull();
    expect(sanitizeJpegDataUrl(toDataUrl(new TextEncoder().encode("x".repeat(500))))).toBeNull();
    expect(sanitizeJpegDataUrl("data:image/jpeg;base64,!!!notbase64")).toBeNull();
  });
});
