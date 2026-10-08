// Builds one vertical (1080×1920) composition per Short from cues + voice timing:
//   shorts/sN.html      full composition (inline SVG shots + caption overlay + audio)
//   index.html          copy of the short being previewed/rendered (node tools/build-shorts.mjs s2)
// Run after tools/tts-cb.py and tools/bed-carve.py. Usage: node tools/build-shorts.mjs [s1|s2|s3]
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { FRAMES, META } from "./cues.mjs";
const ROOT = new URL("../", import.meta.url);
const rel = (p) => new URL(p, ROOT);
for (const f of ["assets/lib/grain.js", "assets/lib/toon.js", "assets/lib/ww2kit.js", "assets/lib/shorts-scenes.js"]) await import(rel(f).href);
const { Toon, ShortScenes: SS } = globalThis;
const timing = JSON.parse(readFileSync(rel("build/timing.json"), "utf8"));
const W = 1080, H = 1920;
const END_TEXT = "Full episode: Everyone Thought Hitler Was Bluffing";
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ---- captions: 2–4 words per card, timed to whisper word stamps (even split as fallback) ----
function captions(lines) {
  const cards = [];
  for (const l of lines) {
    const words = l.text.replace(/"/g, "").split(/\s+/).filter(Boolean);
    let stamps = (l.words || []).length === words.length ? l.words.map((w) => [w[0], w[1]]) : null;
    if (!stamps) { const d = (l.e - l.s) / words.length; stamps = words.map((_, i) => [l.s + i * d, l.s + (i + 1) * d]); }
    let cur = [];
    const flush = () => { if (cur.length) cards.push({ text: cur.map((i) => words[i]).join(" "), s: stamps[cur[0]][0], e: stamps[cur.at(-1)][1], lineEnd: l.e }); cur = []; };
    words.forEach((w, i) => {
      cur.push(i);
      const len = cur.map((j) => words[j]).join(" ").length;
      const nextLen = i + 1 < words.length ? len + 1 + words[i + 1].length : 99;
      if (cur.length >= 4 || /[.?!,…]$/.test(w) && cur.length >= 1 && (cur.length >= 2 || words.length - i <= 1 || /[.?!]$/.test(w)) || (cur.length >= 2 && nextLen > 17)) flush();
    });
    flush();
  }
  // merge stray single-word cards into their neighbour when it stays short
  for (let i = cards.length - 1; i > 0; i--) {
    const a = cards[i - 1], b = cards[i];
    if (b.text.split(" ").length === 1 && a.text.split(" ").length < 3 && (a.text + b.text).length < 16 && a.lineEnd === b.lineEnd && !/[.?!]$/.test(a.text)) { a.text += " " + b.text; a.e = b.e; cards.splice(i, 1); }
  }
  cards.forEach((c, i) => { const n = cards[i + 1]; c.hide = Math.min(n ? n.s : 1e9, c.lineEnd + 0.3); });
  return cards;
}
function captionSvg(c, i) {
  const words = c.text.split(" ");
  let rows = [c.text];
  if (c.text.length > 16 && words.length > 1) { let best = 1, bd = 1e9; for (let k = 1; k < words.length; k++) { const d = Math.abs(words.slice(0, k).join(" ").length - words.slice(k).join(" ").length); if (d < bd) { bd = d; best = k; } } rows = [words.slice(0, best).join(" "), words.slice(best).join(" ")]; }
  const size = Math.max(...rows.map((r) => r.length)) > 15 ? 96 : 112, y0 = 1330 - (rows.length - 1) * size * 0.55;
  return `<g id="cap-${i}" opacity="0" transform="translate(540 ${y0})">` + rows.map((r, k) => `<text y="${k * size * 1.08}" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="${size}" fill="#fffaf0" stroke="#1b1410" stroke-width="22" stroke-linejoin="round" paint-order="stroke fill">${esc(r)}</text>`).join("") + `</g>`;
}

function build(n) {
  const T = timing[n], M = META[n] || {};
  const D = +(T.lines.at(-1).end + M.tail).toFixed(3);
  const L = FRAMES[n].map((l, i) => ({ ...l, s: T.lines[i].start, e: T.lines[i].end, words: T.lines[i].words }));
  const at = (l, frac) => +(l.s + (l.e - l.s) * frac).toFixed(3);
  const shots = [], reveals = [], cams = [], counts = [], talk = [], hud = [], sfx = [];
  const parseAt = (l, a) => { const [id, f] = a.split("@"); return [id, f ? at(l, +f) : l.s]; };
  for (const l of L) {
    if (l.shot) { const [id, t] = parseAt(l, l.shot); shots.push({ id, t: shots.length ? t : 0 }); }
    for (const a of l.at || []) { const [id, t] = parseAt(l, a); reveals.push({ id, t }); }
    for (const [f, s, px, py, d] of l.cam || []) cams.push({ t: at(l, f), s, px, py, d });
    for (const [id, f, from, to, d] of l.count || []) counts.push({ id, t: at(l, f), from, to, d: d || 1.2 });
    if (l.el) talk.push({ id: l.el, s: l.s, e: l.e });
    for (const [f, text] of l.hud || []) hud.push({ t: at(l, f), text });
    for (const [name, off, vol] of l.sfx || []) sfx.push({ name, t: l.s + off, vol: vol ?? 0.5 });
  }
  const tailT = +(T.lines.at(-1).end + 0.2).toFixed(3);
  if (M.endSlam) { shots.push({ id: "end", t: tailT }); reveals.push({ id: M.endSlam, t: tailT }); sfx.push({ name: "boom", t: tailT + 0.25, vol: 0.55 }); }
  if (n === "s3") { reveals.push({ id: "fall-sticker", t: tailT + 0.75 }); sfx.push({ name: "crash", t: tailT + 0.8, vol: 0.4 }); }
  for (const r of reveals) { if (r.id.startsWith("st-")) sfx.push({ name: "slam", t: r.t + 0.22, vol: 0.5 }); else if (r.id.startsWith("pop-")) sfx.push({ name: "pop", t: r.t, vol: 0.35 }); else if (r.id.startsWith("inr-") && !sfx.some((s) => Math.abs(s.t - r.t) < 0.2)) sfx.push({ name: "whoosh", t: r.t, vol: 0.35 }); }
  shots.forEach((s, i) => { s.end = shots[i + 1] ? shots[i + 1].t : D; });
  const caps = captions(L);
  const hudVals = n === "s1" ? ["0", "1", "2", "3", "4", "NO"] : [];
  const CUE = { D, shots, reveals, cams, counts, talk, hud: hud.map((h) => ({ t: h.t, i: hudVals.indexOf(h.text) })), caps: caps.map((c) => ({ s: c.s, h: c.hide })), endT: +(D - 1.5).toFixed(3) };

  const sceneSvg = SS[n]();
  const svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg"><style>${Toon.STYLE}</style>${SS.defs()}<g id="cam">${sceneSvg}</g>${SS.grain()}${SS.vig()}` +
    `<g id="caps">${caps.map(captionSvg).join("")}</g>` +
    `<g id="endtxt" opacity="0"><rect x="70" y="1500" width="940" height="84" rx="42" fill="#1b1410" opacity=".82"/><text x="540" y="1556" text-anchor="middle" font-family="Fredoka" font-weight="600" font-size="38" fill="#fffaf0">${esc(END_TEXT)}</text></g></svg>`;

  // ---- audio ----
  const mp3 = (src, dst, br = "128k") => execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", rel(src).pathname, "-ac", "1", "-b:a", br, rel(dst).pathname]);
  mkdirSync(rel("assets/audio/mp3/"), { recursive: true });
  mp3(`assets/audio/vo/${n}.wav`, `assets/audio/mp3/vo-${n}.mp3`, "128k");
  mp3(`assets/audio/music/bed-${n}.wav`, `assets/audio/mp3/bed-${n}.mp3`, "128k");
  const names = [...new Set(sfx.map((s) => s.name))];
  for (const s of names) if (!existsSync(rel(`assets/audio/mp3/sfx-${s}.mp3`))) mp3(`assets/audio/sfx/${s}.wav`, `assets/audio/mp3/sfx-${s}.mp3`, "96k");
  const dur = Object.fromEntries(names.map((s) => [s, +execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", rel(`assets/audio/mp3/sfx-${s}.mp3`).pathname]).toString().trim()]));
  const sfxTags = sfx.filter((s) => s.t < D - 0.05).sort((a, b) => a.t - b.t).map((s, i) => `      <audio id="sfx-${i}" src="assets/audio/mp3/sfx-${s.name}.mp3" data-start="${Math.max(0, s.t).toFixed(3)}" data-duration="${Math.min(dur[s.name], D - Math.max(0, s.t)).toFixed(3)}" data-track-index="${3 + (i % 2)}" data-volume="${s.vol}"></audio>`).join("\n");
  const engine = readFileSync(rel("assets/lib/shorts-engine.js"), "utf8");
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${W}, height=${H}" />
    <title>WW2 Short ${n}: ${M.name}</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      @font-face { font-family: "Fredoka"; src: url("assets/fonts/Fredoka-latin.woff2") format("woff2"); font-weight: 300 700; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden; background: #1f3550; }
      #root { width: 100%; height: 100%; position: relative; overflow: hidden; }
      #root svg { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${D}" data-width="${W}" data-height="${H}">
      <div id="art" class="clip" data-start="0" data-duration="${D}" data-track-index="0" style="position:absolute;inset:0">
${svg}
      </div>
      <audio id="vo" src="assets/audio/mp3/vo-${n}.mp3" data-start="0" data-duration="${D}" data-track-index="1" data-volume="1"></audio>
      <audio id="music-bed" src="assets/audio/mp3/bed-${n}.mp3" data-start="0" data-duration="${D}" data-track-index="2" data-volume="0.32"></audio>
${sfxTags}
    </div>
    <script>
${engine}
      window.__timelines = window.__timelines || {};
      window.__timelines["main"] = buildShort(gsap, document, ${JSON.stringify(CUE)});
    </script>
  </body>
</html>
`;
  writeFileSync(rel(`${n}.html`), html);
  console.log(`${n}: ${D}s, ${shots.length} shots, ${caps.length} captions, ${sfx.length} sfx`);
  return html;
}
const only = process.argv[2];
for (const n of Object.keys(FRAMES)) if (timing[n] && (!only || only === n)) build(n);
if (only) copyFileSync(rel(`${only}.html`), rel("index.html"));
