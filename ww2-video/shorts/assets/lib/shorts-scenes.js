// Shorts scenes: full-frame vertical shots (1080×1920) built from the Episode 1 kit (toon.js + ww2kit.js).
// Each shot is a <g id="sh-NAME"> that covers the whole frame; ids inside mark what the cue sheet animates.
// Characters are framed big: "big" = full figure ~1300 px tall, "close" = chest-up ~1800 px.
// No insignia anywhere, by design. Classic script → globalThis.ShortScenes.
(function (g) {
  const { C, place, sticker } = g.Toon;
  const { CAST, P, K } = g.WW;
  const ink = C.ink;
  const W = 1080, H = 1920;
  const grain = () => `<rect width="${W}" height="${H}" fill="url(#grain)" opacity=".7" pointer-events="none"/>`;
  const defs = () => `<defs><pattern id="grain" width="256" height="256" patternUnits="userSpaceOnUse"><image href="${g.GRAIN_PNG}" width="256" height="256"/></pattern>` +
    `<radialGradient id="vig" cx=".5" cy=".45" r=".8"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></radialGradient></defs>`;
  const vig = () => `<rect width="${W}" height="${H}" fill="url(#vig)" pointer-events="none"/>`;
  // wall + floor with a few perspective lines; optional rays behind the subject for energy
  const room = (wall, floor, fy = 1560) => `<rect width="${W}" height="${H}" fill="${wall}"/>` +
    `<g opacity=".13">${Array.from({ length: 12 }, (_, i) => `<path d="M540 760 L${-600 + i * 200} -200 L${-500 + i * 200} -200Z" fill="#fff"/>`).join("")}</g>` +
    `<rect y="${fy}" width="${W}" height="${H - fy}" fill="${floor}" stroke="${ink}" stroke-width="6"/>` +
    Array.from({ length: 6 }, (_, i) => `<path d="M${i * 216} ${fy} L${i * 216 - 140} ${H}" stroke="${ink}" stroke-width="3" opacity=".2"/>`).join("");
  const desk = (col = "#6b4a2e") => `<rect width="${W}" height="${H}" fill="${col}"/>` +
    Array.from({ length: 14 }, (_, i) => `<path d="M0 ${i * 150 + 40} C300 ${i * 150 + 10} 700 ${i * 150 + 80} 1080 ${i * 150 + 30}" stroke="#000" stroke-width="4" opacity=".12" fill="none"/>`).join("");
  const sky = (top = "#8fc7e6", bot = "#dff1f8") => `<defs><linearGradient id="sky${top.slice(1)}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bot}"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#sky${top.slice(1)})"/>`;
  const cloud = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-110 30 C-130 -10 -80 -40 -50 -20 C-40 -60 30 -66 46 -26 C80 -46 130 -16 112 30Z" fill="#fff" stroke="${ink}" stroke-width="5"/></g>`;
  const big = (svg, id, o = {}) => place(svg, o.x ?? 540, o.y ?? 1990, o.s ?? 4.4, { id, flip: !!o.flip });
  const close = (svg, id, o = {}) => place(svg, o.x ?? 540, o.y ?? 2240, o.s ?? 6.2, { id, flip: !!o.flip });
  const shot = (id, inner) => `<g id="sh-${id}" opacity="0" data-layout-allow-overlap="true"><g id="sh-${id}-d"><g id="sh-${id}-z">${inner}</g></g></g>`;
  const tag = (x, y, text, id, o = {}) => sticker(x, y, text, { size: o.size || 64, rot: o.rot ?? -3, bg: o.bg || ink, id });

  // ---- props ----
  const cup = (x, y, s = 1, id = "") => `<g${id ? ` id="${id}"` : ""} transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="40" rx="70" ry="14" fill="#fff" stroke="${ink}" stroke-width="5"/><path d="M-44 -30 h88 l-10 66 h-68Z" fill="#fff" stroke="${ink}" stroke-width="6"/><path d="M44 -18 q34 6 0 34" stroke="${ink}" stroke-width="7" fill="none"/><ellipse cx="0" cy="-30" rx="44" ry="8" fill="#6b3f22" stroke="${ink}" stroke-width="4"/><path d="M-14 -50 q-10 -20 4 -36 M14 -54 q-10 -20 4 -36" stroke="#fff" stroke-width="5" fill="none" opacity=".8"/></g>`;
  const board = (x, y, s, numId, value = "5,000") => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-380" y="-230" width="760" height="460" rx="18" fill="#2b2f2a" stroke="${ink}" stroke-width="10"/><rect x="-356" y="-206" width="712" height="412" rx="10" fill="none" stroke="#8a7a5a" stroke-width="5"/>` +
    `<text y="-110" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="64" fill="#e9e2cf" letter-spacing="4">KAFFEE</text>` +
    `<text id="${numId}" y="60" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="170" fill="#fffaf0">${value}</text>` +
    `<text y="160" text-anchor="middle" font-family="Fredoka" font-weight="600" font-size="56" fill="#c9c2b0" letter-spacing="3">MARKS</text></g>`;
  const note = (x, y, r, s = 1) => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})"><rect x="-90" y="-44" width="180" height="88" rx="6" fill="#cfe0b8" stroke="${ink}" stroke-width="5"/><rect x="-74" y="-30" width="148" height="60" rx="4" fill="none" stroke="#5f8a4f" stroke-width="3"/><text y="14" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="34" fill="#2f5a2f">1000000</text></g>`;
  const kite = (x, y, r, s, id) => `<g id="${id}" transform="translate(${x} ${y}) rotate(${r}) scale(${s})"><path d="M0 -150 L110 0 L0 150 L-110 0Z" fill="#cfe0b8" stroke="${ink}" stroke-width="6"/><path d="M0 -150 V150 M-110 0 H110" stroke="#5f8a4f" stroke-width="3"/><text y="14" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="40" fill="#2f5a2f">1000000</text><path d="M0 150 C40 280 -40 400 10 560" stroke="${ink}" stroke-width="4" fill="none"/>${[230, 330, 430].map((yy) => `<path d="M-14 ${yy} l14 -10 l14 10 l-14 10Z" fill="${K.red}" stroke="${ink}" stroke-width="3"/>`).join("")}</g>`;
  // the "agricultural tractor": Ep1's tank, plus a straw hat and a hay bale for the disguise
  const tank = (x, y, s, { id = "", sticker: st = true, disguise = true, stickerId = "" } = {}) =>
    `<g${id ? ` id="${id}"` : ""} transform="translate(${x} ${y}) scale(${s})"><rect x="-230" y="-60" width="460" height="110" rx="40" fill="#5b5f52" stroke="${ink}" stroke-width="8"/>${[-170, -85, 0, 85, 170].map((cx) => `<circle cx="${cx}" cy="0" r="34" fill="#3f423a" stroke="${ink}" stroke-width="5"/>`).join("")}` +
    `<rect x="-190" y="-150" width="380" height="100" rx="18" fill="#6f7766" stroke="${ink}" stroke-width="8"/><rect x="-90" y="-230" width="200" height="90" rx="20" fill="#6f7766" stroke="${ink}" stroke-width="8"/><rect x="100" y="-205" width="240" height="30" rx="10" fill="#4f554a" stroke="${ink}" stroke-width="6"/>` +
    (disguise ? `<g transform="translate(10 -236)"><ellipse cx="0" cy="0" rx="110" ry="18" fill="#e8c86a" stroke="${ink}" stroke-width="5"/><path d="M-56 0 C-56 -56 56 -56 56 0Z" fill="#e8c86a" stroke="${ink}" stroke-width="5"/><path d="M-54 -10 H54" stroke="${K.red}" stroke-width="8"/></g><g transform="translate(-150 -168)"><rect x="-44" y="-30" width="88" height="56" rx="8" fill="#e3c25a" stroke="${ink}" stroke-width="5"/><path d="M-30 -18 h60 M-30 0 h60 M-30 14 h60" stroke="#b8963a" stroke-width="4"/></g>` : "") +
    (st ? `<g${stickerId ? ` id="${stickerId}"` : ""}><g transform="translate(0 -100) rotate(-4)"><rect x="-200" y="-36" width="400" height="72" rx="10" fill="#fffaf0" stroke="${ink}" stroke-width="6"/><text y="12" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="34" fill="${ink}">AGRICULTURAL TRACTOR</text></g></g>` : "") + `</g>`;
  const hud = (vals) => vals.map((v, i) => `<g id="hud-${i}" opacity="0"><rect x="40" y="150" width="${v === "NO" ? 380 : 360}" height="96" rx="18" fill="${v === "NO" ? K.red : ink}" stroke="#fffaf0" stroke-width="5"/><text x="70" y="216" font-family="Fredoka" font-weight="700" font-size="50" fill="#fffaf0">LAST ONES: ${v}</text></g>`).join("");

  // ---------- Short 1: LAST ONE, PROMISE ----------
  const s1 = () => {
    const H1 = CAST.hitler, F = (o) => P.form(540, 860, 2.0, o);
    return [
      shot("h1", room("#c9b48e", "#7a5a3c") + `<g id="inr-h1hit">${big(H1({ pose: "point", mouth: "grin", brows: "smug" }), "h1hit")}${P.form(860, 820, 0.9, { place: "?" })}</g>`),
      shot("f1", desk() + `<g id="st-f1form">${F({ place: "Rhineland" })}</g>` + tag(540, 300, "1936 · RHINELAND", "", { size: 60 })),
      shot("h2", room("#b9c4b0", "#6e6a52") + close(H1({ pose: "raise", mouth: "grin", brows: "happy" }), "h2hit")),
      shot("f2", desk("#5e4630") + `<g id="drop-f2form">${F({ wear: 1, place: "Austria" })}</g>` + cup(830, 1330, 1.5, "pop-f2stain") + tag(540, 300, "1938 · AUSTRIA", "", { size: 60 })),
      shot("h3", room("#d6b9a0", "#7a5a3c") + big(H1({ pose: "hips", mouth: "smirk", brows: "smug" }), "h3hit", { s: 4.8, y: 2080 })),
      shot("f3", room("#c9b48e", "#7a5a3c") + big(H1({ pose: "holdUp", mouth: "grin", brows: "happy" }), "f3hit", { y: 2060 }) + P.form(540, 820, 1.7, { wear: 2, place: "Sudetenland" }) +
        `<g id="pop-f3pen" transform="translate(860 1180) rotate(35)"><rect x="-16" y="-130" width="32" height="220" rx="10" fill="#2a6fdb" stroke="${ink}" stroke-width="6"/><path d="M-16 90 L0 140 L16 90Z" fill="#f3e3c3" stroke="${ink}" stroke-width="5"/></g>` + tag(540, 300, "MUNICH · 1938", "", { size: 60 })),
      shot("c1", room("#b8c8d8", "#5f6f80") + big(CAST.chamberlain({ pose: "armsUp", mouth: "grin", brows: "happy" }), "c1cham", { y: 2030 }) + P.stamp(540, 520, 1.7, "APPROVED", "#2f7a3a", { id: "st-c1ok", rot: -8 })),
      shot("c2", room("#b8c8d8", "#5f6f80") + big(CAST.chamberlain({ pose: "shrug", mouth: "open", brows: "worried" }), "c2cham", { y: 2030 }) + tag(540, 420, "1939 · PRAGUE", "st-c2tag", { size: 64, bg: K.red })),
      shot("h4", room("#c9b48e", "#7a5a3c") + big(H1({ pose: "shrug", mouth: "smirk", brows: "smug" }), "h4hit", { s: 4.8, y: 2080 })),
      shot("f4", desk("#4e3a28") + `<g id="drop-f4nap">${P.form(540, 820, 2.6, { wear: 3 })}</g>` + tag(540, 300, "1939 · POLAND", "", { size: 60, bg: K.red })),
      shot("h5", room("#d6b9a0", "#7a5a3c") + close(H1({ pose: "wave", mouth: "grin", brows: "happy" }), "h5hit")),
      shot("end", `<rect width="${W}" height="${H}" fill="#3a1410"/>` + P.stamp(540, 900, 3.4, "WAR", "#e0402e", { id: "st-war", rot: -10 })),
    ].join("") + `<g id="hud">${hud(["0", "1", "2", "3", "4", "NO"])}</g>`;
  };

  // ---------- Short 2: THE COFFEE ----------
  const s2 = () => {
    const cust = (o) => CAST.civilian({ pose: "hold", ...o });
    const cafe = (w = "#e7cfa4") => room(w, "#8f6a46", 1600);
    return [
      shot("k1", cafe() + board(540, 420, 1.15, "k1price") + big(cust({ mouth: "smile", brows: "happy" }), "k1cust", { s: 4.0, y: 1990 }) + cup(540, 1330, 1.3)),
      shot("k2", cafe("#ecd6ae") + close(cust({ mouth: "open", brows: "happy" }), "k2cust")),
      shot("k3", cafe("#e2c79a") + `<g id="pop-k3board">${board(540, 330, 0.75, "k3price")}</g>` + close(CAST.waiter({ pose: "hips", mouth: "smirk", brows: "smug" }), "k3wait", { flip: true, y: 2330 })),
      shot("k4", cafe() + board(540, 640, 1.3, "k4price") + big(CAST.waiter({ pose: "hips", mouth: "grin", brows: "smug" }), "k4wait", { s: 3.4, y: 2100, x: 800, flip: true })),
      shot("k5", cafe("#ecd6ae") + close(cust({ mouth: "shout", brows: "surprised" }), "k5cust") + cup(820, 1500, 1.6)),
      shot("k6", cafe("#e2c79a") + board(540, 640, 1.3, "k6price", "8,000") + big(CAST.waiter({ pose: "point", mouth: "grin", brows: "happy" }), "k6wait", { s: 3.4, y: 2100, x: 300 })),
      shot("w1", sky() + cloud(220, 260, 1) + cloud(860, 420, 0.8) + `<path d="M0 1500 Q540 1460 1080 1500 V1920 H0Z" fill="#b9ad98" stroke="${ink}" stroke-width="6"/>` +
        `<g id="inr-w1bar">${big(CAST.civilian({ pose: "reach", mouth: "frown", brows: "worried" }), "w1man", { x: 300, s: 3.6, y: 1820 })}<g transform="translate(700 1560)"><path d="M-260 -40 L220 -40 L160 140 L-200 140Z" fill="#8a5a32" stroke="${ink}" stroke-width="8"/><circle cx="200" cy="200" r="70" fill="#3f423a" stroke="${ink}" stroke-width="8"/><path d="M-260 -40 L-420 60" stroke="${ink}" stroke-width="14"/></g>` +
        `<g id="pop-w1cash">${[[600, 1440, -8], [760, 1450, 6], [680, 1370, 3], [540, 1380, -4], [840, 1390, -10], [700, 1300, 12], [620, 1230, -6]].map(([x, y, r]) => note(x, y, r, 1.3)).join("")}</g></g>` + tag(540, 330, "BERLIN · 1923", "", { size: 60 })),
      shot("w2", sky("#9fd0ea", "#e8f6fb") + cloud(260, 1500, 1.2) + `<path d="M0 1640 Q540 1600 1080 1640 V1920 H0Z" fill="${C.grass}" stroke="${ink}" stroke-width="6"/>` +
        kite(300, 480, -12, 1.25, "pop-w2k1") + kite(780, 380, 10, 1.4, "pop-w2k2") + kite(560, 860, -4, 1.1, "pop-w2k3") +
        big(CAST.kid({ pose: "armsUp", mouth: "grin", brows: "happy" }), "w2kid", { s: 3.0, y: 1880, x: 330 }) + big(CAST.kid({ pose: "raise", mouth: "smile", brows: "happy", hairCol: "#2a1d12" }), "w2kid2", { s: 3.0, y: 1880, x: 780 })),
      shot("w3", `<rect width="${W}" height="${H}" fill="#2b2f2a"/>` + Array.from({ length: 22 }, (_, i) => note(80 + (i * 197) % 1000, 120 + i * 82, (i * 37) % 50 - 25, 1.2)).join("") + `<rect width="${W}" height="${H}" fill="#2b2f2a" opacity=".55"/>` +
        `<g id="st-w3dollar" transform="translate(540 900) rotate(-4)"><rect x="-480" y="-330" width="960" height="660" rx="26" fill="${K.red}" stroke="${ink}" stroke-width="10"/><text y="-150" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="140" fill="#fffaf0">$1 =</text><text y="40" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="104" fill="#fffaf0">4,200,000,</text><text y="160" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="104" fill="#fffaf0">000,000</text><text y="280" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="84" fill="#ffd23f">MARKS</text></g>`),
      shot("k7", cafe("#ecd6ae") + close(cust({ mouth: "shout", brows: "furious" }), "k7cust", { s: 6.6, y: 2380 }) + cup(830, 1560, 1.7)),
    ].join("");
  };

  // ---------- Short 3: THE TRACTOR ----------
  const s3 = () => {
    const shed = (w = "#bfb7a8") => room(w, "#7a7468", 1600) + [180, 900].map((x) => `<path d="M${x - 160} 0 L${x - 100} 100 H${x + 100} L${x + 160} 0" fill="#e8e4d8" stroke="${ink}" stroke-width="5"/>`).join("");
    const klaus = (o) => CAST.klaus({ pose: "hold", prop: P.clipboard(100, 222, 0.9), ...o });
    return [
      shot("t1", shed() + `<g transform="translate(540 560) rotate(-2)"><rect x="-400" y="-400" width="800" height="800" rx="10" fill="#f6efdc" stroke="${ink}" stroke-width="8"/><text y="-300" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="56" fill="${ink}">THE TREATY</text><path d="M-330 -260 H330" stroke="${ink}" stroke-width="4"/>` +
        ["Army: tiny", "Air force: none", "Tanks: NONE"].map((t, i) => `<text x="-320" y="${-160 + i * 110}" font-family="Fredoka" font-weight="600" font-size="58" fill="${i === 2 ? K.red : "#555"}">${t}</text>`).join("") + `</g>` +
        P.stamp(540, 700, 2.0, "BANNED", K.red, { id: "st-t1ban", rot: -12 }) + `<g id="inr-t1trac">${tank(560, 1640, 1.45)}</g>`),
      shot("t2", shed("#c9c0ae") + tank(470, 1250, 1.85)),
      shot("t3", shed() + big(klaus({ brows: "worried", mouth: "flat" }), "t3klaus") + tag(540, 380, "KLAUS · SUPPLIES", "st-t3tag", { size: 64 })),
      shot("t4", shed("#c9c0ae") + close(klaus({ brows: "worried", mouth: "open" }), "t4klaus")),
      shot("t5", shed("#b5ad9c") + big(CAST.officerDE({ pose: "hips", mouth: "smirk" }), "t5off", { s: 4.6, y: 2040, flip: true })),
      shot("t6", shed("#c9c0ae") + close(klaus({ brows: "surprised", mouth: "open" }), "t6klaus")),
      shot("t7", shed("#a89f8e") + close(CAST.officerDE({ pose: "hips", mouth: "smirk", brows: "smug" }), "t7off", { flip: true })),
      shot("end", `<rect width="${W}" height="${H}" fill="#3a3d36"/>` + `<g opacity=".2">${Array.from({ length: 14 }, (_, i) => `<path d="M540 900 L${-700 + i * 180} -300 L${-610 + i * 180} -300Z" fill="#fff"/>`).join("")}</g>` +
        `<g id="st-tank">${tank(470, 1060, 2.0, { disguise: false, stickerId: "fall-sticker" })}</g>`),
    ].join("");
  };

  g.ShortScenes = { defs, grain, vig, s1, s2, s3, W, H };
})(globalThis);
