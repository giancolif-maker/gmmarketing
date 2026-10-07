// Episode 1 ("How Hitler Got Away With It") scenes F01–F14. Each returns the frame's
// SVG content (1920×1080); ids mark the parts the cue sheet animates.
// Requires toon.js, ww2kit.js, geo.js, maps/eu.js, grain.js. Classic script → globalThis.Scenes, WWH.
(function (g) {
  const { Toon, WW, Geo } = g;
  const { C, place, sticker } = Toon;
  const { CAST, P, K } = WW;
  const ink = C.ink;

  // ---------- shared backdrops ----------
  const H = {};
  H.defs = () => `<defs><pattern id="grain" width="256" height="256" patternUnits="userSpaceOnUse"><image href="${g.GRAIN_PNG}" width="256" height="256"/></pattern></defs>`;
  H.grain = () => `<rect width="1920" height="1080" fill="url(#grain)" opacity=".8" pointer-events="none"/>`;
  H.sky = (top = C.sky, bot = "#d8eef7", id = "bg") => `<defs><linearGradient id="${id}-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bot}"/></linearGradient></defs><rect width="1920" height="1080" fill="url(#${id}-g)"/>`;
  H.room = (wall = "#d9c7a4", floor = "#b8946a", fy = 820) => `<rect width="1920" height="1080" fill="${wall}"/><rect y="${fy}" width="1920" height="${1080 - fy}" fill="${floor}" stroke="${ink}" stroke-width="5"/>` + Array.from({ length: 9 }, (_, i) => `<path d="M${i * 240} ${fy} L${i * 240 - 120} 1080" stroke="${ink}" stroke-width="3" opacity=".22"/>`).join("");
  H.ground = (y, col = C.grass, dk = C.grassDk) => `<path d="M0 ${y} Q480 ${y - 30} 960 ${y} T1920 ${y} V1080 H0Z" fill="${col}" stroke="${ink}" stroke-width="5"/><path d="M0 ${y + 60} Q600 ${y + 30} 1200 ${y + 70} T1920 ${y + 50} V1080 H0Z" fill="${dk}" opacity=".35"/>`;
  H.clouds = (list = [[260, 170, 1], [1500, 120, 1.3], [980, 230, 0.8]]) => list.map(([x, y, s]) => `<g class="cloud" transform="translate(${x} ${y}) scale(${s})"><path d="M-110 30 C-130 -10 -80 -40 -50 -20 C-40 -60 30 -66 46 -26 C80 -46 130 -16 112 30Z" fill="#fff" stroke="${ink}" stroke-width="5" opacity=".95"/></g>`).join("");
  H.window = (x, y, w, h, sky = "#9fd0ea") => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${sky}" stroke="${ink}" stroke-width="8"/><path d="M${x + w / 2} ${y} V${y + h} M${x} ${y + h / 2} H${x + w}" stroke="${ink}" stroke-width="6"/>`;
  H.table = (x, y, w, col = C.wood) => `<rect x="${x}" y="${y}" width="${w}" height="30" rx="6" fill="${col}" stroke="${ink}" stroke-width="5"/><rect x="${x + 30}" y="${y + 30}" width="22" height="${1080 - y}" fill="${col}" stroke="${ink}" stroke-width="4"/><rect x="${x + w - 52}" y="${y + 30}" width="22" height="${1080 - y}" fill="${col}" stroke="${ink}" stroke-width="4"/>`;
  H.vignette = (o = 0.6) => `<defs><radialGradient id="vig" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="${o}"/></radialGradient></defs><rect width="1920" height="1080" fill="url(#vig)" pointer-events="none"/>`;
  H.date = (x, y, text, id = "") => sticker(x, y, text, { size: 40, rot: -2, bg: ink, id });
  H.label = (x, y, text, size = 34, id = "") => `<text${id ? ` id="${id}"` : ""} x="${x}" y="${y}" text-anchor="middle" class="t-map" font-size="${size}">${text}</text>`;
  H.title = (title, sub) => `<g id="title" opacity="0" data-layout-allow-overlap="true"><rect width="1920" height="1080" fill="#20222a"/>${Array.from({ length: 12 }, (_, i) => `<path d="M960 540 L${960 + Math.cos(i / 6 * Math.PI) * 1400} ${540 + Math.sin(i / 6 * Math.PI) * 1400} L${960 + Math.cos((i + 0.5) / 6 * Math.PI) * 1400} ${540 + Math.sin((i + 0.5) / 6 * Math.PI) * 1400}Z" fill="#2b2e38"/>`).join("")}<text x="960" y="420" text-anchor="middle" class="t-title" font-size="120" fill="#fffaf0">${title}</text><g transform="translate(960 600) rotate(-2)"><rect x="-760" y="-80" width="1520" height="160" rx="22" fill="${K.red}" stroke="${ink}" stroke-width="10"/><text y="32" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="84" fill="#fffaf0">${sub}</text></g></g>`;
  // Map of a baked view; fills: {countryKey: colour}, ids: country paths get id "c-<key>"
  H.map = (view = "europe", fills = {}, { sea = "#2b4a6b", land = "#d8c49a", ids = [] } = {}) => {
    const v = g.EU[view];
    let s = `<rect width="1920" height="1080" fill="${sea}"/><path d="${v.land}" fill="${land}" stroke="${ink}" stroke-width="4" stroke-linejoin="round"/>`;
    for (const [k, d] of Object.entries(v.c)) {
      const f = fills[k];
      s += `<path${ids.includes(k) ? ` id="c-${k}"` : ""} d="${d}" fill="${f || land}" stroke="${ink}" stroke-width="${f ? 3.5 : 2}" stroke-linejoin="round" opacity="${f ? 1 : 0.9}"/>`;
    }
    return s;
  };
  H.city = (name, view = "europe", { label = name, dx = 0, dy = -22, size = 30, dot = true } = {}) => { const [x, y] = Geo.at(name, view); return (dot ? `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="9" fill="#fffaf0" stroke="${ink}" stroke-width="4"/>` : "") + `<text x="${(x + dx).toFixed(0)}" y="${(y + dy).toFixed(0)}" text-anchor="middle" class="t-map" font-size="${size}">${label}</text>`; };
  // Fat map arrow along lon/lat points (drawn on by the engine when its id starts with "arr-")
  H.arrow = (pts, view = "europe", { id = "", col = K.red, w = 26 } = {}) => {
    const P2 = pts.map((p) => Geo.project(p, view)), d = Geo.smoothPath(P2);
    const [a, b] = [P2[P2.length - 2], P2[P2.length - 1]], ang = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
    return `<g${id ? ` id="${id}"` : ""}><path d="${d}" stroke="${ink}" stroke-width="${w + 12}" fill="none" stroke-linecap="round"/><path d="${d}" stroke="${col}" stroke-width="${w}" fill="none" stroke-linecap="round"/><path transform="translate(${b[0].toFixed(1)} ${b[1].toFixed(1)}) rotate(${ang.toFixed(1)})" d="M-6 -${w * 1.6} L${w * 2.2} 0 L-6 ${w * 1.6}Z" fill="${col}" stroke="${ink}" stroke-width="6" stroke-linejoin="round"/></g>`;
  };
  H.flagDE = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="0" y="-8" width="10" height="220" fill="#555" stroke="${ink}" stroke-width="4"/><rect x="10" y="0" width="150" height="34" fill="#1d1d1d" stroke="${ink}" stroke-width="4"/><rect x="10" y="34" width="150" height="34" fill="${K.red}" stroke="${ink}" stroke-width="4"/></g>`;
  H.cut = (id, inner) => `<g id="${id}" data-layout-allow-overlap="true">${inner}</g>`;
  H.bed = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-260" y="-40" width="520" height="70" rx="12" fill="#f4f1ea" stroke="${ink}" stroke-width="6"/><rect x="-280" y="-160" width="24" height="230" rx="6" fill="#9aa3ad" stroke="${ink}" stroke-width="5"/><rect x="256" y="-110" width="24" height="180" rx="6" fill="#9aa3ad" stroke="${ink}" stroke-width="5"/><path d="M-250 -40 C-120 -70 120 -70 250 -40" fill="#c9d6e6" stroke="${ink}" stroke-width="5"/></g>`;

  const S = {};

  // F01 — Hook: montage, then the hospital bed
  S["01"] = () => {
    const ward = H.room("#c9d3cc", "#9aa59d", 760) + H.window(1380, 150, 300, 260, "#7f8a96") + H.bed(820, 780, 1.3) +
      place(CAST.hitlerSick({ brows: "angry", mouth: "frown" }), 520, 745, 1.2, { id: "hitler", rot: 78 }) + H.date(240, 120, "NOVEMBER 1918", "st-date");
    const stamp = `<rect width="1920" height="1080" fill="#e9dfc6"/><rect x="560" y="120" width="800" height="900" fill="#fbf6e8" stroke="${ink}" stroke-width="8" transform="rotate(-3 960 560)"/><text x="960" y="250" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="64" fill="${ink}" transform="rotate(-3 960 560)">TREATY OF VERSAILLES</text>${Array.from({ length: 9 }, (_, i) => `<path d="M640 ${330 + i * 56} H${1240 - (i % 3) * 80}" stroke="#bbb" stroke-width="10" transform="rotate(-3 960 560)"/>`).join("")}` + P.stamp(960, 640, 1.8, "GUILTY", K.red, { rot: -12 });
    const dark = H.map("europe", { de: "#1f1f1f", at: "#2a2a2a", cz: "#2a2a2a", pl: "#333", fr: "#3a3a3a", benl: "#3a3a3a", dk: "#3a3a3a", no: "#444", it: "#3f3a35", yu: "#444", gr: "#444", ussr: "#4a3a3a" }, { sea: "#1a2433", land: "#7a7362" }) + `<defs><radialGradient id="dk" cx=".46" cy=".45" r=".6"><stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs><rect width="1920" height="1080" fill="url(#dk)"/>`;
    const poland = H.map("europe", { de: K.fieldgrey, pl: "#d9d2c0", ussr: "#b04a3a" }) + H.arrow([[13.4, 52.5], [17.5, 52.5], [20.5, 52.2]]) + H.arrow([[14.5, 50.2], [18, 50.2], [20.8, 51.2]]) + H.arrow([[30, 53], [26.5, 52.8], [23.6, 52.4]], "europe", { col: "#b04a3a" }) + H.city("Warsaw");
    const bunker = `<rect width="1920" height="1080" fill="#3b3d42"/>${Array.from({ length: 7 }, (_, i) => `<path d="M0 ${150 * i + 60} H1920" stroke="#2e3034" stroke-width="10"/>`).join("")}<rect x="560" y="140" width="800" height="940" fill="#26282c" stroke="${ink}" stroke-width="10"/><rect x="600" y="180" width="560" height="900" fill="#55585e" stroke="${ink}" stroke-width="8"/>${[260, 520, 780].map((y) => `<rect x="610" y="${y}" width="540" height="22" fill="#44474c"/>`).join("")}<circle cx="1110" cy="640" r="34" fill="#8a8d92" stroke="${ink}" stroke-width="6"/>` + H.vignette(0.85);
    return H.defs() + ward +
      // each montage shot carries its year, so the flash-forward reads without narration
      H.cut("cut-m2", stamp + sticker(960, 990, "1919", { size: 72, rot: -2, bg: ink })) + H.cut("cut-m3", dark + sticker(960, 990, "1942", { size: 72, rot: -2, bg: ink })) +
      H.cut("cut-m4", poland + sticker(960, 990, "1939", { size: 72, rot: -2, bg: ink })) + H.cut("cut-m5", bunker + sticker(960, 990, "1945", { size: 72, rot: -2, bg: "#7a1d12" })) +
      H.title("WORLD WAR II", "How Hitler Got Away With It") + H.grain();
  };

  // F02 — The bill
  S["02"] = () =>
    H.defs() + H.room("#e8d9b5", "#a77f55") +
    `<g>${[300, 760, 1220, 1680].map((x) => `<path d="M${x - 70} 820 V160 Q${x} 60 ${x + 70} 160 V820" fill="#f3e6c3" stroke="${ink}" stroke-width="6"/><path d="M${x - 50} 820 V180 Q${x} 100 ${x + 50} 180 V820" fill="#bcd2e8" stroke="${ink}" stroke-width="4" opacity=".6"/>`).join("")}</g>` +
    `<g>${[...Array(5)].map((_, i) => `<circle cx="${560 + i * 200}" cy="70" r="26" fill="${C.gold}" stroke="${ink}" stroke-width="4"/>`).join("")}<path d="M520 70 H1400" stroke="${C.gold}" stroke-width="6"/></g>` +
    H.table(560, 760, 800, "#6b4a2b") +
    place(CAST.diplomatDE({ pose: "hold", brows: "worried" }), 520, 1040, 1.45, { id: "de" }) +
    place(CAST.diplomatFR({ pose: "point", brows: "smug", mouth: "smirk" }), 1420, 1040, 1.45, { id: "fr", flip: true }) +
    `<g id="pop-env"><rect x="880" y="710" width="160" height="100" rx="6" fill="#fffaf0" stroke="${ink}" stroke-width="5" transform="rotate(-6 960 760)"/><path d="M880 715 L960 770 L1040 715" stroke="${ink}" stroke-width="4" fill="none" transform="rotate(-6 960 760)"/></g>` +
    // the bill unrolls down across the floor
    `<g id="drop-bill"><rect x="840" y="180" width="240" height="600" fill="#fffdf5" stroke="${ink}" stroke-width="6"/>${Array.from({ length: 12 }, (_, i) => `<path d="M870 ${230 + i * 44} H${1050 - (i % 4) * 40}" stroke="#bbb" stroke-width="8"/>`).join("")}<path d="M840 780 C840 900 1080 900 1080 1080 L840 1080Z" fill="#fffdf5" stroke="${ink}" stroke-width="6"/><text x="960" y="1010" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="30" fill="${K.red}">132,000,000,000</text><text x="960" y="1045" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="22" fill="${ink}">GOLD MARKS</text></g>` +
    H.date(260, 120, "VERSAILLES, 1919", "st-date") + H.grain();

  // F03 — Money breaks: the café price board, then kites and wallpaper
  S["03"] = () =>
    H.defs() + H.room("#e7cfa4", "#8f6a46") +
    `<g id="board"><rect x="1080" y="120" width="560" height="300" rx="12" fill="#2b2f2a" stroke="${ink}" stroke-width="8"/><text x="1360" y="190" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="40" fill="#e9e2cf">KAFFEE</text>
      <g id="cnt-price"><text x="1360" y="0" opacity="0">.</text><text x="1360" y="330" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="96" fill="#fffaf0">5,000</text></g><text x="1360" y="395" text-anchor="middle" font-family="Fredoka" font-weight="600" font-size="34" fill="#c9c2b0">MARKS</text></g>` +
    H.table(300, 780, 520, "#7a5432") + `<g><path d="M520 740 h60 l-8 40 h-44Z" fill="#fff" stroke="${ink}" stroke-width="5"/><path d="M580 750 q22 4 0 20" stroke="${ink}" stroke-width="5" fill="none"/></g>` +
    place(CAST.civilian({ pose: "hold", mouth: "open", brows: "surprised" }), 420, 1040, 1.45, { id: "cust" }) +
    place(CAST.waiter({ pose: "hips", brows: "smug", mouth: "smirk" }), 1080, 1040, 1.45, { id: "waiter", flip: true }) +
    `<g id="fade-kites" data-layout-allow-overlap="true"><rect width="1920" height="1080" fill="#9fd0ea"/>${H.clouds()}<path d="M0 860 Q960 820 1920 860 V1080 H0Z" fill="${C.grass}" stroke="${ink}" stroke-width="5"/>
      ${[[520, 300, -12], [900, 220, 8], [1300, 330, -4]].map(([x, y, r]) => `<g transform="translate(${x} ${y}) rotate(${r})"><path d="M0 -110 L80 0 L0 110 L-80 0Z" fill="#cfe0b8" stroke="${ink}" stroke-width="5"/><text y="12" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="30" fill="#2f5a2f">1000000</text><path d="M0 110 C30 220 -30 330 10 460" stroke="${ink}" stroke-width="3" fill="none"/></g>`).join("")}
      ${place(CAST.kid({ pose: "armsUp", mouth: "grin", brows: "happy" }), 560, 960, 1.0)}${place(CAST.kid({ pose: "raise", mouth: "smile", brows: "happy", hairCol: "#2a1d12" }), 1320, 960, 1.0)}
      ${sticker(1540, 920, "$1 = 4,200,000,000,000 MARKS", { size: 40, rot: -2, bg: K.red, id: "st-dollar" })}</g>` +
    H.date(260, 120, "BERLIN, 1923", "st-date") + H.grain();

  // F04 — The beer hall, then the prison cell
  S["04"] = () => {
    const drinkers = [[200, 1, "flat"], [470, -1, "neutral"], [1460, 1, "smile"], [1720, -1, "flat"]].map(([x, f, m], i) => place(CAST.civilian({ pose: i % 2 ? "hold" : "idle", mouth: m, capCol: ["#5a5048", "#6a4a3a", "#4a5a4a", "#7a6a5a"][i] }), x, 1060, 1.2, { flip: f < 0 }));
    return H.defs() + H.room("#a77a4a", "#6e4b2c") +
      `<g>${Array.from({ length: 8 }, (_, i) => `<path d="M${i * 280} 0 V820" stroke="#7d5632" stroke-width="20"/>`).join("")}<path d="M0 120 H1920" stroke="#5a3b20" stroke-width="30"/></g>` +
      `<g>${[260, 620, 1300, 1660].map((x) => `<rect x="${x - 50}" y="210" width="100" height="70" rx="8" fill="#e2b33c" stroke="${ink}" stroke-width="4"/>`).join("")}</g>` +
      H.table(660, 780, 600, "#6e4b2c") + drinkers.join("") +
      place(CAST.hitler({ pose: "pointUp", mouth: "shout", brows: "furious" }), 960, 790, 1.35, { id: "hitler" }) +
      place(CAST.civilian({ pose: "hold", mouth: "open", capCol: "#3a5a3a", prop: P.sausage(116, 214, 0.9) }), 1180, 1060, 1.3, { id: "sausage", flip: true }) +
      `<g id="fade-cell" data-layout-allow-overlap="true"><rect width="1920" height="1080" fill="#6d6f73"/>${Array.from({ length: 10 }, (_, i) => `<path d="M0 ${i * 120} H1920" stroke="#5d5f63" stroke-width="6"/>`).join("")}<rect x="1260" y="160" width="300" height="220" fill="#9fb8cf" stroke="${ink}" stroke-width="8"/>${[1320, 1380, 1440, 1500].map((x) => `<rect x="${x}" y="160" width="14" height="220" fill="#3a3c40"/>`).join("")}<rect y="820" width="1920" height="260" fill="#55575b" stroke="${ink}" stroke-width="5"/>${H.table(460, 760, 520, "#6b5a45")}<g transform="translate(700 742) rotate(-4)"><rect x="-70" y="-24" width="140" height="28" rx="4" fill="#7a2a22" stroke="${ink}" stroke-width="4"/><rect x="-62" y="-36" width="124" height="14" fill="#f4ecd8" stroke="${ink}" stroke-width="3"/></g>${place(CAST.hitler({ pose: "hold", mouth: "smirk", brows: "smug" }), 560, 1040, 1.35)}${place(CAST.guard({ pose: "hips", brows: "worried" }), 1420, 1040, 1.4, { flip: true })}</g>` +
      H.date(260, 120, "MUNICH", "st-date") + H.grain();
  };

  // F05 — The pitch: soup-kitchen queue, then the infomercial set
  S["05"] = () =>
    H.defs() + H.sky("#9aa0a8", "#c9cdd2") + `<g>${[[100, 420], [380, 360], [700, 460], [1040, 380], [1380, 440], [1680, 360]].map(([x, h]) => `<rect x="${x}" y="${820 - h}" width="230" height="${h}" fill="#7f848c" stroke="${ink}" stroke-width="5"/>`).join("")}</g>` + H.ground(820, "#8d9096", "#6d7076") +
    `<g id="queue">${Array.from({ length: 9 }, (_, i) => place(CAST.civilian({ brows: "sad", mouth: "frown", capCol: ["#5a5048", "#4a4a52", "#6a5a4a"][i % 3] }), 1700 - i * 170, 1000, 0.95)).join("")}<rect x="1760" y="560" width="140" height="440" fill="#9aa0a8" stroke="${ink}" stroke-width="5"/><text x="1830" y="620" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="28" fill="${ink}">SOUP</text></g>` +
    sticker(560, 150, "6,000,000 UNEMPLOYED", { size: 52, rot: -3, bg: ink, id: "st-6m" }) +
    `<g id="cut-tv" data-layout-allow-overlap="true"><rect width="1920" height="1080" fill="#ffcf3f"/>${Array.from({ length: 16 }, (_, i) => `<path d="M960 540 L${960 + Math.cos(i / 8 * Math.PI) * 1500} ${540 + Math.sin(i / 8 * Math.PI) * 1500} L${960 + Math.cos((i + 0.5) / 8 * Math.PI) * 1500} ${540 + Math.sin((i + 0.5) / 8 * Math.PI) * 1500}Z" fill="#ffb21f"/>`).join("")}
      <rect x="1080" y="150" width="680" height="440" rx="20" fill="#fffaf0" stroke="${ink}" stroke-width="8"/><text x="1420" y="250" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="54" fill="${K.red}">EVERYTHING IS</text><text x="1420" y="330" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="54" fill="${K.red}">SOMEBODY ELSE'S</text><text x="1420" y="410" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="54" fill="${K.red}">FAULT!</text><text x="1420" y="520" text-anchor="middle" font-family="Fredoka" font-weight="600" font-size="34" fill="${ink}">*results not guaranteed</text>
      ${place(CAST.hitler({ pose: "point", mouth: "grin", brows: "happy" }), 620, 1060, 1.6, { id: "hitler-tv" })}
      <g id="pop-phone"><rect x="1100" y="760" width="640" height="130" rx="22" fill="${K.red}" stroke="${ink}" stroke-width="8"/><text x="1420" y="848" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="64" fill="#fffaf0">VOTE NOW!</text></g></g>` +
    H.grain();

  // F06 — The box
  S["06"] = () => {
    const cons = (x, f, id, pose = "hips") => place(CAST.conservative({ pose, mouth: "smirk", brows: "smug" }), x, 1040, 1.3, { id, flip: f });
    return H.defs() + H.room("#cfc6b5", "#8e7a5e") + H.window(140, 140, 340, 300, "#a9c3d6") + H.window(1440, 140, 340, 300, "#a9c3d6") +
      `<g id="arm-out">${place(CAST.hitler({ pose: "pointUp", mouth: "smirk" }), 960, 1240, 1.35)}</g>` +
      `<g id="box-big">${P.box(960, 1080, 380, 380)}</g>` +
      `<g id="fade-fire" data-layout-allow-overlap="true"><rect x="1400" y="120" width="420" height="320" fill="#ffb14a" opacity=".85"/><text x="1610" y="300" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="44" fill="#7a1d12">PARLIAMENT</text><text x="1610" y="350" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="44" fill="#7a1d12">ON FIRE</text></g>` +
      sticker(960, 170, "EVERY OTHER PARTY: BANNED", { size: 46, rot: 2, bg: K.red, id: "st-banned" }) +
      cons(360, false, "con1") + cons(1560, true, "con2") + cons(1760, true, "con3", "shrug") +
      `<g id="pop-small">${P.box(560, 1010, 200, 150)}</g>` +
      // the reversal: Hitler holding the box, conservatives inside it
      `<g id="cut-rev" data-layout-allow-overlap="true">${H.room("#cfc6b5", "#8e7a5e")}${place(CAST.hitler({ pose: "hold", mouth: "grin", brows: "smug" }), 960, 1040, 1.5)}<g transform="translate(960 830)">${P.box(0, 0, 360, 230, { flaps: true })}</g>${[880, 960, 1040].map((x, i) => `<g transform="translate(${x} 640)"><circle r="34" fill="${C.skin}" stroke="${ink}" stroke-width="5"/><rect x="-34" y="-86" width="68" height="60" rx="4" fill="#1c1c22" stroke="${ink}" stroke-width="4"/><path d="M-12 8 h24" stroke="${ink}" stroke-width="4"/><circle cx="-11" cy="-4" r="4" fill="${ink}"/><circle cx="11" cy="-4" r="4" fill="${ink}"/></g>`).join("")}${sticker(960, 170, "FÜHRER, 1934", { size: 54, rot: -2, bg: ink })}</g>` +
      `<g id="cut-radio" data-layout-allow-overlap="true">${H.room("#d9c3a0", "#8a6a48")}${H.table(700, 700, 520, "#7a5432")}${P.radio(960, 640, 1.4)}${place(WW.CAST.kid({ mouth: "open" }), 520, 1040, 1.15)}${place(CAST.civilian({ pose: "reach", brows: "neutral", mouth: "flat" }), 1380, 1040, 1.4, { flip: true })}</g>` +
      `<g id="fade-laws" data-layout-allow-overlap="true"><rect width="1920" height="1080" fill="#1f2128"/><text x="960" y="330" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="56" fill="#e9e2cf">GERMANY&#8217;S JEWS, 1933&#8211;1935</text>${["JOBS", "CITIZENSHIP", "RIGHTS"].map((w, i) => `<g transform="translate(${480 + i * 480} 540)"><rect x="-200" y="-90" width="400" height="180" rx="12" fill="#fffaf0" stroke="#444" stroke-width="6"/><text y="20" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="52" fill="${ink}">${w}</text><path d="M-170 -60 L170 60" stroke="#9a2a22" stroke-width="12"/></g>`).join("")}</g>` +
      H.date(260, 120, "1933", "st-date") + H.grain();
  };

  // F07 — Mussolini's printer
  S["07"] = () =>
    H.defs() + H.sky("#f2c38a", "#f8e2bd") +
    `<rect x="1040" y="0" width="880" height="760" fill="#e0b98a" stroke="${ink}" stroke-width="6"/><rect x="1180" y="120" width="560" height="380" rx="20" fill="#5a3b28" stroke="${ink}" stroke-width="6"/>` +
    `<g><rect x="1100" y="500" width="720" height="40" fill="#efd9b6" stroke="${ink}" stroke-width="6"/>${Array.from({ length: 9 }, (_, i) => `<rect x="${1120 + i * 80}" y="540" width="26" height="110" fill="#efd9b6" stroke="${ink}" stroke-width="4"/>`).join("")}<rect x="1100" y="650" width="720" height="34" fill="#efd9b6" stroke="${ink}" stroke-width="6"/></g>` +
    place(CAST.mussolini({ pose: "hips", mouth: "smirk", brows: "smug" }), 1460, 510, 1.25, { id: "muss" }) +
    `<path d="M0 760 H1920 V1080 H0Z" fill="#c9b08a" stroke="${ink}" stroke-width="5"/>` +
    `<g id="press"><rect x="200" y="620" width="380" height="300" rx="12" fill="#6a6d72" stroke="${ink}" stroke-width="7"/><circle cx="300" cy="700" r="56" fill="#8a8d92" stroke="${ink}" stroke-width="6"/><circle cx="480" cy="700" r="56" fill="#8a8d92" stroke="${ink}" stroke-width="6"/><rect x="230" y="800" width="320" height="70" fill="#fffaf0" stroke="${ink}" stroke-width="5"/></g>` +
    place(CAST.enzo({ pose: "hold" }), 760, 1040, 1.35, { id: "enzo", flip: true }) +
    P.banner(960, 230, 900, "VICTORY IN ETHIOPIA", { id: "pop-ban", size: 62 }) +
    `<g id="fade-gas" data-layout-allow-overlap="true">${H.map("horn", { it: "#4f7a4a", er: "#7f9a6a", so: "#7f9a6a", ly: "#7f9a6a", et: "#d9cfb4" }, { sea: "#22313f", land: "#8f8670" })}` +
      `${H.arrow([[38.9, 15.3], [39.2, 12.5], [38.9, 10]], "horn", { id: "arr-et1", col: "#3f6a3a", w: 20 })}${H.arrow([[45.3, 2.5], [43.5, 6.5], [40.2, 8.8]], "horn", { id: "arr-et2", col: "#3f6a3a", w: 20 })}` +
      `${H.city("Addis Ababa", "horn", { dy: 44 })}${sticker(520, 150, "ETHIOPIA, 1935", { size: 56, rot: -2, bg: ink })}` +
      `<g transform="translate(560 930)"><rect x="-380" y="-60" width="760" height="120" rx="16" fill="#151820" stroke="#555" stroke-width="5"/><text y="16" text-anchor="middle" font-family="Fredoka" font-weight="600" font-size="38" fill="#e9e2cf">poison gas on soldiers and civilians</text></g>` +
      `<g id="pop-league">${sticker(1460, 170, "LEAGUE OF NATIONS: WEAK SANCTIONS", { size: 38, rot: 2, bg: "#55585e" })}</g><!--/gas--></g>` +
    H.date(260, 120, "ROME", "st-date") + H.grain();

  // F08 — Tractors
  S["08"] = () => {
    const tank = (x, y, s = 1, id = "") => `<g${id ? ` id="${id}"` : ""} transform="translate(${x} ${y}) scale(${s})"><rect x="-230" y="-60" width="460" height="110" rx="40" fill="#5b5f52" stroke="${ink}" stroke-width="8"/>${[-170, -85, 0, 85, 170].map((cx) => `<circle cx="${cx}" cy="0" r="34" fill="#3f423a" stroke="${ink}" stroke-width="5"/>`).join("")}<rect x="-190" y="-150" width="380" height="100" rx="18" fill="#6f7766" stroke="${ink}" stroke-width="8"/><rect x="-90" y="-230" width="200" height="90" rx="20" fill="#6f7766" stroke="${ink}" stroke-width="8"/><rect x="100" y="-205" width="240" height="30" rx="10" fill="#4f554a" stroke="${ink}" stroke-width="6"/></g>`;
    return H.defs() + H.room("#bfb7a8", "#7a7468") +
      `<g>${[260, 960, 1660].map((x) => `<path d="M${x - 200} 0 L${x - 120} 120 H${x + 120} L${x + 200} 0" fill="#e8e4d8" stroke="${ink}" stroke-width="5"/>`).join("")}</g>` +
      tank(820, 760, 1.25, "tank") +
      `<g id="fade-tractor"><rect x="560" y="430" width="520" height="90" rx="12" fill="#fffaf0" stroke="${ink}" stroke-width="6" transform="rotate(-3 820 475)"/><text x="820" y="490" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="44" fill="${ink}" transform="rotate(-3 820 475)">AGRICULTURAL TRACTOR</text></g>` +
      place(CAST.klaus({ pose: "hold", brows: "worried", prop: P.clipboard(100, 222, 0.9) }), 1440, 1040, 1.45, { id: "klaus", flip: true }) +
      place(CAST.officerDE({ pose: "hips", mouth: "smirk" }), 1740, 1040, 1.45, { id: "officer", flip: true }) +
      sticker(1300, 300, "KLAUS · SUPPLIES", { size: 44, rot: -3, bg: ink, id: "st-klaus" }) +
      H.date(260, 120, "1935", "st-date") + H.grain();
  };

  // F09–F11, F14 — the London desk and the "Last One, Promise" form
  const desk = (who, form, extra = "", tag = "") =>
    H.defs() + H.room("#cbb995", "#7a5a3c") + H.window(780, 110, 360, 280, "#9cb7cb") +
    `<g>${[1500, 1640].map((x) => `<rect x="${x}" y="200" width="110" height="160" rx="6" fill="#7a4a2a" stroke="${ink}" stroke-width="5"/>`).join("")}</g>` +
    who + H.table(380, 760, 1160, "#5b3d24") + form + extra + tag + H.grain();
  S["09"] = () => desk(
    place(CAST.clerkUK({ pose: "hold" }), 640, 1000, 1.35, { id: "uk" }) + place(CAST.clerkFR({ pose: "shrug" }), 1300, 1000, 1.35, { id: "frc", flip: true }),
    `<g id="inr-form">${P.form(960, 600, 0.9, { wear: 0, place: "Rhineland" })}</g>`,
    P.stamp(1080, 680, 1.0, "OK", "#2f7a3a", { id: "st-ok", rot: -10 }) + place(CAST.hitler({ pose: "wave", mouth: "smirk", brows: "smug" }), 180, 1040, 1.2, { id: "hitler" }),
    sticker(1580, 980, "GOT AWAY WITH IT ✓", { size: 40, rot: -3, bg: "#2f7a3a", id: "st-got" }) + H.date(260, 120, "RHINELAND, 1936", "st-date"));
  S["10"] = () => desk(
    place(CAST.chamberlain({ pose: "hold", prop: P.umbrella(170, 150, 0.9) }), 1300, 1000, 1.35, { id: "cham", flip: true }),
    `<g id="inr-form">${P.form(960, 600, 0.9, { wear: 1, place: "Austria" })}</g>`,
    P.stamp(1060, 690, 0.95, "APPEASED", K.red, { id: "st-app", rot: -12 }) + `<g id="inl-hitler">${place(CAST.hitler({ pose: "wave", mouth: "smirk", brows: "smug" }), 260, 1040, 1.25, { flip: true })}</g>`,
    sticker(1580, 980, "AGAIN ✓✓", { size: 44, rot: -3, bg: "#2f7a3a", id: "st-got" }) + H.date(260, 120, "AUSTRIA, 1938", "st-date"));
  S["11"] = () =>
    H.defs() + H.room("#d6c3a2", "#6e4c30") + `<g id="win"><rect x="1460" y="120" width="380" height="420" rx="6" fill="#9cb7cb" stroke="${ink}" stroke-width="8"/>${place(CAST.czech({ pose: "raise", mouth: "shout" }), 1650, 640, 1.0, { id: "czech" })}<path d="M1650 120 V540 M1460 330 H1840" stroke="${ink}" stroke-width="6"/></g>` +
    place(CAST.chamberlain({ pose: "hold", brows: "happy", mouth: "smile" }), 1120, 1000, 1.35, { id: "cham", flip: true }) +
    place(CAST.hitler({ pose: "point", mouth: "grin", brows: "smug" }), 420, 1000, 1.35, { id: "hitler" }) +
    place(CAST.mussolini({ pose: "hips" }), 160, 1000, 1.1) + place(CAST.diplomatFR({ pose: "shrug" }), 1380, 1000, 1.1, { flip: true }) +
    H.table(300, 760, 1240, "#4a3320") + `<g id="inr-form">${P.form(800, 590, 0.9, { wear: 2, place: "Sudetenland" })}</g>` +
    P.stamp(900, 690, 0.95, "APPEASED", K.red, { id: "st-app", rot: -14 }) +
    `<g id="fade-plane" data-layout-allow-overlap="true"><rect width="1920" height="1080" fill="#a9c9e2"/>${H.clouds([[300, 200, 1.2], [1500, 160, 1], [900, 840, 1.4]])}<g transform="translate(960 520)"><rect x="-300" y="-40" width="600" height="80" rx="40" fill="#c9ccd2" stroke="${ink}" stroke-width="6"/><path d="M-80 -30 L40 -260 L120 -260 L60 -30Z M-80 30 L40 260 L120 260 L60 30Z" fill="#b0b4bb" stroke="${ink}" stroke-width="6"/></g>${place(CAST.chamberlain({ pose: "raise", mouth: "grin", brows: "happy", prop: `<rect x="160" y="80" width="60" height="44" fill="#fffaf0" stroke="${ink}" stroke-width="4"/>` }), 700, 1040, 1.2)}${sticker(1240, 920, "\"PEACE FOR OUR TIME\"", { size: 48, rot: -2, bg: "#2f6b3a" })}</g>` +
    sticker(1580, 980, "AGAIN ✓✓✓", { size: 44, rot: -3, bg: "#2f7a3a", id: "st-got" }) + H.date(260, 120, "MUNICH, 1938", "st-date") + H.grain();

  // F12 — Kristallnacht (straight): map of Germany and Austria; cities light up; counters
  S["12"] = () => {
    const cities = [[13.4, 52.5], [11.58, 48.14], [16.37, 48.21], [8.68, 50.11], [6.96, 50.94], [9.99, 53.55], [12.37, 51.34], [13.74, 51.05], [11.07, 49.45], [9.18, 48.78], [7.47, 51.51], [8.8, 53.08], [14.29, 48.31], [13.05, 47.8], [11.4, 47.27]];
    const dots = cities.map(([lon, lat], i) => { const [x, y] = Geo.project([lon, lat], "west"); return `<g id="pop-c${i}"><circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="20" fill="#ff9a2e" opacity=".45"/><circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="9" fill="#ffcf5a" stroke="${ink}" stroke-width="3"/></g>`; }).join("");
    const counter = (x, y, label, id) => `<g id="${id}" transform="translate(${x} ${y})"><rect x="-210" y="-70" width="420" height="140" rx="16" fill="#151820" stroke="#555" stroke-width="5"/><text x="0" y="-22" text-anchor="middle" font-family="Fredoka" font-weight="600" font-size="28" fill="#c9c2b0">${label}</text><text x="0" y="44" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="58" fill="#fffaf0">0</text></g>`;
    return H.defs() + H.map("west", { de: "#4a4f58", at: "#4a4f58" }, { sea: "#141a24", land: "#2c313a" }) + dots +
      counter(1620, 640, "JEWISH MEN ARRESTED", "cnt-arrest") +
      `<g id="pop-refuge">${sticker(960, 160, "MOST COUNTRIES: NO MORE JEWISH REFUGEES", { size: 44, rot: -1, bg: ink })}</g>` +
      `<g id="fade-glass" data-layout-allow-overlap="true"><rect width="1920" height="1080" fill="#101218"/><text x="960" y="520" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="96" fill="#e9e2cf">KRISTALLNACHT</text><text x="960" y="610" text-anchor="middle" font-family="Fredoka" font-weight="600" font-size="40" fill="#9a958a">9–10 NOVEMBER 1938</text></g>` +
      H.vignette(0.7) + H.grain();
  };

  // F13 — The worst friendship
  S["13"] = () =>
    H.defs() + H.room("#bba98a", "#6e5638") + `<rect x="1180" y="120" width="600" height="380" rx="14" fill="#1d2027" stroke="${ink}" stroke-width="10"/><g id="screen"><rect x="1200" y="140" width="560" height="340" fill="#8aa0b8"/>${`<clipPath id="scr"><rect x="1200" y="140" width="560" height="340"/></clipPath>`}<g clip-path="url(#scr)">${place(CAST.hitler({ pose: "hold", mouth: "smirk", brows: "smug" }), 1480, 590, 1.1)}</g></g>` +
    `<rect x="960" y="70" width="240" height="44" rx="8" fill="#e33" stroke="${ink}" stroke-width="4"/><text x="1080" y="102" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="26" fill="#fff">LIVE · BERLIN</text>` +
    place(CAST.stalin({ pose: "hold", mouth: "flat" }), 560, 1000, 1.45, { id: "stalin" }) + H.table(260, 760, 900, "#4e3a24") +
    `<g id="pop-doc"><rect x="760" y="640" width="380" height="110" rx="6" fill="#fffaf0" stroke="${ink}" stroke-width="5" transform="rotate(-3 950 695)"/><text x="950" y="706" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="30" fill="${ink}" transform="rotate(-3 950 695)">NON-AGGRESSION PACT</text></g>` +
    // the secret page: each sketching an invasion map of the other's country
    `<g id="fade-secret" data-layout-allow-overlap="true"><rect width="1920" height="1080" fill="#20222a"/><g transform="translate(520 540)"><rect x="-360" y="-260" width="720" height="520" fill="#fbf6e8" stroke="${ink}" stroke-width="6"/><text x="0" y="-200" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="36" fill="${ink}">STALIN'S DOODLE</text><path d="M-260 60 C-160 -40 -40 -60 80 -10 L240 -40" stroke="${K.red}" stroke-width="14" fill="none"/><path d="M220 -70 L260 -40 L220 -6" stroke="${K.red}" stroke-width="14" fill="none"/><text x="160" y="100" font-family="Fredoka" font-weight="700" font-size="40" fill="${ink}">BERLIN</text></g><g transform="translate(1400 540)"><rect x="-360" y="-260" width="720" height="520" fill="#fbf6e8" stroke="${ink}" stroke-width="6"/><text x="0" y="-200" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="36" fill="${ink}">HITLER'S DOODLE</text><path d="M-260 40 C-140 -60 20 -40 140 -20 L240 -60" stroke="${K.red}" stroke-width="14" fill="none"/><path d="M200 -90 L240 -60 L196 -30" stroke="${K.red}" stroke-width="14" fill="none"/><text x="140" y="110" font-family="Fredoka" font-weight="700" font-size="40" fill="${ink}">MOSCOW</text></g></g>` +
    `<g id="fade-split" data-layout-allow-overlap="true">${H.map("europe", { de: K.fieldgrey, ussr: "#b04a3a", pl: "#d9d2c0" })}<path d="${Geo.route([[22.6, 55.3], [21.9, 53.2], [22.5, 51.8], [23.9, 50.3], [24.0, 49.0]])}" stroke="${ink}" stroke-width="10" stroke-dasharray="26 16" fill="none"/>${H.city("Warsaw")}${sticker(1000, 900, "SECRET EXTRA PAGE", { size: 48, rot: -3, bg: ink })}</g>` +
    H.date(260, 120, "AUGUST 1939", "st-date") + H.grain();

  // F14 — The napkin (Poland): WAR stamp, invasion map, Katyn (straight)
  S["14"] = () =>
    desk(place(CAST.chamberlain({ pose: "hold", brows: "worried", mouth: "flat" }), 1300, 1000, 1.35, { id: "cham", flip: true }) + place(CAST.hitler({ pose: "hips", mouth: "grin", brows: "smug" }), 360, 1000, 1.3, { id: "hitler" }),
      `<g id="drop-napkin">${P.form(960, 640, 0.9, { wear: 3 })}</g>`,
      P.stamp(960, 600, 1.9, "WAR", "#8a1a12", { id: "st-war", rot: -10 }) +
      `<g id="fade-inv" data-layout-allow-overlap="true">${H.map("europe", { de: K.fieldgrey, pl: "#d9d2c0", ussr: "#b04a3a", fr: "#6d8bb0", uk: "#a08b5b" })}${H.arrow([[13.4, 52.5], [17.5, 52.5], [20.7, 52.2]], "europe", { id: "arr-1" })}${H.arrow([[18.6, 54.4], [19.8, 53.4], [20.9, 52.5]], "europe", { id: "arr-2" })}${H.arrow([[15, 50.3], [18.6, 50.4], [20.6, 51.5]], "europe", { id: "arr-3" })}${H.arrow([[30, 53.4], [26.5, 52.8], [23.8, 52.3]], "europe", { id: "arr-4", col: "#b04a3a" })}${H.city("Warsaw")}${sticker(560, 960, "1 SEPT 1939", { size: 48, rot: -2, bg: ink })}</g>` +
      `<g id="fade-katyn" data-layout-allow-overlap="true">${H.map("east", { ussr: "#4a3434", pl: "#3c3c3c", de: "#2c2c2c", baltic: "#3a3a3a", ro: "#333" }, { sea: "#141a24", land: "#3a3833" })}` +
        `<g id="pop-kpin">${(() => { const [x, y] = Geo.at("Katyn", "east"); return `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="16" fill="#e9e2cf" stroke="${ink}" stroke-width="5"/><text x="${x.toFixed(0)}" y="${(y - 34).toFixed(0)}" text-anchor="middle" class="t-map" font-size="40">Katyn forest</text>`; })()}</g>` +
        `${sticker(400, 150, "KATYN, 1940", { size: 56, rot: -2, bg: ink })}<g transform="translate(1340 930)"><rect x="-440" y="-60" width="880" height="120" rx="16" fill="#151820" stroke="#555" stroke-width="5"/><text y="16" text-anchor="middle" font-family="Fredoka" font-weight="600" font-size="38" fill="#e9e2cf">about 22,000 Polish prisoners murdered</text></g></g>`,
      "", "");

  g.WWH = H;
  g.Scenes = Object.assign(g.Scenes || {}, S);
})(globalThis);
