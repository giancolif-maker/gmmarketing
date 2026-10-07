// YouTube thumbnail (1920×1080 SVG → PNG via tools/shot.mjs): node tools/thumbnail.mjs build/thumb.html
import { writeFileSync, readFileSync } from "node:fs";
const ROOT = new URL("../", import.meta.url), rel = (p) => new URL(p, ROOT);
for (const f of ["assets/maps/med.js", "assets/lib/geo.js", "assets/lib/grain.js", "assets/lib/toon.js"]) await import(rel(f).href);
const { C, place, CAST, elephant, STYLE } = globalThis.Toon;
const font = readFileSync(rel("assets/fonts/Fredoka-latin.woff2")).toString("base64");
const out = process.argv[2] || "build/thumb.html";

// Split background: Carthage purple (left) vs Rome red (right), sunburst rays, snowy Alps on the horizon
const rays = (cx, cy, col, n = 18) => Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2, b = ((i + 0.5) / n) * Math.PI * 2; return `<path d="M${cx} ${cy} L${cx + Math.cos(a) * 2400} ${cy + Math.sin(a) * 2400} L${cx + Math.cos(b) * 2400} ${cy + Math.sin(b) * 2400}Z" fill="${col}"/>`; }).join("");
const peaks = [[-80, 1080, 260, 560, 600], [380, 1080, 760, 470, 1140], [1000, 1080, 1360, 600, 1720], [1500, 1080, 1800, 520, 2100]]
  .map(([x0, y0, px, py, x1]) => `<path d="M${x0} ${y0} L${px} ${py} L${x1} ${y0}Z" fill="#8fa3bf" stroke="${C.ink}" stroke-width="8"/><path d="M${px - (px - x0) * 0.28} ${py + (y0 - py) * 0.28} L${px} ${py} L${px + (x1 - px) * 0.28} ${py + (y0 - py) * 0.28} l-40 30 l-40 -24 l-40 30Z" fill="#fff" stroke="${C.ink}" stroke-width="6" stroke-linejoin="round"/>`).join("");
const title = (x, y, txt, size, fill, rot = -4) => `<g transform="translate(${x} ${y}) rotate(${rot})"><text text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="${size}" fill="${C.ink}" stroke="${C.ink}" stroke-width="${size * 0.22}" stroke-linejoin="round" x="10" y="12">${txt}</text><text text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="${size}" fill="${fill}" stroke="${C.ink}" stroke-width="${size * 0.12}" stroke-linejoin="round" paint-order="stroke">${txt}</text></g>`;
const sweat = (x, y, s = 1) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 0 C-14 22 -18 34 -18 42 a18 18 0 0 0 36 0 C18 34 14 22 0 0Z" fill="#9fd6f5" stroke="${C.ink}" stroke-width="5"/>`;

const svg = `<svg viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg"><style>${STYLE}</style>
<defs><clipPath id="L"><path d="M0 0 H1120 L860 1080 H0Z"/></clipPath><clipPath id="R"><path d="M1120 0 H1920 V1080 H860Z"/></clipPath></defs>
<g clip-path="url(#L)"><rect width="1920" height="1080" fill="${C.carth}"/>${rays(560, 620, C.carthDk)}</g>
<g clip-path="url(#R)"><rect width="1920" height="1080" fill="${C.rome}"/>${rays(1500, 620, C.romeDk)}</g>
<path d="M1120 0 L860 1080" stroke="${C.ink}" stroke-width="16"/>
<g opacity=".95">${peaks}</g>
${place(elephant({ blanket: C.carth, brows: "angry" }), 600, 1110, 2.35)}
${place(CAST.hannibal({ pose: "point", brows: "angry", mouth: "grin" }), 600, 800, 1.75)}
${place(CAST.flaccus({ pose: "armsUp", brows: "worried", mouth: "open", eyes: "wide" }), 1560, 1140, 2.9, { flip: true })}
${sweat(1840, 360, 1.4)}${sweat(1760, 250, 1.0)}${sweat(1880, 520, 0.9)}
${title(960, 175, "HANNIBAL", 190, "#fffaf0")}
${title(1250, 420, "?!", 200, C.gold, -10)}
<g transform="translate(250 905) rotate(-6)"><rect x="-170" y="-58" width="340" height="116" rx="20" fill="${C.ink}" transform="translate(10 12)"/><rect x="-170" y="-58" width="340" height="116" rx="20" fill="${C.gold}" stroke="${C.ink}" stroke-width="8"/><text y="26" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="76" fill="${C.ink}">37 🐘</text></g>
</svg>`;
writeFileSync(out, `<!doctype html><meta charset="utf-8"><style>@font-face{font-family:Fredoka;src:url(data:font/woff2;base64,${font});font-weight:300 700}html,body{margin:0;background:#000}svg{display:block;width:1920px;height:1080px}</style>${svg}`);
console.log("wrote", out);
