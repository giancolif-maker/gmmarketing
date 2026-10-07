// YouTube thumbnail (1920×1080 SVG → 1280×720 JPG): node tools/thumbnail.mjs build/thumb.html, then shot + ffmpeg scale.
// Hitler at a map, three giant arrows MIDWAY / AFRICA / STALINGRAD, Klaus's fuel gauge on 0, text "3 BATTLES".
import { writeFileSync, readFileSync } from "node:fs";
const ROOT = new URL("../", import.meta.url), rel = (p) => new URL(p, ROOT);
for (const f of ["assets/maps/eu.js", "assets/lib/geo.js", "assets/lib/grain.js", "assets/lib/toon.js", "assets/lib/ww2kit.js", "assets/lib/scenes-1.js"]) await import(rel(f).href);
const { C, place, STYLE } = globalThis.Toon, { CAST, P, K } = globalThis.WW, H = globalThis.WWH;
const ink = C.ink;
const font = readFileSync(rel("assets/fonts/Fredoka-latin.woff2")).toString("base64");
const out = process.argv[2] || "build/thumb.html";

const title = (x, y, txt, size, fill, rot = -3) => `<g transform="translate(${x} ${y}) rotate(${rot})"><text text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="${size}" fill="${ink}" stroke="${ink}" stroke-width="${size * 0.22}" stroke-linejoin="round" x="10" y="12">${txt}</text><text text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="${size}" fill="${fill}" stroke="${ink}" stroke-width="${size * 0.12}" stroke-linejoin="round" paint-order="stroke">${txt}</text></g>`;
// a fat arrow slamming INTO the Axis, with its label on the shaft
const bigArrow = (x1, y1, x2, y2, label, col) => {
  const a = Math.atan2(y2 - y1, x2 - x1), deg = (a * 180) / Math.PI, L = Math.hypot(x2 - x1, y2 - y1);
  return `<g transform="translate(${x1} ${y1}) rotate(${deg})"><path d="M0 -50 H${L - 120} V-110 L${L} 0 L${L - 120} 110 V50 H0Z" fill="${col}" stroke="${ink}" stroke-width="12" stroke-linejoin="round"/><text x="${(L - 120) / 2}" y="22" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="62" fill="#fffaf0" stroke="${ink}" stroke-width="8" paint-order="stroke" transform="rotate(${Math.abs(deg) > 90 ? 180 : 0} ${(L - 120) / 2} 0)">${label}</text></g>`;
};
const map = H.map("world", { de: "#2e3036", it: "#2e3036", fr: "#2e3036", pl: "#2e3036", jp: "#5a2a26", ly: "#2e3036" }, { sea: "#1d3047", land: "#b8a47a" });
const svg = `<svg viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg"><style>${STYLE}</style>
<g transform="translate(-260 -60) scale(1.35)">${map}</g>
<defs><radialGradient id="v" cx=".5" cy=".55" r=".75"><stop offset=".4" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".7"/></radialGradient></defs>
<rect width="1920" height="1080" fill="url(#v)"/>
${bigArrow(1900, 540, 1060, 470, "MIDWAY", "#3d6fa3")}
${bigArrow(1260, 1100, 960, 690, "AFRICA", "#c9a24a")}
${bigArrow(1860, 150, 1000, 300, "STALINGRAD", K.red)}
${place(CAST.hitler({ pose: "shrug", mouth: "shout", brows: "furious", sweat: true }), 560, 1240, 2.9)}
${P.gauge(1700, 880, 2.1, 0, { label: "0" })}
${title(560, 210, "3 BATTLES", 190, "#ffcc33", -4)}
</svg>`;
writeFileSync(rel(out), `<!doctype html><meta charset="utf-8"><style>@font-face{font-family:Fredoka;src:url(data:font/woff2;base64,${font});font-weight:300 700}html,body{margin:0;background:#000}svg{display:block;width:1920px;height:1080px}</style>${svg}`);
console.log("wrote", out);
