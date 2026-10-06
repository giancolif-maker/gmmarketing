// Builds the Act 1 composition from scenes + cues + voice timing:
//   compositions/frames/fNN.html   one sub-composition per frame (inline SVG + engine timeline)
//   index.html                     root: frames in sequence + voice, music bed, SFX
// Run after tools/tts.py. Usage: node tools/build-frames.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { FRAMES } from "./cues.mjs";
const ROOT = new URL("../", import.meta.url);
const rel = (p) => new URL(p, ROOT);
for (const f of ["assets/maps/med.js", "assets/lib/geo.js", "assets/lib/grain.js", "assets/lib/toon.js", "assets/lib/scenes-a.js", "assets/lib/scenes-b.js"]) await import(rel(f).href);
const { Toon, Scenes } = globalThis;
const timing = JSON.parse(readFileSync(rel("build/timing.json"), "utf8"));
const engine = readFileSync(rel("assets/lib/engine.js"), "utf8");
mkdirSync(rel("compositions/frames/"), { recursive: true });

const COUNTS = { "13": { "cnt-0": [0, 90000], "cnt-1": [0, 12000], "cnt-2": [0, 37] }, "20": { "cnt-0": [90000, 20000], "cnt-1": [12000, 6000], "cnt-2": [37, 37] } };
const HIDE_NEXT_END = new Set(["storm"]), HIDE_NEXT_START = new Set(["senate"]);

