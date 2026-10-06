// Act 1 scene layouts, frames 12–22 (see scenes-a.js for conventions).
(function (g) {
  const { Toon, Geo, SceneKit } = g;
  const { C, place, placeEl, CAST, elephant, P, say, sticker } = Toon;
  const { H, R, reg } = SceneKit;
  const S = {};

  // marching column of tiny soldiers along a line
  const column = (x0, y0, x1, y1, n, s = 0.32, mk = () => CAST.carthSoldier({ roundShield: C.carth })) =>
    Array.from({ length: n }, (_, i) => { const f = i / Math.max(1, n - 1); return place(mk(i), x0 + (x1 - x0) * f, y0 + (y1 - y0) * f + (i % 2) * 6, s); }).join("");

  // 12 — The plan: ships vs one overland arrow
  S["12"] = () => {
    const hannibalRoute = Geo.route([[-0.98, 37.6], [-0.3, 39.7], [1.2, 41.2], [2.6, 42.3], [3.4, 43.3], [4.6, 44.0], [6.0, 44.9], [6.9, 45.1], [8.4, 45.3], [9.7, 45.05]]);
    const [nx, ny] = Geo.at("NewCarthage"), [rx, ry] = Geo.at("Rome"), [cx, cy] = Geo.at("Carthage");
    return H.defs() + Toon.map(g.MED, { regions: [reg("italy", C.rome), reg("sicily", C.rome), reg("sardinia", C.rome), reg("corsica", C.rome), reg("africa", C.carth), reg("spainS", C.carth)] }) +
      `<g id="sea-plans" opacity=".9"><path d="M${rx - 20} ${ry + 40} C700 520 560 560 ${nx + 20} ${ny - 10}" stroke="#fffaf0" stroke-width="8" stroke-dasharray="20 14" fill="none"/><path d="M${rx} ${ry + 60} C960 500 900 560 ${cx + 10} ${cy - 20}" stroke="#fffaf0" stroke-width="8" stroke-dasharray="20 14" fill="none"/>${P.ship(640, 520, 0.28, { col: C.rome })}${P.ship(930, 520, 0.28, { col: C.rome })}
        <path id="x1" d="M600 470 l80 80 M680 470 l-80 80" stroke="${C.rome}" stroke-width="16" stroke-linecap="round"/><path id="x2" d="M890 470 l80 80 M970 470 l-80 80" stroke="${C.rome}" stroke-width="16" stroke-linecap="round"/></g>` +
      `<path id="route" d="${hannibalRoute}" stroke="${C.ink}" stroke-width="30" fill="none" stroke-linecap="round"/><path d="${hannibalRoute}" stroke="${C.gold}" stroke-width="18" fill="none" stroke-linecap="round"/>` +
      Toon.city(nx, ny, "NEW CARTHAGE", { dy: 52 }) + Toon.city(rx, ry, "ROME") +
      `<text x="${Geo.at("AlpsPass")[0] - 40}" y="${Geo.at("AlpsPass")[1] - 70}" text-anchor="middle" class="t-label">THE ALPS?!</text>` +
      place(CAST.hannibal({ pose: "point", mouth: "flat", brows: "smug" }), 1450, 1060, 1.0, { id: "hannibal", flip: true }) +
      place(CAST.gisgo({ pose: "shrug", eyes: "wide" }), 1720, 1060, 1.0, { id: "gisgo" }) +
      P.bubble(1480, 620, 400, 140, "Sir. Those are mountains.", { tail: "br", id: "b-mtn", size: 38 }) +
      P.bubble(1060, 700, 300, 110, "It'll be fine.", { tail: "br", id: "b-fine", size: 40 }) + H.grain();
  };

  // 13 — Roll call + meet Surus
  S["13"] = () =>
    H.defs() + H.sky("#bfe0f0", "#f3e3c3") + `<path d="M0 520 L300 380 L520 500 L800 360 L1100 480 L1400 340 L1700 470 L1920 400 V600 H0Z" fill="#c9b48a" stroke="${C.ink}" stroke-width="5"/>` + H.ground(600, "#d7bf86", "#b59a62") +
    `<g id="army">${column(80, 640, 1840, 640, 22, 0.3)}${column(40, 700, 1880, 700, 24, 0.33)}</g>` +
    `<g id="counters">${[["INFANTRY", "90,000"], ["CAVALRY", "12,000"], ["ELEPHANTS", "37"]].map(([l, n], i) => `<g id="cnt-${i}" transform="translate(${170 + i * 560} 120)"><rect width="480" height="190" rx="24" fill="${C.ink}" opacity=".9"/><text x="240" y="64" text-anchor="middle" font-family="Fredoka" font-weight="600" font-size="34" fill="#c9b38f">${l}</text><text x="240" y="160" text-anchor="middle" class="t-title" font-size="96" ${i === 2 ? `fill="${C.gold}"` : ""}>${n}</text></g>`).join("")}</g>` +
    placeEl(elephant({ brows: "happy", mouth: "smile" }), 820, 1060, 1.1, { id: "surus" }) +
    `<text x="820" y="1052" text-anchor="middle" class="t-cap" font-size="34">SURUS</text>` +
    place(CAST.hannibal({ pose: "hips", mouth: "flat" }), 1280, 1070, 0.95, { id: "hannibal", flip: true }) +
    P.bubble(980, 420, 500, 120, "Are we going to the beach?", { tail: "bl", id: "b-beach", size: 38 }) +
    P.bubble(1400, 640, 260, 100, "Sort of.", { tail: "bl", id: "b-sort", size: 40 }) + H.grain();

  // 14 — The Pyrenees: free exit policy
  S["14"] = () =>
    H.defs() + H.sky("#a8d4ec", "#e7f3f8") + H.clouds() +
    `<g id="peaks">${P.mountain(300, 760, 800, 520, { col: "#8f9a7a", snow: false })}${P.mountain(900, 760, 900, 620, { col: "#7f8a6a" })}${P.mountain(1550, 760, 900, 540, { col: "#8f9a7a" })}</g>` + H.ground(740, "#9fb06a", "#7f9050") +
    `<g id="column">${column(380, 860, 1300, 800, 14, 0.36)}</g>` +
    `<g id="deserters">${[0, 1, 2].map((i) => place(CAST.carthSoldier({ pose: "hold", brows: "happy", mouth: "smile", roundShield: false, prop: `<g transform="translate(100 150)"><path d="M0 70 V-20" stroke="${C.wood}" stroke-width="8"/><rect x="-46" y="-70" width="92" height="56" rx="6" fill="#fffaf0" stroke="${C.ink}" stroke-width="5"/><text x="0" y="-30" text-anchor="middle" class="t-ink" font-size="30">NOPE</text></g>` }), 300 - i * 110, 1040 - i * 20, 0.75)).join("")}</g>` +
    place(CAST.hannibal({ pose: "wave", mouth: "flat", brows: "neutral" }), 1500, 1060, 1.0, { id: "hannibal" }) +
    place(CAST.gisgo({ pose: "point", eyes: "wide", mouth: "open" }), 1760, 1060, 1.0, { id: "gisgo", flip: true }) +
    P.bubble(1380, 380, 500, 130, "Wait, we were allowed to leave?", { tail: "br", id: "b-leave", size: 36 }) +
    P.bubble(1180, 600, 260, 100, "Not you.", { tail: "br", id: "b-notyou", size: 40 }) + Toon.elCounter(37) + H.grain();

  // 15 — The Rhône rafts
  S["15"] = () =>
    H.defs() + H.sky("#9fd0ea", "#e3f2f8") + `<path d="M0 420 C400 380 800 430 1200 400 S1800 390 1920 410 V560 H0Z" fill="${C.grassDk}" stroke="${C.ink}" stroke-width="5"/>` +
    `<rect id="river" y="520" width="1920" height="560" fill="#4c8fc2"/>` + [600, 700, 820, 940].map((y, i) => `<path class="wave" d="M${-100 + i * 60} ${y} q60 -16 120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0" stroke="#bfe3f7" stroke-width="5" fill="none" opacity=".7"/>`).join("") +
    `<g id="raft"><rect x="380" y="760" width="760" height="70" rx="10" fill="${C.wood}" stroke="${C.ink}" stroke-width="6"/><path d="M380 760 C500 700 1020 700 1140 760Z" fill="#8a6a3a" stroke="${C.ink}" stroke-width="5"/>${[440, 560, 700, 860, 1000, 1090].map((x) => `<path d="M${x} 726 l8 -26 l8 26 M${x + 22} 724 l6 -18 l6 18" stroke="${C.grassDk}" stroke-width="5" fill="none"/>`).join("")}
      ${placeEl(elephant({ brows: "worried", eyes: "wide" }), 760, 740, 1.05, { id: "surus" })}</g>` +
    `<g id="snorkel">${placeEl(elephant({ trunk: "snorkel", brows: "neutral", blanket: C.carthDk }), 1560, 1150, 0.9)}<rect x="1260" y="992" width="660" height="120" fill="#4c8fc2"/><path d="M1260 992 q60 -16 120 0 t120 0 t120 0 t120 0 t120 0" stroke="#bfe3f7" stroke-width="5" fill="none"/></g>` +
    P.bubble(300, 340, 460, 120, "…The ground is moving.", { tail: "br", id: "b-moving", size: 40 }) +
    sticker(1460, 200, "ELEPHANTS CAN SWIM", { size: 56, rot: 3, bg: "#2f7fb5", id: "st-swim" }) + Toon.elCounter(37) + H.grain();

  // 16 — Scipio, three days late
  S["16"] = () =>
    H.defs() + H.sky("#f6c27a", "#fbe7c0") + `<rect y="560" width="1920" height="520" fill="#4c8fc2"/>` +
    `<path d="M600 1080 C700 760 1100 640 1920 600 V1080Z" fill="#d9c38c" stroke="${C.ink}" stroke-width="5"/>` +
    P.ship(380, 720, 0.9, { col: C.rome, id: "ship" }) +
    `<g id="camp">${P.fire(1260, 790, 0.7)}<g opacity=".7">${[0, 1, 2].map((i) => `<circle cx="${1270 + i * 30}" cy="${640 - i * 70}" r="${36 + i * 12}" fill="#9a96a0"/>`).join("")}</g></g>` +
    `<g id="tumbleweed" transform="translate(1720 860)"><circle r="56" fill="none" stroke="#8a6a3a" stroke-width="8"/><path d="M-40 -30 C0 10 30 -40 44 20 M-50 10 C-10 40 20 0 40 -40 M-20 50 C-10 0 20 30 10 -54" stroke="#8a6a3a" stroke-width="6" fill="none"/></g>` +
    `<g id="dung"><path d="M940 940 C910 940 900 910 930 900 C920 880 960 866 970 886 C996 880 1004 916 980 924 C996 940 970 950 940 940Z" fill="#6b4a2a" stroke="${C.ink}" stroke-width="5"/><path d="M944 860 q6 -14 0 -26 M972 860 q6 -14 0 -26" stroke="#9aa" stroke-width="4" fill="none"/></g>` +
    place(CAST.scipio({ pose: "point", sword: true, swordRot: 60, brows: "worried", mouth: "flat" }), 780, 1000, 1.1, { id: "scipio" }) +
    P.bubble(380, 260, 360, 110, "It's still warm.", { tail: "br", id: "b-warm", size: 42 }) +
    sticker(1380, 200, "3 DAYS LATER", { size: 72, rot: -3, bg: C.ink, id: "st-late" }) + Toon.elCounter(37) + H.grain();

  // 17 — The Alps
  S["17"] = () => {
    const flakes = Array.from({ length: 70 }, (_, i) => { const x = (i * 277) % 1920, y = (i * 131) % 1080, r = 4 + (i % 4) * 2; return `<circle class="flake" cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity=".85"/>`; }).join("");
    return H.defs() + H.sky("#6f87a8", "#c9d6e6") +
      `<g id="peaks">${P.mountain(300, 1080, 1100, 980, { col: "#7d86a3" })}${P.mountain(1500, 1080, 1200, 1060, { col: "#6e7894" })}${P.mountain(960, 1080, 1100, 820, { col: "#8a93ae" })}</g>` +
      `<path id="ledge" d="M0 760 C400 700 900 760 1400 700 L1920 680 V740 C1400 780 900 820 400 790 L0 820Z" fill="${C.snow}" stroke="${C.ink}" stroke-width="6"/>` +
      `<g id="column">${column(80, 800, 1200, 760, 11, 0.36)}</g>` +
      placeEl(elephant({ brows: "sad", eyes: "dot" }), 1420, 760, 0.55, { id: "surus" }) +
      `<g id="mule" transform="translate(1660 900) rotate(35)"><ellipse rx="60" ry="34" fill="#8a6a46" stroke="${C.ink}" stroke-width="5"/><circle cx="56" cy="-30" r="24" fill="#8a6a46" stroke="${C.ink}" stroke-width="5"/><path d="M-30 30 v40 M30 30 v40" stroke="${C.ink}" stroke-width="10"/></g>` +
      place(CAST.gisgo({ pose: "hold", brows: "sad", mouth: "wobbly", sweat: false, roundShield: false }), 760, 1060, 1.1, { id: "gisgo" }) +
      place(CAST.hannibal({ pose: "hips", mouth: "flat", brows: "neutral" }), 1080, 1060, 1.1, { id: "hannibal", flip: true }) +
      P.bubble(220, 470, 480, 120, "My warm thought is Spain, sir.", { tail: "br", id: "b-warm", size: 36 }) +
      `<g id="snow">${flakes}</g>` + H.vignette("vig", 0.4) + Toon.elCounter(37) + H.grain();
  };

  // 18 — Rocks from above
  S["18"] = () =>
    H.defs() + H.sky("#8fa8c6", "#d6e0ea") +
    `<path id="cliff" d="M0 0 H760 C800 120 760 260 820 380 C860 460 780 520 700 560 L0 600Z" fill="#8a8170" stroke="${C.ink}" stroke-width="6"/>` +
    `<path d="M0 860 C500 820 1000 900 1920 840 V1080 H0Z" fill="${C.snow}" stroke="${C.ink}" stroke-width="6"/>` +
    `<g id="gauls">${[220, 420, 600].map((x, i) => place(CAST.gaul({ pose: i === 1 ? "armsUp" : "point" }), x, 360 + i * 8, 0.8)).join("")}</g>` +
    `<g id="score" transform="translate(140 60)"><rect width="300" height="110" rx="14" fill="${C.ink}"/><text x="150" y="78" text-anchor="middle" class="t-title" font-size="70" fill="${C.gold}">STRIKE!</text></g>` +
    `<g id="rocks">${P.boulder(980, 560, 70)}${P.boulder(1180, 780, 90)}${P.boulder(1450, 420, 60)}</g>` +
    `<g id="column">${column(860, 980, 1840, 960, 10, 0.4, (i) => CAST.carthSoldier({ pose: "holdUp", brows: "worried", mouth: "open", roundShield: false }))}</g>` +
    say(1500, 700, "AAAH!", { size: 64, id: "aah" }) + Toon.elCounter(37) + H.grain();

  // 19 — Chef Hannibal's rock removal
  S["19"] = () =>
    H.defs() + `<rect width="1920" height="1080" fill="#f2d7a6"/>` + Array.from({ length: 12 }, (_, i) => `<rect x="${i * 160}" y="0" width="80" height="700" fill="#efc98a"/>`).join("") +
    `<rect y="700" width="1920" height="380" fill="#9b6b43" stroke="${C.ink}" stroke-width="6"/>` +
    `<g id="banner"><rect x="460" y="60" width="1000" height="140" rx="24" fill="${C.rome}" stroke="${C.ink}" stroke-width="8"/><text x="960" y="152" text-anchor="middle" class="t-title" font-size="62">CHEF HANNIBAL'S ROCK REMOVAL</text></g>` +
    `<g id="rock">${P.boulder(1260, 860, 260, { crack: true })}${P.fire(1260, 880, 1.3)}</g>` +
    `<g id="vinegar" transform="translate(860 560) rotate(-35)"><path d="M-50 0 C-60 -80 -30 -120 -20 -150 H20 C30 -120 60 -80 50 0Z" fill="#c64b5c" stroke="${C.ink}" stroke-width="6"/><rect x="-24" y="-180" width="48" height="34" rx="6" fill="${C.wood}" stroke="${C.ink}" stroke-width="5"/><text x="0" y="-40" text-anchor="middle" class="t-flag" font-size="22">SOUR</text><text x="0" y="-16" text-anchor="middle" class="t-flag" font-size="22">WINE</text><path d="M30 -170 C120 -200 200 -120 260 -20" stroke="#c64b5c" stroke-width="12" fill="none" stroke-dasharray="4 18" stroke-linecap="round"/></g>` +
    place(CAST.hannibal({ hat: "chef", pose: "hold", mouth: "smile", brows: "happy" }), 560, 1020, 1.35, { id: "chef" }) +
    P.bubble(140, 300, 460, 120, "…And smash.", { tail: "br", id: "b-smash", size: 46 }) + Toon.elCounter(37) + H.grain();

  // 20 — Into Italy
  S["20"] = () =>
    H.defs() + H.sky("#a7d8f0", "#eaf6fb") + H.clouds() +
    `<g id="alps-behind">${P.mountain(400, 620, 1000, 500, { col: "#9aa4bd" })}${P.mountain(1300, 620, 1200, 560, { col: "#8a95b0" })}</g>` + H.ground(600) +
    `<g>${P.tree(1700, 760, 0.9)}${P.tree(1820, 800, 0.7)}${P.tree(120, 780, 0.8)}</g>` +
    `<g id="army">${column(200, 820, 1100, 830, 9, 0.38, (i) => CAST.carthSoldier({ brows: "sad", mouth: "wobbly", eyes: i % 3 ? "dot" : "spiral", roundShield: false }))}</g>` +
    `<g id="counters">${[["INFANTRY", "~20,000", C.rome], ["CAVALRY", "6,000", C.rome], ["ELEPHANTS", "37", C.gold]].map(([l, n, col], i) => `<g id="cnt-${i}" transform="translate(${70 + i * 520} 140)"><rect width="480" height="190" rx="24" fill="${C.ink}" opacity=".9"/><text x="240" y="64" text-anchor="middle" font-family="Fredoka" font-weight="600" font-size="34" fill="#c9b38f">${l}</text><text x="240" y="160" text-anchor="middle" class="t-title" font-size="96" fill="${col}">${n}</text></g>`).join("")}</g>` +
    placeEl(elephant({ trunk: "up", brows: "happy", mouth: "smile" }), 1420, 1050, 1.0, { id: "surus" }) +
    P.bubble(980, 420, 480, 120, "That was a terrible beach.", { tail: "br", id: "b-beach", size: 38 }) + Toon.elCounter(37) + H.grain();

  // 21 — Ticinus: the rescue
  S["21"] = () =>
    H.defs() + H.sky("#c9dce8", "#eef3e6") + H.ground(640, "#a7b86e", "#879a50") +
    `<path d="M0 760 C500 720 1100 800 1920 740 V820 C1100 880 500 800 0 840Z" fill="#5d9cc8" stroke="${C.ink}" stroke-width="5"/>` +
    `<g id="dust">${[[1400, 560], [1600, 600], [1250, 620]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="90" fill="#d9c9a0" opacity=".8"/>`).join("")}</g>` +
    `<g id="numidians">${[1350, 1550, 1750].map((x) => `<g transform="translate(${x} 700)"><ellipse rx="90" ry="40" fill="#7a5230" stroke="${C.ink}" stroke-width="5"/><circle cx="90" cy="-40" r="30" fill="#7a5230" stroke="${C.ink}" stroke-width="5"/>${place(CAST.carthSoldier({ body: "#e9e2cf", hat: "hair", pose: "point", spear: true, roundShield: false }), 0, -10, 0.55)}</g>`).join("")}</g>` +
    place(CAST.scipio({ pose: "shrug", eyes: "x", mouth: "wobbly", brows: "sad" }), 640, 1000, 1.0, { id: "scipio", rot: -12 }) +
    place(CAST.publius({ pose: "reach", brows: "angry", mouth: "grin" }), 380, 1010, 1.0, { id: "publius" }) +
    P.bubble(60, 300, 420, 110, "You're welcome.", { tail: "bl", id: "b-welcome", size: 44 }) +
    P.pointer(420, 720, "REMEMBER THIS KID", { id: "ptr" }) + Toon.elCounter(37) + H.grain();

  // 22 — Cliffhanger
  S["22"] = () => {
    const stars = Array.from({ length: 40 }, (_, i) => `<circle cx="${(i * 389) % 1920}" cy="${(i * 97) % 420}" r="${2 + (i % 3)}" fill="#fffaf0" opacity=".8"/>`).join("");
    const fires = [[300, 820], [520, 780], [760, 840], [1000, 800], [1280, 830], [1560, 790], [1780, 820]].map(([x, y]) => `<g class="campfire"><circle cx="${x}" cy="${y - 20}" r="36" fill="${C.fire}" opacity=".35"/>${P.fire(x, y, 0.32)}</g>`).join("");
    return H.defs() + H.sky("#14203a", "#2c3c63") + `<g id="stars">${stars}</g><circle cx="1600" cy="180" r="70" fill="#f6f0d8"/>` +
      `<path d="M0 700 C500 650 1200 720 1920 660 V1080 H0Z" fill="#26324a" stroke="${C.ink}" stroke-width="5"/>` + `<g id="fires">${fires}</g>` +
      placeEl(elephant({ brows: "neutral", rider: place(CAST.hannibal({ pose: "point", mouth: "flat" }), 200, 112, 0.62) }), 360, 1060, 1.05, { id: "surus" }) +
      P.bubble(560, 520, 380, 110, "Are we there yet?", { tail: "bl", id: "b-yet", size: 42 }) +
      P.bubble(300, 300, 340, 110, "Not even close.", { tail: "bl", id: "b-close", size: 42 }) +
      `<g id="endcard"><rect x="1000" y="880" width="860" height="150" rx="20" fill="${C.ink}" opacity=".9"/><text x="1430" y="940" text-anchor="middle" font-family="Fredoka" font-weight="600" font-size="34" fill="#c9b38f">NEXT TIME — PART 2</text><text x="1430" y="1002" text-anchor="middle" class="t-title" font-size="54">Rome Keeps Sending Consuls</text></g>` + Toon.elCounter(37) + H.vignette() + H.grain();
  };

  g.Scenes = Object.assign(g.Scenes || {}, S);
})(globalThis);
