// Shorts toolkit on top of lib/core.js: vertical runner, captions, cast rigs, props, Europe map.
"use strict";
setSize(1080, 1920);

// ---------- a generic upper-body rig; head(P) draws the face in head space (neck top = 0,0, faces +x) ----------
function man(P, look) {
  const { x, y, s = 1, flip = false, lean = 0, sq = 0, hr = 0, aR = [20, 30], aL = [15, 25], propR = "", propL = "", t = 0 } = P;
  const { coat, coatD = coat, shirt = "#f1ead8", tie = null, skin = SKIN, collar = null, width = 1, legs = null } = look;
  let g = `<g transform="translate(${f1(x)} ${f1(y)}) scale(${flip ? -s : s} ${s})">`;
  if (legs) g += legs;
  g += `<g transform="rotate(${f1(lean)}) scale(${f1((1 - sq * .06) * width)} ${f1(1 + sq * .08)})">`;
  const L = limb(-6, -206, aL[0], 92, aL[1], 86, coatD, 30);
  g += L.svg + (propL ? `<g transform="translate(${f1(L.hx)} ${f1(L.hy)}) rotate(${f1(-(aL[0] + aL[1]) + 90)})">${propL}</g>` : "") + hand(L.hx, L.hy, skin, 14);
  g += S("M-52,40 C-64,-80 -58,-180 -42,-224 Q0,-248 44,-228 C60,-170 66,-80 56,40Z", coat);
  g += `<path d="M-48,-120 C-52,-40 -48,0 -44,40 L-22,40 C-28,-30 -30,-110 -24,-200Z" fill="url(#hatch)" opacity=".45"/>`;
  if (collar) g += collar; else {
    g += S("M-2,-236 L20,-150 L42,-230Z", shirt, 4);
    if (tie) g += S("M14,-228 L24,-228 L28,-166 L19,-150 L10,-166Z", tie, 3.5);
    g += S("M-2,-236 L14,-178 L4,-150", "none", 4) + S("M42,-230 L28,-176 L36,-150", "none", 4);
  }
  g += `<g transform="translate(12 -238) rotate(${f1(hr)})">` + S("M-10,6 L-8,-16 L16,-16 L18,6Z", skin, 4) + look.head(P) + `</g>`;
  const R = limb(30, -214, aR[0], 96, aR[1], 88, coat, 32);
  g += R.svg + (propR ? `<g transform="translate(${f1(R.hx)} ${f1(R.hy)}) rotate(${f1(-(aR[0] + aR[1]) + 90)})">${propR}</g>` : "");
  g += hand(R.hx, R.hy, skin, 15, P.finger, P.fingerAng || 0);
  return g + `</g></g>`;
}
const brows = (by, k, col, w = 6, xs = [-6, 16, 24, 46]) =>
  `<path d="M${xs[0]},${f1(by + k * 4)} L${xs[1]},${f1(by - k * 3)}" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/><path d="M${xs[2]},${f1(by - k * 3 + 1)} L${xs[3]},${f1(by + k * 5 + 2)}" stroke="${col}" stroke-width="${w + .5}" stroke-linecap="round"/>`;
const FACE = "M-34,-20 C-44,-60 -44,-112 -6,-124 C30,-130 52,-104 50,-60 C49,-36 44,-14 30,-4 C18,4 0,4 -12,-2 C-22,-6 -30,-12 -34,-20Z";
const FACE_SHADE = `<path d="M-34,-24 C-42,-60 -40,-96 -24,-114 C-30,-80 -28,-44 -18,-8Z" fill="#c99a74" opacity=".5"/>`;
const EAR = s => `<ellipse cx="-26" cy="-62" rx="9" ry="15" fill="${s}" stroke="${INK}" stroke-width="4"/>`;

