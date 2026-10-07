// Dev helper: contact sheet of scene layouts. node tools/sheet.mjs out.html [--overlays] 01 02 ...
// By default hides full-screen overlays (cut-*, fade-* panels, title, endcard); --overlays shows only those.
import { writeFileSync, readFileSync } from "node:fs";
const ROOT = new URL("../", import.meta.url), rel = (p) => new URL(p, ROOT);
for (const f of ["assets/maps/eu.js", "assets/lib/geo.js", "assets/lib/grain.js", "assets/lib/toon.js", "assets/lib/ww2kit.js", "assets/lib/scenes-1.js"]) await import(rel(f).href);
let [out, ...ns] = process.argv.slice(2); const ov = ns[0] === "--overlays"; if (ov) ns = ns.slice(1);
if (!ns.length) ns = Object.keys(Scenes).filter((k) => !k.includes("b")).sort();
const font = readFileSync(rel("assets/fonts/Fredoka-latin.woff2")).toString("base64");
const hideCss = ov ? "" : `[id^="cut-"],[id^="fade-"],#title,#endcard{display:none}`;
const cell = (n) => `<div><b>${n}</b><svg viewBox="0 0 1920 1080"><style>${Toon.STYLE}${hideCss}</style>${Scenes[n]()}</svg></div>`;
writeFileSync(out, `<!doctype html><style>@font-face{font-family:Fredoka;src:url(data:font/woff2;base64,${font})}body{margin:0;background:#222;color:#fff;font:14px sans-serif;display:grid;grid-template-columns:repeat(4,480px);gap:4px}svg{width:480px;height:270px;display:block}</style>${ns.map(cell).join("")}`);
