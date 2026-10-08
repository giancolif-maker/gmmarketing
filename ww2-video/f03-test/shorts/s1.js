// Short 1 — "Last One, Promise": every land grab gets the same form, until the last one.
const V = () => EU.europe;
const MAPC = { de: "#8c7b66" };
const stampTool = `<g transform="rotate(90)"><rect x="-26" y="-120" width="52" height="90" rx="20" fill="#6a3a24" stroke="${INK}" stroke-width="4"/><rect x="-10" y="-34" width="20" height="30" fill="#3a2a1e" stroke="${INK}" stroke-width="3"/><rect x="-46" y="-6" width="92" height="30" rx="4" fill="#3a2a1e" stroke="${INK}" stroke-width="4"/></g>`;
const crossed = `<path d="M0,0 L-8,-36 M0,0 L10,-34" stroke="${INK}" stroke-width="16" stroke-linecap="round"/><path d="M0,0 L-8,-36 M0,0 L10,-34" stroke="${SKIN}" stroke-width="9" stroke-linecap="round"/>`;
function tally(t, n, x = 540, y = 150) { // running count of "last ones", top of frame
  let g = `<g transform="translate(${x} ${y})"><rect x="-300" y="-58" width="600" height="116" fill="#efe3c6" fill-opacity=".9" stroke="${INK}" stroke-width="5"/>${tx(-60, 18, 46, "“LAST ONES”:", "FellSC", INK, 'text-anchor="middle"')}`;
  g += tx(200, 26, 76, String(n), "Elite", "#8c2a1f", 'text-anchor="middle"');
  return g + "</g>";
}
function hitler(t, x, y, s, P = {}) { return man({ x, y, s, t, hr: wob(t, 4, .6) * 2, lean: wob(t, 6, .5), sq: Math.sin(t * 2.2) * .1, aR: [20, 30], aL: [15, 25], ...talk("HITLER", t, 7), ...P }, HITLER); }
function mapShot(t, u, n, cam, fills, extra = "") { CAM = cam; return layer(1, europe({ ...MAPC, ...fills }, extra)) + roomGrade(.6); }
const C = (code) => merc(...({ de: [10.4, 51], at: [14.2, 47.6], cz: [15.4, 49.8], pl: [19.4, 52.1], rh: [7, 50.5] })[code], V());

