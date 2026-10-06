// Act 1 scene layouts, frames 01–11. Each returns the frame's SVG content
// (1920×1080) at its key moment; ids mark the parts the build animates.
// Requires toon.js, geo.js, maps/med.js. Classic script → globalThis.Scenes.
(function (g) {
  const { Toon, Geo } = g;
  const { C, place, placeEl, CAST, elephant, P, say, sticker } = Toon;

  // ---------- shared backdrops ----------
  const H = {};
  H.sky = (top = C.sky, bot = "#d8eef7", id = "bg") =>
    `<defs><linearGradient id="${id}-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bot}"/></linearGradient></defs><rect id="${id}" width="1920" height="1080" fill="url(#${id}-g)"/>`;
  H.ground = (y, col = C.grass, dk = C.grassDk) =>
    `<path d="M0 ${y} Q480 ${y - 30} 960 ${y} T1920 ${y} V1080 H0Z" fill="${col}" stroke="${C.ink}" stroke-width="5"/><path d="M0 ${y + 60} Q600 ${y + 30} 1200 ${y + 70} T1920 ${y + 50} V1080 H0Z" fill="${dk}" opacity=".35"/>`;
  H.clouds = () => [[260, 170, 1], [1500, 120, 1.3], [980, 230, 0.8]].map(([x, y, s]) =>
    `<g class="cloud" transform="translate(${x} ${y}) scale(${s})"><path d="M-110 30 C-130 -10 -80 -40 -50 -20 C-40 -60 30 -66 46 -26 C80 -46 130 -16 112 30Z" fill="#fff" stroke="${C.ink}" stroke-width="5" opacity=".95"/></g>`).join("");
  H.interior = (wall = "#d9c7a4", floor = "#b8946a") =>
    `<rect width="1920" height="1080" fill="${wall}"/><rect y="820" width="1920" height="260" fill="${floor}" stroke="${C.ink}" stroke-width="5"/>` +
    Array.from({ length: 9 }, (_, i) => `<path d="M${i * 240} 820 L${i * 240 - 120} 1080" stroke="${C.ink}" stroke-width="3" opacity=".25"/>`).join("");
  H.columns = (xs, y = 820, h = 640) => xs.map((x) => P.column(x, y, h)).join("");
  H.vignette = (id = "vig", o = 0.55) =>
    `<defs><radialGradient id="${id}" cx=".5" cy=".5" r=".75"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="${o}"/></radialGradient></defs><rect width="1920" height="1080" fill="url(#${id})" pointer-events="none"/>`;
  // Paper grain: a pre-baked noise tile (assets/lib/grain.js) — far cheaper to render than feTurbulence.
  H.grain = () => `<rect width="1920" height="1080" fill="url(#grain)" opacity=".8" pointer-events="none"/>`;
  H.defs = () => `<defs><pattern id="grain" width="256" height="256" patternUnits="userSpaceOnUse"><image href="${g.GRAIN_PNG}" width="256" height="256"/></pattern></defs>`;

  // Faction territory polygons (lon/lat) — clipped to land by Toon.map.
  const R = {
    italy: [[6.5, 44.4], [13.6, 44.4], [18.8, 40.3], [17.2, 37.6], [15.4, 37.6], [12.0, 40.4], [9.6, 43.3]],
    sicily: [[12.1, 38.5], [15.9, 38.5], [15.9, 36.4], [12.1, 36.4]],
    sicilyW: [[12.1, 38.5], [13.8, 38.5], [13.8, 37.2], [12.1, 37.3]],
    sardinia: [[7.9, 41.4], [10.0, 41.4], [10.0, 38.7], [7.9, 38.7]],
    corsica: [[8.3, 43.2], [9.8, 43.2], [9.8, 41.25], [8.3, 41.25]],
    africa: [[-6.5, 35.9], [-2.0, 35.5], [3.0, 37.2], [8.2, 37.6], [11.6, 37.7], [11.4, 33.4], [-6.5, 33.6]],
    spainS: [[-9.8, 36.6], [-9.8, 39.6], [-4.0, 40.6], [0.9, 40.9], [0.9, 39.0], [-0.4, 37.9], [-2.0, 36.4], [-5.6, 35.8]],
  };
  const reg = (name, fill, id) => ({ d: Geo.poly(R[name]), fill, id });

  const S = {};

  // 01 — Cold open: the scoreboard
  S["01"] = () => {
    const boxes = ["W", "W", "W", "W", "W", "L"];
    const bx = (i) => 560 + i * 150;
    return H.defs() + `<rect width="1920" height="1080" fill="${C.sea}"/>` +
      Array.from({ length: 14 }, (_, i) => `<path d="M${-200 + i * 160} 1080 L${400 + i * 160} -100" stroke="${C.seaLt}" stroke-width="40" opacity=".35"/>`).join("") +
      `<g id="board"><rect x="300" y="110" width="1320" height="520" rx="30" fill="#2e2620" stroke="${C.ink}" stroke-width="10"/>
        <rect x="330" y="140" width="1260" height="460" rx="18" fill="#1b1714"/>
        <text x="960" y="232" text-anchor="middle" class="t-title" font-size="74">CARTHAGE  <tspan fill="${C.gold}">vs</tspan>  ROME</text>
        <text x="380" y="342" class="t-cap" font-size="40" fill="#e9d9ff">HANNIBAL</text>
        ${boxes.map((b, i) => `<g id="box-${i}"><rect x="${bx(i)}" y="380" width="120" height="150" rx="14" fill="${b === "L" ? C.rome : "#3c7a3a"}" stroke="${C.ink}" stroke-width="6"/><text x="${bx(i) + 60}" y="490" text-anchor="middle" class="t-title" font-size="100">${b}</text></g>`).join("")}
        <text x="960" y="580" text-anchor="middle" font-family="Fredoka" font-weight="600" font-size="30" fill="#a89a8c">TREBIA · TRASIMENE · CANNAE · … · ZAMA</text></g>` +
      placeEl(elephant({ brows: "neutral", rider: place(CAST.hannibal({ pose: "hips", mouth: "flat" }), 200, 112, 0.62) }), 330, 1040, 0.95, { id: "surus" }) +
      P.bubble(600, 690, 720, 130, "I'd like to see the replay.", { tail: "bl", id: "b-replay", size: 52 }) +
      sticker(1560, 960, "HE LOST.", { size: 70, rot: 5, id: "st-lost" }) + `<g id="title" opacity="0" data-layout-allow-overlap="true"><rect width="1920" height="1080" fill="${C.carthDk}"/>${Array.from({ length: 12 }, (_, i) => `<path d="M960 540 L${960 + Math.cos(i / 6 * Math.PI) * 1400} ${540 + Math.sin(i / 6 * Math.PI) * 1400} L${960 + Math.cos((i + .5) / 6 * Math.PI) * 1400} ${540 + Math.sin((i + .5) / 6 * Math.PI) * 1400}Z" fill="${C.carth}"/>`).join("")}<text x="960" y="370" text-anchor="middle" class="t-title" font-size="140">THE SECOND</text><text x="960" y="620" text-anchor="middle" class="t-title" font-size="190" fill="${C.gold}">PUNIC WAR</text><g transform="translate(960 790) rotate(-2)"><rect x="-560" y="-50" width="1120" height="100" rx="16" fill="${C.rome}" stroke="${C.ink}" stroke-width="8"/><text x="0" y="22" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="54" fill="#fffaf0">Part 1: Some Guy With Elephants</text></g>${placeEl(elephant({ trunk: "up", brows: "happy", mouth: "smile" }), 1640, 1060, 0.7)}${place(CAST.hannibal({ pose: "point", mouth: "flat" }), 260, 1060, 0.9)}</g>` + H.grain();
  };

  // 02 — The neighbors over the sea
  S["02"] = () => {
    const [rx, ry] = Geo.at("Rome"), [cx, cy] = Geo.at("Carthage"), [sx, sy] = Geo.at("Sicily");
    return H.defs() + Toon.map(g.MED, { regions: [reg("italy", C.rome, "r-rome"), reg("africa", C.carth, "r-carth"), reg("sicilyW", C.carth, "r-sicw"), reg("sardinia", C.carth), reg("corsica", C.carth)] }) +
      `<ellipse id="sicily-ring" cx="${sx}" cy="${sy}" rx="120" ry="80" fill="none" stroke="${C.gold}" stroke-width="10" stroke-dasharray="22 14"/>` +
      Toon.city(rx, ry, "ROME") + Toon.city(cx, cy, "CARTHAGE", { dy: 48 }) +
      place(CAST.flaccus({ pose: "point", brows: "smug", mouth: "smirk" }), rx + 150, ry + 40, 0.9, { id: "flaccus" }) +
      place(CAST.carthSenator({ pose: "hips", brows: "angry", mouth: "frown" }), cx - 70, cy + 330, 0.9, { id: "carth", flip: true }) +
      P.bubble(1180, 150, 560, 120, "Nice island you've got there.", { tail: "bl", id: "b1", size: 40 }) +
      P.bubble(250, 640, 480, 120, "It's Sicily. It's ours.", { tail: "br", id: "b2", size: 42 }) +
      sticker(1460, 420, "For now.", { size: 56, rot: 4, bg: C.white, fg: C.ink, id: "st-fornow" }) + H.grain();
  };

  // 03 — First war speed-run: copying the shipwreck
  S["03"] = () =>
    H.defs() + H.sky("#8cc9e8", "#d5eef8") + H.clouds() +
    `<rect y="600" width="1920" height="480" fill="#3d7bb0"/><path d="M0 620 Q240 600 480 620 T960 620 T1440 620 T1920 620" stroke="#fff" stroke-width="6" fill="none" opacity=".6"/>` +
    `<path d="M0 700 C400 660 900 690 1920 650 V1080 H0Z" fill="#e7cf98" stroke="${C.ink}" stroke-width="5"/>` +
    P.ship(520, 790, 1.15, { col: C.carth, sail: "#efe6d2", sunk: -12, id: "wreck" }) +
    `<g id="copy" transform="translate(1340 800) scale(1.1)"><path d="M-160 -40 L160 -40 C150 10 120 24 -120 24 C-150 10 -160 -20 -160 -40Z" fill="none" stroke="${C.ink}" stroke-width="6" stroke-dasharray="18 12"/>${[-120, -60, 0, 60, 120].map((x) => `<path d="M${x} -40 V20" stroke="${C.wood}" stroke-width="12"/>`).join("")}<path d="M-160 -40 L60 -40" stroke="${C.wood}" stroke-width="16" stroke-linecap="round"/></g>` +
    `<path id="tape" d="M640 740 L1150 760" stroke="${C.gold}" stroke-width="10" stroke-dasharray="4 10"/>` +
    place(CAST.legionary({ pose: "point", brows: "neutral", mouth: "open", shield: false }), 960, 930, 0.85, { id: "measurer" }) +
    place(CAST.romanSenator({ pose: "hold", brows: "happy", mouth: "smile", prop: P.scroll(70, 196, 60, 40) }), 1660, 960, 0.85, { id: "copier", flip: true }) +
    say(300, 360, "Hey, that's ours!", { size: 56, id: "offscreen" }) +
    sticker(1180, 300, "PLANK. BY. PLANK.", { size: 64, rot: -3, id: "st-plank" }) + `<g id="storm" opacity="0" data-layout-allow-overlap="true"><rect width="1920" height="1080" fill="#1d2433" opacity=".82"/>${Array.from({ length: 60 }, (_, i) => `<path class="rain" d="M${(i * 173) % 1920} ${(i * 89) % 1080} l-30 70" stroke="#9fb4d6" stroke-width="4" opacity=".7"/>`).join("")}<path id="bolt" d="M1300 0 L1220 260 L1300 260 L1180 560 L1360 220 L1280 220 L1360 0Z" fill="${C.fireLt}" stroke="${C.ink}" stroke-width="5"/>${P.ship(760, 760, 1.0, { col: C.rome, sunk: 28 })}${P.ship(1500, 820, 0.7, { col: C.rome, sunk: -34 })}</g>` + sticker(760, 480, "ROME WINS. SOMEHOW.", { size: 64, rot: 3, id: "st-win" }) + H.grain();

  // 04 — The complaining fee
  S["04"] = () => {
    const [sx, sy] = Geo.at("Sardinia"), [kx, ky] = Geo.at("Corsica");
    return H.defs() + Toon.map(g.MED, { regions: [reg("italy", C.rome), reg("sicily", C.rome), reg("africa", C.carth)] }) +
      `<g clip-path="url(#map-land)"><path d="${Geo.poly(R.sardinia)}" fill="${C.sea}"/><path d="${Geo.poly(R.corsica)}" fill="${C.sea}"/></g><g id="islands" transform="translate(0 -60)"><ellipse cx="${sx}" cy="${sy + 90}" rx="80" ry="22" fill="#000" opacity=".25"/>` +
      `<g clip-path="url(#map-land)"><path d="${Geo.poly(R.sardinia)}" fill="${C.carth}"/><path d="${Geo.poly(R.corsica)}" fill="${C.carth}"/></g></g>` +
      // a big Roman hand pinching the islands
      `<g id="hand" transform="translate(${kx + 10} ${ky - 190})"><path d="M-46 -400 V-90 H54 V-400Z" fill="${C.white}" stroke="${C.ink}" stroke-width="6"/><path d="M-46 -150 H54" stroke="${C.rome}" stroke-width="14"/><path d="M-60 -90 C-70 -20 -40 30 10 30 C60 30 80 -20 70 -90Z" fill="${C.skin}" stroke="${C.ink}" stroke-width="6"/><path d="M-40 10 C-60 50 -40 90 -14 80 C0 74 -6 40 -10 20" fill="${C.skin}" stroke="${C.ink}" stroke-width="6"/><path d="M40 10 C56 50 40 90 16 80 C2 74 6 40 10 20" fill="${C.skin}" stroke="${C.ink}" stroke-width="6"/></g>` +
      Toon.city(...Geo.at("Rome"), "ROME") +
      place(CAST.flaccus({ pose: "shrug", brows: "smug", mouth: "smirk" }), 1260, 520, 0.8, { id: "flaccus" }) +
      P.bubble(1330, 200, 420, 110, "Forever-ish.", { tail: "bl", id: "b-forever", size: 50 }) +
      `<g id="invoice" transform="translate(1330 700) rotate(-6)"><rect x="0" y="0" width="520" height="300" fill="#fffaf0" stroke="${C.ink}" stroke-width="6"/><text x="260" y="66" text-anchor="middle" class="t-ink" font-size="44">INVOICE</text><path d="M40 92 H480" stroke="${C.ink}" stroke-width="4"/><text x="40" y="140" class="t-ink" font-size="30">Complaining fee</text><text x="480" y="232" text-anchor="end" class="t-ink" font-size="56" fill="${C.rome}">1,200 talents</text><text x="40" y="270" font-family="Fredoka" font-size="22" fill="${C.greyDk}">payable to: ROME</text></g>` + `<g id="mercs">${[0, 1, 2].map((i) => place(CAST.mercenary({ pose: i === 1 ? "armsUp" : "point", spear: i !== 1 }), Geo.at("Carthage")[0] - 260 + i * 90, Geo.at("Carthage")[1] + 300, 0.55)).join("")}${place(CAST.carthSenator({ pose: "shrug", brows: "worried", mouth: "open", eyes: "wide" }), Geo.at("Carthage")[0] + 80, Geo.at("Carthage")[1] + 310, 0.6, { flip: true })}</g>` + H.grain();
  };

  // 05 — Hamilcar's revenge corkboard / Hanno says no
  S["05"] = () => {
    const pins = [[640, 260], [900, 210], [1140, 300], [760, 470], [1040, 500], [1240, 560]];
    return H.defs() + `<rect width="1920" height="1080" fill="#2d2440"/>` +
      `<g id="board"><rect x="520" y="140" width="880" height="560" rx="10" fill="#b98a55" stroke="${C.ink}" stroke-width="10"/>` +
      pins.map(([x, y], i) => `<rect x="${x - 56}" y="${y - 66}" width="112" height="132" fill="#fffaf0" stroke="${C.ink}" stroke-width="4" transform="rotate(${(i % 3) * 4 - 4} ${x} ${y})"/><g transform="translate(${x} ${y + 40}) scale(.36) translate(-100 -230)">${i === 5 ? `<rect x="40" y="60" width="120" height="120" fill="#d9dde3"/><text x="100" y="150" text-anchor="middle" class="t-ink" font-size="90">?</text>` : CAST.romanSenator({ brows: "smug" })}</g>`).join("") +
      `<path id="strings" d="M640 260 L900 210 L1140 300 L1040 500 L760 470 L640 260 M900 210 L1040 500 M1140 300 L1240 560" stroke="${C.rome}" stroke-width="6" fill="none"/>` +
      `<text x="1240" y="660" text-anchor="middle" font-family="Fredoka" font-weight="600" font-size="26" fill="${C.ink}">my lower back</text></g>` +
      place(CAST.hamilcar({ pose: "point", mouth: "shout", eyes: "wide" }), 330, 1000, 1.25, { id: "hamilcar" }) +
      `<g id="hanno-win"><rect x="1450" y="560" width="400" height="440" rx="20" fill="#f3e3c3" stroke="${C.ink}" stroke-width="8"/>${place(CAST.hanno(), 1650, 1000, 1.25)}</g>` +
      P.bubble(150, 120, 330, 130, "Purely. Financial.", { tail: "br", id: "b-fin", size: 40 }) +
      P.bubble(1520, 380, 220, 120, "No.", { tail: "bl", id: "b-no", size: 72 }) + H.vignette() + H.grain();
  };

  // 06 — The oath
  S["06"] = () =>
    H.defs() + `<rect width="1920" height="1080" fill="#3a2a22"/><path d="M200 0 L960 -80 L1720 0 V120 H200Z" fill="#5a4030"/>` +
    H.columns([220, 520, 1400, 1700], 860, 760) +
    `<rect y="860" width="1920" height="220" fill="#5c4434" stroke="${C.ink}" stroke-width="5"/>` +
    `<g id="glow"><circle cx="960" cy="560" r="360" fill="${C.fire}" opacity=".18"/><circle cx="960" cy="600" r="220" fill="${C.fireLt}" opacity=".15"/></g>` +
    `<g id="altar"><rect x="840" y="700" width="240" height="170" fill="${C.stone}" stroke="${C.ink}" stroke-width="6"/><rect x="820" y="680" width="280" height="36" fill="${C.stoneDk}" stroke="${C.ink}" stroke-width="6"/>${P.fire(960, 690, 1.2, { id: "flame" })}</g>` +
    place(CAST.hamilcar({ pose: "point", mouth: "flat", brows: "angry" }), 640, 940, 1.15, { id: "hamilcar" }) +
    place(CAST.hannibalKid({ pose: "raise", brows: "worried", mouth: "flat" }), 1220, 940, 1.0, { id: "kid" }) +
    P.bubble(1180, 220, 640, 150, "Is there a version of Spain without the hatred?", { tail: "bl", id: "b-version", size: 34 }) +
    P.bubble(300, 340, 200, 110, "No.", { tail: "br", id: "b-no", size: 64 }) + H.vignette("vig", 0.7) + `<g id="split" opacity="0" data-layout-allow-overlap="true"><rect width="960" height="1080" fill="#f7d77a"/><text x="480" y="140" text-anchor="middle" class="t-title" font-size="70">MOST KIDS</text>${place(CAST.kid({ pose: "hold" }), 420, 900, 1.6)}<g transform="translate(540 760)"><ellipse rx="90" ry="60" fill="#c98d4a" stroke="${C.ink}" stroke-width="6"/><circle cx="80" cy="-50" r="50" fill="#c98d4a" stroke="${C.ink}" stroke-width="6"/><path d="M60 -96 l-20 -40 l30 20Z M110 -92 l10 -44 l14 34Z" fill="#8a5a32" stroke="${C.ink}" stroke-width="5"/><circle cx="96" cy="-56" r="7" fill="${C.ink}"/><path d="M120 -36 q10 8 0 14" stroke="${C.ink}" stroke-width="5" fill="none"/></g>
  <g id="split-r"><rect x="960" width="960" height="1080" fill="#3a2a22"/><text x="1440" y="140" text-anchor="middle" class="t-title" font-size="70">THIS KID</text>${place(CAST.hannibalKid({ pose: "hold", brows: "furious", mouth: "grit" }), 1400, 900, 1.6)}${P.scroll(1440, 560, 300, 150, ["ETERNAL", "HATRED"], { size: 52 })}</g><rect x="954" width="12" height="1080" fill="${C.ink}"/></g>` + H.grain();

  // 07 — Spain: silver, a spy, and a river
  S["07"] = () => {
    const [ix, iy] = Geo.project([-3.6, 39.6]);
    const z = 2.1, tx = 960 - ix * z, ty = 540 - iy * z;
    const coins = [[-4.5, 37.9], [-2.4, 38.6], [-6.2, 37.4], [-1.2, 38.0], [-3.2, 37.5]].map((ll, i) => { const [x, y] = Geo.project(ll); return `<g class="coin" id="coin-${i}">${P.coin(x, y - 20, 12)}</g>`; }).join("");
    return H.defs() + `<g id="zoom" transform="translate(${tx.toFixed(1)} ${ty.toFixed(1)}) scale(${z})">` +
      Toon.map(g.MED, { regions: [reg("spainS", C.carth, "r-spain"), reg("africa", C.carth)], graticule: false }) + `<g id="coins">` + coins + `</g></g>` +
      `<g id="bush"><circle cx="1560" cy="980" r="110" fill="${C.grassDk}" stroke="${C.ink}" stroke-width="6"/><circle cx="1700" cy="1000" r="110" fill="${C.grass}" stroke="${C.ink}" stroke-width="6"/></g>` +
      place(CAST.spy({ pose: "hold", prop: P.scroll(60, 200, 80, 50) }), 1640, 1060, 0.95, { id: "spy" }) +
      P.bubble(1000, 470, 620, 170, "Carthage. Getting rich again. Also — elephants.", { tail: "br", id: "b-spy", size: 36 }) +
      Toon.city(...(() => { const [x, y] = Geo.at("NewCarthage"); return [x * z + tx, y * z + ty]; })(), "NEW CARTHAGE", { dy: 52 }) + `<g id="river" opacity="0" data-layout-allow-overlap="true"><rect width="1920" height="1080" fill="#9fd0ea"/><path d="M0 420 C500 380 1300 440 1920 400 V1080 H0Z" fill="#3d7bb0" stroke="${C.ink}" stroke-width="6"/>${[520, 640, 780, 920].map((y) => `<path d="M0 ${y} q80 -16 160 0 t160 0 t160 0 t160 0 t160 0 t160 0 t160 0 t160 0 t160 0 t160 0 t160 0 t160 0" stroke="#bfe3f7" stroke-width="5" fill="none" opacity=".7"/>`).join("")}<g id="helmet" transform="translate(960 470)"><g transform="scale(1.4) translate(-100 -40)"><path d="M32 96 C30 46 62 24 100 24 C138 24 170 46 168 96 C150 82 128 76 100 76 C72 76 50 82 32 96Z" fill="${C.gold}" stroke="${C.ink}" stroke-width="6"/><path d="M100 22 C96 -6 120 -20 136 -12 C122 -6 116 8 112 24Z" fill="${C.rome}" stroke="${C.ink}" stroke-width="5"/></g></g>${[[900, 380, 18], [1010, 330, 12], [950, 280, 9]].map(([x, y, r]) => `<circle class="bubble" cx="${x}" cy="${y}" r="${r}" fill="#dff3ff" stroke="${C.ink}" stroke-width="4"/>`).join("")}<text x="1080" y="420" class="t-cap" font-size="56">blub.</text></g>` + H.grain();
  };

  // 08 — Hasdrubal the Handsome and the Ebro line
  S["08"] = () => {
    const [ix, iy] = Geo.project([-2.5, 40.4]);
    const z = 2.0, tx = 960 - ix * z, ty = 420 - iy * z;
    const ebro = Geo.route([[-3.8, 43.0], [-2.0, 42.4], [-0.9, 41.65], [0.3, 41.0], [0.85, 40.72]]);
    return H.defs() + `<g transform="translate(${tx.toFixed(1)} ${ty.toFixed(1)}) scale(${z})">` +
      Toon.map(g.MED, { regions: [reg("spainS", C.carth, "r-spain")], graticule: false }) +
      `<path id="ebro" d="${ebro}" stroke="#fffaf0" stroke-width="9" fill="none" stroke-dasharray="16 10" stroke-linecap="round"/></g>` +
      `<text id="ebro-label" x="1250" y="210" class="t-label" font-size="54">THE EBRO</text>` +
      `<g id="sparkles">${[[520, 520], [760, 470], [600, 760], [470, 680]].map(([x, y]) => `<path d="M${x} ${y - 30} L${x + 8} ${y - 8} L${x + 30} ${y} L${x + 8} ${y + 8} L${x} ${y + 30} L${x - 8} ${y + 8} L${x - 30} ${y} L${x - 8} ${y - 8}Z" fill="${C.fireLt}" stroke="${C.ink}" stroke-width="3"/>`).join("")}</g>` +
      place(CAST.hasdrubal({ pose: "point" }), 620, 1020, 1.25, { id: "hasdrubal" }) +
      place(CAST.flaccus({ pose: "point", brows: "angry", mouth: "flat" }), 1300, 1020, 1.25, { id: "flaccus", flip: true }) +
      P.bubble(1360, 520, 460, 130, "Not one toe over this line.", { tail: "bl", id: "b-toe", size: 34 }) +
      P.bubble(160, 470, 480, 120, "Wouldn't dream of it, darling.", { tail: "br", id: "b-darling", size: 32 }) +
      sticker(560, 150, "HASDRUBAL THE HANDSOME", { size: 50, rot: -2, bg: "#e07ab0", id: "st-name" }) + `<g id="dagger" opacity="0" data-layout-allow-overlap="true"><rect width="1920" height="1080" fill="#120c0a" opacity=".7"/><g transform="translate(640 560) rotate(-30)"><rect x="-10" y="-150" width="20" height="140" fill="#dfe6ee" stroke="${C.ink}" stroke-width="5"/><rect x="-40" y="-14" width="80" height="16" rx="6" fill="${C.gold}" stroke="${C.ink}" stroke-width="5"/><rect x="-9" y="0" width="18" height="60" rx="5" fill="${C.wood}" stroke="${C.ink}" stroke-width="5"/></g><text x="1100" y="560" class="t-title" font-size="90">GRUDGE #2</text></g>` + H.grain();
  };

  // 09 — Hannibal raised on a shield
  S["09"] = () =>
    H.defs() + H.sky("#f2b46b", "#fde1b0") + `<circle cx="960" cy="560" r="300" fill="#ffe08a" opacity=".6"/>` + H.ground(820, "#c9a86a", "#a8874e") +
    `<g id="crowd">${[180, 380, 1540, 1740].map((x, i) => place(CAST.carthSoldier({ pose: "armsUp", mouth: "grin", brows: "happy", roundShield: false }), x, 1060, 0.95, { flip: i > 1 })).join("")}</g>` +
    `<g id="lift">${[760, 1160].map((x, i) => place(CAST.carthSoldier({ pose: "holdUp", mouth: "grin", brows: "happy", roundShield: false }), x, 1060, 1.0, { flip: i === 1 })).join("")}
      <ellipse cx="960" cy="720" rx="300" ry="44" fill="${C.carth}" stroke="${C.ink}" stroke-width="8"/><ellipse cx="960" cy="712" rx="260" ry="30" fill="${C.gold}" stroke="${C.ink}" stroke-width="4"/>
      ${place(CAST.hannibal({ pose: "raise", sword: true, swordRot: -10 }), 960, 712, 1.15, { id: "hannibal" })}</g>` +
    `<g id="flash"><circle cx="1560" cy="300" r="150" fill="#fffaf0" stroke="${C.ink}" stroke-width="8"/><clipPath id="fl-clip"><circle cx="1560" cy="300" r="146"/></clipPath><g clip-path="url(#fl-clip)"><rect x="1400" y="140" width="320" height="320" fill="#3a2a22"/>${place(CAST.hannibalKid({ pose: "raise" }), 1560, 470, 0.95)}</g><text x="1560" y="490" text-anchor="middle" class="t-cap" font-size="32">age 9</text></g>` +
    sticker(560, 220, "STILL ANGRY.", { size: 84, rot: -4, id: "st-angry" }) + H.grain();

  // 10 — Saguntum
  S["10"] = () =>
    H.defs() + H.sky("#9bc4dc", "#e5d6c0") + `<g id="smoke">${[[700, 260], [1060, 220], [900, 160]].map(([x, y]) => `<path d="M${x - 110} ${y + 40} C${x - 140} ${y - 30} ${x - 60} ${y - 80} ${x - 10} ${y - 50} C${x + 20} ${y - 110} ${x + 120} ${y - 80} ${x + 100} ${y - 10} C${x + 150} ${y + 20} ${x + 110} ${y + 70} ${x + 60} ${y + 60} C${x + 20} ${y + 90} ${x - 70} ${y + 90} ${x - 110} ${y + 40}Z" fill="#7b7480" stroke="${C.ink}" stroke-width="5" opacity=".85"/>`).join("")}</g>` + H.ground(760, "#cdb27a", "#a8874e") +
    `<g id="town"><rect x="460" y="420" width="1000" height="360" fill="#e8d6b0" stroke="${C.ink}" stroke-width="8"/>` +
    Array.from({ length: 13 }, (_, i) => `<rect x="${460 + i * 80}" y="390" width="44" height="40" fill="#e8d6b0" stroke="${C.ink}" stroke-width="6"/>`).join("") +
    `<rect x="880" y="600" width="160" height="180" rx="80" fill="#5a3b22" stroke="${C.ink}" stroke-width="6"/>
      <g id="sign" transform="rotate(-4 960 500)"><rect x="660" y="450" width="600" height="110" fill="#fffaf0" stroke="${C.ink}" stroke-width="6"/><text x="960" y="525" text-anchor="middle" class="t-ink" font-size="52">FRIENDS WITH ROME <tspan fill="${C.rome}">♥</tspan></text></g>
      </g><g id="fires">${P.fire(560, 430, 0.8)}${P.fire(1380, 440, 0.9)}${P.fire(1280, 520, 0.6)}</g>` +
    `<g id="calendar" transform="translate(110 150)"><rect width="250" height="270" rx="14" fill="#fffaf0" stroke="${C.ink}" stroke-width="6"/><rect width="250" height="70" rx="14" fill="${C.rome}" stroke="${C.ink}" stroke-width="6"/><text x="125" y="50" text-anchor="middle" class="t-flag" font-size="34">SIEGE</text><text id="cal-n" x="125" y="180" text-anchor="middle" class="t-ink" font-size="110">8</text><text x="125" y="240" text-anchor="middle" class="t-ink" font-size="36">MONTHS</text></g>` +
    place(CAST.saguntine({ pose: "hold", brows: "sad", mouth: "frown", sweat: true, prop: P.scroll(50, 190, 100, 60) }), 1640, 1050, 1.15, { id: "saguntine" }) +
    `<g id="letter">${P.scroll(1200, 140, 560, 170, ["Thoughts and prayers.", "— Rome"], { size: 46 })}</g>` + place(CAST.saguntine({ pose: "armsUp", brows: "happy", mouth: "grin" }), 1640, 1050, 1.15, { id: "saguntine-happy" }) + H.grain();

  // 11 — The toga
  S["11"] = () => {
    const seats = [];
    for (let row = 0; row < 2; row++) for (let i = 0; i < 7; i++) {
      const x = 170 + i * 260 + (row ? 130 : 0); if (x > 700 && x < 1220) continue;
      seats.push(place(CAST.carthSenator({ brows: i % 2 ? "neutral" : "worried" }), x, 600 + row * 150, 0.75));
    }
    return H.defs() + H.interior("#cbb38c", "#9a7a56") + H.columns([120, 1800], 820, 700) +
      `<rect x="200" y="560" width="1520" height="60" fill="#8a6a46" stroke="${C.ink}" stroke-width="5"/><rect x="200" y="710" width="1520" height="60" fill="#8a6a46" stroke="${C.ink}" stroke-width="5"/>` +
      `<g id="senate">${seats.join("")}</g>` +
      place(CAST.hanno({ pose: "cross" }), 340, 1010, 1.05, { id: "hanno" }) +
      place(CAST.envoy({ pose: "raise", brows: "angry", mouth: "open" }), 900, 1030, 1.3, { id: "envoy" }) +
      `<g id="fold"><path d="M990 650 C960 690 980 760 1010 790 C1040 760 1060 700 1030 650Z" fill="${C.white}" stroke="${C.ink}" stroke-width="6"/><path d="M1000 690 C1006 720 1012 744 1012 770" stroke="#d8cbb0" stroke-width="4" fill="none"/><text x="1080" y="700" class="t-cap" font-size="44"><tspan fill="#bfe8b2">PEACE</tspan></text><text x="1080" y="760" class="t-cap" font-size="44"><tspan fill="#ff8f86">WAR</tspan></text></g>` +
      P.bubble(400, 300, 440, 120, "What else is in there?", { tail: "bl", id: "b-what", size: 38 }) +
      P.bubble(1110, 300, 400, 120, "…Snacks. Choose!", { tail: "bl", id: "b-snacks", size: 44 }) + sticker(960, 520, "WAR.", { size: 160, rot: -4, id: "st-war" }) + H.grain();
  };

  g.Scenes = Object.assign(g.Scenes || {}, S);
  g.SceneKit = { H, R, reg };
})(globalThis);
