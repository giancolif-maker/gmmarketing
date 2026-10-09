// Episode 2 cast: one parametric upper-body rig + a face/costume builder, so every character
// shares the same ink style, blinks, lip sync and gestures. Depends on lib/core.js.
"use strict";

// ---------- rig ----------
// P: pose + performance (x, y, s, flip, lean, sq, hr, aR/aL [shoulder, elbow] angles, props, o/shape/bl/brow/... for the face)
// C: character spec from mk()
function person(P, C) {
  const { x, y, s = 1, flip = false, lean = 0, sq = 0, hr = 0, aR = [20, 30], aL = [15, 25], propR = "", propL = "", legs = C.legs ?? true, walk = 0, sit = false } = P;
  let g = `<g transform="translate(${f1(x)} ${f1(y)}) scale(${flip ? -s : s} ${s})">`;
  if (legs && !sit) {
    const sw = Math.sin(walk) * 26;
    g += `<path d="M-20,30 L${f1(-26 + sw)},250 M22,30 L${f1(26 - sw)},250" stroke="${INK}" stroke-width="50" stroke-linecap="round"/><path d="M-20,30 L${f1(-26 + sw)},250 M22,30 L${f1(26 - sw)},250" stroke="${C.trousers}" stroke-width="40" stroke-linecap="round"/>`;
    g += `<path d="M${f1(-62 + sw)},262 q0,-24 34,-24 q30,0 34,24Z M${f1(10 - sw)},262 q0,-24 34,-24 q30,0 34,24Z" fill="#1d1712" stroke="${INK}" stroke-width="4"/>`;
  }
  if (sit) g += limb(0, 20, 88, 100, -88, 140, C.trousers, 44).svg;
  g += `<g transform="rotate(${f1(lean)}) scale(${f1((1 - sq * .06) * C.width)} ${f1(1 + sq * .08)})">`;
  const L = limb(-6, -206, aL[0], 92, aL[1], 86, C.coatD, 30);
  g += L.svg + (propL ? `<g transform="translate(${f1(L.hx)} ${f1(L.hy)}) rotate(${f1(-(aL[0] + aL[1]) + 90)})">${propL}</g>` : "") + hand(L.hx, L.hy, C.skin, 14);
  g += S(C.belly ? "M-60,40 C-82,-60 -70,-190 -42,-226 Q0,-250 46,-230 C80,-180 86,-60 64,40Z" : "M-52,40 C-64,-80 -58,-180 -42,-224 Q0,-248 44,-228 C60,-170 66,-80 56,40Z", C.coat);
  g += `<path d="M-48,-120 C-52,-40 -48,0 -44,40 L-22,40 C-28,-30 -30,-110 -24,-200Z" fill="url(#hatch)" opacity=".45"/>`;
  g += C.front;
  g += `<g transform="translate(12 -238) rotate(${f1(hr)})">` + S("M-10,6 L-8,-16 L16,-16 L18,6Z", C.skin, 4) + C.head(P) + `</g>`;
  const R = limb(30, -214, aR[0], 96, aR[1], 88, C.coat, 32);
  g += R.svg + (propR ? `<g transform="translate(${f1(R.hx)} ${f1(R.hy)}) rotate(${f1(-(aR[0] + aR[1]) + 90)})">${propR}</g>` : "");
  g += hand(R.hx, R.hy, C.skin, 15, P.finger, P.fingerAng || 0);
  return g + `</g></g>`;
}

