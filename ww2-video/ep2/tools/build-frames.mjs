// Builds the Episode 2 composition from scenes + cues + voice timing:
//   compositions/frames/fNN.html   one sub-composition per frame (inline SVG + engine timeline)
//   index.html                     root: frames in sequence + voice, music bed, SFX
// Run after tools/tts.py. Usage: node tools/build-frames.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { FRAMES, META } from "./cues.mjs";
const ROOT = new URL("../", import.meta.url);
const rel = (p) => new URL(p, ROOT);
for (const f of ["assets/maps/eu.js", "assets/lib/geo.js", "assets/lib/grain.js", "assets/lib/toon.js", "assets/lib/ww2kit.js", "assets/lib/scenes-1.js"
]) await import(rel(f).href);
const { Toon, Scenes } = globalThis;
// Scene-baked speech bubbles: a bubble no cue line uses is dropped, one a line uses shows that
// line's text (or its bt), and picture-in-picture bubbles (-pipb) always give way to cue bubbles.
const rawBubble = Toon.P.bubble;
let BUSED = new Set(), BOVR = {};
Toon.P.bubble = (x, y, w, h, text, o = {}) => {
  const id = o.id || "";
  if (id.endsWith("-pipb")) return "";
  if (/^b/.test(id) && !BUSED.has(id)) return "";
  if (BOVR[id] != null) text = BOVR[id];
  return rawBubble(x, y, w, h, text, o);
};
const shown = (l) => l.bt ?? l.text;
const tAt = (l, f) => +(typeof f === "string" && f.startsWith("+") ? l.e + parseFloat(f.slice(1)) : l.s + (l.e - l.s) * parseFloat(f)).toFixed(3);
// Minor characters who only appear as a portrait in a circle (cue line: pip: [id, preset, x, y])
const PIPS = {
  dennis: () => Toon.CAST.romanSenator({ hat: "hair", hairCol: "#5b4a3a", brows: "sad", mouth: "flat" }),
  flaccus: () => Toon.CAST.flaccus({ pose: "shrug", brows: "smug", mouth: "smirk" }),
};
const pipSvg = (id, preset, x, y, label) => `<g id="${id}"><circle cx="${x}" cy="${y}" r="100" fill="#efe6d2" stroke="${Toon.C.ink}" stroke-width="8"/><clipPath id="${id}-c"><circle cx="${x}" cy="${y}" r="94"/></clipPath><g clip-path="url(#${id}-c)">${Toon.place((globalThis.WW?.CAST[preset] || PIPS[preset])(), x, y + 215, 0.88)}</g>${label ? Toon.sticker(x, y + 112, label, { size: 26, rot: -2, bg: Toon.C.ink, pad: 14 }) : ""}</g>`;
// The Consul Welcome Pack: a full-screen office that replays for each new consul (META[n].welcome)
const welcomeSvg = ({ consul, sign = 0 }) => {
  const { C, CAST, place, sticker } = Toon;
  const who = consul === "pair"
    ? place(CAST.romanSenator({ brows: "worried", mouth: "open" }), 1300, 1010, 1.05, { id: "w-consul", flip: true }) + place(CAST.romanSenator({ hat: "hair", hairCol: "#3a2a1a", brows: "worried", mouth: "flat" }), 1600, 1010, 1.05, { id: "w-consul2", flip: true })
    : place(CAST[consul]({ brows: "worried", mouth: "open" }), 1420, 1010, 1.1, { id: "w-consul", flip: true });
  return `<g id="r-welcome" data-layout-allow-overlap="true"><rect width="1920" height="1080" fill="#e9dcc0"/><rect y="760" width="1920" height="320" fill="#c9a86a"/>` +
    [260, 960, 1660].map((x) => `<rect x="${x - 40}" y="80" width="80" height="600" fill="#f4ecd8" stroke="${C.ink}" stroke-width="5"/>`).join("") +
    `<g transform="translate(960 150) rotate(-1.5)"><rect x="-520" y="-56" width="1040" height="112" rx="16" fill="${C.rome}" stroke="${C.ink}" stroke-width="7"/><text y="26" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="64" fill="#fffaf0">WELCOME TO CONSUL!</text></g>` +
    `<g transform="translate(1560 360) rotate(2)"><rect x="-170" y="-80" width="340" height="160" rx="10" fill="#fffaf0" stroke="${C.ink}" stroke-width="5"/><text y="-28" text-anchor="middle" font-family="Fredoka" font-weight="600" font-size="26" fill="${C.ink}">DAYS WITHOUT LOSING</text><text y="2" text-anchor="middle" font-family="Fredoka" font-weight="600" font-size="26" fill="${C.ink}">A CONSUL:</text><text y="66" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="60" fill="${C.rome}">${sign}</text></g>` +
    place(CAST.flaccus({ pose: "shrug", brows: "happy", mouth: "smile" }), 520, 1010, 1.1, { id: "w-flaccus" }) +
    `<g><rect x="760" y="700" width="420" height="34" rx="6" fill="${C.wood}" stroke="${C.ink}" stroke-width="5"/><rect x="790" y="734" width="24" height="200" fill="${C.wood}" stroke="${C.ink}" stroke-width="4"/><rect x="1126" y="734" width="24" height="200" fill="${C.wood}" stroke="${C.ink}" stroke-width="4"/>` +
    `<path d="M820 700 l20 -90 h120 l20 90Z" fill="#d8a85a" stroke="${C.ink}" stroke-width="5"/><path d="M830 610 q70 -70 140 0" stroke="${C.ink}" stroke-width="6" fill="none"/><circle cx="870" cy="600" r="16" fill="#c23b2e" stroke="${C.ink}" stroke-width="4"/><circle cx="910" cy="596" r="16" fill="#e2b33c" stroke="${C.ink}" stroke-width="4"/>` +
    `<rect x="1020" y="610" width="110" height="90" rx="10" fill="#fffaf0" stroke="${C.ink}" stroke-width="5"/><path d="M1130 630 q34 0 34 22 t-34 24" stroke="${C.ink}" stroke-width="7" fill="none"/><text x="1075" y="644" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="16" fill="${C.ink}">WORLD'S</text><text x="1075" y="664" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="16" fill="${C.ink}">BEST</text><text x="1075" y="684" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="16" fill="${C.rome}">CONSUL</text>${sign ? `<path d="M1040 620 l14 24 l-8 18 l16 22" stroke="${C.ink}" stroke-width="3" fill="none"/>` : ""}</g>` +
    who + `</g>`;
};
const timing = JSON.parse(readFileSync(rel("build/timing.json"), "utf8"));
const engine = readFileSync(rel("assets/lib/engine.js"), "utf8");
mkdirSync(rel("compositions/frames/"), { recursive: true });