// Prefix every id (and its references) so frames can share one page.
const prefixIds = (svg, P) => svg
  .replace(/\bid="([^"]+)"/g, (_, id) => `id="${P}${id}"`)
  .replace(/url\(#([^)]+)\)/g, (_, id) => `url(#${P}${id})`)
  .replace(/href="#([^"]+)"/g, (_, id) => `href="#${P}${id}"`);

const sfxTrack = [];
let cursor = 0;
const frameHosts = [];
for (const n of Object.keys(FRAMES).sort()) {
  const lines = FRAMES[n];
  const T = timing[n], D = T.duration, P = `f${n}-`;
  const L = lines.map((l, i) => ({ ...l, s: T.lines[i].start, e: T.lines[i].end }));
  // extra bubbles for lines that need one
  let extra = "";
  L.forEach((l, i) => { if (l.add) { const [x, y, w, tail, size] = l.add; l.b = `a-${i}`; extra += Toon.P.bubble(x, y, w, 100, l.text, { tail, size, id: l.b }); } });
  const reveals = [];
  L.forEach((l, i) => {
    for (const a of l.at || []) {
      const [id, frac] = a.split("@"); const t = frac ? l.s + (l.e - l.s) * parseFloat(frac) : l.s;
      let hideAt = null;
      if (HIDE_NEXT_END.has(id) && L[i + 1]) hideAt = L[i + 1].e;
      if (HIDE_NEXT_START.has(id) && L[i + 1]) hideAt = L[i + 1].s - 0.05;
      reveals.push({ id, t: +t.toFixed(3), hideAt });
      if (id.startsWith("st-") && !(l.sfx || []).length) sfxTrack.push({ name: "slam", t: cursor + t, vol: 0.5 });
    }
    if (l.b) {
      // leave before the next bubble in this spot pops: same speaker next → at the next line; else two lines on
      const nxt = L[i + 1] && L[i + 1].who === l.who ? L[i + 1] : L[i + 2];
      const hideAt = l.keep ? null : nxt ? Math.max(l.e, nxt.s - 0.36) : null;
      reveals.push({ id: l.b, t: Math.max(0, l.s - 0.06), hideAt });
      sfxTrack.push({ name: l.b.startsWith("st-") ? "slam" : "pop", t: cursor + Math.max(0, l.s - 0.06), vol: l.b.startsWith("st-") ? 0.5 : 0.25 });
    }
    for (const [name, off] of l.sfx || []) sfxTrack.push({ name, t: cursor + l.s + off, vol: 0.55 });
  });
  const CUE = { frame: n, D, lines: L.map((l) => ({ s: l.s, e: l.e, el: l.el || null })), reveals, counts: COUNTS[n] || {} };

  const svg = prefixIds(`<svg viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg"><style>${Toon.STYLE}</style><g id="cam">${Scenes[n]()}${extra}</g></svg>`, P);
  const id = `f${n}`;
  writeFileSync(rel(`compositions/frames/${id}.html`), `<!doctype html>
<html><head><meta charset="UTF-8" /></head><body>
<template id="${id}-template">
<style>
@font-face { font-family: "Fredoka"; src: url("assets/fonts/Fredoka-latin.woff2") format("woff2"); font-weight: 300 700; }
#root { position: absolute; inset: 0; overflow: hidden; background: #1f3550; }
#root svg { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
</style>
<div id="root" data-composition-id="${id}" data-width="1920" data-height="1080" data-duration="${D}">
${svg}
</div>
<script>
${engine}
(function () {
  const CUE = ${JSON.stringify(CUE)};
  window.__timelines["${id}"] = buildFrame(gsap, document, "${P}", CUE);
})();
</script>
</template>
</body></html>
`);
  frameHosts.push({ id, start: +cursor.toFixed(3), D });
  cursor += D;
}
const TOTAL = +cursor.toFixed(3);

// ---- audio: mp3 copies to keep the repo light ----
const mp3 = (src, dst, br = "128k") => { if (!existsSync(rel(dst)) || process.argv.includes("--reencode")) execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", rel(src).pathname, "-ac", "1", "-b:a", br, rel(dst).pathname]); };
mkdirSync(rel("assets/audio/mp3/"), { recursive: true });
for (const { id } of frameHosts) mp3(`assets/audio/vo/frame-${id.slice(1)}.wav`, `assets/audio/mp3/vo-${id}.mp3`, "96k");
mp3("assets/audio/music/bed.wav", "assets/audio/mp3/bed.mp3", "128k");
const sfxNames = [...new Set(sfxTrack.map((s) => s.name))];
for (const s of sfxNames) mp3(`assets/audio/sfx/${s}.wav`, `assets/audio/mp3/sfx-${s}.mp3`, "96k");
const sfxDur = Object.fromEntries(sfxNames.map((s) => [s, +execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", rel(`assets/audio/mp3/sfx-${s}.mp3`).pathname]).toString().trim()]));

const hosts = frameHosts.map((f, i) => `      <div id="${f.id}" data-composition-id="${f.id}" data-composition-src="compositions/frames/${f.id}.html" data-start="${f.start}" data-duration="${f.D}" data-track-index="0" data-width="1920" data-height="1080"></div>`).join("\n");
const vo = frameHosts.map((f) => `      <audio id="vo-${f.id}" src="assets/audio/mp3/vo-${f.id}.mp3" data-start="${f.start}" data-duration="${f.D}" data-track-index="1" data-volume="1"></audio>`).join("\n");
const sfx = sfxTrack.sort((a, b) => a.t - b.t).map((s, i) => `      <audio id="sfx-${i}" src="assets/audio/mp3/sfx-${s.name}.mp3" data-start="${s.t.toFixed(3)}" data-duration="${Math.min(sfxDur[s.name], TOTAL - s.t).toFixed(3)}" data-track-index="${3 + (i % 2)}" data-volume="${s.vol}"></audio>`).join("\n");

writeFileSync(rel("index.html"), `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <title>The Second Punic War — Part 1: Some Guy With Elephants</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { margin: 0; width: 1920px; height: 1080px; overflow: hidden; background: #1f3550; }
      #root { width: 100%; height: 100%; position: relative; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${TOTAL}" data-width="1920" data-height="1080">
${hosts}
${vo}
      <audio id="music-bed" src="assets/audio/mp3/bed.mp3" data-start="0" data-duration="${TOTAL}" data-track-index="2" data-volume="0.2"></audio>
${sfx}
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
`);
console.log(`built ${frameHosts.length} frames, ${TOTAL}s (${(TOTAL / 60).toFixed(2)} min), ${sfxTrack.length} sfx`);
