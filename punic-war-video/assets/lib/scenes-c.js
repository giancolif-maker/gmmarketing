// Act 2 — "Rome Keeps Sending Consuls", frames 23–33 (conventions: scenes-a.js).
(function (g) {
  const { Toon, Geo, SceneKit } = g;
  const { C, place, placeEl, CAST, elephant, P, sticker, unit } = Toon;
  const { H } = SceneKit;
  const S = {};
  const HB = (x = {}) => CAST.hannibal({ eyepatch: true, ...x });

  // Full-screen act title card (revealed at t=0 and hidden before the first line by META.intro).
  H.actCard = (part, title, col = C.rome) =>
    `<g id="act" data-layout-allow-overlap="true"><rect width="1920" height="1080" fill="${C.carthDk}"/>${Array.from({ length: 12 }, (_, i) => `<path d="M960 540 L${960 + Math.cos(i / 6 * Math.PI) * 1400} ${540 + Math.sin(i / 6 * Math.PI) * 1400} L${960 + Math.cos((i + .5) / 6 * Math.PI) * 1400} ${540 + Math.sin((i + .5) / 6 * Math.PI) * 1400}Z" fill="${C.carth}"/>`).join("")}<text x="960" y="400" text-anchor="middle" class="t-title" font-size="96" fill="${C.gold}">PART ${part}</text><g transform="translate(960 560) rotate(-2)"><rect x="-760" y="-80" width="1520" height="160" rx="22" fill="${col}" stroke="${C.ink}" stroke-width="10"/><text x="0" y="34" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="92" fill="#fffaf0">${title}</text></g></g>`;
  // Picture-in-picture speaker with a bubble (used for Flaccus' "Okay. More legions.")
  H.pip = (id, who, x, y, text, { bx = x - 470, by = y - 200, tail = "br" } = {}) =>
    `<g id="${id}"><circle cx="${x}" cy="${y}" r="110" fill="#efe6d2" stroke="${C.ink}" stroke-width="8"/><clipPath id="${id}-c"><circle cx="${x}" cy="${y}" r="104"/></clipPath><g clip-path="url(#${id}-c)">${place(who, x, y + 230, 0.95)}</g>${P.bubble(bx, by, 380, 110, text, { tail, size: 38 })}</g>`;
  H.snow = (n = 60) => `<g id="snowfall">${Array.from({ length: n }, (_, i) => `<circle class="flake" cx="${(i * 277) % 1920}" cy="${(i * 131) % 1080}" r="${3 + (i % 4) * 2}" fill="#fff" opacity=".85"/>`).join("")}</g>`;
  H.water = (y, col = "#4c8fc2", h = 1080) => `<rect y="${y}" width="1920" height="${h}" fill="${col}" opacity=".9"/>` + [0, 1, 2].map((i) => `<path class="wave" d="M-100 ${y + 30 + i * 70} q60 -14 120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0" stroke="#bfe3f7" stroke-width="5" fill="none" opacity=".6"/>`).join("");
  // An eyepatch overlay that lines up with a placed character (same x, y, scale, flip)
  H.patch = (x, y, s, flip = false, id = "patch") => place(`<path d="M36 82 L164 96" stroke="${C.ink}" stroke-width="5"/><ellipse cx="120" cy="106" rx="18" ry="15" fill="${C.ink}"/>`, x, y, s, { flip, id });
  const cow = (x, y, s = 1, torch = true) => `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="-40" rx="60" ry="34" fill="#f2efe8" stroke="${C.ink}" stroke-width="5"/><ellipse cx="-18" cy="-48" rx="16" ry="10" fill="${C.ink}"/><circle cx="58" cy="-62" r="24" fill="#f2efe8" stroke="${C.ink}" stroke-width="5"/><path d="M-36 -10 v20 M-10 -10 v20 M20 -10 v20 M40 -10 v20" stroke="${C.ink}" stroke-width="8" stroke-linecap="round"/>${torch ? `<path d="M50 -84 l-8 -26 M68 -84 l8 -26" stroke="${C.wood}" stroke-width="6"/><circle cx="42" cy="-114" r="11" fill="${C.fire}"/><circle cx="76" cy="-114" r="11" fill="${C.fire}"/><circle cx="42" cy="-118" r="6" fill="${C.fireLt}"/><circle cx="76" cy="-118" r="6" fill="${C.fireLt}"/>` : ""}</g>`;
  const column = (x0, y0, x1, y1, n, s, mk) => Array.from({ length: n }, (_, i) => { const f = i / Math.max(1, n - 1); return place(mk(i), x0 + (x1 - x0) * f, y0 + (y1 - y0) * f + (i % 2) * 6, s); }).join("");

  // 23 — Part 2 title, then the plan in a snowy camp
  S["23"] = () =>
    H.defs() + H.sky("#9fb2c9", "#e3ebf2") + H.ground(700, "#eef3f7", "#cfd9e3") +
    `<g>${[300, 1600].map((x) => `<path d="M${x - 160} 760 L${x} 520 L${x + 160} 760Z" fill="#c9a86a" stroke="${C.ink}" stroke-width="6"/><path d="M${x - 30} 760 L${x} 640 L${x + 30} 760Z" fill="${C.ink}"/>`).join("")}</g>` +
    `<g id="table"><rect x="760" y="760" width="400" height="30" rx="6" fill="${C.wood}" stroke="${C.ink}" stroke-width="5"/><rect x="790" y="790" width="22" height="120" fill="${C.wood}" stroke="${C.ink}" stroke-width="4"/><rect x="1108" y="790" width="22" height="120" fill="${C.wood}" stroke="${C.ink}" stroke-width="4"/><rect x="800" y="728" width="320" height="40" fill="#f3e3c3" stroke="${C.ink}" stroke-width="4" transform="rotate(-3 960 748)"/><path d="M820 750 q60 -20 120 0 t140 -10" stroke="#3d7bb0" stroke-width="6" fill="none"/></g>` +
    place(CAST.hannibal({ pose: "point", mouth: "smirk", brows: "smug" }), 640, 1000, 1.25, { id: "hannibal" }) +
    place(CAST.gisgo({ pose: "shrug", eyes: "wide", mouth: "open" }), 1300, 1000, 1.25, { id: "gisgo", flip: true }) +
    H.snow(50) + Toon.elCounter(37) + H.actCard(2, "Rome Keeps Sending Consuls") + H.grain();

  // 24 — Trebia: Romans wade the freezing river; Carthaginians are warm and oily
  S["24"] = () =>
    H.defs() + H.sky("#b9c8d8", "#e8eef3") +
    `<path d="M0 360 C500 330 1300 380 1920 340 V470 H0Z" fill="#eef3f7" stroke="${C.ink}" stroke-width="5"/>` +
    `<g id="carths">${column(1020, 450, 1820, 440, 7, 0.5, () => CAST.carthSoldier({ brows: "happy", mouth: "smile", roundShield: false }))}${P.fire(1500, 470, 0.6)}<g id="shine">${[[1100, 300], [1350, 290], [1650, 300]].map(([x, y]) => `<path d="M${x} ${y - 24} L${x + 6} ${y - 6} L${x + 24} ${y} L${x + 6} ${y + 6} L${x} ${y + 24} L${x - 6} ${y + 6} L${x - 24} ${y} L${x - 6} ${y - 6}Z" fill="${C.fireLt}" stroke="${C.ink}" stroke-width="3"/>`).join("")}</g></g>` +
    `<rect y="470" width="1920" height="610" fill="#6fa3c7"/>` +
    `<g id="romans">${column(120, 1010, 860, 960, 8, 0.85, (i) => CAST.legionary({ brows: "sad", mouth: "grit", shield: false, pose: i % 2 ? "holdUp" : "idle" }))}</g>` +
    place(CAST.sempronius({ pose: "point", mouth: "grit", brows: "angry", sword: true }), 520, 1060, 1.15, { id: "sempronius" }) +
    `<rect y="880" width="1920" height="200" fill="#7fb3d5" opacity=".85"/><path class="wave" d="M-100 890 q60 -14 120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0" stroke="#e6f6ff" stroke-width="6" fill="none"/>` +
    place(CAST.gisgo({ pose: "wave", mouth: "grin", brows: "happy", roundShield: false }), 1360, 470, 0.8, { id: "gisgo" }) +
    `<text x="960" y="1050" text-anchor="middle" class="t-cap" font-size="40" id="temp">River temperature: very no.</text>` +
    H.snow(40) + Toon.elCounter(37) + H.grain();

  // 25 — Trebia diagram: Mago's ambush, and the elephants freeze
  S["25"] = () =>
    H.defs() + `<rect width="1920" height="1080" fill="#eef3f7"/>` +
    `<path d="M0 470 C400 430 800 520 1200 470 S1700 430 1920 480 V560 C1700 520 1400 560 1200 550 S400 520 0 550Z" fill="#7fb3d5" stroke="${C.ink}" stroke-width="5"/>` +
    `<text x="120" y="620" class="t-label" font-size="40">TREBIA</text>` +
    `<g id="c-line">${[0, 1, 2, 3, 4].map((i) => unit(420 + i * 190, 270, 170, 60, "#f7f2e6")).join("")}</g>` +
    `<g id="r-army">${[0, 1, 2, 3].map((i) => unit(500 + i * 200, 700, 180, 90, C.rome)).join("")}</g>` +
    `<g id="mago">${unit(380, 860, 900, 70, C.carth)}<text x="830" y="908" text-anchor="middle" class="t-flag" font-size="34">MAGO</text></g>` +
    P.arrow(830, 850, 830, 800, { col: C.carth, id: "mago-arrow" }) +
    placeEl(elephant({ brows: "sad", eyes: "wide" }), 1640, 1040, 0.85, { id: "surus" }) +
    H.pip("flaccus-pip", CAST.flaccus({ pose: "shrug" }), 1560, 220, "Okay. More legions.", { bx: 1030, by: 120 }) +
    Toon.elCounter(37) + H.grain();

  // 26 — The marsh: four days wading, one eye lost
  S["26"] = () =>
    H.defs() + H.sky("#8a9a7a", "#c9d0b0") + `<g>${[200, 500, 1450, 1750].map((x, i) => `<path d="M${x} 620 v-220" stroke="#5a4a32" stroke-width="16"/><path d="M${x} 420 q-60 -40 -90 -10 M${x} 450 q60 -40 90 -10" stroke="#5a6a3a" stroke-width="10" fill="none"/>`).join("")}</g>` +
    `<rect y="600" width="1920" height="480" fill="#6b7a4a"/>` +
    `<g id="waders">${column(80, 900, 700, 860, 6, 0.6, () => CAST.carthSoldier({ brows: "sad", mouth: "wobbly", roundShield: false }))}</g>` +
    placeEl(elephant({ brows: "sad" }), 1500, 900, 0.75, { id: "surus" }) +
    place(CAST.hannibal({ pose: "hips", mouth: "flat", brows: "neutral" }), 960, 1030, 1.2, { id: "hannibal" }) +
    H.patch(960, 1030, 1.2) +
    place(CAST.gisgo({ pose: "point", brows: "angry", mouth: "flat", roundShield: false }), 1300, 1030, 1.1, { id: "gisgo", flip: true }) +
    `<rect y="900" width="1920" height="180" fill="#5d6b3e" opacity=".9"/><path class="wave" d="M-100 910 q60 -10 120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0" stroke="#9aa86a" stroke-width="5" fill="none"/>` +
    sticker(560, 160, "4 DAYS. 3 NIGHTS. 1 EYE.", { size: 60, rot: -3, bg: C.ink, id: "st-days" }) + Toon.elCounter(1) + H.grain();

  // 27 — Lake Trasimene in the fog
  S["27"] = () =>
    H.defs() + `<rect width="1920" height="1080" fill="#a9c48a"/>` +
    `<path d="M0 640 C300 600 700 700 1100 660 S1700 600 1920 640 V1080 H0Z" fill="#4c8fc2" stroke="${C.ink}" stroke-width="5"/><text x="300" y="900" class="t-label" font-size="48">LAKE TRASIMENE</text>` +
    `<g id="hills">${[200, 520, 840, 1160, 1480, 1800].map((x) => `<path d="M${x - 220} 420 Q${x} 140 ${x + 220} 420Z" fill="#7f9a5a" stroke="${C.ink}" stroke-width="5"/>`).join("")}</g>` +
    `<g id="c-hide">${[260, 620, 980, 1340, 1700].map((x) => unit(x - 80, 300, 160, 50, C.carth)).join("")}</g>` +
    `<g id="r-col">${[0, 1, 2, 3, 4, 5].map((i) => unit(120 + i * 220, 530, 190, 54, C.rome)).join("")}</g>` +
    `<g id="fog"><rect width="1920" height="1080" fill="#eef1f2" opacity=".75"/>${[[300, 500], [900, 420], [1500, 520]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="520" ry="160" fill="#fff" opacity=".6"/>`).join("")}</g>` +
    place(CAST.flaminius({ pose: "point", sword: true, swordRot: -60 }), 1600, 1060, 1.1, { id: "flaminius" }) +
    H.pip("flaccus-pip", CAST.flaccus({ pose: "shrug", brows: "worried", mouth: "wobbly" }), 1560, 220, "Okay… more legions?", { bx: 1030, by: 120 }) +
    Toon.consulCounter(0) + Toon.elCounter(1) + H.grain();

  // 28 — Fabius the Delayer
  S["28"] = () =>
    H.defs() + H.interior("#cbb38c", "#9a7a56") + H.columns([140, 1780], 820, 700) +
    `<g id="plan" transform="translate(600 160)"><rect width="720" height="420" rx="18" fill="#fffaf0" stroke="${C.ink}" stroke-width="6"/><text x="360" y="70" text-anchor="middle" class="t-ink" font-size="44">THE FABIUS PLAN</text>${["Follow him", "Watch him", "Take his food", "NEVER fight him"].map((t, i) => `<g id="plan-${i}"><rect x="60" y="${110 + i * 72}" width="40" height="40" rx="6" fill="none" stroke="${C.ink}" stroke-width="4"/><path d="M68 ${130 + i * 72} l10 12 l20 -24" stroke="${C.rome}" stroke-width="6" fill="none"/><text x="120" y="${142 + i * 72}" class="t-ink" font-size="38" ${i === 3 ? `fill="${C.rome}"` : ""}>${t}</text></g>`).join("")}</g>` +
    place(CAST.fabius({ pose: "cross" }), 520, 1030, 1.3, { id: "fabius" }) +
    place(CAST.flaccus({ pose: "hips", brows: "angry", mouth: "frown" }), 1420, 1030, 1.3, { id: "flaccus", flip: true }) +
    sticker(960, 660, "CUNCTATOR: THE DELAYER", { size: 60, rot: 2, id: "st-delay" }) + Toon.consulCounter(1) + Toon.elCounter(1) + H.grain();

  // 29 — The burning cattle
  S["29"] = () => {
    const stars = Array.from({ length: 30 }, (_, i) => `<circle cx="${(i * 389) % 1920}" cy="${(i * 97) % 360}" r="${2 + (i % 3)}" fill="#fffaf0" opacity=".8"/>`).join("");
    return H.defs() + H.sky("#101a30", "#2a3656") + stars +
      `<path d="M0 560 L700 220 L1000 560Z" fill="#26324a" stroke="${C.ink}" stroke-width="5"/><path d="M1100 560 L1500 260 L1920 520 V560Z" fill="#26324a" stroke="${C.ink}" stroke-width="5"/>` +
      `<path d="M0 560 H1920 V1080 H0Z" fill="#1d283e"/>` +
      `<g id="cows">${Array.from({ length: 10 }, (_, i) => cow(320 + (i % 5) * 70 + Math.floor(i / 5) * 40, 520 - (i % 5) * 50 - Math.floor(i / 5) * 20, 0.55)).join("")}</g>` +
      `<g id="romans">${column(900, 800, 1300, 760, 5, 0.5, () => CAST.legionary({ pose: "point", shield: false, brows: "angry", mouth: "open" }))}</g>` +
      `<g id="sneak">${column(1100, 620, 1500, 610, 6, 0.36, () => CAST.carthSoldier({ brows: "smug", mouth: "smirk", roundShield: false }))}</g>` +
      `<g id="captor">${place(CAST.legionary({ pose: "hold", shield: false, brows: "sad", mouth: "flat" }), 420, 1040, 1.1)}${cow(620, 1040, 1.2, false)}</g>` +
      sticker(1500, 160, "2,000 COWS", { size: 64, rot: 3, id: "st-cows" }) + Toon.consulCounter(1) + Toon.elCounter(1) + H.grain();
  };

  // 30 — Cannae: so many Romans; the Gisgo joke
  S["30"] = () =>
    H.defs() + H.sky("#f2c27a", "#fbe7c0") + H.ground(560, "#d7bf86", "#b59a62") +
    `<g id="romans">${Array.from({ length: 4 }, (_, r) => column(260, 600 + r * 50, 1840, 600 + r * 50, 26, 0.26, () => CAST.legionary({ shield: C.rome }))).join("")}</g>` +
    `<path d="M0 1080 L0 820 C300 760 700 780 900 1080Z" fill="#b59a62" stroke="${C.ink}" stroke-width="6"/>` +
    place(HB({ pose: "point", mouth: "smirk", brows: "smug" }), 320, 1000, 1.05, { id: "hannibal" }) +
    place(CAST.gisgo({ pose: "hold", eyes: "wide", mouth: "wobbly", sweat: true }), 600, 1010, 1.0, { id: "gisgo", flip: true }) +
    `<g id="laugh">${[[1000, 900], [1240, 920], [1480, 900], [1720, 920]].map(([x, y]) => place(CAST.carthSoldier({ eyes: "closed", mouth: "grin", brows: "happy", roundShield: false, pose: "armsUp" }), x, y + 140, 0.7) + `<text x="${x}" y="${y - 120}" text-anchor="middle" class="t-cap" font-size="44">HA!</text>`).join("")}</g>` +
    `<g id="confused">${[500, 1100, 1600].map((x) => `<text x="${x}" y="560" text-anchor="middle" class="t-title" font-size="80">?</text>`).join("")}</g>` +
    sticker(1400, 160, "REAL JOKE · PLUTARCH", { size: 54, rot: 3, bg: C.ink, id: "st-real" }) + Toon.consulCounter(1) + Toon.elCounter(1) + H.grain();

  // 31 — Cannae, the double envelopment (battle diagram)
  S["31"] = () =>
    H.defs() + `<rect width="1920" height="1080" fill="#e6cf95"/>` +
    `<path d="M1700 0 C1640 300 1780 600 1680 1080" stroke="#4c8fc2" stroke-width="60" fill="none"/><text x="1520" y="1010" class="t-label" font-size="34">AUFIDUS</text><text x="80" y="1010" class="t-label" font-size="48">CANNAE, 216 BC</text>` +
    `<g id="rome">${[0, 1, 2, 3, 4, 5].map((i) => unit(560 + i * 110, 640, 96, 220, C.rome)).join("")}<text x="890" y="910" text-anchor="middle" class="t-label" font-size="36">ROME ~86,000</text></g>` +
    `<g id="c-center">${[0, 1, 2, 3, 4].map((i) => unit(610 + i * 120, 470 + Math.abs(i - 2) * 30, 110, 54, "#f7f2e6")).join("")}</g>` +
    `<g id="c-left">${unit(380, 520, 150, 70, C.carth)}<text x="455" y="500" text-anchor="middle" class="t-flag" font-size="26" fill="${C.ink}">VETERANS</text></g>` +
    `<g id="c-right">${unit(1260, 520, 150, 70, C.carth)}<text x="1335" y="500" text-anchor="middle" class="t-flag" font-size="26" fill="${C.ink}">VETERANS</text></g>` +
    `<g id="cav-l">${unit(160, 520, 150, 60, C.gold)}</g><g id="cav-r">${unit(1460, 520, 150, 60, C.gold)}</g>` +
    `<g id="push">${P.arrow(890, 640, 890, 470, { col: C.rome })}</g>` +
    Toon.consulCounter(1) + Toon.elCounter(1) + H.grain();

  // 32 — Cannae stat card; the consul counter ticks
  S["32"] = () =>
    H.defs() + Toon.statCard("BATTLE OF CANNAE", [["STRENGTH", "~50,000", "~86,000"], ["KILLED", "~6,000", "~50,000"]]) +
    `<text id="senators" x="960" y="1000" text-anchor="middle" font-family="Fredoka" font-weight="600" font-size="34" fill="#c9b38f">+ about 80 senators, + consul Paullus</text>` +
    Toon.consulCounter(1) + Toon.elCounter(1);

  // 33 — Maharbal: "you don't know how to use one"
  S["33"] = () =>
    H.defs() + H.sky("#e98a5a", "#fbd9a0") + `<circle cx="1500" cy="520" r="140" fill="#ffd27a"/>` +
    `<g id="rome-far"><path d="M1240 600 h520 v-60 h-40 v-40 h-60 v40 h-80 v-80 l-60 -40 l-60 40 v80 h-80 v-40 h-60 v40 h-80Z" fill="#8a4a3a" opacity=".8"/><text x="1500" y="440" text-anchor="middle" class="t-label" font-size="44">ROME →</text></g>` +
    H.ground(600, "#c99a5a", "#a87a3e") +
    place(CAST.maharbal({ pose: "point", mouth: "shout", spear: false }), 760, 1030, 1.3, { id: "maharbal" }) +
    place(HB({ pose: "cross", mouth: "flat", brows: "neutral" }), 380, 1030, 1.3, { id: "hannibal" }) +
    sticker(560, 200, "5 DAYS TO ROME", { size: 64, rot: -3, id: "st-5days" }) + Toon.consulCounter(2) + Toon.elCounter(1) + H.grain();

  g.Scenes = Object.assign(g.Scenes || {}, S);
})(globalThis);