function bigStamp(t, t0) {
  if (t < t0) return ""; const p = clamp((t - t0) / .16), sc = lerp(2, 1, E.out(p)), [a, b] = shake(t, t0 + .1, 14);
  return `<g transform="translate(${540 + a} ${880 + b}) rotate(-7) scale(${f1(sc)})" opacity="${f1(p * .95)}"><rect x="-400" y="-170" width="800" height="340" fill="#efe3c6" fill-opacity=".9" stroke="#8c2a1f" stroke-width="14"/><rect x="-380" y="-150" width="760" height="300" fill="none" stroke="#8c2a1f" stroke-width="4"/>${tx(0, 50, 220, "WAR", "FellSC", "#8c2a1f", 'text-anchor="middle" letter-spacing="14"')}${tx(0, 124, 46, "1 SEPTEMBER 1939", "Elite", "#8c2a1f", 'text-anchor="middle"')}</g>`;
}
runShort(() => {
  const L = TIMING.lines, D = TIMING.duration;
  const deskScene = (t, cam, who, grade = .8) => { CAM = cam; return office(t) + layer(1, who + desk(820, 1000, 900)) + layer(1, `<circle cx="1180" cy="760" r="260" fill="url(#warmGlow)" opacity=".55" style="mix-blend-mode:screen"/>`) + roomGrade(grade); };
  return [
    { a: 0, b: L[1].s, draw: (t, u, n) => { // cold open: the form slams onto the desk
      const p = K(u, [[0, 0], [.32, 1, "in"]]), sq = u > .32 && u < .55 ? Math.sin((u - .32) * 14) * (1 - (u - .32) / .23) : 0;
      const [a, b] = shake(t, .32, 12);
      const f = form(820, lerp(-300, 1150, p), lerp(-30, -4, p), .95 * (1 + sq * .06), 1);
      return { w: deskScene(t, [840 + a, 900 + b, 1.25, 0], hitler(t, 820, 1050, 1.5, { lean: 10, aR: [70, 20], look: [.5, .6], brow: .4 })) + layer(1, f), hud: tally(t, 0) };
    } },
    { a: L[1].s, b: L[2].s, draw: (t, u, n) => { const [x, y] = C("rh");
      return { w: mapShot(t, u, n, K(u, [[0, [x + 60, y, 2.2, 0]], [n, [x + 40, y, 2.5, 0], "lin"]]), {}, rhineland(clamp((u - .4) / .6))), hud: tally(t, u > .5 ? 1 : 0) + stamp(t, L[1].s + .3, 540, 1250, -4, "1936", "RHINELAND", 560) }; } },
    { a: L[2].s, b: L[3].s, draw: (t, u, n) => ({ w: deskScene(t, K(u, [[0, [860, 800, 2.3, 0]], [n, [860, 790, 2.45, 0], "lin"]]), hitler(t, 820, 1150, 1.5, { aR: [-20, 150], lid: 0, brow: .9, browK: -.5, curve: 4, look: [.3, -.3] })), hud: tally(t, 1) }) },
    { a: L[3].s, b: L[4].s, draw: (t, u, n) => { const [x, y] = C("at");
      return { w: mapShot(t, u, n, K(u, [[0, [x - 40, y - 60, 2.0, 0]], [n, [x - 40, y - 60, 2.25, 0], "lin"]]), {}, rhineland(1) + inkFill("at", "#8c2a1f", (u - .3) / .7, x, y, "iAt")), hud: tally(t, u > .5 ? 2 : 1) + stamp(t, L[3].s + .3, 540, 1250, 3, "1938", "AUSTRIA", 560) }; } },
    { a: L[4].s, b: L[5].s, draw: (t, u, n) => { // the promise again — with crossed fingers behind his back
      const cam = K(u, [[0, [860, 800, 2.3, 0]], [.7, [860, 800, 2.3, 0]], [1.0, [720, 930, 1.9, -4], "io"], [n, [715, 930, 1.95, -4], "lin"]]);
      return { w: deskScene(t, cam, hitler(t, 820, 1150, 1.5, { aR: [-20, 150], aL: [-35, -25], propL: crossed, lid: 0, brow: .9, browK: -.5, curve: 4, look: [.3, -.3] })), hud: tally(t, 2) }; } },
    { a: L[5].s, b: L[6].s, draw: (t, u, n) => { // writing "last one" in pen
      const w = clamp((u - .5) / (n - .7)), hx = 640 + w * 320, hy = 1180 + Math.sin(w * 40) * 10;
      return { w: deskScene(t, K(u, [[0, [820, 1080, 2.0, 0]], [n, [820, 1100, 2.15, 0], "lin"]]), hitler(t, 820, 1050, 1.5, { lean: 12, look: [.6, .7] })) + layer(1, form(820, 1150, -3, .95, 3, { penW: w }) + `<g transform="translate(${f1(hx)} ${f1(hy)}) rotate(-50)">${pen}</g>` + hand(hx + 10, hy - 6, SKIN, 22)), hud: tally(t, 3) }; } },
    { a: L[6].s, b: L[7].s, draw: (t, u, n) => { // Chamberlain, thrilled; the approval stamp comes down
      const sp = K(u, [[0, 0], [.5, 0], [.68, 1, "in"], [.9, .2, "out"]]), stamped = u > .68 ? 1 : 0;
      const cam = K(u, [[0, [860, 880, 1.9, 0]], [n, [860, 860, 2.0, 0], "lin"]]); const [a, b] = shake(t, L[6].s + .68, 8);
      CAM = [cam[0] + a, cam[1] + b, cam[2], cam[3]];
      const ch = man({ x: 760, y: 1120, s: 1.5, t, ...talk("CHAMBERLAIN", t, 13), hr: wob(t, 2, .8) * 3, lean: -sp * 8, aR: [lerp(150, 70, sp), lerp(-60, 10, sp)], propR: stampTool, aL: [10, 20], propL: umbrella, curve: 6, brow: .5 }, CHAMBERLAIN);
      return { w: office(t) + layer(1, ch + desk(820, 1000, 900) + form(820, 1160, 4, .9, 3, { stamp: stamped ? clamp((u - .68) / .12) : 0, stampTxt: "APPROVED" })) + roomGrade(.75), hud: tally(t, 3) };
    } },
    { a: L[7].s, b: L[8].s, draw: (t, u, n) => { const [x, y] = C("cz"), [ax, ay] = C("at");
      return { w: mapShot(t, u, n, K(u, [[0, [x, y - 40, 2.0, 0]], [n, [x, y - 40, 2.3, 0], "lin"]]), {}, rhineland(1) + inkFill("at", "#8c2a1f", 1, ax, ay, "iAt") + inkFill("cz", "#8c2a1f", (u - .1) / .5, x, y, "iCz")), hud: tally(t, u > .3 ? 4 : 3) + stamp(t, L[7].s + .2, 540, 1250, -3, "1939", "PRAGUE", 560) }; } },
    { a: L[8].s, b: L[9].s, draw: (t, u, n) => { // "That one didn't need a form." — he flicks the form away
      const p = clamp((u - .5) / .7);
      return { w: deskScene(t, K(u, [[0, [880, 820, 2.0, 0]], [n, [880, 800, 2.1, 0], "lin"]]), hitler(t, 820, 1150, 1.5, { aR: [lerp(40, 110, p), lerp(30, -20, p)], aL: [-40, 120], curve: -3, lid: .35, brow: -.2, browK: .8, look: [.8, 0] })) +
        layer(1, form(lerp(900, 1700, E.in(p)), lerp(1100, 700, p), p * 300, .8, 4)), hud: tally(t, 4) }; } },
    { a: L[9].s, b: L[10].s, draw: (t, u, n) => { const [x, y] = C("pl"), [ax, ay] = C("at"), [cx, cy] = C("cz");
      const dp = K(u, [[0, 0], [.6, 0], [.85, 1, "in"]]);
      return { w: mapShot(t, u, n, K(u, [[0, [x - 120, y, 1.9, 0]], [n, [x - 120, y, 2.1, 0], "lin"]]), {}, rhineland(1) + inkFill("at", "#8c2a1f", 1, ax, ay, "iAt") + inkFill("cz", "#8c2a1f", 1, cx, cy, "iCz")) +
        layer(1, form(x - 260, lerp(y - 900, y + 260, dp), lerp(-40, 6, dp), .5, 5, { nap: true })), hud: tally(t, "?") }; } },
    { a: L[10].s, b: L[10].e + .25, draw: (t, u, n) => ({ w: deskScene(t, K(u, [[0, [860, 800, 2.2, 0]], [n, [860, 770, 2.6, 0], "lin"]]), hitler(t, 820, 1150, 1.5, { aR: [-20, 150], curve: 7, lid: .1, brow: .7, browK: -.3, look: [.2, -.2] })), hud: tally(t, "?") }) },
    { a: L[10].e + .25, b: 99, noCap: true, draw: (t, u, n) => { const [x, y] = C("pl"), [ax, ay] = C("at"), [cx, cy] = C("cz"), [gx, gy] = C("de");
      let arrows = ""; [[gx + 60, gy - 40, x - 20, y - 30], [gx + 80, gy + 60, x - 10, y + 60], [cx + 40, cy + 20, x + 10, y + 100]].forEach(([x0, y0, x1, y1], i) => { const p = clamp((u - i * .15) / .6); arrows += `<path d="M${f1(x0)},${f1(y0)} L${f1(lerp(x0, x1, p))},${f1(lerp(y0, y1, p))}" stroke="#8c2a1f" stroke-width="16" stroke-linecap="round"/>`; });
      return { w: mapShot(t, u, n, [x - 100, y, 1.9, 0], {}, rhineland(1) + inkFill("at", "#8c2a1f", 1, ax, ay, "iAt") + inkFill("cz", "#8c2a1f", 1, cx, cy, "iCz") + inkFill("pl", "#5e1c14", (u - .3) / 1.0, x - 100, y, "iPl") + arrows) + `<rect x="0" y="0" width="1080" height="1920" fill="#1a0e08" opacity="${f1(clamp(u / 1.2) * .35)}"/>`,
        hud: bigStamp(t, L[10].e + .5) }; } },
  ];
});
