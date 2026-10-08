// WW2 cast and props on top of the shared cartoon kit (toon.js). Characters use
// toon's 200×300 box (feet at 100,300); parts here are drawn in the same box via
// the torso / headUnder / head hooks. No real insignia anywhere, by design.
// Classic script: defines globalThis.WW.
(function (g) {
  const { C, char } = g.Toon;
  const ink = C.ink;
  const K = {
    brown: "#8b6f47", fieldgrey: "#6f7766", fieldgreyDk: "#565d4f", khakiSU: "#9a8f62", khakiUK: "#a08b5b",
    blueFR: "#6d8bb0", suit: "#2f2f36", suitGrey: "#7d808a", navy: "#33415c", olive: "#6b6b3a",
    shirtBlack: "#26252b", apron: "#e8e0cc", red: "#c8352b", hairDk: "#22180f", hairGrey: "#9a9a9a",
    paper: "#f6efdc", gold: C.gold,
  };

  // ---------- hair ----------
  const HAIR = {
    // flat hair cap with a long fringe swept down over the left of the forehead
    sidepart: (c = K.hairDk) => `<path d="M34 100 C24 44 66 28 104 30 C142 30 176 48 166 100 C160 80 150 70 136 68 C112 62 86 60 70 70 C60 78 54 90 52 104 C46 96 40 94 34 100Z" fill="${c}" stroke="${ink}" stroke-width="5"/><path d="M98 34 C78 52 62 70 56 96 C70 76 86 62 108 52Z" fill="${c}" stroke="${ink}" stroke-width="4"/>`,
    // thick hair swept straight back
    swept: (c = "#3b3530") => `<path d="M32 104 C20 40 68 22 104 24 C146 24 182 44 168 104 C162 80 150 62 132 58 C112 50 86 52 68 60 C52 66 40 82 32 104Z" fill="${c}" stroke="${ink}" stroke-width="5"/><path d="M60 50 C80 36 120 34 146 48 M54 64 C80 48 124 46 150 60" stroke="#6b625a" stroke-width="3" fill="none"/>`,
    neat: (c = "#5b4a3a") => `<path d="M34 100 C26 44 66 30 100 30 C140 30 176 46 166 100 C158 78 142 66 120 64 L72 64 C54 68 40 80 34 100Z" fill="${c}" stroke="${ink}" stroke-width="5"/><path d="M118 34 L112 64" stroke="${ink}" stroke-width="3"/>`,
    fringe: (c = K.hairGrey) => `<path d="M34 112 C30 92 36 80 44 76 M166 112 C170 92 164 80 156 76" stroke="${c}" stroke-width="14" stroke-linecap="round" fill="none"/>`,
  };

  // ---------- moustaches ----------
  const MOUSTACHE = {
    toothbrush: (c = K.hairDk) => `<rect x="90" y="122" width="20" height="13" rx="2" fill="${c}" stroke="${ink}" stroke-width="3"/>`,
    walrus: (c = "#3b3530") => `<path d="M62 128 C72 114 92 116 100 124 C108 116 128 114 138 128 C140 142 126 146 120 138 C112 134 106 136 100 134 C94 136 88 134 80 138 C74 146 60 142 62 128Z" fill="${c}" stroke="${ink}" stroke-width="4"/>`,
    thin: (c = "#5b4a3a") => `<path d="M80 128 C90 122 98 124 100 127 C102 124 110 122 120 128" stroke="${c}" stroke-width="6" stroke-linecap="round" fill="none"/>`,
    bushy: (c = "#8a8a8a") => `<path d="M68 130 C78 116 96 120 100 126 C104 120 122 116 132 130 C120 138 110 136 100 133 C90 136 80 138 68 130Z" fill="${c}" stroke="${ink}" stroke-width="4"/>`,
  };

  // ---------- headwear (drawn last, over the face) ----------
  const CAP = {
    // peaked officer's cap: crown, band, visor (plain, no badge)
    peaked: (crown = K.fieldgrey, band = K.fieldgreyDk) => `<path d="M26 66 C24 40 60 26 104 26 C150 26 182 40 176 66 C150 74 54 74 26 66Z" fill="${crown}" stroke="${ink}" stroke-width="5"/><rect x="40" y="62" width="122" height="20" rx="6" fill="${band}" stroke="${ink}" stroke-width="5"/><path d="M42 82 C70 98 132 98 160 82 C150 92 56 94 42 82Z" fill="#1d1d22" stroke="${ink}" stroke-width="4"/>`,
    side: (c = K.fieldgrey) => `<path d="M40 72 C50 40 150 38 162 72 C130 64 72 64 40 72Z" fill="${c}" stroke="${ink}" stroke-width="5"/><path d="M48 70 L150 54" stroke="${ink}" stroke-width="3"/>`,
    tophat: (c = "#1c1c22") => `<rect x="56" y="-40" width="88" height="88" rx="6" fill="${c}" stroke="${ink}" stroke-width="5"/><rect x="56" y="30" width="88" height="12" fill="#5a5a66"/><path d="M30 48 C60 40 140 40 170 48 C150 58 50 58 30 48Z" fill="${c}" stroke="${ink}" stroke-width="5"/>`,
    homburg: (c = "#26262e") => `<path d="M58 54 C56 18 144 18 142 54Z" fill="${c}" stroke="${ink}" stroke-width="5"/><path d="M80 24 Q100 36 120 24" stroke="${ink}" stroke-width="3" fill="none"/><path d="M32 56 C60 44 140 44 168 56 C150 66 50 66 32 56Z" fill="${c}" stroke="${ink}" stroke-width="5"/>`,
    kepi: (c = "#5a5f4a") => `<path d="M58 66 L64 4 L136 4 L142 66Z" fill="${c}" stroke="${ink}" stroke-width="5"/><ellipse cx="100" cy="4" rx="36" ry="8" fill="${c}" stroke="${ink}" stroke-width="4"/><path d="M50 66 C80 80 120 80 150 66 C140 76 60 78 50 66Z" fill="#1d1d22" stroke="${ink}" stroke-width="4"/><path d="M64 24 H136" stroke="${K.gold}" stroke-width="4"/>`,
    flat: (c = "#7a6a52") => `<path d="M34 72 C30 40 70 30 104 32 C150 32 176 50 168 70 C176 76 170 84 150 82 C110 70 70 74 34 72Z" fill="${c}" stroke="${ink}" stroke-width="5"/>`,
    stahlhelm: (c = K.fieldgrey) => `<path d="M24 98 C20 44 58 18 100 18 C142 18 180 44 176 98 L182 108 L150 100 C150 82 130 70 100 70 C70 70 50 82 50 100 L18 108Z" fill="${c}" stroke="${ink}" stroke-width="6" stroke-linejoin="round"/>`,
    brodie: (c = "#7c7a52") => `<ellipse cx="100" cy="62" rx="84" ry="18" fill="${c}" stroke="${ink}" stroke-width="5"/><path d="M50 62 C50 22 150 22 150 62Z" fill="${c}" stroke="${ink}" stroke-width="5"/>`,
    adrian: (c = K.blueFR) => `<path d="M40 70 C40 22 160 22 160 70Z" fill="${c}" stroke="${ink}" stroke-width="5"/><path d="M60 30 C80 14 120 14 140 30" stroke="${ink}" stroke-width="5" fill="none"/><path d="M26 74 C60 62 140 62 174 74 C150 84 50 84 26 74Z" fill="${c}" stroke="${ink}" stroke-width="5"/>`,
    sovhelm: (c = "#5d6b45") => `<path d="M30 96 C24 40 64 20 100 20 C136 20 176 40 170 96 C150 78 128 70 100 70 C72 70 50 78 30 96Z" fill="${c}" stroke="${ink}" stroke-width="6"/>`,
    pilot: (c = "#6b4a2c") => `<path d="M34 110 C24 40 70 24 100 24 C130 24 176 40 166 110 C150 90 140 74 100 72 C60 74 50 90 34 110Z" fill="${c}" stroke="${ink}" stroke-width="5"/><g fill="#bfe3f2" stroke="${ink}" stroke-width="4"><circle cx="76" cy="58" r="16"/><circle cx="124" cy="58" r="16"/></g><path d="M92 58 H108" stroke="${ink}" stroke-width="4"/>`,
    nurse: () => `<path d="M48 64 C50 34 150 34 152 64Z" fill="#fff" stroke="${ink}" stroke-width="5"/>`,
  };

  const GLASSES = (c = ink) => `<g fill="none" stroke="${c}" stroke-width="4"><circle cx="80" cy="106" r="15"/><circle cx="120" cy="106" r="15"/><path d="M95 104 Q100 100 105 104"/></g>`;
  const CIGAR = `<g transform="translate(112 140) rotate(-12)"><rect x="0" y="-6" width="46" height="13" rx="5" fill="#7a4a24" stroke="${ink}" stroke-width="4"/><rect x="40" y="-6" width="7" height="13" fill="#bbb"/></g>`;
  const HOLDER = `<g transform="translate(112 140) rotate(-24)"><rect x="0" y="-3" width="58" height="6" rx="3" fill="${ink}"/><rect x="56" y="-5" width="16" height="10" rx="2" fill="#f4f4f4" stroke="${ink}" stroke-width="3"/></g>`;
  const JAW = (skin = C.skin) => `<path d="M48 126 C50 176 76 196 100 196 C124 196 150 176 152 126 C140 150 60 150 48 126Z" fill="${skin}" stroke="${ink}" stroke-width="6"/>`;

  // ---------- torsos ----------
  const TORSO = {
    suit: (c = K.suit, tie = K.red, bow = false) => `<path d="M86 172 L100 214 L114 172Z" fill="#fff" stroke="${ink}" stroke-width="4"/>` +
      (bow ? `<path d="M84 176 L100 184 L84 192Z M116 176 L100 184 L116 192Z" fill="${tie}" stroke="${ink}" stroke-width="3"/><g fill="#fff">${[[90, 182], [110, 182], [88, 188], [112, 188]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6"/>`).join("")}</g>` : `<path d="M96 178 L104 178 L108 210 L100 220 L92 210Z" fill="${tie}" stroke="${ink}" stroke-width="3"/>`) +
      `<path d="M70 176 L100 236 M130 176 L100 236" stroke="${ink}" stroke-width="5" fill="none"/><circle cx="100" cy="246" r="4" fill="${ink}"/>`,
    tunic: (c = K.fieldgreyDk) => `<path d="M100 176 V270" stroke="${ink}" stroke-width="3"/><g fill="${ink}">${[196, 216, 236, 256].map((y) => `<circle cx="104" cy="${y}" r="3.2"/>`).join("")}</g><rect x="64" y="194" width="26" height="20" rx="3" fill="none" stroke="${c}" stroke-width="4"/><rect x="110" y="194" width="26" height="20" rx="3" fill="none" stroke="${c}" stroke-width="4"/><path d="M80 172 L100 188 L120 172" stroke="${ink}" stroke-width="4" fill="none"/>`,
    blackshirt: () => `<path d="M80 172 L100 188 L120 172" stroke="#000" stroke-width="5" fill="none"/>`,
    apron: () => `<path d="M66 196 L134 196 L140 276 C120 284 80 284 60 276Z" fill="${K.apron}" stroke="${ink}" stroke-width="4"/><path d="M66 198 C70 180 130 180 134 198" stroke="${ink}" stroke-width="3" fill="none"/><path d="M76 230 h20 M104 250 h18" stroke="#4a6fa5" stroke-width="5" stroke-linecap="round"/>`,
    waiter: () => `<path d="M86 172 L100 200 L114 172Z" fill="#fff" stroke="${ink}" stroke-width="4"/><path d="M90 176 L100 182 L90 188Z M110 176 L100 182 L110 188Z" fill="${ink}"/><path d="M62 220 L138 220 L142 278 C120 286 80 286 58 278Z" fill="#fff" stroke="${ink}" stroke-width="4"/>`,
    hospital: () => `<path d="M60 186 H140 M60 206 H140 M60 226 H140 M60 246 H140" stroke="#8fb3d9" stroke-width="5"/>`,
  };

  // ---------- character builder ----------
  // Same options as Toon.char, plus: hair, stache, cap, capCol, glasses, cigar, holder, jaw, torso, extraHead
  function person(o = {}) {
    const headUnder = (o.hair ? HAIR[o.hair](o.hairCol) : "") + (o.jaw ? JAW(o.skin) : "") + (o.headUnderExtra || "");
    let head = "";
    if (o.stache) head += MOUSTACHE[o.stache](o.stacheCol);
    if (o.glasses) head += GLASSES();
    if (o.cigar) head += CIGAR;
    if (o.holder) head += HOLDER;
    if (o.cap) head += `<g transform="translate(0 ${o.capY ?? -8})">${CAP[o.cap](o.capCol, o.capBand)}</g>`;
    if (o.extraHead) head += o.extraHead;
    const torso = (o.torsoKind ? TORSO[o.torsoKind](...(o.torsoArgs || [])) : "") + (o.torsoExtra || "");
    return char({ belt: false, ...o, headUnder, head, torso });
  }

  // ---------- props (in scene coordinates) ----------
  const P = {
    umbrella: (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 0 V150 q0 18 -16 18" stroke="${ink}" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M-10 6 L0 -10 L10 6 L4 150 L-4 150Z" fill="#1c1c22" stroke="${ink}" stroke-width="3"/></g>`,
    clipboard: (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s}) rotate(-8)"><rect x="-26" y="-34" width="52" height="68" rx="5" fill="#c99a5a" stroke="${ink}" stroke-width="4"/><rect x="-20" y="-24" width="40" height="52" fill="#fff" stroke="${ink}" stroke-width="2"/><rect x="-10" y="-40" width="20" height="10" rx="3" fill="#888" stroke="${ink}" stroke-width="3"/><path d="M-14 -12 h28 M-14 -2 h28 M-14 8 h20" stroke="#999" stroke-width="3"/></g>`,
    // fuel gauge dial; level 0..1, or label for the "NO" joke
    gauge: (x, y, s = 1, level = 0.5, { id = "", label = "" } = {}) => {
      const a = -150 + 120 * level, r = (deg) => (deg * Math.PI) / 180;
      return `<g${id ? ` id="${id}"` : ""} transform="translate(${x} ${y}) scale(${s})"><circle r="70" fill="#fdf6e3" stroke="${ink}" stroke-width="7"/><path d="M${Math.cos(r(-150)) * 52} ${Math.sin(r(-150)) * 52} A52 52 0 0 1 ${Math.cos(r(-30)) * 52} ${Math.sin(r(-30)) * 52}" stroke="${ink}" stroke-width="5" fill="none"/><text x="-50" y="12" font-family="Fredoka" font-weight="700" font-size="22" fill="${K.red}">E</text><text x="38" y="12" font-family="Fredoka" font-weight="700" font-size="22" fill="${ink}">F</text><text x="0" y="48" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="${label ? 30 : 18}" fill="${label ? K.red : ink}">${label || "FUEL"}</text><g class="needle" transform="rotate(${a + 90})"><path d="M-5 0 L0 -54 L5 0Z" fill="${K.red}" stroke="${ink}" stroke-width="3"/></g><circle r="8" fill="${ink}"/></g>`;
    },
    stamp: (x, y, s = 1, word = "APPEASED", col = K.red, { id = "", rot = -8 } = {}) => {
      const w = word.length * 34 + 60;
      return `<g${id ? ` id="${id}"` : ""} transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"><rect x="${-w / 2}" y="-44" width="${w}" height="88" rx="10" fill="none" stroke="${col}" stroke-width="9"/><rect x="${-w / 2 + 12}" y="-32" width="${w - 24}" height="64" rx="6" fill="none" stroke="${col}" stroke-width="3"/><text y="20" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="58" fill="${col}" letter-spacing="2">${word}</text></g>`;
    },
    // the "Last One, Promise" form; wear 0 = crisp, 1 = coffee-stained, 2 = crumpled, 3 = napkin
    form: (x, y, s = 1, { wear = 0, place = "", id = "", no = false } = {}) => {
      const paper = wear >= 3 ? "#fbfbf6" : wear >= 2 ? "#ece2c8" : "#fffdf5";
      const shape = wear >= 3
        ? `<path d="M-150 -120 L-120 -126 L-90 -118 L-60 -126 L-30 -118 L0 -126 L30 -118 L60 -126 L90 -118 L120 -126 L150 -120 L144 120 L-144 126Z" fill="${paper}" stroke="${ink}" stroke-width="5"/>`
        : wear >= 2 ? `<path d="M-170 -210 L-60 -220 L40 -204 L176 -214 L170 -60 L182 60 L166 214 L40 206 L-60 220 L-176 210 L-166 60 L-180 -60Z" fill="${paper}" stroke="${ink}" stroke-width="5"/><path d="M-120 -160 L-40 -90 M60 -170 L120 -40 M-150 40 L-20 90 M40 120 L150 170" stroke="#d6caa8" stroke-width="3"/>`
        : `<rect x="-170" y="-215" width="340" height="430" rx="6" fill="${paper}" stroke="${ink}" stroke-width="5"/>`;
      const stain = wear >= 1 && wear < 3 ? `<circle cx="96" cy="140" r="44" fill="none" stroke="#a87b4f" stroke-width="10" opacity=".55"/><circle cx="110" cy="128" r="16" fill="#a87b4f" opacity=".3"/>` : "";
      const body = wear >= 3
        ? `<text y="-40" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="44" fill="${ink}">LAST ONE?</text><rect x="-120" y="2" width="44" height="44" fill="#fff" stroke="${ink}" stroke-width="5"/><path d="M-114 8 L-82 40 M-82 8 L-114 40" stroke="${K.red}" stroke-width="8"/><text x="-60" y="40" font-family="Fredoka" font-weight="700" font-size="48" fill="${K.red}">NO</text>`
        : `<text y="-165" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="26" fill="${ink}" letter-spacing="2">TERRITORIAL DEMAND</text><path d="M-140 -146 H140" stroke="${ink}" stroke-width="3"/>
           <text x="-140" y="-106" font-family="Fredoka" font-weight="600" font-size="22" fill="#555">Territory:</text><text x="-20" y="-106" font-family="Fredoka" font-weight="700" font-size="${place.length > 10 ? 22 : 28}" fill="${ink}">${place}</text>
           <text x="-140" y="-40" font-family="Fredoka" font-weight="600" font-size="22" fill="#555">Is this your last one?</text>
           <rect x="-140" y="-20" width="34" height="34" fill="#fff" stroke="${ink}" stroke-width="4"/><text x="-96" y="8" font-family="Fredoka" font-weight="700" font-size="26" fill="${ink}">Yes</text>
           <rect x="0" y="-20" width="34" height="34" fill="#fff" stroke="${ink}" stroke-width="4"/><text x="44" y="8" font-family="Fredoka" font-weight="700" font-size="26" fill="${ink}">No</text>
           ${no ? `<path d="M6 -14 L28 8 M28 -14 L6 8" stroke="${K.red}" stroke-width="6"/>` : `<path d="M-136 -4 L-124 10 L-102 -22" stroke="#2a6fdb" stroke-width="6" fill="none" stroke-linecap="round"/>`}
           <text x="-140" y="70" font-family="Fredoka" font-weight="600" font-size="22" fill="#555">Signed:</text><path d="M-40 70 ${wear >= 1 ? "c20 -30 30 20 50 -6 s30 -20 60 4 s20 10 40 -10" : "c14 -22 26 14 40 -4 s22 -12 40 2"}" stroke="#2a6fdb" stroke-width="4" fill="none"/>
           ${wear >= 2 ? `<text x="0" y="150" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="40" fill="#2a6fdb" transform="rotate(-8 0 150)">LAST ONE!!</text>` : ""}`;
      return `<g${id ? ` id="${id}"` : ""} transform="translate(${x} ${y}) scale(${s}) rotate(${wear >= 2 ? -4 : -2})">${shape}${stain}${body}</g>`;
    },
    banner: (x, y, w, text, { id = "", col = "#2f6b3a", fg = "#fffaf0", size = 64, rot = -2, strike = false } = {}) =>
      `<g${id ? ` id="${id}"` : ""} transform="translate(${x} ${y}) rotate(${rot})"><path d="M${-w / 2 - 40} -10 L${-w / 2} -50 L${-w / 2} 50 Z M${w / 2 + 40} -10 L${w / 2} -50 L${w / 2} 50 Z" fill="${col}" stroke="${ink}" stroke-width="5"/><rect x="${-w / 2}" y="-56" width="${w}" height="112" rx="6" fill="${col}" stroke="${ink}" stroke-width="6"/><text y="${size * 0.35}" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="${size}" fill="${fg}">${text}</text>${strike ? `<path d="M${-w / 2 + 20} 0 L${w / 2 - 20} 0" stroke="${K.red}" stroke-width="12" stroke-linecap="round"/>` : ""}</g>`,
    sausage: (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s}) rotate(-20)"><rect x="-6" y="-60" width="6" height="70" fill="#d9c08a" stroke="${ink}" stroke-width="2"/><rect x="-16" y="-70" width="26" height="62" rx="13" fill="#b5532f" stroke="${ink}" stroke-width="4"/></g>`,
    radio: (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-70 60 L-70 -20 C-70 -70 70 -70 70 -20 L70 60Z" fill="#6b4226" stroke="${ink}" stroke-width="6"/><circle cy="-6" r="36" fill="#d8c08a" stroke="${ink}" stroke-width="5"/><path d="M-30 -6 H30 M-26 -18 H26 M-26 6 H26" stroke="#8a6a3a" stroke-width="3"/><circle cx="-34" cy="44" r="9" fill="#d8c08a" stroke="${ink}" stroke-width="4"/><circle cx="34" cy="44" r="9" fill="#d8c08a" stroke="${ink}" stroke-width="4"/></g>`,
    box: (x, y, w = 260, h = 200, { id = "", flaps = true, label = "" } = {}) => `<g${id ? ` id="${id}"` : ""} transform="translate(${x} ${y})"><rect x="${-w / 2}" y="${-h}" width="${w}" height="${h}" fill="#c99a5a" stroke="${ink}" stroke-width="6"/>${flaps ? `<path d="M${-w / 2} ${-h} L${-w / 2 - 40} ${-h - 50} L${-w / 2 + 40} ${-h - 30}Z M${w / 2} ${-h} L${w / 2 + 40} ${-h - 50} L${w / 2 - 40} ${-h - 30}Z" fill="#b5864a" stroke="${ink}" stroke-width="5"/>` : ""}<path d="M${-w / 2 + 20} ${-h / 2} H${w / 2 - 20}" stroke="#a8763c" stroke-width="5" stroke-dasharray="14 10"/>${label ? `<text y="${-h / 2 + 50}" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="28" fill="${ink}">${label}</text>` : ""}</g>`,
  };

  // ---------- cast ----------
  const SKIN = C.skin;
  const CAST = {
    hitler: (x = {}) => person({ body: K.brown, sleeve: K.brown, legs: "#4a3b28", hair: "sidepart", stache: "toothbrush", torsoKind: "tunic", torsoArgs: ["#6e583a"], brows: "angry", ...x }),
    hitlerSick: (x = {}) => person({ body: "#e8eef5", sleeve: "#e8eef5", legs: "#cdd6e0", hair: "sidepart", stache: "toothbrush", torsoKind: "hospital", extraHead: `<path d="M40 96 C70 90 130 90 162 96 L162 118 C130 112 70 112 40 118Z" fill="#fff" stroke="${ink}" stroke-width="4"/>`, brows: "angry", ...x }),
    stalin: (x = {}) => person({ body: K.khakiSU, sleeve: K.khakiSU, legs: "#5b5440", hair: "swept", stache: "walrus", torsoKind: "tunic", torsoArgs: ["#7d7450"], brows: "neutral", mouth: "flat", ...x }),
    mussolini: (x = {}) => person({ body: K.shirtBlack, sleeve: K.shirtBlack, legs: "#2a2a2a", hat: "bald", jaw: true, torsoKind: "blackshirt", brows: "smug", mouth: "smirk", ...x }),
    enzo: (x = {}) => person({ body: "#8a8f7a", sleeve: "#8a8f7a", legs: "#4b4b45", cap: "flat", torsoKind: "apron", stache: "thin", stacheCol: "#3a2a1a", brows: "neutral", mouth: "flat", ...x }),
    chamberlain: (x = {}) => person({ body: K.suit, sleeve: K.suit, legs: "#2a2a2f", hair: "neat", hairCol: "#8a8a8a", stache: "bushy", stacheCol: "#9a9a9a", torsoKind: "suit", torsoArgs: [K.suit, "#46536b"], brows: "happy", mouth: "smile", ...x }),
    churchill: (x = {}) => person({ body: K.suit, sleeve: K.suit, legs: "#2a2a2f", hat: "bald", hairCol: "#d9c3a0", torsoKind: "suit", torsoArgs: [K.suit, "#2a4f9a", true], cigar: true, brows: "angry", mouth: "frown", skin: "#f4cfa8", ...x }),
    fdr: (x = {}) => person({ body: K.suitGrey, sleeve: K.suitGrey, legs: "#55585f", hair: "neat", hairCol: "#a9a9a9", glasses: true, holder: true, torsoKind: "suit", torsoArgs: [K.suitGrey, "#2f4f7f"], brows: "happy", mouth: "grin", ...x }),
    klaus: (x = {}) => person({ body: K.fieldgrey, sleeve: K.fieldgrey, legs: "#4b5045", cap: "side", hair: "neat", hairCol: "#c9a25a", torsoKind: "tunic", brows: "worried", mouth: "flat", ...x }),
    degaulle: (x = {}) => person({ body: "#8a7d55", sleeve: "#8a7d55", legs: "#5b5238", cap: "kepi", stache: "thin", stacheCol: "#3a2a1a", torsoKind: "tunic", torsoArgs: ["#6f6440"], brows: "smug", mouth: "flat", ...x }),
    conservative: (x = {}) => person({ body: K.suit, sleeve: K.suit, legs: "#2a2a2f", cap: "tophat", capY: -18, hat: "bald", stache: "bushy", torsoKind: "suit", torsoArgs: [K.suit, "#6b6b6b"], brows: "smug", mouth: "smirk", ...x }),
    diplomatDE: (x = {}) => person({ body: K.suit, sleeve: K.suit, legs: "#2a2a2f", hair: "neat", hairCol: "#7a6a52", stache: "thin", torsoKind: "suit", torsoArgs: [K.suit, "#444"], brows: "worried", ...x }),
    diplomatFR: (x = {}) => person({ body: K.navy, sleeve: K.navy, legs: "#25304a", hat: "bald", stache: "bushy", stacheCol: "#5a4a3a", torsoKind: "suit", torsoArgs: [K.navy, "#b3262e"], brows: "smug", mouth: "smirk", ...x }),
    waiter: (x = {}) => person({ body: "#1f1f24", sleeve: "#1f1f24", legs: "#1f1f24", hair: "neat", hairCol: "#2a1d12", stache: "thin", torsoKind: "waiter", brows: "neutral", ...x }),
    civilian: (x = {}) => person({ body: "#7a6a5a", sleeve: "#7a6a5a", legs: "#4a4038", cap: "flat", capCol: "#5a5048", brows: "neutral", ...x }),
    guard: (x = {}) => person({ body: "#4a5a6a", sleeve: "#4a5a6a", legs: "#333c46", cap: "peaked", capCol: "#4a5a6a", capBand: "#2a3440", torsoKind: "tunic", brows: "neutral", ...x }),
    clerkUK: (x = {}) => person({ body: K.suit, sleeve: K.suit, legs: "#2a2a2f", hair: "neat", hairCol: "#6a5a4a", glasses: true, torsoKind: "suit", torsoArgs: [K.suit, "#1f3f7f"], ...x }),
    clerkFR: (x = {}) => person({ body: K.navy, sleeve: K.navy, legs: "#25304a", hair: "neat", hairCol: "#2a1d12", stache: "thin", torsoKind: "suit", torsoArgs: [K.navy, "#b3262e"], ...x }),
    soldierDE: (x = {}) => person({ body: K.fieldgrey, sleeve: K.fieldgrey, legs: "#4b5045", cap: "stahlhelm", capY: -16, torsoKind: "tunic", ...x }),
    soldierUK: (x = {}) => person({ body: K.khakiUK, sleeve: K.khakiUK, legs: "#6e5f3e", cap: "brodie", capY: -20, torsoKind: "tunic", torsoArgs: ["#7e6b45"], ...x }),
    soldierFR: (x = {}) => person({ body: K.blueFR, sleeve: K.blueFR, legs: "#4f6a8f", cap: "adrian", capY: -18, torsoKind: "tunic", torsoArgs: ["#56739a"], stache: "thin", ...x }),
    soldierSU: (x = {}) => person({ body: K.khakiSU, sleeve: K.khakiSU, legs: "#5b5440", cap: "sovhelm", capY: -16, torsoKind: "tunic", torsoArgs: ["#7d7450"], ...x }),
    officerDE: (x = {}) => person({ body: K.fieldgrey, sleeve: K.fieldgrey, legs: "#4b5045", cap: "peaked", torsoKind: "tunic", stache: "thin", brows: "smug", ...x }),
    generalFR: (x = {}) => person({ body: K.blueFR, sleeve: K.blueFR, legs: "#4f6a8f", cap: "kepi", capCol: "#2b3a5a", stache: "bushy", torsoKind: "tunic", torsoArgs: ["#56739a"], brows: "smug", ...x }),
    pilotDE: (x = {}) => person({ body: "#5d5a45", sleeve: "#5d5a45", legs: "#3d3a2d", cap: "pilot", capCol: "#4a3b2a", torsoKind: "tunic", ...x }),
    aide: (x = {}) => person({ body: K.khakiSU, sleeve: K.khakiSU, legs: "#5b5440", hair: "neat", hairCol: "#4a3a2a", torsoKind: "tunic", torsoArgs: ["#7d7450"], brows: "worried", ...x }),
    kid: (x = {}) => person({ kid: true, body: "#5a7d9a", sleeve: "#5a7d9a", legs: "#3e5468", hair: "neat", hairCol: "#7a5230", brows: "neutral", ...x }),
    czech: (x = {}) => person({ body: "#6a5a7a", sleeve: "#6a5a7a", legs: "#3a3448", cap: "homburg", hair: "neat", torsoKind: "suit", torsoArgs: ["#6a5a7a", "#2a6fdb"], brows: "worried", mouth: "open", ...x }),
  };

  g.WW = { K, HAIR, MOUSTACHE, CAP, TORSO, person, CAST, P, GLASSES };
})(globalThis);