// Hitler: petty, vain, never cool. Plain brown jacket, no insignia of any kind.
const HITLER = {
  coat: "#7a6a4f", coatD: "#5e5140", tie: "#5e5140", shirt: "#d9cfb8",
  head: P => {
    const { o = 0, shape = "closed", bl = 0, brow = 0, browK = .6, look = [.5, 0], curve = -2, skew = 0, lid = .25 } = P;
    let h = S(FACE, SKIN) + FACE_SHADE + EAR(SKIN);
    h += eye("hE1", 6, -74, 7, 8.5, Math.max(lid, bl), look, SKIN) + eye("hE2", 32, -72, 7.5, 9, Math.max(lid, bl), look, SKIN);
    h += brows(-90 - brow * 10, browK, "#2b2018", 7);
    h += S("M40,-70 C48,-56 52,-44 46,-38 C42,-34 36,-36 34,-40", SKIN, 4);
    h += mouthSvg(34, -18, 20, o, shape, curve, skew);
    h += `<rect x="${f1(27)}" y="${f1(-34 - o * 3)}" width="17" height="11" rx="2" fill="#2b2018" stroke="${INK}" stroke-width="2.5"/>`;
    // the hair: slicked flat with the famous swoop over the forehead
    h += S("M-40,-74 C-48,-110 -20,-134 14,-130 C40,-128 52,-112 50,-96 C40,-104 30,-104 22,-100 C30,-90 30,-80 20,-70 C14,-84 0,-96 -18,-100 C-28,-92 -34,-82 -40,-74Z", "#2b2018", 4);
    return h;
  },
};
// Chamberlain: elderly, wing collar, moustache, umbrella, delighted by paperwork
const CHAMBERLAIN = {
  coat: "#24232a", coatD: "#1a1a1f",
  collar: S("M-4,-236 L20,-160 L44,-230Z", "#f6f2e6", 4) + S("M2,-236 L12,-222 L22,-234 Z M22,-234 L32,-222 L42,-232Z", "#fff", 3) + S("M16,-226 L28,-226 L26,-200 L18,-200Z", "#5b5a68", 3),
  head: P => {
    const { o = 0, shape = "closed", bl = 0, brow = .3, look = [.5, -.1], curve = 5, lid = .1 } = P;
    let h = S("M-32,-16 C-44,-60 -42,-118 -4,-130 C32,-136 50,-108 48,-60 C47,-30 42,-6 26,4 C14,10 0,10 -12,4 C-22,0 -28,-6 -32,-16Z", "#efcfae") + FACE_SHADE + EAR("#efcfae");
    h += S("M-36,-80 C-44,-110 -30,-128 -10,-130 C-24,-118 -30,-100 -28,-84Z", "#e9e5dc", 3) + S("M40,-104 C46,-96 48,-86 46,-80", "none", 6, 'stroke="#e9e5dc"');
    h += eye("cE1", 6, -76, 7, 8.5, Math.max(lid, bl), look, "#efcfae") + eye("cE2", 32, -74, 7.5, 9, Math.max(lid, bl), look, "#efcfae");
    h += brows(-94 - brow * 10, -.3, "#d8d3c8", 7);
    h += S("M40,-72 C54,-58 58,-46 50,-40 C46,-36 38,-38 36,-42", "#efcfae", 4);
    h += mouthSvg(34, -14, 22, o, shape, curve);
    h += S(`M20,${f1(-30 - o * 3)} C30,${f1(-38 - o * 3)} 46,${f1(-38 - o * 3)} 54,${f1(-28 - o * 3)} C44,${f1(-24 - o * 3)} 30,${f1(-24 - o * 3)} 20,${f1(-30 - o * 3)}Z`, "#cfc9bd", 3);
    return h;
  },
};
// Klaus: young clerk-soldier, round glasses, big ears, side cap, clipboard; always anxious
const KLAUS = {
  coat: "#6d7462", coatD: "#525947", shirt: "#c9c4ad", tie: "#3d4236",
  head: P => {
    const { o = 0, shape = "closed", bl = 0, brow = .6, browK = -.8, look = [.6, 0], curve = -2, lid = .05 } = P;
    let h = S(FACE, SKIN) + FACE_SHADE;
    h += `<ellipse cx="-28" cy="-62" rx="14" ry="22" fill="${SKIN}" stroke="${INK}" stroke-width="4"/>`;
    h += eye("kE1", 6, -76, 8, 10, Math.max(lid, bl), look, SKIN) + eye("kE2", 33, -74, 9, 11, Math.max(lid, bl), look, SKIN);
    h += `<circle cx="6" cy="-76" r="15" fill="#fff" fill-opacity=".12" stroke="${INK}" stroke-width="3.5"/><circle cx="33" cy="-74" r="16" fill="#fff" fill-opacity=".12" stroke="${INK}" stroke-width="3.5"/><path d="M21,-77 Q19,-82 17,-77" stroke="${INK}" stroke-width="3" fill="none"/>`;
    h += brows(-98 - brow * 10, browK, "#8a6a40", 5);
    h += S("M40,-70 C50,-56 54,-46 48,-40 C44,-36 38,-38 36,-42", SKIN, 4);
    h += mouthSvg(32, -18, 18, o, shape, curve);
    h += `<ellipse cx="32" cy="-46" rx="10" ry="6" fill="#d7765f" opacity=".3"/>`;
    h += S("M-40,-104 C-34,-130 30,-138 46,-110 L40,-100 C10,-112 -20,-110 -40,-100Z", "#5d6553", 4) + `<path d="M-30,-112 C0,-124 24,-120 40,-110" stroke="${INK}" stroke-width="2.5" fill="none"/>`;
    return h;
  },
};
// The Officer: square jaw, monocle, plain peaked cap; unmovably deadpan
const OFFICER = {
  coat: "#5e6658", coatD: "#454c40", shirt: "#d8d3c2", tie: "#2e3229", width: 1.12,
  head: P => {
    const { o = 0, shape = "closed", bl = 0, brow = 0, look = [.5, 0], curve = -1, lid = .4 } = P;
    let h = S("M-36,-14 C-44,-60 -42,-112 -4,-122 C34,-126 54,-100 52,-56 C52,-30 50,-6 40,4 C24,12 -4,12 -20,6 C-30,2 -34,-6 -36,-14Z", SKIN) + FACE_SHADE + EAR(SKIN);
    h += `<path d="M10,6 C24,8 36,4 42,-2" stroke="${INK}" stroke-width="3" fill="none"/>`;
    h += eye("oE1", 6, -72, 7, 8, Math.max(lid, bl), look, SKIN) + eye("oE2", 32, -70, 8, 9, Math.max(lid * .8, bl), look, SKIN);
    h += `<circle cx="32" cy="-70" r="15" fill="#fff" fill-opacity=".18" stroke="${INK}" stroke-width="4"/><path d="M32,-55 C30,-30 20,-10 14,20" stroke="#c9a24a" stroke-width="2.5" fill="none"/>`;
    h += brows(-88 - brow * 8, .1, "#3a2f24", 8);
    h += S("M42,-66 C52,-54 54,-44 48,-38 C44,-35 38,-36 36,-40", SKIN, 4);
    h += mouthSvg(34, -14, 22, o, shape, curve);
    h += S("M-46,-100 C-40,-150 40,-158 62,-112 L58,-98 C20,-110 -20,-108 -46,-100Z", "#5e6658", 4) + S("M-50,-100 C-10,-92 40,-94 72,-100 L76,-90 C40,-80 -10,-82 -50,-92Z", "#2a2420", 4);
    h += `<rect x="-44" y="-112" width="104" height="10" fill="#2e3229"/>`;
    return h;
  },
};