// ---------- face/costume builder ----------
const FACES = {
  long: "M-34,-20 C-44,-60 -44,-112 -6,-124 C30,-130 52,-104 50,-60 C49,-36 44,-14 30,-4 C18,4 0,4 -12,-2 C-22,-6 -30,-12 -34,-20Z",
  round: "M-44,-30 C-56,-80 -40,-128 0,-130 C44,-132 62,-90 56,-46 C52,-14 34,8 4,8 C-24,8 -40,-6 -44,-30Z",
  square: "M-36,-14 C-44,-60 -42,-112 -4,-122 C34,-126 54,-100 52,-56 C52,-30 50,-6 40,4 C24,12 -4,12 -20,6 C-30,2 -34,-6 -36,-14Z",
  jaw: "M-38,-30 C-46,-90 -30,-128 4,-130 C40,-130 56,-96 56,-60 C58,-30 56,0 44,12 C26,24 -10,22 -26,10 C-36,2 -38,-14 -38,-30Z",
};
const HAIR = {
  none: "", bald: (c) => `<ellipse cx="-4" cy="-118" rx="20" ry="7" fill="#fff" opacity=".4"/>`,
  swoop: (c) => S("M-40,-74 C-48,-110 -20,-134 14,-130 C40,-128 52,-112 50,-96 C40,-104 30,-104 22,-100 C30,-90 30,-80 20,-70 C14,-84 0,-96 -18,-100 C-28,-92 -34,-82 -40,-74Z", c, 4),
  back: (c) => S("M-42,-70 C-50,-118 -10,-140 24,-132 C46,-126 54,-110 52,-98 C30,-112 0,-114 -20,-104 C-30,-94 -36,-84 -42,-70Z", c, 4),
  side: (c) => S("M-40,-60 C-46,-90 -40,-104 -30,-110 C-34,-90 -32,-74 -26,-56Z", c, 3) + S("M44,-104 C50,-96 52,-86 50,-78", "none", 6, `stroke="${c}"`),
  short: (c) => S("M-40,-80 C-44,-120 -10,-136 22,-132 C42,-128 52,-114 50,-100 C30,-108 0,-112 -24,-106 C-32,-100 -38,-92 -40,-80Z", c, 4),
  curly: (c) => S("M-44,-76 c-10,-20 4,-34 14,-38 c4,-16 24,-22 36,-14 c12,-12 34,-4 36,10 c14,4 16,22 8,32 C30,-96 0,-100 -44,-76Z", c, 4),
};
const STACHE = {
  none: () => "",
  brush: (o) => `<rect x="27" y="${f1(-34 - o * 3)}" width="17" height="11" rx="2" fill="#2b2018" stroke="${INK}" stroke-width="2.5"/>`,
  walrus: (o, c = "#4a3a2c") => S(`M14,${f1(-28 - o * 3)} C24,${f1(-46 - o * 3)} 50,${f1(-46 - o * 3)} 58,${f1(-26 - o * 3)} C54,${f1(-14 - o * 3)} 44,${f1(-22 - o * 3)} 36,${f1(-24 - o * 3)} C28,${f1(-22 - o * 3)} 18,${f1(-14 - o * 3)} 14,${f1(-28 - o * 3)}Z`, c, 3),
  thin: (o, c = "#4a3a2c") => S(`M28,${f1(-31 - o * 3)} Q40,${f1(-28 - o * 3)} 52,${f1(-33 - o * 3)} Q46,${f1(-25 - o * 3)} 38,${f1(-26 - o * 3)} Q32,${f1(-26 - o * 3)} 28,${f1(-31 - o * 3)}Z`, c, 2.5),
};
const HATS = {
  none: "",
  peaked: (c, band = "#2a2420", w = 1) => S("M-46,-100 C-40,-150 40,-158 62,-112 L58,-98 C20,-110 -20,-108 -46,-100Z", c, 4) + S("M-50,-100 C-10,-92 40,-94 72,-100 L76,-90 C40,-80 -10,-82 -50,-92Z", "#1c1814", 4) + `<rect x="-44" y="-112" width="104" height="10" fill="${band}"/>`,
  rommel: (c) => HATS.peaked(c) + `<g transform="translate(6 -128)"><ellipse cx="-14" cy="0" rx="13" ry="10" fill="#9fb0b0" stroke="${INK}" stroke-width="4"/><ellipse cx="16" cy="0" rx="13" ry="10" fill="#9fb0b0" stroke="${INK}" stroke-width="4"/><path d="M-1,0 h4" stroke="${INK}" stroke-width="4"/></g>`,
  navy: () => S("M-46,-100 C-44,-146 44,-154 64,-112 L60,-98 C20,-108 -20,-106 -46,-100Z", "#f2efe6", 4) + S("M-50,-100 C-10,-92 40,-94 72,-100 L76,-90 C40,-80 -10,-82 -50,-92Z", "#1c1814", 4) + `<rect x="-44" y="-112" width="104" height="10" fill="#1c1c24"/><circle cx="8" cy="-118" r="7" fill="#d8b25a" stroke="${INK}" stroke-width="2"/>`,
  side: (c) => S("M-40,-104 C-34,-130 30,-138 46,-110 L40,-100 C10,-112 -20,-110 -40,-100Z", c, 4),
  stahl: (c = "#5e6658") => S("M-50,-86 C-56,-150 46,-164 62,-96 L70,-82 L48,-86 C20,-100 -20,-100 -50,-86Z", c, 5) + `<path d="M-44,-98 C0,-110 30,-108 56,-98" stroke="${INK}" stroke-width="3" fill="none"/>`,
  soviet: (c = "#5f6a4c") => S("M-48,-88 C-52,-150 50,-160 60,-90 C30,-102 -20,-102 -48,-88Z", c, 5) + `<path d="M10,-138 l4,10 l10,0 l-8,6 l3,10 l-9,-6 l-9,6 l3,-10 l-8,-6 l10,0Z" fill="#a8342a"/>`,
  ushanka: (c = "#6b5a46") => S("M-50,-80 C-56,-150 50,-156 60,-84 L64,-40 L44,-44 L44,-86 C10,-96 -24,-96 -40,-86 L-40,-40 L-56,-44Z", c, 5),
  pilot: (c = "#6b4a30") => S("M-46,-60 C-56,-130 50,-148 58,-80 L54,-60 C20,-90 -20,-90 -46,-60Z", c, 4) + `<g transform="translate(6 -112)"><ellipse cx="-14" cy="0" rx="13" ry="10" fill="#c9d4d4" stroke="${INK}" stroke-width="4"/><ellipse cx="16" cy="0" rx="13" ry="10" fill="#c9d4d4" stroke="${INK}" stroke-width="4"/></g>`,
  cap: (c = "#3a3530") => S("M-44,-104 C-36,-134 34,-140 52,-108 L70,-104 L-44,-96Z", c, 4),
  fedora: (c = "#3e3a36") => S("M-40,-104 C-40,-150 44,-156 48,-106Z", c, 4) + `<ellipse cx="4" cy="-104" rx="66" ry="11" fill="${c}" stroke="${INK}" stroke-width="4"/><path d="M-38,-114 C0,-108 30,-110 46,-114" stroke="#1c1814" stroke-width="7"/>`,
};
// chest/front pieces
const FRONT = {
  suit: (tie = "#7d2f25", shirt = "#f1ead8") => S("M-2,-236 L20,-150 L42,-230Z", shirt, 4) + S("M14,-228 L24,-228 L28,-166 L19,-150 L10,-166Z", tie, 3.5) + S("M-2,-236 L14,-178 L4,-150", "none", 4) + S("M42,-230 L28,-176 L36,-150", "none", 4),
  tunic: (btn = "#c9a24a") => S("M-4,-236 L40,-232 L36,-214 L0,-216Z", "none", 4) + [0, 1, 2, 3].map(i => `<circle cx="20" cy="${-190 + i * 44}" r="5" fill="${btn}" stroke="${INK}" stroke-width="2"/>`).join("") + `<path d="M-30,-150 h30 v26 h-30Z M34,-150 h30 v26 h-30Z" fill="none" stroke="${INK}" stroke-width="3"/>`,
  bowtie: (shirt = "#f1ead8") => S("M-2,-236 L20,-170 L42,-230Z", shirt, 4) + S("M6,-228 L20,-220 L6,-212Z M34,-228 L20,-220 L34,-212Z", "#2a2a3a", 3),
  navy: () => S("M-2,-236 L20,-180 L42,-230Z", "#f1ead8", 4) + [0, 1, 2].map(i => `<circle cx="20" cy="${-170 + i * 46}" r="6" fill="#d8b25a" stroke="${INK}" stroke-width="2"/>`).join("") + `<rect x="-36" y="-190" width="40" height="14" fill="#8c2a1f" stroke="${INK}" stroke-width="2"/><rect x="-36" y="-176" width="40" height="8" fill="#2f5a8c" stroke="${INK}" stroke-width="2"/>`,
  apron: () => S("M-40,-150 L50,-150 L60,40 L-50,40Z", "#efe9da", 4) + `<path d="M-40,-150 L-30,-226 M50,-150 L40,-226" stroke="#efe9da" stroke-width="6"/><path d="M-20,-80 h40" stroke="#5a4630" stroke-width="10" opacity=".4"/>`,
  scarf: (c = "#d8cfb8") => S("M-6,-236 C10,-210 36,-210 46,-232 L40,-200 C24,-190 6,-194 -4,-206Z", c, 4) + FRONT.tunic(),
};
function mk(spec) {
  const C = {
    skin: SKIN, coat: "#555", coatD: null, trousers: "#3a3a42", width: 1, belly: false, legs: true,
    face: "long", hair: "short", hairCol: "#3a2c20", stache: "none", stacheCol: "#4a3a2c", glasses: false, monocle: false, hat: "none", hatCol: "#5e6658",
    browCol: "#3a2c20", lid0: .1, curve0: 0, prop: "", front: "suit", ...spec,
  };
  C.coatD = C.coatD || shade(C.coat, .78);
  C.front = typeof C.front === "string" ? (FRONT[C.front] ? FRONT[C.front]() : C.front) : C.front;
  const id = (spec.id || "x").replace(/\W/g, "");
  C.head = P => {
    const { o = 0, shape = "closed", bl = 0, brow = 0, browK = 0, look = [.5, 0], curve = C.curve0, skew = 0, lid = C.lid0 } = P;
    let h = S(FACES[C.face], C.skin) + `<path d="M-34,-24 C-42,-60 -40,-96 -24,-114 C-30,-80 -28,-44 -18,-8Z" fill="#000" opacity=".1"/>`;
    h += `<ellipse cx="-28" cy="-62" rx="${C.ears || 9}" ry="${(C.ears || 9) * 1.6}" fill="${C.skin}" stroke="${INK}" stroke-width="4"/>`;
    h += eye(id + "e1", 6, -74, 7.5, 9, Math.max(lid, bl), look, C.skin) + eye(id + "e2", 33, -72, 8.5, 10, Math.max(lid, bl), look, C.skin);
    if (C.glasses) h += `<circle cx="6" cy="-74" r="15" fill="#fff" fill-opacity=".1" stroke="${INK}" stroke-width="3.5"/><circle cx="33" cy="-72" r="16" fill="#fff" fill-opacity=".1" stroke="${INK}" stroke-width="3.5"/><path d="M21,-75 Q19,-80 17,-75" stroke="${INK}" stroke-width="3" fill="none"/>`;
    if (C.monocle) h += `<circle cx="33" cy="-72" r="15" fill="#fff" fill-opacity=".18" stroke="${INK}" stroke-width="4"/><path d="M33,-57 C30,-30 20,-10 14,20" stroke="#c9a24a" stroke-width="2.5" fill="none"/>`;
    const by = -94 - brow * 11;
    h += `<path d="M-6,${f1(by + browK * 4)} L16,${f1(by - browK * 3)}" stroke="${C.browCol}" stroke-width="${C.browW || 6}" stroke-linecap="round"/><path d="M24,${f1(by - browK * 3 + 1)} L46,${f1(by + browK * 5 + 2)}" stroke="${C.browCol}" stroke-width="${(C.browW || 6) + .5}" stroke-linecap="round"/>`;
    h += S(C.nose || "M40,-70 C50,-56 56,-44 48,-38 C44,-34 38,-36 36,-40", C.skin, 4);
    h += mouthSvg(34, -16, 22, o, shape, curve, skew);
    h += STACHE[C.stache](o, C.stacheCol);
    const hr = HAIR[C.hair]; if (hr) h += hr(C.hairCol);
    const ht = HATS[C.hat]; if (ht) h += ht(C.hatCol);
    if (C.cigar) h += `<g transform="translate(48 -14) rotate(${f1(8 + o * 10)})"><rect x="0" y="-5" width="54" height="11" rx="5" fill="#6b4226" stroke="${INK}" stroke-width="3"/><rect x="48" y="-5" width="8" height="11" fill="#bdb3a3"/></g>`;
    if (C.pipe) h += `<g transform="translate(46 -12)"><path d="M0,0 L30,4" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M26,-4 L44,-4 L42,18 L28,18Z" fill="#5b3a22" stroke="${INK}" stroke-width="3.5"/></g>`;
    if (C.holder) h += `<g transform="translate(46 -14) rotate(-28)"><path d="M0,0 L70,0" stroke="${INK}" stroke-width="5"/><rect x="66" y="-5" width="26" height="10" fill="#f4efe2" stroke="${INK}" stroke-width="2.5"/></g>`;
    return h;
  };
  return C;
}
function shade(hex, k) { const n = parseInt(hex.slice(1), 16), r = n >> 16, g = n >> 8 & 255, b = n & 255; return "#" + [r, g, b].map(v => Math.round(v * k).toString(16).padStart(2, "0")).join(""); }

