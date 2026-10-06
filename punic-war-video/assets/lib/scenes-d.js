// Act 3 — "The Longest Vacation in Italy", frames 34–43 (conventions: scenes-a.js).
(function (g) {
  const { Toon, Geo, SceneKit } = g;
  const { C, place, placeEl, CAST, elephant, P, sticker, unit } = Toon;
  const { H, R, reg } = SceneKit;
  const S = {};
  const HB = (x = {}) => CAST.hannibal({ eyepatch: true, ...x });
  const PA = (x = {}) => CAST.publiusAdult(x);
  const column = (x0, y0, x1, y1, n, s, mk) => Array.from({ length: n }, (_, i) => { const f = i / Math.max(1, n - 1); return place(mk(i), x0 + (x1 - x0) * f, y0 + (y1 - y0) * f + (i % 2) * 6, s); }).join("");

  // 34 — Part 3 title; Hannibal offers terms
  S["34"] = () =>
    H.defs() + H.interior("#d9c7a4", "#a88a62") + H.columns([960], 820, 700) +
    `<rect x="560" y="760" width="800" height="40" rx="8" fill="${C.wood}" stroke="${C.ink}" stroke-width="6"/>${P.scroll(820, 690, 280, 60, ["TERMS?"], { size: 30 })}` +
    place(HB({ pose: "point", mouth: "smirk", brows: "smug" }), 480, 1020, 1.3, { id: "hannibal" }) +
    place(CAST.flaccus({ pose: "cross", brows: "angry", mouth: "flat" }), 1440, 1020, 1.3, { id: "flaccus", flip: true }) +
    Toon.elCounter(1) + H.actCard(3, "The Longest Vacation in Italy", C.carth) + H.grain();

  // 35 — Rome refuses to lose
  S["35"] = () =>
    H.defs() + H.sky("#c9dce8", "#eef3e6") + `<g>${[0, 1, 2, 3, 4, 5].map((i) => P.column(260 + i * 280, 900, 640, { w: 70 })).join("")}<path d="M120 270 L960 90 L1800 270Z" fill="#efe6d2" stroke="${C.ink}" stroke-width="6"/></g><rect y="900" width="1920" height="180" fill="#bfae8c" stroke="${C.ink}" stroke-width="5"/>` +
    place(CAST.flaccus({ pose: "cross", brows: "furious", mouth: "grit" }), 960, 1040, 1.4, { id: "flaccus" }) +
    sticker(470, 380, "NO PEACE TALKS", { size: 54, rot: -4, id: "st-a" }) + sticker(1450, 380, "NO RANSOMS", { size: 54, rot: 3, id: "st-b" }) +
    sticker(470, 640, "MOURNING: 30 DAYS MAX", { size: 46, rot: 2, bg: C.ink, id: "st-c" }) + sticker(1450, 640, "+8,000 SLAVES ARMED", { size: 46, rot: -3, bg: C.ink, id: "st-d" }) +
    Toon.elCounter(1) + H.grain();

  // 36 — Allies switch sides: Capua, Macedon, Syracuse
  S["36"] = () => {
    const mac = [[19.5, 42.3], [24.5, 42.3], [24.5, 39.7], [21.2, 39.6], [19.4, 40.3]];
    const [cx, cy] = Geo.project([14.25, 41.08]), [sx, sy] = Geo.at("Syracuse"), [mx, my] = Geo.project([22.3, 41.0]);
    return H.defs() + Toon.map(g.MED, { regions: [reg("italy", C.rome), reg("sicily", C.rome), reg("sardinia", C.rome), reg("corsica", C.rome), reg("africa", C.carth), reg("spainS", C.carth), { d: Geo.poly(mac), fill: C.carth, id: "r-mac" }] }) +
      `<g id="capua">${P.flag(cx, cy, C.carth, { h: 90 })}<text x="${cx}" y="${cy + 46}" text-anchor="middle" class="t-map">CAPUA</text></g>` +
      `<g id="macedon"><text x="${mx}" y="${my - 10}" text-anchor="middle" class="t-map">MACEDON</text></g>` +
      `<g id="syracuse">${P.flag(sx, sy, C.carth, { h: 90 })}<text x="${sx + 20}" y="${sy + 46}" text-anchor="middle" class="t-map">SYRACUSE</text></g>` +
      sticker(560, 150, "TEAM HANNIBAL: +3", { size: 58, rot: -3, bg: C.carth, id: "st-team" }) + Toon.elCounter(1) + H.grain();
  };

  // 37 — Archimedes' claw, then his circles
  S["37"] = () =>
    H.defs() + H.sky("#9fd0ea", "#e3f2f8") + `<rect y="640" width="1920" height="440" fill="#3d7bb0"/>` +
    `<g id="wall"><rect x="1380" y="260" width="540" height="820" fill="#d9c7a4" stroke="${C.ink}" stroke-width="6"/>${Array.from({ length: 7 }, (_, i) => `<rect x="${1380 + i * 80}" y="230" width="46" height="40" fill="#d9c7a4" stroke="${C.ink}" stroke-width="5"/>`).join("")}</g>` +
    place(CAST.archimedes({ pose: "point", mouth: "grin", brows: "happy" }), 1720, 270, 0.9, { id: "archimedes", flip: true }) +
    `<g id="claw"><path d="M1420 300 L760 180" stroke="${C.wood}" stroke-width="36" stroke-linecap="round"/><path d="M1420 300 L760 180" stroke="${C.ink}" stroke-width="6" fill="none" opacity=".3"/><path d="M760 180 V330" stroke="${C.ink}" stroke-width="6"/>
      <path d="M720 330 q40 60 80 0" stroke="${C.ink}" stroke-width="14" fill="none" stroke-linecap="round"/>
      <g transform="translate(760 470) rotate(170)">${P.ship(0, 0, 0.75, { col: C.rome })}</g>
      ${place(CAST.sailor({ pose: "armsUp" }), 820, 560, 0.7, { id: "sailor", rot: 180 })}</g>` +
    `<path class="wave" d="M-100 660 q60 -14 120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0" stroke="#bfe3f7" stroke-width="6" fill="none"/>` +
    `<g id="circles" data-layout-allow-overlap="true"><rect width="1920" height="1080" fill="#e7cf98"/>${[[700, 760, 120], [940, 820, 70], [1160, 760, 150]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#8a6a3a" stroke-width="8"/>`).join("")}<path d="M580 760 H1310" stroke="#8a6a3a" stroke-width="5"/>${place(CAST.archimedes({ pose: "point", mouth: "shout", brows: "furious", eyes: "dot" }), 420, 1020, 1.3, { id: "arch2" })}${place(CAST.legionary({ pose: "point", sword: true, shield: false }), 1600, 1020, 1.3, { flip: true })}<text x="960" y="200" text-anchor="middle" class="t-title" font-size="64">SYRACUSE, 212 BC</text></g>` +
    Toon.elCounter(1) + H.grain();

  // 38 — Letters home; Hanno says no
  S["38"] = () =>
    H.defs() + `<rect width="960" height="1080" fill="#e8c78f"/><rect x="960" width="960" height="1080" fill="#5b3f7a"/><rect x="954" width="12" height="1080" fill="${C.ink}"/>` +
    `<text x="480" y="100" text-anchor="middle" class="t-title" font-size="56">ITALY</text><text x="1440" y="100" text-anchor="middle" class="t-title" font-size="56">CARTHAGE</text>` +
    `<rect x="160" y="820" width="640" height="30" fill="${C.wood}" stroke="${C.ink}" stroke-width="5"/>` + place(HB({ pose: "hold", mouth: "flat", brows: "neutral" }), 480, 1040, 1.15, { id: "hannibal" }) +
    `<rect x="1120" y="820" width="640" height="30" fill="${C.wood}" stroke="${C.ink}" stroke-width="5"/>` + place(CAST.hanno({ pose: "cross" }), 1440, 1040, 1.15, { id: "hanno" }) +
    [[1, ["Dear Carthage.", "Winning.", "Need more men.", "Love, Hannibal."], 250], [2, ["Dear Carthage.", "Still winning.", "Really need more men."], 200], [3, ["Dear Carthage.", "Please."], 150]].map(([i, lines, h]) => `<g id="letter-${i}">${P.scroll(110 + (i - 1) * 50, 170 + (i - 1) * 40, 520, h, lines, { size: 34 })}</g>`).join("") +
    Toon.elCounter(1) + H.grain();

  // 39 — Hannibal at the gates; the land sells at full price
  S["39"] = () =>
    H.defs() + H.sky("#f2c27a", "#fbe7c0") + H.ground(700, "#c9b06a", "#a98f4e") +
    `<g id="walls"><rect x="1180" y="260" width="740" height="480" fill="#d9c7a4" stroke="${C.ink}" stroke-width="6"/>${Array.from({ length: 9 }, (_, i) => `<rect x="${1190 + i * 82}" y="226" width="48" height="44" fill="#d9c7a4" stroke="${C.ink}" stroke-width="5"/>`).join("")}<text x="1550" y="620" text-anchor="middle" class="t-title" font-size="72">ROMA</text></g>` +
    place(CAST.romanMother({ pose: "point" }), 1420, 270, 0.8, { id: "mother", flip: true }) + place(CAST.kid({ brows: "worried", mouth: "wobbly", eyes: "wide" }), 1560, 270, 0.6, { id: "kid" }) +
    `<g id="camp"><path d="M220 780 L420 520 L620 780Z" fill="${C.carth}" stroke="${C.ink}" stroke-width="6"/><path d="M380 780 L420 650 L460 780Z" fill="${C.ink}"/></g>` +
    place(HB({ pose: "hips", mouth: "flat", brows: "neutral" }), 800, 1000, 1.2, { id: "hannibal" }) +
    `<g id="sale" transform="translate(260 900) rotate(-4)"><path d="M0 120 V-20" stroke="${C.wood}" stroke-width="12"/><rect x="-150" y="-140" width="300" height="140" rx="10" fill="#fffaf0" stroke="${C.ink}" stroke-width="6"/><text x="0" y="-84" text-anchor="middle" class="t-ink" font-size="40" fill="${C.rome}">SOLD!</text><text x="0" y="-34" text-anchor="middle" class="t-ink" font-size="28">full price</text></g>` +
    sticker(560, 150, "HANNIBAL AD PORTAS", { size: 60, rot: -3, id: "st-portas" }) + Toon.elCounter(1) + H.grain();

  // 40 — Who wants Spain? The kid from the Ticinus.
  S["40"] = () =>
    H.defs() + H.interior("#cbb38c", "#9a7a56") + H.columns([140, 1780], 820, 700) +
    `<g id="graves">${[1080, 1340].map((x) => `<path d="M${x - 70} 560 V420 Q${x} 340 ${x + 70} 420 V560Z" fill="${C.stone}" stroke="${C.ink}" stroke-width="6"/><text x="${x}" y="480" text-anchor="middle" class="t-ink" font-size="26">SCIPIO</text>`).join("")}<text x="1210" y="620" text-anchor="middle" class="t-ink" font-size="30">211 BC</text></g>` +
    `<g id="senators">${[1280, 1480].map((x) => place(CAST.romanSenator({ brows: "worried", pose: "shrug" }), x, 1000, 1.0)).join("")}</g>` +
    place(CAST.flaccus({ pose: "shrug", brows: "surprised", mouth: "open" }), 1660, 1020, 1.15, { id: "flaccus", flip: true }) +
    place(PA({ pose: "raise", brows: "happy", mouth: "grin" }), 520, 1020, 1.25, { id: "publius" }) +
    P.pointer(520, 640, "REMEMBER THIS KID ✔", { id: "ptr" }) + Toon.elCounter(1) + H.grain();

  // 41 — New Carthage: wading the lagoon at low tide
  S["41"] = () =>
    H.defs() + `<rect width="1920" height="1080" fill="#3d7bb0"/><path d="M0 820 C400 780 900 860 1920 800 V1080 H0Z" fill="#d9c08f" stroke="${C.ink}" stroke-width="5"/>` +
    `<ellipse id="lagoon" cx="1180" cy="330" rx="560" ry="200" fill="#8fc6e6" stroke="${C.ink}" stroke-width="5"/><text x="1180" y="100" text-anchor="middle" class="t-label" font-size="38">LAGOON (shallow at dusk)</text>` +
    `<g id="city"><path d="M560 420 C620 300 860 300 920 420 C960 520 880 640 740 650 C600 640 520 540 560 420Z" fill="#d9c08f" stroke="${C.ink}" stroke-width="6"/><rect x="620" y="400" width="240" height="160" fill="#efe6d2" stroke="${C.ink}" stroke-width="5"/>${Array.from({ length: 5 }, (_, i) => `<rect x="${624 + i * 48}" y="380" width="26" height="26" fill="#efe6d2" stroke="${C.ink}" stroke-width="4"/>`).join("")}<text x="740" y="720" text-anchor="middle" class="t-map">NEW CARTHAGE</text></g>` +
    `<g id="front">${[0, 1, 2].map((i) => unit(560 + i * 130, 830, 110, 50, C.rome)).join("")}</g>` +
    `<g id="waders">${[0, 1, 2].map((i) => unit(1560 + i * 40, 300 + i * 70, 110, 44, C.rome)).join("")}</g>` +
    place(PA({ pose: "point", brows: "smug", mouth: "smirk" }), 1680, 1060, 1.0, { id: "publius" }) +
    sticker(560, 150, "TAKEN IN ONE DAY", { size: 60, rot: -3, id: "st-day" }) + Toon.elCounter(1) + H.grain();

  // 42 — Hasdrubal crosses the Alps; the Metaurus; Hannibal finds out
  S["42"] = () => {
    const route = Geo.route([[-1, 38.5], [1.5, 42.3], [4.6, 44.0], [6.9, 45.1], [9.7, 45.05], [12.0, 44.5], [12.9, 43.7]]);
    const [mx, my] = Geo.project([12.9, 43.7]);
    return H.defs() + Toon.map(g.MED, { regions: [reg("italy", C.rome), reg("sicily", C.rome), reg("spainS", C.carth), reg("africa", C.carth)] }) +
      `<g id="route2"><path d="${route}" stroke="${C.ink}" stroke-width="26" fill="none" stroke-linecap="round"/><path d="${route}" stroke="#b48ae0" stroke-width="14" fill="none" stroke-linecap="round" stroke-dasharray="26 16"/></g>` +
      `<text x="560" y="220" class="t-label" font-size="42">HASDRUBAL (the brother)</text>` +
      `<g id="msg" transform="translate(1180 360)">${P.scroll(-90, -50, 180, 70, ["PLANS"], { size: 30 })}<path d="M-110 -70 L110 90 M110 -70 L-110 90" stroke="${C.rome}" stroke-width="18" stroke-linecap="round"/></g>` +
      `<g id="metaurus"><circle cx="${mx}" cy="${my}" r="26" fill="${C.rome}" stroke="#fff" stroke-width="5"/><text x="${mx + 40}" y="${my - 20}" class="t-map">METAURUS, 207 BC</text></g>` +
      `<g id="sad" data-layout-allow-overlap="true"><rect width="1920" height="1080" fill="#2d2440"/>${place(HB({ pose: "hold", brows: "sad", mouth: "frown" }), 960, 1000, 1.5)}<text x="960" y="200" text-anchor="middle" class="t-title" font-size="60">That's how he found out.</text></g>` +
      Toon.elCounter(1) + H.grain();
  };

  // 43 — Ilipa; Spain is Rome's; Hannibal stuck in the toe of the boot
  S["43"] = () => {
    const [tx, ty] = Geo.project([16.3, 38.9]);
    return H.defs() + Toon.map(g.MED, { regions: [reg("italy", C.rome), reg("sicily", C.rome), reg("sardinia", C.rome), reg("corsica", C.rome), reg("africa", C.carth), reg("spainS", C.carth, "r-spain-c"), reg("spainS", C.rome, "r-spain-r")] }) +
      `<g id="toe"><circle cx="${tx}" cy="${ty}" r="34" fill="${C.carth}" stroke="#fff" stroke-width="6"/><text x="${tx + 50}" y="${ty + 10}" class="t-map">HANNIBAL (still here)</text></g>` +
      sticker(560, 150, "ILIPA, 206 BC: SPAIN → ROME", { size: 50, rot: -3, id: "st-ilipa" }) +
      placeEl(elephant({ brows: "sad" }), 1560, 1060, 0.7, { id: "surus" }) + place(HB({ pose: "cross", mouth: "flat", brows: "neutral" }), 1260, 1060, 0.9, { id: "hannibal" }) +
      Toon.elCounter(1) + H.grain();
  };

  g.Scenes = Object.assign(g.Scenes || {}, S);
})(globalThis);