// ---------- props ----------
const pen = `<path d="M0,0 L70,-8" stroke="${INK}" stroke-width="12" stroke-linecap="round"/><path d="M0,0 L70,-8" stroke="#2c2a33" stroke-width="7" stroke-linecap="round"/><path d="M-8,1 L2,-1" stroke="#c9a24a" stroke-width="5"/>`;
const umbrella = `<path d="M0,0 L-4,-220" stroke="${INK}" stroke-width="10" stroke-linecap="round"/><path d="M-4,-220 C-40,-180 -46,-80 -10,-20 L4,-20 C30,-80 30,-180 -4,-220Z" fill="#1d1c21" stroke="${INK}" stroke-width="4"/><path d="M0,0 q-14,20 -26,6" stroke="${INK}" stroke-width="8" fill="none" stroke-linecap="round"/>`;
const clipboard = `<g transform="rotate(-90)"><rect x="-60" y="-80" width="120" height="160" rx="6" fill="#8a6a44" stroke="${INK}" stroke-width="4"/><rect x="-50" y="-66" width="100" height="136" fill="#efe7d2" stroke="${INK}" stroke-width="2.5"/><rect x="-18" y="-86" width="36" height="16" rx="4" fill="#b7b2a6" stroke="${INK}" stroke-width="3"/><path d="M-38,-40 h76 M-38,-20 h76 M-38,0 h60 M-38,20 h70" stroke="#7c705c" stroke-width="4"/></g>`;
// the "Last One, Promise" form
function form(x, y, rot, s, n, extra = {}) {
  const { stain = 0, penW = 0, nap = false, stamp = 0, stampTxt = "APPROVED" } = extra;
  let g = `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)}) scale(${s})">`;
  if (nap) g += S("M-170,-170 L170,-180 L176,170 L-176,176Z", "#f4f1ea", 5) + `<path d="M-170,-60 L172,-66 M-172,50 L174,46" stroke="#d8d2c4" stroke-width="3"/>` + tx(0, -10, 54, "last one?", "Fell", INK, 'text-anchor="middle" font-style="italic" transform="rotate(-4)"') + tx(0, 80, 40, "— A.H.", "Fell", INK, 'text-anchor="middle" font-style="italic"');
  else {
    g += S("M-200,-270 L200,-270 L200,270 L-200,270Z", "#efe6cc", 5) + `<rect x="-200" y="-270" width="400" height="540" fill="url(#hatch)" opacity=".05"/>`;
    g += tx(0, -200, 40, "FORM 1936 / " + n, "Elite", "#5a4630", 'text-anchor="middle"') + tx(0, -132, 60, "LAST ONE.", "FellSC", INK, 'text-anchor="middle"') + tx(0, -72, 60, "PROMISE.", "FellSC", INK, 'text-anchor="middle"');
    g += `<path d="M-160,-30 h320 M-160,30 h320 M-160,90 h220" stroke="#b9ad92" stroke-width="3"/>` + tx(-160, 170, 30, "Signed:", "Fell", "#5a4630");
    g += `<path d="M-40,170 c20,-30 40,20 60,-10 c20,-30 30,10 60,-6" stroke="${INK}" stroke-width="4" fill="none"/>`;
    if (stain) g += `<ellipse cx="110" cy="120" rx="${f1(70 * stain)}" ry="${f1(60 * stain)}" fill="none" stroke="#8a5a32" stroke-width="10" opacity=".55"/><ellipse cx="110" cy="120" rx="${f1(60 * stain)}" ry="${f1(50 * stain)}" fill="#8a5a32" opacity=".18"/>`;
    if (penW) { const L = 560; g += tx(0, 30, 64, "last one", "Fell", "#1d2a5a", `text-anchor="middle" font-style="italic" stroke="#1d2a5a" stroke-width="1.5" stroke-dasharray="${L}" stroke-dashoffset="${f1(L * (1 - penW))}" fill-opacity="${f1(clamp(penW * 2 - 1))}"`); }
  }
  if (stamp) { const p = clamp(stamp), sc = lerp(1.6, 1, E.out(p)); g += `<g transform="translate(40 120) rotate(-12) scale(${f1(sc)})" opacity="${f1(p * .9)}"><rect x="-150" y="-50" width="300" height="100" fill="none" stroke="#8c2a1f" stroke-width="8"/>${tx(0, 18, 50, stampTxt, "FellSC", "#8c2a1f", 'text-anchor="middle" letter-spacing="4"')}</g>`; }
  return g + "</g>";
}
function desk(x, y, w) {
  return S(`M${x - w / 2},${y} L${x + w / 2},${y} L${x + w / 2 + 40},${y + 60} L${x - w / 2 - 40},${y + 60}Z`, "#6a4a30", 5) + S(`M${x - w / 2 - 40},${y + 60} L${x + w / 2 + 40},${y + 60} L${x + w / 2 + 40},${y + 520} L${x - w / 2 - 40},${y + 520}Z`, "#4e3420", 5) +
    `<rect x="${x - w / 2 - 40}" y="${y + 60}" width="${w + 80}" height="460" fill="url(#hatch)" opacity=".25"/>` + `<path d="M${x - w / 2},${y + 140} h${w} M${x - w / 2},${y + 300} h${w}" stroke="#2e1d12" stroke-width="5"/>`;
}
function office(t, lampOn = 1) {
  let b = `<rect x="-600" y="-400" width="2400" height="2800" fill="#4a3a2c"/>`;
  for (let i = 0; i < 8; i++) b += `<rect x="${-500 + i * 260}" y="-300" width="220" height="1400" fill="#56432f" stroke="#2f2216" stroke-width="6"/>`;
  b += `<rect x="-600" y="-400" width="2400" height="2800" fill="url(#hatch)" opacity=".12"/>`;
  b += S("M640,120 L1000,120 L1000,780 L640,780Z", "#9aa3a8", 8) + `<path d="M820,120 v660 M640,450 h360" stroke="${INK}" stroke-width="10"/><rect x="640" y="120" width="360" height="660" fill="url(#warmGlow)" opacity=".25"/>`;
  b += S("M600,100 C640,300 620,600 660,820 L560,820 C540,600 560,300 520,100Z", "#5a2a24", 4) + S("M1040,100 C1000,300 1020,600 980,820 L1080,820 C1100,600 1080,300 1120,100Z", "#5a2a24", 4);
  // globe (a Great Dictator nod)
  b += `<path d="M150,980 L150,760" stroke="#3b2a1e" stroke-width="16"/><circle cx="150" cy="680" r="110" fill="#b8a77c" stroke="${INK}" stroke-width="5"/><path d="M70,640 c40,-20 60,30 100,10 c30,-16 50,20 70,0 M90,720 c30,10 60,-10 90,10" stroke="#6f7b55" stroke-width="16" fill="none" stroke-linecap="round"/><path d="M150,560 a120,120 0 0 1 0,240" stroke="#8a6326" stroke-width="10" fill="none"/>`;
  return layer(.6, b);
}
// ---------- Europe map ----------
function merc(lon, lat, v) { const r = Math.PI / 180, k = v.scale; return [960 + k * (lon - v.center[0]) * r, 540 - k * (Math.log(Math.tan(Math.PI / 4 + lat * r / 2)) - Math.log(Math.tan(Math.PI / 4 + v.center[1] * r / 2)))]; }
function europe(fills, extra = "") {
  const v = EU.europe; let m = `<rect x="-600" y="-900" width="3200" height="2900" fill="#9fb0b0"/><rect x="-600" y="-900" width="3200" height="2900" fill="url(#hatch)" opacity=".12"/>`;
  m += `<path d="${v.land}" fill="#e3d4ae" stroke="${INK}" stroke-width="3"/>`;
  for (const [c, d] of Object.entries(v.c)) m += `<path d="${d}" fill="${fills[c] || "#e3d4ae"}" stroke="${INK}" stroke-width="${fills[c] ? 4 : 2}" stroke-linejoin="round"/>`;
  return m + extra;
}
function rhineland(p) {
  const v = EU.europe, pts = [[6.0, 51.85], [7.2, 51.9], [8.6, 50.2], [8.3, 49.2], [6.4, 49.2], [5.95, 50.2]].map(q => merc(q[0], q[1], v));
  return `<path d="M${pts.map(q => q.map(f1).join(",")).join(" L")}Z" fill="#8c2a1f" opacity="${f1(.75 * p)}" stroke="${INK}" stroke-width="3"/>`;
}
// map fill that bleeds in like ink: grows a radial mask from a point
function inkFill(code, col, p, cx, cy, id) {
  if (p <= 0) return "";
  return `<clipPath id="${id}"><circle cx="${cx}" cy="${cy}" r="${f1(E.out(clamp(p)) * 420)}"/></clipPath><g clip-path="url(#${id})"><path d="${EU.europe.c[code]}" fill="${col}" stroke="${INK}" stroke-width="5"/><path d="${EU.europe.c[code]}" fill="url(#hatch)" opacity=".35"/></g>`;
}
// German "tractor" (a tank under a thin excuse), faces +x; origin at ground centre
function tractor(x, y, s, t, roll = 0) {
  const tr = (t * 80 * roll) % 40;
  let g = `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})">`;
  g += S("M-420,-20 C-440,-120 -400,-150 -340,-150 L340,-150 C400,-150 440,-120 420,-20 C400,30 -400,30 -420,-20Z", "#3b3a36", 6);
  for (let i = 0; i < 7; i++) g += `<circle cx="${-300 + i * 100}" cy="-60" r="44" fill="#6c6b64" stroke="${INK}" stroke-width="5"/><circle cx="${-300 + i * 100}" cy="-60" r="14" fill="#3b3a36"/>`;
  for (let i = 0; i < 22; i++) g += `<path d="M${f1(-410 + ((i * 40 + tr) % 860))},-2 l0,22" stroke="#22211e" stroke-width="10"/>`;
  g += S("M-380,-150 L-330,-330 L330,-330 L400,-150Z", "#68705a", 6) + `<path d="M-330,-330 L330,-330 L400,-150 L-380,-150Z" fill="url(#hatch)" opacity=".25"/>`;
  for (let i = 0; i < 12; i++) g += `<circle cx="${-300 + i * 54}" cy="-300" r="6" fill="${INK}"/><circle cx="${-320 + i * 58}" cy="-176" r="6" fill="${INK}"/>`;
  g += S("M-170,-330 L-130,-470 L170,-470 L210,-330Z", "#6f7862", 6);
  g += `<path d="M200,-400 L720,-410" stroke="${INK}" stroke-width="40" stroke-linecap="round"/><path d="M200,-400 L720,-410" stroke="#565d4a" stroke-width="28" stroke-linecap="round"/>`;
  // the excuse: some hay on top and a farm sign
  g += S("M-160,-470 C-150,-530 -60,-560 0,-540 C60,-570 150,-540 170,-470Z", "#d9b45a", 4) + `<path d="M-120,-490 l-14,-30 M-60,-500 l-6,-40 M10,-510 l8,-36 M80,-500 l20,-34" stroke="#a8842e" stroke-width="5"/>`;
  g += `<g transform="translate(-250 -250) rotate(-3)"><rect x="-110" y="-46" width="280" height="92" fill="#efe6cc" stroke="${INK}" stroke-width="4"/>${tx(30, -8, 30, "Landwirtschaftlicher", "Fraktur", INK, 'text-anchor="middle"')}${tx(30, 30, 30, "Schlepper", "Fraktur", INK, 'text-anchor="middle"')}</g>`;
  return g + "</g>";
}
function field(t) {
  let s = layer(.1, `<rect x="-600" y="-600" width="2400" height="3200" fill="url(#skyDusk)"/><path d="M-200,520 C200,500 500,530 800,512 M100,720 C500,700 800,730 1300,708" stroke="#ead2b0" stroke-width="18" stroke-linecap="round" opacity=".5" fill="none"/>`);
  s += layer(.35, `<path d="M-600,1100 C-200,1020 200,1060 600,1010 C900,980 1300,1040 1800,1000 L1800,2600 L-600,2600Z" fill="#8e9a6a" stroke="${INK}" stroke-width="4"/>` +
    S("M760,1010 L760,860 L860,780 L960,860 L960,1010Z", "#8c3b2c", 4) + S("M740,870 L860,770 L980,870", "none", 6));
  let f = `<path d="M-600,1260 C-100,1220 400,1250 1800,1230 L1800,2600 L-600,2600Z" fill="#a39a5e" stroke="${INK}" stroke-width="4"/>`;
  for (let i = 0; i < 14; i++) f += `<path d="M${-600 + i * 180},2600 L${300 + i * 40},1260" stroke="#8a8048" stroke-width="5"/>`;
  f += S("M-80,1300 q60,-80 130,0Z", "#d9b45a", 4) + S("M60,1290 q50,-70 110,0Z", "#cfa94d", 4);
  return s + layer(.75, f);
}

