// Episode 1 scenes F15–F27 (see scenes-1.js for conventions and the shared H helpers).
(function (g) {
  const { Toon, WW, Geo, WWH: H } = g;
  const { C, place, sticker } = Toon;
  const { CAST, P, K } = WW;
  const ink = C.ink;
  const S = {};

  const tank = (x, y, s = 1, id = "", col = "#5f6650") => `<g${id ? ` id="${id}"` : ""} transform="translate(${x} ${y}) scale(${s})"><rect x="-230" y="-60" width="460" height="110" rx="40" fill="#3f423a" stroke="${ink}" stroke-width="8"/>${[-170, -85, 0, 85, 170].map((cx) => `<circle cx="${cx}" cy="0" r="34" fill="#2c2e28" stroke="${ink}" stroke-width="5"/>`).join("")}<rect x="-190" y="-150" width="380" height="100" rx="18" fill="${col}" stroke="${ink}" stroke-width="8"/><rect x="-90" y="-230" width="200" height="90" rx="20" fill="${col}" stroke="${ink}" stroke-width="8"/><rect x="-330" y="-205" width="240" height="30" rx="10" fill="#4f554a" stroke="${ink}" stroke-width="6"/></g>`;
  const tree = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-12" y="-40" width="24" height="60" fill="#6b4a2c" stroke="${ink}" stroke-width="4"/><path d="M0 -220 L80 -40 L-80 -40Z" fill="#3f6b3a" stroke="${ink}" stroke-width="5"/><path d="M0 -270 L60 -130 L-60 -130Z" fill="#4a7a42" stroke="${ink}" stroke-width="5"/></g>`;
  const boat = (x, y, s, hull, label = "", id = "") => `<g${id ? ` id="${id}"` : ""} transform="translate(${x} ${y}) scale(${s})"><path d="M-160 0 L160 0 L120 60 L-130 60Z" fill="${hull}" stroke="${ink}" stroke-width="7"/><rect x="-60" y="-70" width="120" height="70" fill="#f4f1ea" stroke="${ink}" stroke-width="6"/><rect x="10" y="-130" width="26" height="60" fill="#c9352b" stroke="${ink}" stroke-width="5"/>${label ? `<text y="44" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="30" fill="#fffaf0">${label}</text>` : ""}</g>`;

  // F15 — Waiting: the card game, then Finland in snow, then Hitler takes notes
  S["15"] = () =>
    H.defs() + H.sky("#a9b8c4", "#dfe4e8") + `<path d="M0 640 H1920 V1080 H0Z" fill="#7a6a4a" stroke="${ink}" stroke-width="5"/><path d="M0 640 Q480 600 960 640 T1920 640" stroke="#5a4a32" stroke-width="16" fill="none"/>` +
    `<g>${Array.from({ length: 22 }, (_, i) => `<rect x="${i * 90}" y="560" width="80" height="80" rx="10" fill="#c9b98a" stroke="${ink}" stroke-width="4"/>`).join("")}</g>` +
    H.table(700, 820, 520, "#6b4a2c") +
    place(CAST.soldierUK({ pose: "hold", mouth: "flat", brows: "neutral" }), 560, 1060, 1.4, { id: "uk" }) +
    place(CAST.soldierFR({ pose: "hold", mouth: "flat", brows: "neutral" }), 1360, 1060, 1.4, { id: "frs", flip: true }) +
    `<g id="pop-tourn"><rect x="1380" y="120" width="440" height="300" rx="12" fill="#fffaf0" stroke="${ink}" stroke-width="7"/><text x="1600" y="180" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="36" fill="${ink}">GO FISH OPEN 1940</text><text x="1460" y="260" font-family="Fredoka" font-weight="600" font-size="34" fill="${ink}">UK</text><text x="1740" y="260" text-anchor="end" font-family="Fredoka" font-weight="700" font-size="40" fill="${ink}">4,812</text><text x="1460" y="340" font-family="Fredoka" font-weight="600" font-size="34" fill="${ink}">FRANCE</text><text x="1740" y="340" text-anchor="end" font-family="Fredoka" font-weight="700" font-size="40" fill="${ink}">4,815</text></g>` +
    `<g id="cal"><rect x="120" y="120" width="240" height="250" rx="14" fill="#fffaf0" stroke="${ink}" stroke-width="7"/><rect x="120" y="120" width="240" height="70" rx="14" fill="${K.red}" stroke="${ink}" stroke-width="7"/><text x="240" y="300" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="64" fill="${ink}">OCT</text>${["DEC", "MAR"].map((m, i) => `<g id="cut-cal${i + 2}"><rect x="128" y="196" width="224" height="166" fill="#fffaf0"/><text x="240" y="300" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="64" fill="${ink}">${m}</text></g>`).join("")}</g>` +
    `<g id="fade-fin" data-layout-allow-overlap="true"><rect width="1920" height="1080" fill="#e8eef4"/>${Array.from({ length: 14 }, (_, i) => `<path d="M${i * 150} 760 L${i * 150 + 60} 520 L${i * 150 + 120} 760Z" fill="#c9d6e0" stroke="${ink}" stroke-width="3"/>`).join("")}<rect y="760" width="1920" height="320" fill="#f6f9fc" stroke="${ink}" stroke-width="4"/><g id="fin-skiers">${[300, 520, 740].map((x) => place(WW.person({ body: "#f4f6f8", sleeve: "#f4f6f8", legs: "#e2e6ea", cap: "nurse", brows: "happy", mouth: "smile" }), x, 980, 1.0) + `<path d="M${x - 110} 990 L${x + 90} 1000" stroke="#8a5a2a" stroke-width="10"/>`).join("")}</g><g id="inr-sov">${[1300, 1460, 1620, 1780].map((x) => place(CAST.soldierSU({ pose: "hold", brows: "worried", mouth: "flat" }), x, 1000, 0.95, { flip: true })).join("")}</g>${H.label(1360, 300, "FINLAND, WINTER 1939–40", 54)}${sticker(1400, 520, "THE 2-WEEK WAR: 3½ MONTHS", { size: 46, rot: -2, bg: K.red })}</g>` +
    `<g id="cut-notes" data-layout-allow-overlap="true">${H.room("#a89a82", "#6b5a42")}${place(CAST.hitler({ pose: "hold", mouth: "smirk", brows: "smug", prop: P.clipboard(118, 220, 0.9) }), 620, 1040, 1.45)}${place(CAST.klaus({ pose: "shrug", brows: "worried" }), 1300, 1040, 1.4, { flip: true })}<g transform="translate(960 300) rotate(-3)"><rect x="-330" y="-90" width="660" height="180" fill="#fbf6e8" stroke="${ink}" stroke-width="6"/><text y="20" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="54" fill="${K.red}">"THEIR ARMY IS WEAK"</text></g></g>` +
    H.grain();

  // F16 — Around the wall: Maginot Line, the forest, the tanks
  S["16"] = () =>
    H.defs() + H.sky("#b9d3e4", "#eaf3f8") + H.ground(700, "#8fb35a", "#6d8f3e") +
    `<g id="wall"><rect x="980" y="430" width="940" height="270" fill="#9a9c9f" stroke="${ink}" stroke-width="8"/>${Array.from({ length: 6 }, (_, i) => `<rect x="${1020 + i * 150}" y="360" width="110" height="90" rx="14" fill="#8a8c90" stroke="${ink}" stroke-width="6"/><rect x="${1050 + i * 150}" y="390" width="50" height="16" fill="#2a2a2a"/>`).join("")}${H.label(1450, 600, "MAGINOT LINE", 56)}</g>` +
    `<g id="forest">${Array.from({ length: 14 }, (_, i) => tree(40 + i * 70, 760 - (i % 3) * 30, 1.1 + (i % 2) * 0.2)).join("")}${H.label(480, 300, "ARDENNES", 60)}</g>` +
    place(CAST.generalFR({ pose: "point", mouth: "smirk", brows: "smug" }), 1500, 1050, 1.4, { id: "gen", flip: true }) +
    `<g id="tanks">${tank(-460, 970, 0.5, "inl-tank3")}${tank(-60, 940, 0.6, "inl-tank2")}${tank(420, 900, 0.8, "inl-tank1")}</g>` +
    `<g id="pop-driver">${place(CAST.soldierDE({ pose: "wave", mouth: "grin", brows: "happy" }), 470, 780, 0.75)}</g>` +
    H.date(260, 120, "MAY 1940", "st-date") + H.grain();

  // F17 — Dunkirk: beach crowd, Hitler/Klaus inset, boats arriving
  S["17"] = () =>
    H.defs() + H.sky("#c4d4de", "#eef2f4") + `<rect y="520" width="1920" height="560" fill="#5b88ad"/>${Array.from({ length: 4 }, (_, i) => `<path class="wave" d="M-100 ${560 + i * 60} q60 -14 120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0" stroke="#d9ecf7" stroke-width="5" fill="none" opacity=".7"/>`).join("")}` +
    `<path d="M0 760 Q600 700 1100 760 T1920 800 V1080 H0Z" fill="#e2cf9a" stroke="${ink}" stroke-width="6"/>` +
    `<g id="crowd">${Array.from({ length: 26 }, (_, i) => place(CAST.soldierUK({ brows: i % 3 ? "worried" : "sad", mouth: "flat" }), 60 + i * 72, 1020 - (i % 3) * 40, 0.6)).join("")}</g>` +
    `<g id="pop-boat1">${boat(1500, 560, 1.4, "#6a6d72", "DESTROYER")}</g><g id="pop-boat2">${boat(1050, 600, 1.0, "#3f5f8a", "FERRY")}</g><g id="pop-boat3">${boat(620, 640, 0.75, "#8a5a2a", "")}</g><g id="pop-boat4">${boat(260, 660, 0.6, "#c9a24a", "")}</g>` +
    `<g id="cut-hq" data-layout-allow-overlap="true">${H.room("#a89a82", "#6b5a42")}${place(CAST.hitler({ pose: "hips", mouth: "smirk", brows: "smug" }), 560, 1040, 1.45)}${place(CAST.klaus({ pose: "shrug", brows: "worried", mouth: "open" }), 1300, 1040, 1.4, { flip: true })}${sticker(960, 160, "GÖRING'S PROMISE", { size: 48, rot: -2, bg: ink })}</g>` +
    H.date(260, 120, "DUNKIRK, MAY 1940", "st-date") + H.grain();

  // F18 — The railway carriage, then de Gaulle in London
  S["18"] = () =>
    H.defs() + H.sky("#cfe0c8", "#eef4ea") + H.ground(780, "#7fa35a", "#5f833e") +
    `<g>${Array.from({ length: 10 }, (_, i) => tree(60 + i * 200, 760, 1.4)).join("")}</g>` +
    `<g id="carriage"><rect x="380" y="380" width="1160" height="400" rx="20" fill="#6b3f26" stroke="${ink}" stroke-width="8"/>${Array.from({ length: 5 }, (_, i) => `<rect x="${430 + i * 220}" y="430" width="170" height="140" rx="10" fill="#f2e2b4" stroke="${ink}" stroke-width="6"/>`).join("")}<rect x="400" y="780" width="1120" height="30" fill="#3a2a1a"/><text x="960" y="700" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="44" fill="#f2e2b4">COMPIÈGNE · 1918 · 1940</text></g>` +
    place(CAST.hitler({ pose: "hips", mouth: "grin", brows: "smug" }), 760, 1050, 1.35, { id: "hitler" }) +
    place(CAST.officerDE({ pose: "shrug", brows: "worried" }), 1240, 1050, 1.3, { id: "aide", flip: true }) +
    `<g id="cut-london" data-layout-allow-overlap="true"><rect width="1920" height="1080" fill="#6d7a86"/><rect y="760" width="1920" height="320" fill="#4f5a64"/>${[200, 560, 1400, 1700].map((x) => `<rect x="${x}" y="300" width="200" height="460" fill="#8a7a6a" stroke="${ink}" stroke-width="5"/>`).join("")}<g transform="translate(960 560)"><rect x="-60" y="-120" width="120" height="160" rx="16" fill="#3a3a40" stroke="${ink}" stroke-width="6"/><rect x="-12" y="40" width="24" height="200" fill="#555"/></g>${place(CAST.degaulle({ pose: "point" }), 700, 1040, 1.75)}${place(CAST.clerkUK({ pose: "shrug", brows: "worried" }), 1320, 1040, 1.3, { flip: true })}${sticker(1400, 160, "BBC · LONDON", { size: 46, rot: -2, bg: ink })}</g>` +
    H.date(260, 120, "JUNE 1940", "st-date") + H.grain();

  // F19 — Late to the party (balcony again)
  S["19"] = () => g.Scenes["07"]().replace('id="pop-ban"', 'id="pop-banx"').replace("VICTORY IN ETHIOPIA", "VICTORY IN ITALY?").replace(/<g id="fade-gas"[\s\S]*?<!--\/gas--><\/g>/, "") + P.banner(960, 230, 840, "VICTORY IN FRANCE", { id: "pop-ban2", size: 64 });

  // F20 — Churchill: Downing Street doorway
  S["20"] = () =>
    H.defs() + `<rect width="1920" height="1080" fill="#3a2f2a"/>${Array.from({ length: 12 }, (_, i) => Array.from({ length: 8 }, (_, j) => `<rect x="${(i * 170) + (j % 2) * 85 - 60}" y="${j * 110}" width="160" height="100" fill="#4a3b33" stroke="#2a201b" stroke-width="5"/>`).join("")).join("")}` +
    `<g><rect x="760" y="200" width="400" height="640" rx="10" fill="#151518" stroke="${ink}" stroke-width="10"/><path d="M760 360 Q960 200 1160 360" fill="none" stroke="#b9a87a" stroke-width="10"/><text x="960" y="470" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="88" fill="#d9c8a0">10</text><circle cx="1110" cy="560" r="16" fill="#d9c8a0"/></g>` +
    `<rect y="840" width="1920" height="240" fill="#6d6f73" stroke="${ink}" stroke-width="5"/>` +
    `<g id="cham">${place(CAST.chamberlain({ pose: "hold", brows: "sad", mouth: "flat", prop: `<rect x="70" y="200" width="70" height="60" fill="#c99a5a" stroke="${ink}" stroke-width="4"/>` }), 600, 1040, 1.45)}</g>` +
    place(CAST.churchill({ pose: "hips" }), 1300, 1040, 1.55, { id: "church", flip: true }) +
    sticker(1520, 200, "PRIME MINISTER, 10 MAY 1940", { size: 40, rot: -2, bg: ink, id: "st-pm" }) + H.grain();

  // F21 — Carrots: the sky battle, radar, the German pilots
  S["21"] = () => {
    const plane = (x, y, s, col, flip = false) => `<g transform="translate(${x} ${y}) scale(${flip ? -s : s} ${s})"><path d="M-110 0 C-60 -26 60 -26 110 0 C60 18 -60 18 -110 0Z" fill="${col}" stroke="${ink}" stroke-width="6"/><path d="M-20 -6 L20 -90 L44 -90 L30 -6Z M-20 6 L20 90 L44 90 L30 6Z" fill="${col}" stroke="${ink}" stroke-width="5"/><path d="M-100 -4 L-128 -40 L-112 -40 L-90 -6Z" fill="${col}" stroke="${ink}" stroke-width="4"/></g>`;
    return H.defs() + H.sky("#7fb4d8", "#d4e8f3") + H.clouds([[300, 260, 1.3], [1300, 180, 1.1], [900, 520, 0.9]]) +
      `<path d="M0 900 Q500 860 960 900 T1920 880 V1080 H0Z" fill="#8fb35a" stroke="${ink}" stroke-width="5"/>` +
      `<g id="radar"><rect x="1660" y="560" width="22" height="340" fill="#888" stroke="${ink}" stroke-width="4"/><path d="M1600 560 L1740 560 L1700 600 L1640 600Z" fill="#aaa" stroke="${ink}" stroke-width="4"/>${[0, 1, 2].map((i) => `<path d="M${1560 - i * 70} ${520 - i * 60} q100 -60 200 0" stroke="#2a6fdb" stroke-width="6" fill="none" opacity="${0.8 - i * 0.2}"/>`).join("")}${H.label(1670, 960, "RADAR", 40)}</g>` +
      `<g id="planes">${plane(420, 380, 0.9, "#7d7a5a")}${plane(640, 470, 0.8, "#7d7a5a")}${plane(1260, 330, 0.75, "#5a7a4a", true)}${plane(1500, 430, 0.7, "#5a7a4a", true)}</g>` +
      `<g id="cut-cock" data-layout-allow-overlap="true"><rect width="1920" height="1080" fill="#3a3d36"/><rect x="0" y="0" width="1920" height="420" fill="#9fc6e2"/>${H.clouds([[400, 200, 1.1], [1500, 150, 1]])}<rect y="420" width="1920" height="40" fill="#2a2c27"/>${place(CAST.pilotDE({ pose: "shrug", brows: "worried", mouth: "open" }), 620, 1060, 1.45)}${place(CAST.officerDE({ pose: "point", brows: "smug" }), 1300, 1060, 1.45, { flip: true })}<g id="pop-carrot" transform="translate(960 300) rotate(30)"><path d="M0 -150 C40 -60 30 80 0 150 C-30 80 -40 -60 0 -150Z" fill="#f28a1a" stroke="${ink}" stroke-width="7"/><path d="M0 -150 l-30 -60 M0 -150 l0 -70 M0 -150 l30 -60" stroke="#4a8a3a" stroke-width="14" stroke-linecap="round"/></g></g>` +
      H.date(260, 120, "SUMMER 1940", "st-date") + H.grain();
  };

  // F22 — The Blitz (straight): map of Britain, cities light up, a counter; the Underground
  S["22"] = () => {
    const cities = ["London", "Coventry", "Liverpool", "Glasgow", "Belfast", "Birmingham", "Plymouth", "Bristol", "Hull"];
    return H.defs() + H.map("uk", { uk: "#5a5f6a", ie: "#3a3f48" }, { sea: "#10151e", land: "#2a2f38" }) +
      cities.map((c, i) => { const [x, y] = Geo.at(c, "uk"); return `<g id="pop-u${i}"><circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="26" fill="#ff8a2e" opacity=".45"/><circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="11" fill="#ffcf5a" stroke="${ink}" stroke-width="3"/><text x="${(x + 22).toFixed(0)}" y="${(y + 10).toFixed(0)}" font-family="Fredoka" font-weight="600" font-size="28" fill="#e9e2cf">${c}</text></g>`; }).join("") +
      `<g id="cnt-blitz" transform="translate(1520 860)"><rect x="-260" y="-80" width="520" height="160" rx="16" fill="#151820" stroke="#555" stroke-width="5"/><text x="0" y="-26" text-anchor="middle" font-family="Fredoka" font-weight="600" font-size="28" fill="#c9c2b0">CIVILIANS KILLED</text><text x="0" y="48" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="64" fill="#fffaf0">0</text></g>` +
      `<g id="fade-tube" data-layout-allow-overlap="true"><rect width="1920" height="1080" fill="#3a3530"/><path d="M0 200 Q960 -120 1920 200 V1080 H0Z" fill="#c9b99a" stroke="${ink}" stroke-width="6"/><rect x="0" y="780" width="1920" height="300" fill="#6b5a48"/>${Array.from({ length: 9 }, (_, i) => place(CAST.civilian({ eyes: "closed", brows: "sad", mouth: "flat", capCol: ["#5a5048", "#6a4a3a", "#4a4a52"][i % 3] }), 120 + i * 210, 1000, 0.9, { rot: i % 2 ? 0 : -6 })).join("")}<rect x="760" y="300" width="400" height="90" rx="45" fill="#c8352b" stroke="${ink}" stroke-width="6"/><rect x="700" y="320" width="520" height="50" fill="#1f3f7f" stroke="${ink}" stroke-width="5"/><text x="960" y="356" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="34" fill="#fff">UNDERGROUND</text></g>` +
      H.vignette(0.7) + H.grain();
  };

  // F23 — The shop
  S["23"] = () =>
    H.defs() + H.sky("#9fd0ea", "#e3f2f9") + `<rect y="880" width="1920" height="200" fill="#9a9a9a" stroke="${ink}" stroke-width="5"/>` +
    `<g><rect x="260" y="260" width="1400" height="620" fill="#f3e6c8" stroke="${ink}" stroke-width="8"/><path d="M260 260 L1660 260 L1620 360 L300 360Z" fill="#c8352b" stroke="${ink}" stroke-width="6"/>${Array.from({ length: 14 }, (_, i) => `<path d="M${300 + i * 95} 260 L${300 + i * 95 + 40} 360" stroke="#fff" stroke-width="22" opacity=".85"/>`).join("")}<rect x="320" y="420" width="560" height="380" fill="#bfe0ef" stroke="${ink}" stroke-width="7"/><rect x="1040" y="420" width="560" height="380" fill="#bfe0ef" stroke="${ink}" stroke-width="7"/>${[[400, 640], [520, 600], [640, 660], [760, 620]].map(([x, y], i) => `<rect x="${x}" y="${y}" width="90" height="${800 - y}" fill="${["#6b6b3a", "#5a6a7a", "#8a5a3a", "#6b6b3a"][i]}" stroke="${ink}" stroke-width="4"/>`).join("")}</g>` +
    `<g id="sign1" transform="translate(960 160)"><rect x="-480" y="-70" width="960" height="140" rx="16" fill="#1f3f7f" stroke="${ink}" stroke-width="8"/><text y="12" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="58" fill="#fffaf0">WE'RE NEUTRAL!</text><text y="54" text-anchor="middle" font-family="Fredoka" font-weight="600" font-size="30" fill="#ffd27a">(CASH. YOU CARRY IT.)</text></g>` +
    `<g id="pop-sign2" transform="translate(960 160)"><rect x="-480" y="-70" width="960" height="140" rx="16" fill="#1f3f7f" stroke="${ink}" stroke-width="8"/><text y="12" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="58" fill="#fffaf0">WE'RE NEUTRAL!</text><text y="54" text-anchor="middle" font-family="Fredoka" font-weight="600" font-size="30" fill="#9effa0">(BORROWING AVAILABLE.)</text></g>` +
    place(CAST.fdr({ pose: "shrug" }), 1320, 1060, 1.5, { id: "fdr", flip: true }) +
    place(CAST.churchill({ pose: "hold", brows: "worried", mouth: "flat" }), 560, 1060, 1.5, { id: "church" }) + H.grain();

  // F24 — Banner trouble (Greece)
  S["24"] = () =>
    H.defs() + H.map("med", { it: "#2f6b3a", gr: "#4a7ab0", al: "#2f6b3a", uk: "#a08b5b", eg: "#a08b5b", ly: "#2f6b3a" }, { sea: "#2b4a6b" }) +
    `<g id="arr-gr">${(() => { const a = Geo.project([19.6, 41.0], "med"), b = Geo.project([21.4, 39.9], "med"), c = Geo.project([20.4, 40.6], "med"); return `<path d="M${a[0]} ${a[1]} Q${b[0]} ${b[1] - 40} ${c[0]} ${c[1]}" stroke="${ink}" stroke-width="34" fill="none" stroke-linecap="round"/><path d="M${a[0]} ${a[1]} Q${b[0]} ${b[1] - 40} ${c[0]} ${c[1]}" stroke="#2f6b3a" stroke-width="22" fill="none" stroke-linecap="round"/>`; })()}</g>` +
    `<g id="press2">${place(CAST.enzo({ pose: "hold", brows: "worried" }), 1650, 1060, 1.3, { flip: true })}</g>` +
    P.banner(960, 180, 860, "VICTORY IN GREECE", { id: "pop-b1", size: 64 }) +
    sticker(1240, 290, "(PENDING)", { size: 50, rot: 6, bg: "#c9a24a", id: "st-pend" }) +
    P.banner(960, 180, 860, "HELP IN GREECE", { id: "pop-b3", size: 66, col: K.red }) +
    `<g id="cut-help" data-layout-allow-overlap="true">${H.room("#a89a82", "#6b5a42")}${place(CAST.hitler({ pose: "shrug", mouth: "shout", brows: "furious" }), 620, 1040, 1.45)}${place(CAST.mussolini({ pose: "raise", mouth: "grin", brows: "happy" }), 1320, 1040, 1.45, { flip: true })}</g>` +
    H.date(260, 120, "1940", "st-date") + H.grain();

  // F25 — The plan: giant map of the USSR, the fuel gauge
  S["25"] = () =>
    H.defs() + H.room("#8a7d68", "#5a4e3c") +
    `<g transform="translate(160 120)"><rect x="-20" y="-20" width="1240" height="740" fill="#3a2f22" stroke="${ink}" stroke-width="8"/><clipPath id="wallmap"><rect width="1200" height="700"/></clipPath><g clip-path="url(#wallmap)"><g transform="scale(0.625 0.648)">${H.map("east", { ussr: "#b04a3a", de: K.fieldgrey, pl: K.fieldgrey, fi: "#d9d2c0", ro: "#c9b98a" })}</g></g></g>` +
    sticker(760, 90, "OPERATION BARBAROSSA", { size: 44, rot: -2, bg: ink, id: "st-op" }) +
    place(CAST.hitler({ pose: "point", mouth: "grin", brows: "angry" }), 1500, 1050, 1.5, { id: "hitler", flip: true }) +
    `<g id="klausg">${place(CAST.klaus({ pose: "hold", brows: "worried" }), 520, 1060, 1.35)}${P.gauge(860, 900, 0.95, 0.5, { id: "gauge" })}</g>` +
    `<g id="pop-note" transform="translate(1220 380) rotate(4)"><rect x="-230" y="-60" width="460" height="120" fill="#fbf6e8" stroke="${ink}" stroke-width="6"/><text y="16" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="40" fill="${K.red}">"THEIR ARMY IS WEAK"</text></g>` +
    H.grain();

  // F26 — The warnings
  S["26"] = () =>
    H.defs() + H.room("#9a8a6a", "#5e4e36") +
    `<rect x="1300" y="140" width="460" height="320" rx="10" fill="#7a2a22" stroke="${ink}" stroke-width="8"/>` +
    H.table(380, 760, 1000, "#4e3a24") +
    place(CAST.stalin({ pose: "hold", mouth: "flat", brows: "neutral" }), 760, 1000, 1.45, { id: "stalin" }) +
    `<g id="letters">${Array.from({ length: 3 }, (_, i) => `<g id="pop-l${i}" transform="translate(${1060 + i * 30} ${720 - i * 26}) rotate(${-6 + i * 5})"><rect x="-120" y="-70" width="240" height="140" fill="#fbf6e8" stroke="${ink}" stroke-width="5"/><text y="-20" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="26" fill="${K.red}">WARNING</text><text y="20" text-anchor="middle" font-family="Fredoka" font-weight="600" font-size="22" fill="${ink}">${["from: TOKYO", "from: LONDON", "from: a German"][i]}</text></g>`).join("")}</g>` +
    place(CAST.aide({ pose: "hold" }), 1560, 1040, 1.35, { id: "aide", flip: true }) +
    place(CAST.soldierDE({ pose: "wave", brows: "worried", mouth: "open", cap: "side", capY: -8 }), 1820, 1040, 1.2, { id: "pop-deserter", flip: true }) +
    H.date(260, 120, "21 JUNE 1941", "st-date") + H.grain();

  // F27 — Dawn: the front line lights up; end card
  S["27"] = () => {
    const front = [[21.3, 55.3], [22.7, 54.2], [23.6, 52.1], [24.0, 50.5], [24.3, 48.6], [26.8, 48.2], [28.2, 46.6], [29.7, 45.4]];
    return H.defs() + H.map("east", { ussr: "#b04a3a", de: K.fieldgrey, pl: K.fieldgrey, ro: "#8a8a6a", hu: "#8a8a6a", fi: "#a8b4c0", baltic: "#c98a7a" }, { sea: "#1d2b3d" }) +
      `<g id="arr-front">${(() => { const d = Geo.route(front, "east"); return `<path d="${d}" stroke="#ffcf5a" stroke-width="22" fill="none" stroke-linecap="round"/><path d="${d}" stroke="#ff7a1a" stroke-width="10" fill="none" stroke-linecap="round"/>`; })()}</g>` +
      [[[21.5, 54.5], [26, 56], [29.5, 58.5]], [[23.8, 52.6], [28, 53.5], [32.5, 54.5]], [[24.2, 50.4], [28.5, 50.4], [31.5, 50.4]], [[27, 47.7], [30.5, 47.4], [33.5, 47.2]]].map((pts, i) => H.arrow(pts, "east", { id: `arr-${i + 1}`, w: 22 })).join("") +
      H.city("Moscow", "east") + H.city("Leningrad", "east") + H.city("Kiev", "east") +
      sticker(560, 940, "22 JUNE 1941", { size: 52, rot: -2, bg: ink, id: "st-date" }) +
      `<g id="cut-stalin" data-layout-allow-overlap="true"><rect width="1920" height="1080" fill="#20222a"/>${place(CAST.stalin({ pose: "idle", mouth: "flat", brows: "sad" }), 960, 1100, 2.0)}</g>` +
      // the cliffhanger: back at America's shop, the sign starts to come down
      `<g id="cut-shop" data-layout-allow-overlap="true">${H.sky("#9fd0ea", "#e3f2f9")}<rect y="880" width="1920" height="200" fill="#9a9a9a" stroke="${ink}" stroke-width="5"/><rect x="260" y="260" width="1400" height="620" fill="#f3e6c8" stroke="${ink}" stroke-width="8"/><path d="M260 260 L1660 260 L1620 360 L300 360Z" fill="#c8352b" stroke="${ink}" stroke-width="6"/>${Array.from({ length: 14 }, (_, i) => `<path d="M${300 + i * 95} 260 L${300 + i * 95 + 40} 360" stroke="#fff" stroke-width="22" opacity=".85"/>`).join("")}<rect x="320" y="420" width="560" height="380" fill="#bfe0ef" stroke="${ink}" stroke-width="7"/><rect x="1040" y="420" width="560" height="380" fill="#bfe0ef" stroke="${ink}" stroke-width="7"/>` +
      `<g id="sign-tilt"><g transform="translate(960 160)"><rect x="-480" y="-70" width="960" height="140" rx="16" fill="#1f3f7f" stroke="${ink}" stroke-width="8"/><text y="12" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="58" fill="#fffaf0">WE'RE NEUTRAL!</text><text y="54" text-anchor="middle" font-family="Fredoka" font-weight="600" font-size="30" fill="#9effa0">(BORROWING AVAILABLE.)</text></g></g>` +
      `${place(CAST.fdr({ pose: "pointUp", brows: "smug", mouth: "smirk" }), 1240, 1060, 1.5, { flip: true })}</g>` +
      `<g id="endcard" data-layout-allow-overlap="true"><rect x="-40" y="-40" width="2000" height="1160" fill="#14161c" opacity=".93"/><text x="960" y="430" text-anchor="middle" font-family="Fredoka" font-weight="600" font-size="48" letter-spacing="8" fill="#c9c2b0">NEXT EPISODE</text><text x="960" y="560" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="104" fill="#fffaf0">The Year Hitler</text><text x="960" y="680" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="104" fill="#ffcc33">Started Losing</text></g>` +
      H.vignette(0.5) + H.grain();
  };

  g.Scenes = Object.assign(g.Scenes || {}, S);
})(globalThis);
