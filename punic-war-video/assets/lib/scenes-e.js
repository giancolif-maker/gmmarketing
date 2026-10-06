// Act 4 — "Copy His Homework", frames 44–55 (conventions: scenes-a.js).
(function (g) {
  const { Toon, Geo, SceneKit } = g;
  const { C, place, placeEl, CAST, elephant, P, sticker, unit } = Toon;
  const { H, R, reg } = SceneKit;
  const S = {};
  const HB = (x = {}) => CAST.hannibal({ eyepatch: true, ...x });
  const PA = (x = {}) => CAST.publiusAdult(x);
  const column = (x0, y0, x1, y1, n, s, mk) => Array.from({ length: n }, (_, i) => { const f = i / Math.max(1, n - 1); return place(mk(i), x0 + (x1 - x0) * f, y0 + (y1 - y0) * f + (i % 2) * 6, s); }).join("");
  const mini = (x, y, s = 0.3, flip = false) => placeEl(elephant({ brows: "angry", blanket: C.carthDk }), x, y, s, { flip });

  // 44 — Part 4 title; "let's go to them"
  S["44"] = () =>
    H.defs() + H.interior("#cbb38c", "#9a7a56") + H.columns([140, 1780], 820, 700) +
    `<g id="africa-map" transform="translate(760 180)"><rect width="400" height="300" rx="10" fill="#f3e3c3" stroke="${C.ink}" stroke-width="6"/><path d="M40 210 C120 170 260 180 360 220 V290 H40Z" fill="${C.carth}"/><path d="M60 40 C140 60 160 110 200 150" stroke="${C.rome}" stroke-width="10" fill="none" stroke-dasharray="14 10"/><text x="200" y="270" text-anchor="middle" class="t-flag" font-size="30">AFRICA</text></g>` +
    place(PA({ pose: "point", brows: "smug", mouth: "grin" }), 520, 1020, 1.3, { id: "publius" }) +
    place(CAST.fabius({ pose: "cross", eyes: "dot", brows: "worried", mouth: "frown" }), 1420, 1020, 1.3, { id: "fabius", flip: true }) +
    Toon.elCounter(1) + H.actCard(4, "Copy His Homework", C.rome) + H.grain();

  // 45 — Volunteers, Cannae survivors, landing in Africa
  S["45"] = () => {
    const [sx, sy] = Geo.project([13.4, 38.1]), [ax, ay] = Geo.project([10.2, 37.2]);
    return H.defs() + Toon.map(g.MED, { regions: [reg("italy", C.rome), reg("sicily", C.rome), reg("sardinia", C.rome), reg("corsica", C.rome), reg("spainS", C.rome), reg("africa", C.carth)] }) +
      `<g id="ships">${P.arrow(sx - 10, sy + 10, ax + 30, ay - 30, { col: C.rome, w: 20 })}${P.ship(sx - 120, sy + 90, 0.25, { col: C.rome })}${P.ship(sx - 40, sy + 130, 0.25, { col: C.rome })}</g>` +
      `<text x="${ax}" y="${ay + 80}" text-anchor="middle" class="t-map">204 BC</text>` +
      sticker(600, 160, "CANNAE SURVIVORS: WANT A REMATCH", { size: 46, rot: -3, bg: C.ink, id: "st-cannae" }) +
      place(PA({ pose: "raise", sword: true, swordRot: -10, mouth: "grin" }), 1560, 1060, 1.0, { id: "publius" }) + Toon.elCounter(1) + H.grain();
  };

  // 46 — Masinissa joins
  S["46"] = () =>
    H.defs() + H.sky("#f6c27a", "#fbe7c0") + H.ground(620, "#d9b876", "#b8964e") +
    `<g id="cav">${[1200, 1420, 1640, 1860].map((x) => `<g transform="translate(${x} 700)"><ellipse rx="90" ry="40" fill="#7a5230" stroke="${C.ink}" stroke-width="5"/><circle cx="90" cy="-40" r="30" fill="#7a5230" stroke="${C.ink}" stroke-width="5"/>${place(CAST.numidian({ pose: "point" }), 0, -10, 0.55)}</g>`).join("")}</g>` +
    place(CAST.masinissa({ pose: "point" }), 1160, 1030, 1.3, { id: "masinissa", flip: true }) +
    place(PA({ pose: "point", mouth: "grin", brows: "happy" }), 640, 1030, 1.3, { id: "publius" }) +
    sticker(500, 170, "MASINISSA: BEST CAVALRY AROUND", { size: 46, rot: -3, bg: "#2f7d5a", id: "st-mas" }) + Toon.elCounter(1) + H.grain();

  // 47 — Night raid on Syphax's camps; Carthage panics
  S["47"] = () =>
    H.defs() + H.sky("#14203a", "#3a2a40") + `<path d="M0 640 C600 600 1300 660 1920 620 V1080 H0Z" fill="#2a2030"/>` +
    `<g id="camps">${[300, 620, 940, 1260, 1580].map((x, i) => `<path d="M${x - 110} 760 L${x} 600 L${x + 110} 760Z" fill="#8a6a46" stroke="${C.ink}" stroke-width="5"/>`).join("")}</g>` +
    `<g id="flames">${[300, 620, 940, 1260, 1580].map((x, i) => P.fire(x, 700 + (i % 2) * 20, 1.2 + (i % 3) * 0.2)).join("")}</g>` +
    `<g id="panic" data-layout-allow-overlap="true"><rect width="1920" height="1080" fill="#5b3f7a"/>${H.columns([160, 1760], 900, 760)}${place(CAST.hanno({ pose: "armsUp", eyes: "wide", brows: "surprised", mouth: "shout", sweat: true }), 760, 1040, 1.3)}${place(CAST.gisgo({ pose: "hips", brows: "angry", mouth: "flat", roundShield: false }), 1240, 1040, 1.3, { id: "gisgo2", flip: true })}</g>` +
    Toon.elCounter(1) + H.grain();

  // 48 — Hannibal sails home after fifteen years
  S["48"] = () =>
    H.defs() + H.sky("#f2b46b", "#fde1b0") + `<circle cx="1500" cy="380" r="120" fill="#ffe08a"/><rect y="560" width="1920" height="520" fill="#3d7bb0"/>` +
    `<path d="M0 560 L0 470 C120 440 260 470 380 560Z" fill="${C.grassDk}" stroke="${C.ink}" stroke-width="5"/><text x="60" y="440" class="t-map">ITALY</text>` +
    `<g id="boat">${P.ship(960, 760, 1.4, { col: C.carth, sail: "#efe6d2" })}${place(HB({ pose: "wave", mouth: "flat", brows: "sad" }), 820, 700, 0.75)}${placeEl(elephant({ brows: "happy", mouth: "smile" }), 1120, 700, 0.45, { id: "surus" })}</g>` +
    `<path class="wave" d="M-100 820 q60 -14 120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0" stroke="#bfe3f7" stroke-width="6" fill="none"/>` +
    sticker(560, 160, "15 YEARS. NEVER BEATEN.", { size: 58, rot: -3, bg: C.carth, id: "st-15" }) + Toon.elCounter(1) + H.grain();

  // 49 — The meeting before Zama
  S["49"] = () =>
    H.defs() + H.sky("#c9dce8", "#f3e3c3") + H.ground(600, "#d7bf86", "#b59a62") +
    `<g id="armies">${column(40, 640, 600, 640, 10, 0.3, () => CAST.carthSoldier({ roundShield: C.carth }))}${column(1320, 640, 1880, 640, 10, 0.3, () => CAST.legionary({ shield: C.rome }))}</g>` +
    place(HB({ pose: "point", mouth: "flat", brows: "neutral" }), 720, 1030, 1.35, { id: "hannibal" }) +
    place(PA({ pose: "hips", brows: "smug", mouth: "smirk" }), 1200, 1030, 1.35, { id: "publius", flip: true }) +
    sticker(960, 170, "ZAMA, 202 BC", { size: 70, rot: -2, bg: C.ink, id: "st-zama" }) + Toon.elCounter(1) + H.grain();

  // 50 — Zama: eighty elephants, Roman lanes, trumpets
  S["50"] = () =>
    H.defs() + `<rect width="1920" height="1080" fill="#e6cf95"/>` +
    `<g id="lanes">${[0, 1, 2, 3, 4, 5].map((i) => unit(200 + i * 280, 760, 170, 120, C.rome)).join("")}${[0, 1, 2, 3, 4].map((i) => `<path d="M${370 + i * 280 + 55} 760 V900" stroke="#fffaf0" stroke-width="6" stroke-dasharray="12 10"/>`).join("")}<text x="960" y="940" text-anchor="middle" class="t-label" font-size="36">LANES</text></g>` +
    `<g id="herd">${Array.from({ length: 12 }, (_, i) => mini(260 + (i % 6) * 280 + 40, 260 + Math.floor(i / 6) * 150, 0.3, true)).join("")}</g>` +
    `<g id="horns">${[300, 860, 1420].map((x) => `<g transform="translate(${x} 980)"><path d="M0 0 L80 -30 L80 30Z" fill="${C.gold}" stroke="${C.ink}" stroke-width="5"/><text x="110" y="12" class="t-cap" font-size="44">TOOT!</text></g>`).join("")}</g>` +
    placeEl(elephant({ brows: "neutral", mouth: "smile" }), 1760, 640, 0.55, { id: "surus" }) + `<text x="1760" y="680" text-anchor="middle" class="t-cap" font-size="30">SURUS (retired)</text>` +
    Toon.elCounter(1) + H.grain();

  // 51 — Zama: the cavalry hits the rear (Cannae, reversed)
  S["51"] = () =>
    H.defs() + `<rect width="1920" height="1080" fill="#e6cf95"/>` +
    `<g id="c-inf">${[0, 1, 2, 3].map((i) => unit(600 + i * 190, 360, 170, 80, i % 2 ? C.carth : "#f7f2e6")).join("")}</g>` +
    `<g id="r-inf">${[0, 1, 2, 3].map((i) => unit(600 + i * 190, 520, 170, 80, C.rome)).join("")}</g>` +
    `<g id="cav-a">${unit(120, 820, 220, 60, C.gold)}<text x="230" y="910" text-anchor="middle" class="t-flag" font-size="26" fill="${C.ink}">MASINISSA</text></g>` +
    `<g id="cav-b">${unit(1580, 820, 220, 60, C.rome)}<text x="1690" y="910" text-anchor="middle" class="t-flag" font-size="26" fill="${C.ink}">LAELIUS</text></g>` +
    `<g id="pip-p"><circle cx="300" cy="230" r="110" fill="#efe6d2" stroke="${C.ink}" stroke-width="8"/><clipPath id="pp-c"><circle cx="300" cy="230" r="104"/></clipPath><g clip-path="url(#pp-c)">${place(PA({ pose: "point", mouth: "grin", brows: "smug" }), 300, 460, 0.95)}</g></g>` +
    `<g id="pip-h"><circle cx="1620" cy="230" r="110" fill="#efe6d2" stroke="${C.ink}" stroke-width="8"/><clipPath id="ph-c"><circle cx="1620" cy="230" r="104"/></clipPath><g clip-path="url(#ph-c)">${place(HB({ pose: "cross", mouth: "flat", brows: "sad" }), 1620, 460, 0.95)}</g></g>` +
    Toon.elCounter(1) + H.grain();

  // 52 — The peace terms
  S["52"] = () =>
    H.defs() + H.interior("#5b3f7a", "#3e2a56") +
    `<rect x="560" y="760" width="800" height="40" rx="8" fill="${C.wood}" stroke="${C.ink}" stroke-width="6"/>${P.scroll(800, 640, 320, 110, ["TREATY", "201 BC"], { size: 36 })}` +
    place(CAST.hanno({ pose: "hold", eyes: "dot", brows: "sad", mouth: "frown" }), 560, 1030, 1.3, { id: "hanno" }) +
    place(CAST.flaccus({ pose: "cross", brows: "smug", mouth: "smirk" }), 1380, 1030, 1.3, { id: "flaccus", flip: true }) +
    sticker(960, 120, "SCIPIO AFRICANUS", { size: 70, rot: -2, id: "st-af" }) +
    sticker(420, 300, "SPAIN → ROME", { size: 40, rot: -3, bg: C.ink, id: "st-a" }) + sticker(1500, 300, "NAVY: 10 SHIPS", { size: 40, rot: 3, bg: C.ink, id: "st-b" }) +
    sticker(420, 460, "10,000 TALENTS / 50 YEARS", { size: 36, rot: 2, bg: C.ink, id: "st-c" }) + sticker(1500, 460, "NO WARS WITHOUT ASKING", { size: 36, rot: -2, bg: C.ink, id: "st-d" }) +
    Toon.elCounter(1) + H.grain();

  // 53 — Hannibal fixes Carthage; exile; 183 BC
  S["53"] = () => {
    const route = Geo.route([[10.3, 36.9], [22, 34.5], [33, 35.2], [36.1, 36.2]]);
    return H.defs() + `<rect width="1920" height="1080" fill="#e8c78f"/>` +
      `<rect x="180" y="760" width="760" height="36" fill="${C.wood}" stroke="${C.ink}" stroke-width="5"/>` +
      `<g id="coins">${Array.from({ length: 9 }, (_, i) => P.coin(560 + (i % 3) * 40, 740 - Math.floor(i / 3) * 30, 22)).join("")}</g>` +
      place(HB({ pose: "hold", mouth: "smile", brows: "happy", prop: P.scroll(60, 200, 80, 50) }), 360, 1040, 1.2, { id: "hannibal" }) +
      sticker(560, 200, "DEBT: PAID EARLY", { size: 60, rot: -3, bg: "#3c7a3a", id: "st-paid" }) +
      `<g id="flaccus-pip"><circle cx="1500" cy="300" r="110" fill="#efe6d2" stroke="${C.ink}" stroke-width="8"/><clipPath id="fp53"><circle cx="1500" cy="300" r="104"/></clipPath><g clip-path="url(#fp53)">${place(CAST.flaccus({ pose: "cross", brows: "angry", mouth: "flat", eyes: "dot" }), 1500, 530, 0.95)}</g>${P.bubble(1100, 440, 360, 110, "…That's suspicious.", { tail: "br", size: 38, id: "fp-pipb" })}</g>` +
      `<g id="exile" data-layout-allow-overlap="true">${Toon.map(g.MED, { id: "map53", regions: [reg("italy", C.rome), reg("sicily", C.rome), reg("spainS", C.rome), reg("africa", C.carth)] })}<path d="${route}" stroke="${C.carth}" stroke-width="14" fill="none" stroke-dasharray="22 14" stroke-linecap="round"/><text x="1500" y="300" class="t-label" font-size="40">EXILE</text>${sticker(560, 160, "183 BC", { size: 70, rot: -3, bg: C.ink })}</g>` +
      Toon.elCounter(1) + H.grain();
  };

  // 54 — Cato and the figs
  S["54"] = () =>
    H.defs() + H.interior("#cbb38c", "#9a7a56") + H.columns([140, 1780], 820, 700) +
    `<g id="audience">${[1200, 1420, 1640].map((x) => place(CAST.romanSenator({ eyes: "closed", brows: "neutral" }), x, 1000, 0.95)).join("")}</g>` +
    place(CAST.cato({ pose: "point", mouth: "shout" }), 600, 1030, 1.4, { id: "cato" }) +
    `<g id="figs" transform="translate(860 520)"><circle r="44" fill="#6b3a6a" stroke="${C.ink}" stroke-width="5"/><circle cx="70" cy="20" r="38" fill="#7b4a7a" stroke="${C.ink}" stroke-width="5"/><text x="30" y="110" text-anchor="middle" class="t-ink" font-size="30">FIG PRICES</text></g>` +
    sticker(960, 180, "CARTHAGO DELENDA EST", { size: 66, rot: -3, id: "st-delenda" }) +
    sticker(1440, 560, "146 BC: ANOTHER WAR", { size: 44, rot: 3, bg: C.ink, id: "st-146" }) + Toon.elCounter(1) + H.grain();

  // 55 — The end: the beach, finally
  S["55"] = () =>
    H.defs() + H.sky("#f08a5a", "#fde1b0") + `<circle cx="960" cy="560" r="180" fill="#ffd27a"/><rect y="580" width="1920" height="200" fill="#3d7bb0"/><path d="M0 760 C500 720 1300 780 1920 740 V1080 H0Z" fill="#ead39c" stroke="${C.ink}" stroke-width="5"/>` +
    `<g id="board" transform="translate(560 90) scale(.45)"><rect x="0" y="0" width="1760" height="420" rx="30" fill="#2e2620" stroke="${C.ink}" stroke-width="14"/>${["W", "W", "W", "W", "W", "W", "L"].map((b, i) => `<rect x="${80 + i * 230}" y="110" width="190" height="200" rx="16" fill="${b === "L" ? C.rome : "#3c7a3a"}" stroke="${C.ink}" stroke-width="8"/><text x="${175 + i * 230}" y="265" text-anchor="middle" class="t-title" font-size="140">${b}</text>`).join("")}</g>` +
    placeEl(elephant({ brows: "happy", mouth: "smile", trunk: "up" }), 1180, 980, 0.95, { id: "surus" }) +
    place(HB({ pose: "wave", mouth: "smile", brows: "happy" }), 760, 990, 1.05, { id: "hannibal" }) +
    `<g id="end"><text x="960" y="470" text-anchor="middle" class="t-title" font-size="110">THE END</text></g>` + Toon.elCounter(1) + H.grain();

  g.Scenes = Object.assign(g.Scenes || {}, S);
})(globalThis);