// ---------- runner ----------
// TIMING and MOUTH are declared in lib/core.js
const Lx = i => TIMING.lines[i];
function wrap(txt, n) { const w = txt.split(" "), out = []; let cur = ""; for (const x of w) { if ((cur + " " + x).trim().length > n) { out.push(cur.trim()); cur = x; } else cur += " " + x; } if (cur.trim()) out.push(cur.trim()); return out; }
function caption(t) {
  const L = TIMING.lines; let i = -1;
  for (let k = 0; k < L.length; k++) if (t >= L[k].s - .04 && t < (L[k + 1] ? L[k + 1].s - .04 : L[k].e + .5)) i = k;
  if (i < 0) return "";
  const rows = wrap(L[i].text.replace(/"/g, "”"), 24), p = clamp((t - L[i].s + .04) / .12), sc = lerp(.85, 1, E.back(p));
  let g = `<g transform="translate(540 1490) scale(${f1(sc)})" opacity="${f1(p)}">`;
  const hgt = rows.length * 70 + 40, wd = Math.max(...rows.map(r => r.length)) * 29 + 80;
  g += `<path d="M${-wd / 2},${-hgt / 2} L${wd / 2},${-hgt / 2 - 6} L${wd / 2 + 6},${hgt / 2} L${-wd / 2 - 4},${hgt / 2 + 4}Z" fill="#f3ead2" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>`;
  rows.forEach((r, j) => g += tx(0, -hgt / 2 + 70 + j * 70, 58, r, "Fell", INK, 'text-anchor="middle"'));
  return g + "</g>";
}
function stamp(t, t0, x, y, rot, l1, l2, w = 760) {
  if (t < t0) return "";
  const p = clamp((t - t0) / .16), sc = lerp(1.9, 1, E.out(p)), [a, b] = shake(t, t0 + .1, 10);
  return `<g transform="translate(${x + a} ${y + b}) rotate(${rot}) scale(${f1(sc)})" opacity="${f1(p * .94)}"><rect x="${-w / 2}" y="-100" width="${w}" height="${l2 ? 200 : 140}" fill="#efe3c6" fill-opacity=".85" stroke="#8c2a1f" stroke-width="10"/>${tx(0, l2 ? -18 : 14, l2 ? 62 : 74, l1, "FellSC", "#8c2a1f", 'text-anchor="middle" letter-spacing="4"')}${l2 ? tx(0, 66, 58, l2, "Elite", "#8c2a1f", 'text-anchor="middle"') : ""}</g>`;
}
function endCard(t) {
  const D = TIMING.duration, p = clamp((t - (D - 1.5)) / .25); if (p <= 0) return "";
  return `<g opacity="${f1(p)}" transform="translate(540 300)"><rect x="-400" y="-60" width="800" height="120" fill="#2a1c12" opacity=".88"/>${tx(0, 18, 50, "Full story · Episode 1", "FellSC", "#f3ead2", 'text-anchor="middle" letter-spacing="3"')}</g>`;
}
function runShort(SHOTS_FN) {
  let SH = null;
  window.init = (timing, m) => { TIMING = timing; MOUTH = m; SH = null; };
  window.renderAt = t => {
    if (!SH) SH = SHOTS_FN();
    const sh = SH.find(s => t >= s.a && t < s.b) || SH[SH.length - 1];
    document.getElementById("boilT").setAttribute("seed", String(Math.floor(t * 8) % 4 + 1));
    if (!sh.cam0) { CAM0 = null; sh.draw(sh.a, 0, sh.b - sh.a); sh.cam0 = CAM.slice(); }
    CAM0 = sh.cam0;
    const r = sh.draw(t, t - sh.a, sh.b - sh.a) || {};
    document.getElementById("world").innerHTML = r.w || "";
    document.getElementById("hud").innerHTML = (r.hud || "") + (sh.noCap ? "" : caption(t)) + endCard(t);
    document.getElementById("fade").style.opacity = String(clamp(1 - t / .12) * 0);
    return true;
  };
}
// speaker state helper
const talk = (who, t, seed) => { const o = mouth(who, t); return { o, shape: shapeAt(t + seed * .1, o), bl: blink(t, seed), t }; };
