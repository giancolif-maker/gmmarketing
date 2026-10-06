// Cartoon kit for "The Second Punic War". Every function returns an SVG string.
// Characters are drawn in a 200×300 box with their feet at (100, 300); use
// Toon.place() to put one in a scene. Classic script: defines globalThis.Toon.
(function (g) {
  const C = {
    ink: "#2b1e16", paper: "#f3e3c3", paperDk: "#e2c99a", sea: "#1f3550", seaLt: "#2c4a6e",
    land: "#d8c49a", landDk: "#bfa877", rome: "#c8352b", romeDk: "#962419", carth: "#6b3fa0",
    carthDk: "#4b2a73", gold: "#e2b33c", bronze: "#c08a3e", bronzeDk: "#8f6328", skin: "#f1c79a",
    skinDk: "#d9a777", skinTan: "#c98d5a", skinTanDk: "#a8703f", white: "#fffaf0", grey: "#8d8f99",
    greyDk: "#6a6c78", snow: "#f4f7fb", sky: "#9fd0ea", grass: "#8fb35a", grassDk: "#6d8f3e",
    fire: "#f28a1a", fireLt: "#ffd23f", wood: "#8a5a32", stone: "#b8ad9c", stoneDk: "#8f8576",
  };
  const S = 6; // outline width
  const r1 = (n) => Math.round(n * 10) / 10;

  // ---------- placement ----------
  // x,y = feet position in scene; s = scale (1 → 300px tall); flip mirrors.
  function place(svg, x, y, s = 1, { flip = false, id = "", cls = "", rot = 0 } = {}) {
    const sx = flip ? -s : s;
    const attrs = `${id ? ` id="${id}"` : ""}${cls ? ` class="${cls}"` : ""}`;
    return `<g${attrs} transform="translate(${r1(x)} ${r1(y)}) rotate(${rot}) scale(${sx} ${s}) translate(-100 -300)">${svg}</g>`;
  }
  const wrapG = (inner, id, cls) => `<g${id ? ` id="${id}"` : ""}${cls ? ` class="${cls}"` : ""}>${inner}</g>`;

  // ---------- face parts ----------
  const BROWS = {
    neutral: "M62 86 L90 86 M110 86 L138 86",
    angry: "M60 78 L92 92 M140 78 L108 92",
    furious: "M58 74 L94 94 M142 74 L106 94",
    worried: "M62 92 L90 80 M138 92 L110 80",
    happy: "M62 84 Q76 74 90 84 M110 84 Q124 74 138 84",
    surprised: "M64 74 Q76 64 90 72 M110 72 Q124 64 136 74",
    smug: "M62 88 L90 84 M110 80 L138 90",
    sad: "M62 90 L90 82 M138 90 L110 82",
  };
  const MOUTHS = {
    flat: `<path d="M88 142 L112 142" stroke="${C.ink}" stroke-width="5" stroke-linecap="round" fill="none"/>`,
    smile: `<path d="M84 138 Q100 154 116 138" stroke="${C.ink}" stroke-width="5" stroke-linecap="round" fill="none"/>`,
    grin: `<path d="M80 136 Q100 162 120 136 Z" fill="${C.ink}"/><path d="M86 138 L114 138" stroke="#fff" stroke-width="4"/>`,
    frown: `<path d="M86 148 Q100 136 114 148" stroke="${C.ink}" stroke-width="5" stroke-linecap="round" fill="none"/>`,
    open: `<ellipse cx="100" cy="146" rx="11" ry="13" fill="${C.ink}"/><ellipse cx="100" cy="152" rx="6" ry="4" fill="#d9534f"/>`,
    shout: `<path d="M80 134 Q100 132 120 134 Q118 166 100 168 Q82 166 80 134Z" fill="${C.ink}"/><ellipse cx="100" cy="158" rx="10" ry="6" fill="#d9534f"/>`,
    grit: `<rect x="82" y="134" width="36" height="16" rx="5" fill="#fff" stroke="${C.ink}" stroke-width="4"/><path d="M94 134 V150 M106 134 V150" stroke="${C.ink}" stroke-width="3"/>`,
    smirk: `<path d="M88 144 Q104 146 116 134" stroke="${C.ink}" stroke-width="5" stroke-linecap="round" fill="none"/>`,
    wobbly: `<path d="M84 144 q4 -5 8 0 t8 0 t8 0 t8 0" stroke="${C.ink}" stroke-width="5" stroke-linecap="round" fill="none"/>`,
  };

  // ---------- headgear / hair ----------
  function hat(kind, o) {
    const crest = o.crest || (kind === "roman" ? C.rome : C.carth);
    switch (kind) {
      case "roman": // bronze dome + transverse red crest + cheek guards
        return `<path d="M98 6 C118 -4 150 0 160 30 L150 34 C140 14 118 12 100 16 C82 12 60 14 50 34 L40 30 C50 0 82 -4 98 6Z" fill="${crest}" stroke="${C.ink}" stroke-width="${S}"/>
          <path d="M30 98 C28 50 60 22 100 22 C140 22 172 50 170 98 L156 98 C150 70 130 56 100 56 C70 56 50 70 44 98Z" fill="${C.bronze}" stroke="${C.ink}" stroke-width="${S}"/>
          <path d="M34 96 L48 96 L52 138 L38 132Z M166 96 L152 96 L148 138 L162 132Z" fill="${C.bronze}" stroke="${C.ink}" stroke-width="5" stroke-linejoin="round"/>
          <path d="M58 40 Q100 28 142 40" stroke="${C.bronzeDk}" stroke-width="4" fill="none"/>`;
      case "carth": // gold rounded cap + tall plume
        return `<path d="M100 22 C96 -6 120 -20 136 -12 C122 -6 116 8 112 24Z" fill="${crest}" stroke="${C.ink}" stroke-width="5"/>
          <path d="M32 94 C30 46 62 24 100 24 C138 24 170 46 168 94 C150 82 128 76 100 76 C72 76 50 82 32 94Z" fill="${C.gold}" stroke="${C.ink}" stroke-width="${S}"/>
          <path d="M44 74 Q100 54 156 74" stroke="${C.bronzeDk}" stroke-width="4" fill="none"/>`;
      case "hannibal": // Carthaginian helmet with a big purple brush crest
        return `<path d="M60 20 C70 -18 140 -22 150 14 C160 30 150 40 140 34 C128 6 84 4 70 30 C58 36 52 30 60 20Z" fill="${C.carth}" stroke="${C.ink}" stroke-width="5"/>
          <path d="M32 96 C30 46 62 24 100 24 C138 24 170 46 168 96 C150 82 128 76 100 76 C72 76 50 82 32 96Z" fill="${C.gold}" stroke="${C.ink}" stroke-width="${S}"/>
          <path d="M44 74 Q100 54 156 74" stroke="${C.bronzeDk}" stroke-width="4" fill="none"/>`;
      case "laurel":
        return `<path d="M42 70 Q100 30 158 70" stroke="#4f7d32" stroke-width="10" fill="none" stroke-linecap="round"/>
          ${[52, 70, 88, 112, 130, 148].map((x, i) => `<ellipse cx="${x}" cy="${i < 3 ? 62 - i * 8 : 46 + (i - 3) * 8}" rx="10" ry="5" fill="#6aa043" stroke="${C.ink}" stroke-width="2" transform="rotate(${i < 3 ? -30 : 30} ${x} ${i < 3 ? 62 - i * 8 : 46 + (i - 3) * 8})"/>`).join("")}`;
      case "bald": // shine + side fringe
        return `<path d="M34 112 C30 92 36 80 44 76 M166 112 C170 92 164 80 156 76" stroke="${o.hairCol || "#cfcfcf"}" stroke-width="14" stroke-linecap="round" fill="none"/>
          <ellipse cx="78" cy="58" rx="16" ry="8" fill="#fff" opacity=".55" transform="rotate(-25 78 58)"/>`;
      case "hair": // short hair cap
        return `<path d="M34 100 C26 44 66 30 100 30 C140 30 176 46 166 100 C160 76 140 62 120 66 C106 56 84 58 70 68 C54 66 40 80 34 100Z" fill="${o.hairCol || "#3a2618"}" stroke="${C.ink}" stroke-width="5"/>`;
      case "curly":
        return `<g fill="${o.hairCol || "#3a2618"}" stroke="${C.ink}" stroke-width="4">${[[46, 70], [62, 50], [84, 40], [108, 38], [132, 46], [152, 64], [160, 86], [40, 92]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="18"/>`).join("")}</g>`;
      case "gaul": // shaggy hair + moustache drawn in face()
        return `<path d="M28 108 C18 40 70 24 100 26 C140 24 184 44 172 110 L160 96 L150 112 L140 92 C120 70 80 70 60 92 L50 112 L40 96Z" fill="${o.hairCol || "#c9862f"}" stroke="${C.ink}" stroke-width="5" stroke-linejoin="round"/>`;
      case "chef":
        return `<path d="M56 60 C30 50 40 10 70 18 C76 -6 124 -6 130 18 C160 10 170 50 144 60Z" fill="#fff" stroke="${C.ink}" stroke-width="${S}"/><rect x="56" y="52" width="88" height="22" rx="6" fill="#fff" stroke="${C.ink}" stroke-width="${S}"/>`;
      default:
        return "";
    }
  }

  // ---------- arms ----------
  // Each arm: shoulder → elbow → hand. Coordinates in char box.
  const POSES = {
    idle: [[[58, 190], [42, 228], [50, 256]], [[142, 190], [158, 228], [150, 256]]],
    point: [[[58, 190], [42, 228], [50, 256]], [[142, 186], [182, 176], [214, 166]]],
    pointUp: [[[58, 190], [42, 228], [50, 256]], [[142, 186], [170, 150], [178, 112]]],
    raise: [[[58, 190], [42, 228], [50, 256]], [[142, 186], [168, 152], [176, 118]]],
    shrug: [[[58, 190], [26, 200], [16, 172]], [[142, 190], [174, 200], [184, 172]]],
    armsUp: [[[58, 186], [30, 150], [22, 112]], [[142, 186], [170, 150], [178, 112]]],
    hips: [[[58, 190], [28, 214], [52, 238]], [[142, 190], [172, 214], [148, 238]]],
    hold: [[[58, 190], [60, 226], [92, 222]], [[142, 190], [140, 226], [108, 222]]],
    holdUp: [[[58, 188], [48, 160], [76, 132]], [[142, 188], [152, 160], [124, 132]]],
    wave: [[[58, 190], [42, 228], [50, 256]], [[142, 186], [182, 160], [190, 120]]],
    cross: [[[58, 190], [84, 214], [130, 206]], [[142, 190], [116, 222], [70, 214]]],
    reach: [[[58, 190], [20, 196], [-14, 198]], [[142, 190], [180, 196], [214, 198]]],
  };
  function arm(pts, col) {
    const d = `M${pts[0]} Q${pts[1]} ${pts[2]}`;
    return `<path d="${d}" stroke="${C.ink}" stroke-width="28" stroke-linecap="round" fill="none"/>
      <path d="${d}" stroke="${col}" stroke-width="16" stroke-linecap="round" fill="none"/>`;
  }

  // ---------- character ----------
  // o: { body, skin, hat, crest, hairCol, beard, beardCol, brows, mouth, pose, eyepatch,
  //      toga, cape, kid, belt, sword, shield, prop, eyes:'dot'|'closed'|'wide'|'spiral', blush, sweat, moustache }
  function char(o = {}) {
    const body = o.body || C.rome, skin = o.skin || C.skin, ink = C.ink;
    const pose = POSES[o.pose || "idle"];
    const sleeve = o.sleeve || skin;
    let s = "";
    if (o.cape) s += `<path d="M52 176 C30 230 34 280 44 296 L156 296 C166 280 170 230 148 176Z" fill="${o.cape}" stroke="${ink}" stroke-width="${S}"/>`;
    // legs
    s += `<rect x="72" y="256" width="20" height="42" rx="8" fill="${o.legs || C.skinDk}" stroke="${ink}" stroke-width="5"/>
      <rect x="108" y="256" width="20" height="42" rx="8" fill="${o.legs || C.skinDk}" stroke="${ink}" stroke-width="5"/>
      <path d="M64 298 h32 M104 298 h32" stroke="${ink}" stroke-width="8" stroke-linecap="round"/>`;
    // back arm (left) drawn before body
    s += arm(pose[0], sleeve);
    // body (bean)
    s += `<path d="M58 178 C46 210 46 252 54 270 C70 284 130 284 146 270 C154 252 154 210 142 178 C124 166 76 166 58 178Z" fill="${body}" stroke="${ink}" stroke-width="${S}"/>`;
    if (o.armor) s += `<path d="M62 186 C60 210 62 228 66 238 L134 238 C138 228 140 210 138 186 C120 176 80 176 62 186Z" fill="${o.armor}" stroke="${ink}" stroke-width="4"/><path d="M74 200 H126 M72 216 H128" stroke="${C.bronzeDk}" stroke-width="3"/>`;
    if (o.toga) s += `<path d="M60 180 C90 200 120 240 146 266 C150 250 150 214 142 180 C128 170 112 168 100 170Z" fill="${o.toga === true ? C.white : o.toga}" stroke="${ink}" stroke-width="4" stroke-linejoin="round"/><path d="M84 178 C104 204 122 230 136 252" stroke="#d8cbb0" stroke-width="4" fill="none"/>`;
    if (o.togaStripe) s += `<path d="M64 182 C94 202 122 240 146 264" stroke="${o.togaStripe}" stroke-width="7" fill="none"/>`;
    if (o.belt !== false && !o.toga) s += `<path d="M52 240 Q100 250 148 240" stroke="${o.belt || C.ink}" stroke-width="7" fill="none"/>`;
    if (o.trim) s += `<path d="M50 262 Q100 276 150 262" stroke="${o.trim}" stroke-width="8" fill="none"/>`;
    // head
    const hr = o.kid ? 62 : 68;
    s += `<circle cx="100" cy="104" r="${hr}" fill="${skin}" stroke="${ink}" stroke-width="${S}"/>`;
    if (o.hat === "bald" || o.hat === "hair" || o.hat === "curly" || o.hat === "gaul") s += hat(o.hat, o);
    // beard
    if (o.beard) s += `<path d="M38 112 C40 150 66 182 100 182 C134 182 160 150 162 112 C150 128 136 132 124 128 C112 138 88 138 76 128 C64 132 50 128 38 112Z" fill="${o.beardCol || "#22160f"}" stroke="${ink}" stroke-width="5"/>`;
    if (o.moustache) s += `<path d="M70 132 C80 122 96 124 100 130 C104 124 120 122 130 132 C122 138 108 136 100 134 C92 136 78 138 70 132Z" fill="${o.beardCol || o.hairCol || "#c9862f"}" stroke="${ink}" stroke-width="4"/>`;
    // eyes
    const eyes = o.eyes || "dot";
    if (eyes === "dot") s += `<circle cx="80" cy="106" r="7.5" fill="${ink}"/><circle cx="120" cy="106" r="7.5" fill="${ink}"/>`;
    else if (eyes === "wide") s += `<circle cx="80" cy="106" r="13" fill="#fff" stroke="${ink}" stroke-width="4"/><circle cx="120" cy="106" r="13" fill="#fff" stroke="${ink}" stroke-width="4"/><circle cx="80" cy="106" r="5" fill="${ink}"/><circle cx="120" cy="106" r="5" fill="${ink}"/>`;
    else if (eyes === "closed") s += `<path d="M70 108 Q80 100 90 108 M110 108 Q120 100 130 108" stroke="${ink}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
    else if (eyes === "spiral") s += `<path d="M80 106 m-8 0 a8 8 0 1 1 8 8 a4 4 0 1 1 -4 -4 M120 106 m-8 0 a8 8 0 1 1 8 8 a4 4 0 1 1 -4 -4" stroke="${ink}" stroke-width="3" fill="none"/>`;
    else if (eyes === "x") s += `<path d="M72 98 l16 16 M88 98 l-16 16 M112 98 l16 16 M128 98 l-16 16" stroke="${ink}" stroke-width="5" stroke-linecap="round"/>`;
    if (o.eyepatch) s += `<path d="M36 82 L164 96" stroke="${ink}" stroke-width="4"/><ellipse cx="120" cy="106" rx="17" ry="14" fill="${ink}"/>`;
    s += `<path d="${BROWS[o.brows || "neutral"]}" stroke="${ink}" stroke-width="${o.kid ? 7 : 9}" stroke-linecap="round" fill="none"/>`;
    if (!o.beard || o.mouth) s += MOUTHS[o.mouth || "flat"];
    if (o.blush) s += `<ellipse cx="66" cy="128" rx="10" ry="6" fill="#e98a7a" opacity=".6"/><ellipse cx="134" cy="128" rx="10" ry="6" fill="#e98a7a" opacity=".6"/>`;
    if (o.sweat) s += `<path d="M156 66 C150 78 150 86 156 88 C162 86 162 78 156 66Z" fill="#8fd3ff" stroke="${ink}" stroke-width="3"/>`;
    // helmets sit on top of the head
    if (["roman", "carth", "hannibal", "laurel", "chef"].includes(o.hat)) s += `<g transform="translate(0 ${o.hat === "laurel" ? 0 : -15})">${hat(o.hat, o)}</g>`;
    // front arm (right) + held prop
    s += arm(pose[1], sleeve);
    if (o.sword) { const h = pose[1][2]; s += `<g transform="translate(${h[0]} ${h[1]}) rotate(${o.swordRot ?? -40})"><rect x="-4" y="-78" width="12" height="74" rx="3" fill="#dfe6ee" stroke="${ink}" stroke-width="4"/><rect x="-14" y="-6" width="32" height="9" rx="3" fill="${C.gold}" stroke="${ink}" stroke-width="4"/><rect x="-3" y="2" width="10" height="20" rx="3" fill="${C.wood}" stroke="${ink}" stroke-width="4"/></g>`; }
    if (o.spear) { const h = pose[1][2]; s += `<path d="M${h[0]} ${h[1] + 60} L${h[0]} ${h[1] - 120}" stroke="${ink}" stroke-width="12" stroke-linecap="round"/><path d="M${h[0]} ${h[1] + 60} L${h[0]} ${h[1] - 120}" stroke="${C.wood}" stroke-width="6"/><path d="M${h[0] - 10} ${h[1] - 116} L${h[0]} ${h[1] - 150} L${h[0] + 10} ${h[1] - 116}Z" fill="#dfe6ee" stroke="${ink}" stroke-width="4"/>`; }
    if (o.shield) s += `<rect x="18" y="176" width="70" height="104" rx="18" fill="${o.shield}" stroke="${ink}" stroke-width="${S}"/><circle cx="53" cy="228" r="12" fill="${C.gold}" stroke="${ink}" stroke-width="4"/><path d="M30 196 H76 M30 260 H76" stroke="${C.gold}" stroke-width="5"/>`;
    if (o.roundShield) s += `<circle cx="56" cy="226" r="46" fill="${o.roundShield}" stroke="${ink}" stroke-width="${S}"/><circle cx="56" cy="226" r="14" fill="${C.gold}" stroke="${ink}" stroke-width="4"/>`;
    if (o.prop) s += o.prop;
    return s;
  }

  // ---------- cast presets ----------
  const CAST = {
    hannibal: (x = {}) => char({ body: C.carth, armor: C.gold, hat: "hannibal", beard: true, brows: "angry", cape: C.carthDk, legs: C.skinTanDk, skin: C.skinTan, ...x }),
    hannibalKid: (x = {}) => char({ body: C.carth, hat: "hair", kid: true, brows: "angry", skin: C.skinTan, legs: C.skinTanDk, belt: C.gold, ...x }),
    hamilcar: (x = {}) => char({ body: C.carth, armor: C.bronze, hat: "carth", crest: C.rome, beard: true, beardCol: "#4a2f1d", brows: "furious", skin: C.skinTan, legs: C.skinTanDk, cape: C.romeDk, ...x }),
    hasdrubal: (x = {}) => char({ body: C.carth, armor: C.gold, hat: "curly", hairCol: "#1d140e", brows: "smug", mouth: "smirk", skin: C.skinTan, legs: C.skinTanDk, cape: "#e07ab0", ...x }),
    gisgo: (x = {}) => char({ body: "#efe6d2", hat: "carth", crest: "#9b6fd0", brows: "worried", mouth: "wobbly", skin: C.skinTan, legs: C.skinTanDk, belt: C.carth, roundShield: C.carth, ...x }),
    carthSoldier: (x = {}) => char({ body: "#efe6d2", hat: "carth", brows: "angry", skin: C.skinTan, legs: C.skinTanDk, belt: C.carth, roundShield: C.carth, ...x }),
    carthSenator: (x = {}) => char({ body: C.carth, toga: "#efe6d2", hat: "bald", hairCol: "#2a2a2a", beard: true, beardCol: "#555", brows: "neutral", skin: C.skinTan, legs: C.skinTanDk, ...x }),
    hanno: (x = {}) => char({ body: C.carthDk, toga: "#e9e0f2", togaStripe: C.gold, hat: "bald", hairCol: "#ddd", brows: "smug", mouth: "flat", eyes: "closed", skin: C.skinTan, legs: C.skinTanDk, ...x }),
    flaccus: (x = {}) => char({ body: C.white, toga: true, togaStripe: C.rome, hat: "bald", brows: "neutral", mouth: "flat", ...x }),
    romanSenator: (x = {}) => char({ body: C.white, toga: true, togaStripe: C.rome, hat: "bald", brows: "neutral", ...x }),
    envoy: (x = {}) => char({ body: C.white, toga: true, togaStripe: C.rome, hat: "laurel", hairCol: "#666", brows: "smug", mouth: "smirk", ...x }),
    legionary: (x = {}) => char({ body: C.rome, armor: "#c9ccd3", hat: "roman", brows: "angry", shield: C.rome, ...x }),
    scipio: (x = {}) => char({ body: C.rome, armor: C.bronze, hat: "roman", crest: "#f4f0e6", brows: "worried", cape: C.romeDk, ...x }),
    publius: (x = {}) => char({ body: C.rome, hat: "hair", hairCol: "#7a4a24", brows: "happy", mouth: "smile", kid: true, cape: C.rome, ...x }),
    saguntine: (x = {}) => char({ body: "#7fb3d5", hat: "hair", hairCol: "#2f1f14", brows: "happy", mouth: "smile", belt: C.white, ...x }),
    gaul: (x = {}) => char({ body: "#5f8f4a", hat: "gaul", moustache: true, hairCol: "#c9862f", brows: "angry", mouth: "grin", legs: "#6b4a2a", ...x }),
    kid: (x = {}) => char({ body: "#e8a33d", hat: "hair", kid: true, brows: "happy", mouth: "smile", ...x }),
    spy: (x = {}) => char({ body: C.rome, hat: "roman", beard: true, beardCol: "#2a1a10", brows: "smug", mouth: "smirk", ...x }),
    mercenary: (x = {}) => char({ body: "#a0693a", hat: "gaul", hairCol: "#3b2b1e", moustache: true, brows: "furious", mouth: "shout", legs: "#5a3a20", ...x }),
  };

  // ---------- Surus the elephant (400×300 box, feet at y=300) ----------
  function elephant(o = {}) {
    const g1 = o.col || C.grey, g2 = C.greyDk, ink = C.ink;
    let s = "";
    s += `<rect x="96" y="214" width="44" height="84" rx="14" fill="${g2}" stroke="${ink}" stroke-width="${S}"/><rect x="236" y="214" width="44" height="84" rx="14" fill="${g2}" stroke="${ink}" stroke-width="${S}"/>`;
    s += `<path d="M66 170 C60 110 120 70 200 70 C290 70 334 120 328 180 C324 230 280 250 200 250 C120 250 70 230 66 170Z" fill="${g1}" stroke="${ink}" stroke-width="${S}"/>`;
    s += `<path d="M66 160 C50 170 44 190 52 200" stroke="${ink}" stroke-width="6" fill="none" stroke-linecap="round"/>`;
    s += `<rect x="130" y="222" width="44" height="76" rx="14" fill="${g1}" stroke="${ink}" stroke-width="${S}"/><rect x="262" y="222" width="44" height="76" rx="14" fill="${g1}" stroke="${ink}" stroke-width="${S}"/>`;
    if (o.blanket !== false) s += `<path d="M130 84 C170 72 240 72 270 84 L262 186 C220 198 170 198 138 186Z" fill="${o.blanket || C.carth}" stroke="${ink}" stroke-width="5"/><path d="M138 178 C176 190 224 190 262 178" stroke="${C.gold}" stroke-width="8" fill="none"/>`;
    // head
    s += `<circle cx="318" cy="128" r="62" fill="${g1}" stroke="${ink}" stroke-width="${S}"/>`;
    s += `<path d="M298 86 C250 60 222 110 236 160 C246 196 286 196 300 168Z" fill="${g1}" stroke="${ink}" stroke-width="${S}"/><path d="M290 104 C262 92 250 120 258 150" stroke="${g2}" stroke-width="6" fill="none"/>`;
    // trunk
    const trunk = o.trunk === "up" ? "M350 158 C382 150 392 110 380 70 C376 58 364 60 366 72 C374 104 366 132 344 140"
      : o.trunk === "snorkel" ? "M346 150 C366 120 372 60 368 -20 L352 -20 C352 50 348 110 330 136"
      : "M350 158 C372 184 376 228 362 262 C358 272 346 270 348 260 C358 230 352 196 334 176";
    s += `<path d="${trunk}" fill="${g1}" stroke="${ink}" stroke-width="${S}" stroke-linejoin="round"/>`;
    if (o.tusk !== false) s += `<path d="M330 168 C344 196 370 204 390 196 C370 190 352 178 344 160Z" fill="#fffaf0" stroke="${ink}" stroke-width="4"/>`;
    s += `<circle cx="332" cy="114" r="${o.eyes === "wide" ? 10 : 7}" fill="${ink}"/>`;
    s += `<path d="${{ worried: "M318 92 L344 84", angry: "M318 86 L346 98", happy: "M318 92 Q332 80 346 92", sad: "M318 88 L344 98", neutral: "M318 92 L346 92" }[o.brows || "worried"]}" stroke="${ink}" stroke-width="8" stroke-linecap="round"/>`;
    if (o.mouth === "smile") s += `<path d="M330 160 Q340 170 350 160" stroke="${ink}" stroke-width="4" fill="none"/>`;
    if (o.rider) s += o.rider;
    return s;
  }
  // place an elephant: feet at x,y; native size 400×300
  function placeEl(svg, x, y, s = 1, { flip = false, id = "", cls = "" } = {}) {
    const attrs = `${id ? ` id="${id}"` : ""}${cls ? ` class="${cls}"` : ""}`;
    return `<g${attrs} transform="translate(${r1(x)} ${r1(y)}) scale(${flip ? -s : s} ${s}) translate(-200 -300)">${svg}</g>`;
  }

  // ---------- props ----------
  const P = {
    arrow: (x1, y1, x2, y2, { col = C.rome, w = 18, id = "" } = {}) => {
      const a = Math.atan2(y2 - y1, x2 - x1), L = 44, hx = x2 - Math.cos(a) * L * 0.6, hy = y2 - Math.sin(a) * L * 0.6;
      const p1 = [x2 - Math.cos(a - 0.5) * L, y2 - Math.sin(a - 0.5) * L], p2 = [x2 - Math.cos(a + 0.5) * L, y2 - Math.sin(a + 0.5) * L];
      return `<g${id ? ` id="${id}"` : ""}><path d="M${x1} ${y1} L${r1(hx)} ${r1(hy)}" stroke="${C.ink}" stroke-width="${w + 10}" stroke-linecap="round"/><path d="M${x1} ${y1} L${r1(hx)} ${r1(hy)}" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/><path d="M${x2} ${y2} L${r1(p1[0])} ${r1(p1[1])} L${r1(p2[0])} ${r1(p2[1])}Z" fill="${col}" stroke="${C.ink}" stroke-width="5" stroke-linejoin="round"/></g>`;
    },
    // red pointer arrow + label, pointing down-left at (x,y)
    pointer: (x, y, label, { id = "", side = "right" } = {}) => {
      const dx = side === "right" ? 1 : -1;
      return `<g${id ? ` id="${id}"` : ""}>${P.arrow(x + dx * 120, y - 120, x + dx * 14, y - 14)}<text x="${x + dx * 130}" y="${y - 140}" text-anchor="${side === "right" ? "start" : "end"}" class="t-label">${label}</text></g>`;
    },
    // Speech bubble. Wraps text to fit width w (Fredoka ≈ 0.5em per char); grows taller as needed.
    bubble: (x, y, w, h, text, { tail = "bl", id = "", size = 44 } = {}) => {
      const cw = size * 0.43, maxC = Math.max(4, Math.floor((w - 60) / cw)), lines = [];
      for (const word of text.split(" ")) { const cur = lines[lines.length - 1]; if (cur !== undefined && (cur + " " + word).length <= maxC) lines[lines.length - 1] = cur + " " + word; else lines.push(word); }
      const longest = Math.max(...lines.map((l) => l.length));
      const bw = Math.max(Math.min(w, longest * cw + 70), 160), lh = size * 1.22, bh = Math.max(h, lines.length * lh + 46);
      const bx = tail[1] === "r" ? x + w - bw : x;
      const tx = tail[1] === "l" ? bx + 40 : bx + bw - 40, ty = y + bh;
      const t0 = y + bh / 2 - ((lines.length - 1) * lh) / 2 + size * 0.36;
      return `<g${id ? ` id="${id}"` : ""}><path d="M${tx - 16} ${ty - 4} L${tx + (tail[1] === "l" ? -30 : 30)} ${ty + 46} L${tx + 22} ${ty - 4}Z" fill="#fff" stroke="${C.ink}" stroke-width="5" stroke-linejoin="round"/><rect x="${bx}" y="${y}" width="${bw}" height="${bh}" rx="28" fill="#fff" stroke="${C.ink}" stroke-width="5"/><path d="M${tx - 13} ${ty - 3} L${tx + 19} ${ty - 3}" stroke="#fff" stroke-width="8"/><text text-anchor="middle" class="t-bubble" font-size="${size}">${lines.map((l, i) => `<tspan x="${bx + bw / 2}" y="${(t0 + i * lh).toFixed(1)}">${l}</tspan>`).join("")}</text></g>`;
    },
    scroll: (x, y, w, h, lines = [], { id = "", size = 34 } = {}) =>
      `<g${id ? ` id="${id}"` : ""}><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#f7ecd2" stroke="${C.ink}" stroke-width="5"/><rect x="${x - 14}" y="${y - 16}" width="${w + 28}" height="28" rx="14" fill="${C.paperDk}" stroke="${C.ink}" stroke-width="5"/><rect x="${x - 14}" y="${y + h - 12}" width="${w + 28}" height="28" rx="14" fill="${C.paperDk}" stroke="${C.ink}" stroke-width="5"/>${lines.map((l, i) => `<text x="${x + w / 2}" y="${y + 50 + i * size * 1.3}" text-anchor="middle" class="t-script" font-size="${size}">${l}</text>`).join("")}</g>`,
    boulder: (x, y, r, { crack = false, id = "" } = {}) =>
      `<g${id ? ` id="${id}"` : ""}><path d="M${x - r} ${y} C${x - r * 1.05} ${y - r * 0.9} ${x - r * 0.4} ${y - r * 1.3} ${x + r * 0.2} ${y - r * 1.15} C${x + r * 0.9} ${y - r} ${x + r * 1.1} ${y - r * 0.3} ${x + r} ${y}Z" fill="${C.stone}" stroke="${C.ink}" stroke-width="${S}"/><path d="M${x - r * 0.5} ${y - r * 0.7} q${r * 0.2} -${r * 0.15} ${r * 0.4} 0" stroke="${C.stoneDk}" stroke-width="5" fill="none"/>${crack ? `<path d="M${x + r * 0.1} ${y - r * 1.15} l-${r * 0.15} ${r * 0.35} l${r * 0.2} ${r * 0.2} l-${r * 0.25} ${r * 0.3} l${r * 0.15} ${r * 0.3}" stroke="${C.ink}" stroke-width="7" fill="none" stroke-linejoin="round"/>` : ""}</g>`,
    fire: (x, y, s = 1, { id = "" } = {}) =>
      `<g${id ? ` id="${id}"` : ""} transform="translate(${x} ${y}) scale(${s})"><path d="M-40 0 C-60 -40 -30 -70 -20 -110 C-10 -80 0 -80 4 -130 C30 -90 50 -60 40 0Z" fill="${C.fire}" stroke="${C.ink}" stroke-width="5"/><path d="M-20 0 C-30 -30 -10 -50 -4 -74 C6 -50 24 -40 20 0Z" fill="${C.fireLt}"/><path d="M-54 6 L54 -6 M-54 -6 L54 6" stroke="${C.wood}" stroke-width="16" stroke-linecap="round"/></g>`,
    column: (x, y, h, { w = 60 } = {}) =>
      `<g><rect x="${x - w / 2}" y="${y - h}" width="${w}" height="${h}" fill="#efe6d2" stroke="${C.ink}" stroke-width="5"/>${[0.25, 0.5, 0.75].map((f) => `<path d="M${x - w / 2 + w * f} ${y - h + 20} V${y - 20}" stroke="#d6c9ab" stroke-width="4"/>`).join("")}<rect x="${x - w / 2 - 12}" y="${y - h - 22}" width="${w + 24}" height="24" fill="#efe6d2" stroke="${C.ink}" stroke-width="5"/><rect x="${x - w / 2 - 12}" y="${y - 22}" width="${w + 24}" height="22" fill="#efe6d2" stroke="${C.ink}" stroke-width="5"/></g>`,
    ship: (x, y, s = 1, { col = C.rome, sail = C.white, sunk = 0, id = "" } = {}) =>
      `<g${id ? ` id="${id}"` : ""} transform="translate(${x} ${y}) rotate(${sunk}) scale(${s})"><path d="M-160 -40 L160 -40 C150 10 120 24 -120 24 C-150 10 -160 -20 -160 -40Z" fill="${C.wood}" stroke="${C.ink}" stroke-width="${S}"/><path d="M-150 -30 H150" stroke="${col}" stroke-width="10"/>${[-110, -70, -30, 10, 50, 90].map((ox) => `<path d="M${ox} 0 l-24 40" stroke="${C.ink}" stroke-width="6" stroke-linecap="round"/>`).join("")}<path d="M0 -40 V-220" stroke="${C.ink}" stroke-width="10"/><path d="M-90 -200 Q0 -180 90 -200 L80 -70 Q0 -56 -80 -70Z" fill="${sail}" stroke="${C.ink}" stroke-width="5"/><path d="M-60 -150 Q0 -138 60 -150" stroke="${col}" stroke-width="12" fill="none"/><path d="M160 -40 q30 -20 20 -60" stroke="${C.ink}" stroke-width="10" fill="none" stroke-linecap="round"/></g>`,
    tree: (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-10" y="-70" width="20" height="70" fill="${C.wood}" stroke="${C.ink}" stroke-width="5"/><circle cx="0" cy="-100" r="52" fill="${C.grass}" stroke="${C.ink}" stroke-width="5"/><circle cx="-26" cy="-120" r="20" fill="#a3c86a"/></g>`,
    pine: (x, y, s = 1, snow = false) => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-8" y="-30" width="16" height="30" fill="${C.wood}" stroke="${C.ink}" stroke-width="4"/><path d="M0 -170 L56 -30 L-56 -30Z" fill="${snow ? "#4f7a5a" : "#3f6b3a"}" stroke="${C.ink}" stroke-width="5" stroke-linejoin="round"/>${snow ? `<path d="M0 -170 L22 -116 Q0 -104 -22 -116Z" fill="#fff"/>` : ""}</g>`,
    mountain: (x, y, w, h, { snow = true, col = "#8a8fa8" } = {}) =>
      `<g><path d="M${x - w / 2} ${y} L${x} ${y - h} L${x + w / 2} ${y}Z" fill="${col}" stroke="${C.ink}" stroke-width="5" stroke-linejoin="round"/>${snow ? `<path d="M${x} ${y - h} L${x + w * 0.16} ${y - h * 0.66} L${x + w * 0.06} ${y - h * 0.72} L${x - w * 0.02} ${y - h * 0.62} L${x - w * 0.1} ${y - h * 0.7} L${x - w * 0.16} ${y - h * 0.66}Z" fill="${C.snow}" stroke="${C.ink}" stroke-width="4" stroke-linejoin="round"/>` : ""}</g>`,
    coin: (x, y, r = 22) => `<g><circle cx="${x}" cy="${y}" r="${r}" fill="#d9dde3" stroke="${C.ink}" stroke-width="4"/><circle cx="${x}" cy="${y}" r="${r * 0.6}" fill="none" stroke="#9aa3ad" stroke-width="3"/></g>`,
    flag: (x, y, col, { h = 120, id = "", label = "" } = {}) =>
      `<g${id ? ` id="${id}"` : ""}><path d="M${x} ${y} V${y - h}" stroke="${C.ink}" stroke-width="8" stroke-linecap="round"/><path d="M${x} ${y - h} h70 l-14 24 l14 24 h-70Z" fill="${col}" stroke="${C.ink}" stroke-width="5" stroke-linejoin="round"/>${label ? `<text x="${x + 30}" y="${y - h + 34}" text-anchor="middle" class="t-flag">${label}</text>` : ""}</g>`,
    // faction emblems used on map tokens / stat cards
    emblemRome: (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-40" y="-50" width="80" height="100" rx="8" fill="${C.rome}" stroke="${C.ink}" stroke-width="5"/><path d="M-22 -18 L0 -34 L22 -18 M0 -34 V26 M-24 6 C-10 -6 10 -6 24 6" stroke="${C.gold}" stroke-width="7" fill="none" stroke-linecap="round"/><text x="0" y="44" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="17" fill="${C.gold}">SPQR</text></g>`,
    emblemCarth: (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-40" y="-50" width="80" height="100" rx="8" fill="${C.carth}" stroke="${C.ink}" stroke-width="5"/><circle cx="0" cy="-20" r="13" fill="${C.gold}"/><path d="M0 -6 L-22 34 H22Z M-26 2 H26" stroke="${C.gold}" stroke-width="7" fill="none" stroke-linejoin="round"/></g>`,
  };

  // ---------- map ----------
  // Mediterranean map layer from assets/maps/med.json. regions: [{d, fill, id}]
  function map(med, { regions = [], sea = C.sea, land = C.land, id = "map", graticule = true } = {}) {
    let s = `<g id="${id}"><rect x="-200" y="-200" width="2320" height="1480" fill="${sea}"/>`;
    if (graticule) for (let i = -2; i < 12; i++) s += `<path d="M${i * 200} -200 V1300 M-200 ${i * 160} H2200" stroke="${C.seaLt}" stroke-width="2" opacity=".55"/>`;
    s += `<defs><clipPath id="${id}-land"><path d="${med.land}"/></clipPath></defs>`;
    s += `<path d="${med.land}" fill="none" stroke="#ffffff" stroke-opacity=".18" stroke-width="16" stroke-linejoin="round"/>`;
    s += `<path d="${med.land}" fill="${land}" stroke="${C.ink}" stroke-width="3" stroke-linejoin="round"/>`;
    s += `<g clip-path="url(#${id}-land)">${regions.map((r) => `<path${r.id ? ` id="${r.id}"` : ""} d="${r.d}" fill="${r.fill}" opacity="${r.opacity ?? 0.92}"/>`).join("")}</g>`;
    s += `<path d="${med.land}" fill="none" stroke="${C.ink}" stroke-width="3" stroke-linejoin="round" opacity=".9"/></g>`;
    return s;
  }
  function city(x, y, label, { col = C.ink, id = "", anchor = "middle", dy = -26 } = {}) {
    return `<g${id ? ` id="${id}"` : ""}><circle cx="${r1(x)}" cy="${r1(y)}" r="11" fill="${col}" stroke="#fff" stroke-width="4"/><text x="${r1(x)}" y="${r1(y + dy)}" text-anchor="${anchor}" class="t-map">${label}</text></g>`;
  }

  // ---------- text styles & shared defs (inject once per SVG/HTML) ----------
  const STYLE = `
    .t-title{font-family:Fredoka,sans-serif;font-weight:700;fill:#fffaf0;stroke:${C.ink};stroke-width:14px;paint-order:stroke;letter-spacing:1px}
    .t-cap{font-family:Fredoka,sans-serif;font-weight:700;fill:#fffaf0;stroke:${C.ink};stroke-width:10px;paint-order:stroke}
    .t-label{font-family:Fredoka,sans-serif;font-weight:700;font-size:46px;fill:#fffaf0;stroke:${C.ink};stroke-width:10px;paint-order:stroke}
    .t-map{font-family:Fredoka,sans-serif;font-weight:600;font-size:34px;fill:#fffaf0;stroke:${C.ink};stroke-width:8px;paint-order:stroke}
    .t-bubble{font-family:Fredoka,sans-serif;font-weight:600;fill:${C.ink}}
    .t-script{font-family:Fredoka,sans-serif;font-weight:500;fill:#5a3b22}
    .t-flag{font-family:Fredoka,sans-serif;font-weight:700;font-size:26px;fill:#fffaf0}
    .t-ink{font-family:Fredoka,sans-serif;font-weight:700;fill:${C.ink}}
  `;
  // Dialogue subtitle near a speaker (white, ink-outlined, centered at x)
  const say = (x, y, text, { size = 40, id = "", anchor = "middle" } = {}) =>
    `<text${id ? ` id="${id}"` : ""} x="${x}" y="${y}" text-anchor="${anchor}" class="t-cap" font-size="${size}">${text}</text>`;
  // Big chunky caption card (rotated sticker)
  const sticker = (x, y, text, { size = 64, rot = -3, bg = C.rome, fg = "#fffaf0", id = "", pad = 34 } = {}) => {
    const w = text.length * size * 0.56 + pad * 2, h = size * 1.5;
    return `<g${id ? ` id="${id}"` : ""} transform="translate(${x} ${y}) rotate(${rot})"><rect x="${-w / 2 + 8}" y="${-h / 2 + 10}" width="${w}" height="${h}" rx="14" fill="${C.ink}"/><rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="14" fill="${bg}" stroke="${C.ink}" stroke-width="6"/><text x="0" y="${size * 0.36}" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="${size}" fill="${fg}">${text}</text></g>`;
  };
  // Elephant counter badge (top-right HUD)
  const elCounter = (n, { id = "el-counter", x = 1690, y = 40 } = {}) =>
    `<g id="${id}" transform="translate(${x} ${y})"><rect x="0" y="0" width="200" height="96" rx="22" fill="${C.ink}" opacity=".88"/><g transform="translate(14 8) scale(.26)">${elephant({ blanket: C.carth, brows: "neutral" })}</g><text x="182" y="66" text-anchor="end" font-family="Fredoka" font-weight="700" font-size="52" fill="#fffaf0" class="el-num">${n}</text></g>`;

  // Paper texture / vignette overlays
  const paperGrain = (id = "grain") => `<filter id="${id}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="7"/><feColorMatrix values="0 0 0 0 .35  0 0 0 0 .25  0 0 0 0 .15  0 0 0 .08 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>`;

  g.Toon = { C, place, placeEl, char, CAST, elephant, P, map, city, STYLE, say, sticker, elCounter, paperGrain, wrapG, POSES };
})(globalThis);
