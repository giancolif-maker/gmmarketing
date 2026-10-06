// Builds storyboard.html (the sketch sheet) from STORYBOARD.md + assets/lib/scenes-*.js.
// Static output: every cell is an inline SVG of the frame's key moment. No scripts.
// Usage: node tools/build-storyboard.mjs [--version N] [--single NN out.html]
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const ROOT = new URL("../", import.meta.url);
const rel = (p) => new URL(p, ROOT);
for (const f of ["assets/maps/med.js", "assets/lib/geo.js", "assets/lib/toon.js", "assets/lib/scenes-a.js", "assets/lib/scenes-b.js"])
  if (existsSync(rel(f))) await import(rel(f).href);
const { Toon, Scenes } = globalThis;

const args = process.argv.slice(2);
const version = args.includes("--version") ? args[args.indexOf("--version") + 1] : "1";
const md = readFileSync(rel("STORYBOARD.md"), "utf8");
const frames = md.split(/^## Frame /m).slice(1).map((blk) => {
  const [head, ...rest] = blk.split("\n"), m = head.match(/^(\d+) — (.+)$/);
  const meta = Object.fromEntries([...rest.join("\n").matchAll(/^- ([^:\n]+?): (.+)$/gm)].map((x) => [x[1].split(" ")[0], x[2]]));
  return { n: m[1].padStart(2, "0"), title: m[2].trim(), ...meta };
});
const fontFace = `@font-face{font-family:Fredoka;src:url(data:font/woff2;base64,${readFileSync(rel("assets/fonts/Fredoka-latin.woff2")).toString("base64")}) format("woff2");font-weight:300 700}`;
const svg = (n) => `<svg viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg"><style>${Toon.STYLE}</style>${Scenes[n] ? Scenes[n]() : `<rect width="1920" height="1080" fill="#ddd"/><text x="960" y="560" text-anchor="middle" font-size="80" font-family="Fredoka">outline</text>`}</svg>`;

if (args[0] === "--single") {
  const [, n, out] = args;
  writeFileSync(out, `<!doctype html><meta charset="utf-8"><style>${fontFace}body{margin:0}svg{display:block;width:1920px;height:1080px}</style>${svg(n)}`);
  process.exit(0);
}

let t = 0;
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
const cells = frames.map((f) => {
  const d = parseFloat(f.duration) || 0, a = t; t += d;
  return `<figure class="cell" id="frame-${f.n}"><div class="art">${svg(f.n)}</div>
    <figcaption><div class="row"><b>${f.n} · ${f.title.toUpperCase()}</b><span>${fmt(a)}–${fmt(t)} · ${d}s</span></div>
    <p><b>On screen.</b> ${f.scene || ""}</p><p><b>Moves.</b> ${f.motion || ""}</p><span class="chip">in: ${f.transition_in || "cut"}</span></figcaption></figure>`;
}).join("\n");

const C = Toon.C;
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Storyboard — The Second Punic War, Act 1 (v${version})</title>
<style>${fontFace}
:root{--ink:${C.ink};--paper:${C.paper};--rome:${C.rome};--carth:${C.carth}}
*{box-sizing:border-box}body{margin:0;background:#241c17;color:var(--paper);font-family:Fredoka,system-ui,sans-serif}
header{padding:40px 48px 24px;display:flex;flex-wrap:wrap;gap:16px 32px;align-items:flex-end;justify-content:space-between}
h1{margin:0;font-size:44px;line-height:1}h1 small{font-size:20px;color:#c9b38f;font-weight:500;display:block;margin-top:8px}
.tag{background:var(--carth);padding:8px 14px;border-radius:999px;font-weight:600}
.act{margin:8px 48px 20px;padding:10px 18px;background:var(--rome);border-radius:12px;font-weight:700;font-size:22px}
.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:28px;padding:0 48px 48px}
@media (max-width:1100px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media (max-width:700px){.grid{grid-template-columns:1fr;padding:0 16px 32px}header,.act{margin-left:16px;margin-right:16px;padding-left:0}}
.cell{margin:0;background:#2f2620;border-radius:16px;overflow:hidden;border:3px solid #120d0a}
.art{aspect-ratio:16/9;background:#111}.art svg{width:100%;height:100%;display:block}
figcaption{padding:14px 16px 18px;font-size:15px;line-height:1.4;color:#eadbc0}
.row{display:flex;justify-content:space-between;gap:8px;font-size:15px;margin-bottom:8px}.row span{color:#c9b38f}
figcaption p{margin:4px 0}.chip{display:inline-block;margin-top:8px;background:#46392f;padding:3px 10px;border-radius:999px;font-size:13px}
.tokens{padding:20px}.sw{display:inline-flex;align-items:center;gap:8px;margin:0 14px 10px 0;font-size:14px}.sw i{width:28px;height:28px;border-radius:6px;border:2px solid #000}
</style></head><body>
<header><h1>The Second Punic War — Act 1 storyboard <small>“Some Guy With Elephants” · sketch pass v${version} · key moment of each frame, no motion yet</small></h1>
<span class="tag">1920×1080 · ~${fmt(t)} · ${frames.length} frames</span></header>
<div class="act">ACT 1 — Some Guy With Elephants</div>
<div class="grid">${cells}
<figure class="cell tokens"><div class="row"><b>TOKENS</b><span>frame look</span></div>
${[["ink", C.ink], ["paper", C.paper], ["sea", C.sea], ["land", C.land], ["Rome", C.rome], ["Carthage", C.carth], ["gold", C.gold], ["skin", C.skin]].map(([n, c]) => `<span class="sw"><i style="background:${c}"></i>${n}</span>`).join("")}
<p>Type: Fredoka 500–700 (OFL, embedded). Ink outline 6px on everything. Dialogue = white text with ink stroke, or white speech bubbles.</p>
<p><b>Bans:</b> no copied OverSimplified art, characters or lines; no gradient text; no slideshow beats (every frame gets a gag in motion).</p></figure>
</div></body></html>`;
writeFileSync(rel("storyboard.html"), html);
console.log("storyboard.html:", frames.length, "frames,", fmt(t), "built scenes:", Object.keys(Scenes || {}).length);