const COUNTS = {};
const HIDE_NEXT_END = new Set(), HIDE_NEXT_START = new Set();

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
  BUSED = new Set(L.filter((l) => l.b).map((l) => l.b)); BOVR = {};
  for (const l of L) if (l.b) BOVR[l.b] = shown(l);
  L.forEach((l, i) => {
    if (l.stk) { const [x, y, text, size = 46, rot = -3, bg] = l.stk; const sid = `st-k${i}`; extra += Toon.sticker(x, y, text, { size, rot, id: sid, ...(bg ? { bg } : {}) }); l.at = [...(l.at || []), `${sid}@${l.stkAt ?? 0}`]; }
    if (l.pip) { const [pid, preset, x, y, label] = l.pip; extra += pipSvg(pid, preset, x, y, label); l.at = [...(l.at || []), pid]; }
  });
  L.forEach((l, i) => { if (l.add) { const [x, y, w, tail, size] = l.add; l.b = `a-${i}`; extra += Toon.P.bubble(x, y, w, 100, shown(l), { tail, size, id: l.b }); } });
  const wel = (META || {})[n]?.welcome;
  if (wel) extra = welcomeSvg(wel) + extra;
  const reveals = [], moves = [], counters = [], cams = [];
  // frame-level timed reveals and sfx (absolute seconds), e.g. a no-narration montage
  for (const [id, t, hideAt] of (META || {})[n]?.reveals || []) reveals.push({ id, t: t < 0 ? D + t : t, hideAt: hideAt ?? null });
  for (const [name, t, vol] of (META || {})[n]?.sfx || []) sfxTrack.push({ name, t: cursor + (t < 0 ? D + t : t), vol: vol ?? 0.55 });
  for (const c of (META || {})[n]?.cams || []) cams.push(c);
  const intro = (META || {})[n]?.intro;
  if (intro) reveals.push({ id: intro, t: 0, hideAt: (META[n].lead || 3) - 0.35 });
  if (wel) reveals.push({ id: "r-welcome", t: intro ? (META[n].lead || 3) - 0.4 : 0, hideAt: L[wel.until].s - 0.25 });
  L.forEach((l, i) => {
    for (const a of l.at || []) {
      const [id, frac] = a.split("@"); const t = frac ? tAt(l, frac) : l.s;
      let hideAt = null;
      if (HIDE_NEXT_END.has(id) && L[i + 1]) hideAt = L[i + 1].e;
      if (HIDE_NEXT_START.has(id) && L[i + 1]) hideAt = L[i + 1].s - 0.05;
      reveals.push({ id, t: +t.toFixed(3), hideAt });
      if (id.startsWith("st-") && !(l.sfx || []).length) sfxTrack.push({ name: "slam", t: cursor + t, vol: 0.5 });
    }
    if (l.b) {
      // leave before the next bubble in this spot pops: same speaker next → at the next line; else two lines on
      const nxt = L[i + 1] && L[i + 1].who === l.who ? L[i + 1] : L[i + 2];
      let hideAt = l.keep ? null : nxt ? Math.max(l.e, nxt.s - 0.36) : null;
      if (wel && i < wel.until) hideAt = Math.min(hideAt ?? 1e9, L[wel.until].s - 0.25);
      reveals.push({ id: l.b, t: Math.max(0, l.s - 0.06), hideAt });
      sfxTrack.push({ name: l.b.startsWith("st-") ? "slam" : "pop", t: cursor + Math.max(0, l.s - 0.06), vol: l.b.startsWith("st-") ? 0.5 : 0.25 });
    }
    for (const [name, off] of l.sfx || []) sfxTrack.push({ name, t: cursor + (typeof off === "string" ? tAt(l, off) : l.s + off), vol: 0.55 });
    const at = (frac) => tAt(l, frac);
    for (const [id, frac, v, d] of l.move || []) moves.push({ id, t: at(frac), d: d ?? 1, ...v });
    for (const [id, frac, from, to] of l.count || []) counters.push({ id, t: at(frac), from, to });
    for (const id of l.hide || []) moves.push({ id, t: l.s, d: 0.25, o: 0 });
    for (const [frac, sc, px, py, d] of l.cam || []) cams.push({ t: at(frac), s: sc, px, py, d: d ?? 0.8 });
  });
  // full-screen cut-aways: bubbles, name stickers and portraits from the shot underneath leave when one opens or closes
  const sceneSvg = Scenes[n]();
  const overlays = new Set([...sceneSvg.matchAll(/<g id="((?:cut|fade)-[^"]+)" data-layout-allow-overlap/g)].map((m) => m[1]));
  const edges = [...reveals.filter((r) => overlays.has(r.id)).map((r) => r.t), ...moves.filter((m) => overlays.has(m.id) && m.o === 0).map((m) => m.t)];
  const opens = reveals.filter((r) => overlays.has(r.id)).map((r) => r.t);
  for (const r of reveals) {
    // the place/date tag belongs to the shot underneath: it leaves when a cutaway opens over it
    const list = /^(a-|b-|st-k|pip-)/.test(r.id) ? edges : r.id === "st-date" ? opens : null;
    if (!list) continue;
    for (const T of list) if (T - r.t > 0.3 && (r.hideAt == null || r.hideAt > T)) r.hideAt = T;
  }
  cams.sort((a, b) => a.t - b.t);
  const CUE = { cams, drop: (META || {})[n]?.drop || [], frame: n, D, lines: L.map((l) => ({ s: l.s, e: l.e, el: l.el || null })), reveals, counts: COUNTS[n] || {}, moves, counters };

  const svg = prefixIds(`<svg viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg"><style>${Toon.STYLE}</style><g id="cam">${sceneSvg}${extra}</g></svg>`, P);
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
    <title>World War II — The Year Hitler Started Losing</title>
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
