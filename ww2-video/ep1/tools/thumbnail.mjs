// YouTube thumbnail (1920×1080 SVG → PNG via tools/shot.mjs): node tools/thumbnail.mjs build/thumb.html
import { writeFileSync, readFileSync } from "node:fs";
const ROOT = new URL("../", import.meta.url), rel = (p) => new URL(p, ROOT);
for (const f of ["assets/maps/eu.js", "assets/lib/geo.js", "assets/lib/grain.js", "assets/lib/toon.js", "assets/lib/ww2kit.js", "assets/lib/scenes-1.js"]) await import(rel(f).href);
const { C, place, STYLE } = globalThis.Toon, { CAST, P, K } = globalThis.WW, H = globalThis.WWH;
const ink = C.ink;
const font = readFileSync(rel("assets/fonts/Fredoka-latin.woff2")).toString("base64");
const out = process.argv[2] || "build/thumb.html";

const title = (x, y, txt, size, fill, rot = -3) => `<g transform="translate(${x} ${y}) rotate(${rot})"><text text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="${size}" fill="${ink}" stroke="${ink}" stroke-width="${size * 0.22}" stroke-linejoin="round" x="10" y="12">${txt}</text><text text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="${size}" fill="${fill}" stroke="${ink}" stroke-width="${size * 0.12}" stroke-linejoin="round" paint-order="stroke">${txt}</text></g>`;

// Europe going dark from Germany outward; a hard vignette keeps the eye on Hitler and the form
const map = H.map("europe", { de: "#151515", at: "#1d1d1d", cz: "#1d1d1d", pl: "#262626", fr: "#3a3a3a", benl: "#2e2e2e", dk: "#2e2e2e", no: "#3a3a3a", it: "#2f2b27", yu: "#3a3a3a", gr: "#444", hu: "#333", ro: "#3c3c3c", ussr: "#5a3b33", uk: "#8a7b57" }, { sea: "#16202d", land: "#6d6655" });
const form = `<g transform="translate(1440 700) rotate(6) scale(1.3)">${P.form(0, 0, 1, { place: "Everything", no: true })}</g>`;
// big red circle around the ticked NO
const circle = `<g transform="translate(1440 700) rotate(6) scale(1.3)"><ellipse cx="40" cy="4" rx="78" ry="36" fill="none" stroke="${K.red}" stroke-width="9" transform="rotate(-4 40 4)"/></g>`;

const svg = `<svg viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg"><style>${STYLE}</style>
${map}
<defs><radialGradient id="v" cx=".5" cy=".6" r=".75"><stop offset=".35" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".75"/></radialGradient></defs>
<rect width="1920" height="1080" fill="url(#v)"/>
${place(CAST.hitler({ pose: "shrug", mouth: "grin", brows: "smug" }), 640, 1180, 2.7)}
${form}
${circle}
${title(960, 150, "HE KEPT GETTING", 124, "#fffaf0", -2)}
${title(990, 290, "AWAY WITH IT", 140, "#ffcc33", -2)}
</svg>`;
writeFileSync(rel(out), `<!doctype html><meta charset="utf-8"><style>@font-face{font-family:Fredoka;src:url(data:font/woff2;base64,${font});font-weight:300 700}html,body{margin:0;background:#000}svg{display:block;width:1920px;height:1080px}</style>${svg}`);
console.log("wrote", out);
