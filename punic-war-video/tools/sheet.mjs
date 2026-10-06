// Dev helper: render a contact sheet of scene layouts (all layers visible except act cards). node tools/sheet.mjs out.html 23 24 ...
import { writeFileSync, readFileSync } from "node:fs";
const ROOT = new URL("../", import.meta.url), rel = (p) => new URL(p, ROOT);
for (const f of ["assets/maps/med.js", "assets/lib/geo.js", "assets/lib/grain.js", "assets/lib/toon.js", "assets/lib/scenes-a.js", "assets/lib/scenes-b.js", "assets/lib/scenes-c.js", "assets/lib/scenes-d.js", "assets/lib/scenes-e.js"]) { try { await import(rel(f).href); } catch (e) { if (!String(e).includes("Cannot find")) throw e; } }
const [out, ...ns] = process.argv.slice(2);
const font = readFileSync(rel("assets/fonts/Fredoka-latin.woff2")).toString("base64");
const cell = (n) => `<div><b>${n}</b><svg viewBox="0 0 1920 1080"><style>${Toon.STYLE}</style>${Scenes[n]().replace(/<g id="act"[\s\S]*?<\/g><\/g>/, "")}</svg></div>`;
writeFileSync(out, `<!doctype html><style>@font-face{font-family:Fredoka;src:url(data:font/woff2;base64,${font})}body{margin:0;background:#222;color:#fff;font:14px sans-serif;display:grid;grid-template-columns:repeat(3,640px);gap:6px}svg{width:640px;height:360px;display:block}</style>${ns.map(cell).join("")}`);
