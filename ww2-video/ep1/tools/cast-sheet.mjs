// Dev helper: a contact sheet of every WW2 cast preset. node tools/cast-sheet.mjs build/cast.html
import { writeFileSync, readFileSync } from "node:fs";
const ROOT = new URL("../", import.meta.url), rel = (p) => new URL(p, ROOT);
for (const f of ["assets/lib/toon.js", "assets/lib/ww2kit.js"]) await import(rel(f).href);
const { Toon, WW } = globalThis;
const font = readFileSync(rel("assets/fonts/Fredoka-latin.woff2")).toString("base64");
const names = Object.keys(WW.CAST);
const cells = names.map((n, i) => { const x = 130 + (i % 9) * 205, y = 420 + Math.floor(i / 9) * 420; return Toon.place(WW.CAST[n](), x, y, 0.95) + `<text x="${x}" y="${y + 40}" text-anchor="middle" font-family="Fredoka" font-size="26" fill="#222">${n}</text>`; }).join("");
const props = WW.P.gauge(1700, 1500, 1, 0.5) + WW.P.stamp(1500, 1700, 0.8, "APPEASED") + WW.P.form(300, 1950, 0.6, { wear: 0, place: "Rhineland" }) + WW.P.form(600, 1950, 0.6, { wear: 1, place: "Austria" }) + WW.P.form(900, 1950, 0.6, { wear: 2, place: "Sudetenland" }) + WW.P.form(1200, 1950, 0.6, { wear: 3 }) + WW.P.banner(1600, 2000, 560, "VICTORY IN GREECE", { size: 48 });
writeFileSync(process.argv[2], `<!doctype html><style>@font-face{font-family:Fredoka;src:url(data:font/woff2;base64,${font})}body{margin:0;background:#eee}</style><svg viewBox="0 0 1920 2200" width="1920" height="2200"><style>${Toon.STYLE}</style>${cells}${props}</svg>`);