// ---------- the cast ----------
const CAST = {
  HITLER: mk({ id: "hit", coat: "#7a6a4f", trousers: "#3d3428", hair: "swoop", hairCol: "#2b2018", stache: "brush", browCol: "#2b2018", front: FRONT.suit("#5e5140", "#d9cfb8"), lid0: .25, curve0: -2, browK0: .6 }),
  KLAUS: mk({ id: "kla", coat: "#6d7462", trousers: "#525947", hair: "short", hairCol: "#8a6a40", glasses: true, ears: 14, hat: "side", hatCol: "#5d6553", browCol: "#8a6a40", front: FRONT.suit("#3d4236", "#c9c4ad") }),
  STALIN: mk({ id: "sta", coat: "#8a8370", trousers: "#5a5546", face: "square", hair: "back", hairCol: "#3a3430", stache: "walrus", stacheCol: "#3a3430", pipe: true, front: FRONT.tunic("#8a8370"), browCol: "#3a3430", lid0: .35, skin: "#e2b996" }),
  MUSSOLINI: mk({ id: "mus", coat: "#2b2a2e", trousers: "#2b2a2e", face: "jaw", hair: "bald", front: FRONT.tunic(), curve0: -3, browW: 8 }),
  ENZO: mk({ id: "enz", coat: "#6f6052", face: "round", hair: "curly", hairCol: "#2b2018", stache: "thin", front: FRONT.apron(), hat: "cap", hatCol: "#5a4a3a" }),
  CHURCHILL: mk({ id: "chu", coat: "#2a2a34", face: "round", hair: "bald", belly: true, width: 1.15, cigar: true, front: FRONT.bowtie(), curve0: -2, skin: "#f0c8a8" }),
  FDR: mk({ id: "fdr", coat: "#5a5d66", face: "long", hair: "back", hairCol: "#8d8a84", glasses: true, holder: true, curve0: 5, front: FRONT.suit("#2f3f6a") }),
  TOJO: mk({ id: "toj", coat: "#7a7350", trousers: "#5e5940", face: "long", hair: "bald", glasses: true, stache: "thin", stacheCol: "#2b2018", front: FRONT.tunic(), skin: "#e8c39a" }),
  YAMAMOTO: mk({ id: "yam", coat: "#f1eee4", trousers: "#f1eee4", face: "square", hat: "navy", front: FRONT.navy(), skin: "#e8c39a", lid0: .25, curve0: -2 }),
  ROMMEL: mk({ id: "rom", coat: "#8a7a52", trousers: "#7a6c48", face: "square", hat: "rommel", hatCol: "#8a7a52", front: FRONT.scarf(), lid0: .2 }),
  PAULUS: mk({ id: "pau", coat: "#5e6658", face: "long", hat: "peaked", hatCol: "#5e6658", front: FRONT.tunic(), skin: "#e0c0a0", lid0: .35, curve0: -3 }),
  CHUIKOV: mk({ id: "chk", coat: "#6a6e50", face: "round", hair: "curly", hairCol: "#2b2018", front: FRONT.tunic(), curve0: 2 }),
  SOVOFF: mk({ id: "sof", coat: "#6a6e50", face: "square", hat: "ushanka", front: FRONT.tunic() }),
  SOVSOLDIER: mk({ id: "sso", coat: "#6a6e50", hat: "soviet", front: FRONT.tunic("#8a8370") }),
  GERSOLDIER: mk({ id: "gso", coat: "#5e6658", hat: "stahl", front: FRONT.tunic("#8a8a80") }),
  RADAR: mk({ id: "rad", coat: "#9c8a62", face: "long", hair: "short", hairCol: "#b9894a", ears: 12, front: FRONT.suit("#6b5a3a", "#cfc6a8"), curve0: 1 }),
  DUTY: mk({ id: "dut", coat: "#9c8a62", face: "square", hat: "peaked", hatCol: "#8a7a52", front: FRONT.suit("#6b5a3a", "#cfc6a8"), lid0: .4 }),
  PILOTUS: mk({ id: "plu", coat: "#6b4a30", face: "long", hat: "pilot", front: FRONT.scarf("#efe9da"), curve0: 1 }),
  DOOLITTLE: mk({ id: "doo", coat: "#6b4a30", face: "round", hair: "bald", front: FRONT.scarf("#efe9da"), curve0: 4 }),
  CODEBREAKERUS: mk({ id: "cbu", coat: "#f1eee4", face: "long", hair: "short", glasses: true, front: FRONT.navy(), lid0: .3 }),
  CODEBREAKERUK: mk({ id: "cbk", coat: "#7a5a44", face: "long", hair: "back", hairCol: "#5a3a22", glasses: true, front: FRONT.suit("#3a5a3a"), lid0: .3 }),
  UBOAT: mk({ id: "ubo", coat: "#2e3036", face: "square", hat: "navy", stache: "none", front: FRONT.navy(), curve0: -2 }),
  AIDESU: mk({ id: "ais", coat: "#6a6e50", face: "long", hair: "short", front: FRONT.tunic() }),
  PILOT: mk({ id: "plg", coat: "#5e6658", hat: "pilot", hatCol: "#4a3a2c", front: FRONT.scarf() }),
};
// speaking state for a cast member at time t
function perf(who, t, seed = 1, extra = {}) { const o = mouth(who, t); return { o, shape: shapeAt(t + seed * .1, o), bl: blink(t, seed), t, hr: wob(t, seed, .6) * 2, lean: wob(t, seed + 2, .5) * 1.2, sq: Math.sin(t * 2.1 + seed) * .1, ...extra }; }
function actor(who, t, x, y, s, extra = {}, seed) { return person({ x, y, s, ...perf(who, t, seed ?? (who.length * 7), extra) }, CAST[who]); }
