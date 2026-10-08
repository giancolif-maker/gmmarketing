// Short 3 — "The Tractor": the treaty banned tanks, so the army ordered "agricultural tractors".
const legsOf = (col) => `<path d="M-22,30 L-30,250 M24,30 L30,250" stroke="${INK}" stroke-width="50" stroke-linecap="round"/><path d="M-22,30 L-30,250 M24,30 L30,250" stroke="${col}" stroke-width="40" stroke-linecap="round"/><path d="M-62,262 q0,-24 34,-24 q30,0 34,24Z M8,262 q0,-24 34,-24 q30,0 34,24Z" fill="#1d1712" stroke="${INK}" stroke-width="4"/>`;
const KL = { ...KLAUS, legs: legsOf("#525947") }, OF = { ...OFFICER, legs: legsOf("#454c40") };
const hen = (x, y, t) => `<g transform="translate(${x} ${y}) rotate(${f1(wob(t, 3, 2) * 4)})"><ellipse cx="0" cy="0" rx="40" ry="30" fill="#f2ead8" stroke="${INK}" stroke-width="4"/><circle cx="34" cy="-30" r="18" fill="#f2ead8" stroke="${INK}" stroke-width="4"/><path d="M30,-50 q6,-12 12,0 q6,-12 10,2" fill="#a83a2a" stroke="${INK}" stroke-width="3"/><path d="M50,-30 l14,4 l-14,4Z" fill="#d9a43a" stroke="${INK}" stroke-width="2.5"/><circle cx="38" cy="-34" r="3" fill="${INK}"/><path d="M-40,-6 q-24,-20 -16,-34 q10,10 18,16" fill="#f2ead8" stroke="${INK}" stroke-width="3.5"/></g>`;
function yard(t, roll = 0, tx0 = 760) {
  return field(t) + layer(1, tractor(tx0, 1400, 1.0, t, roll) + hen(tx0 + 640, 1000, t));
}
runShort(() => {
  const L = TIMING.lines, split0 = 1.25;
  const klaus = (t, P = {}) => man({ x: 250, y: 1250, s: 1.25, t, ...talk("KLAUS", t, 17), hr: wob(t, 3, 1.2) * 3, sq: Math.sin(t * 2.6) * .1, aL: [25, 60], propL: clipboard, aR: [20, 30], ...P }, KL);
  const officer = (t, P = {}) => man({ x: 1560, y: 1250, s: 1.35, t, flip: true, ...talk("OFFICER", t, 23), hr: wob(t, 6, .4), aR: [-20, -40], aL: [-15, -30], ...P }, OF);
  const scene = (t, cam, P1 = {}, P2 = {}) => { CAM = cam; return yard(t) + layer(1, klaus(t, P1) + officer(t, P2)) + roomGrade(.55); };
  return [
    { a: 0, b: split0, draw: (t, u, n) => { // cold open: VERBOTEN slams onto the treaty
      CAM = K(u, [[0, [540, 960, 1.15, 0]], [n, [540, 960, 1.25, 0], "lin"]]);
      let d = `<rect x="-400" y="-400" width="1900" height="2800" fill="#4a3424"/>` + `<g transform="rotate(-3 540 960)">` + S("M140,360 L940,340 L960,1560 L120,1580Z", "#ece2c6", 6);
      d += tx(540, 500, 64, "Treaty of Versailles", "Fraktur", INK, 'text-anchor="middle"') + tx(540, 580, 40, "1919 · Article 171", "Fell", "#5a4630", 'text-anchor="middle"');
      for (let i = 0; i < 9; i++) d += `<path d="M220,${680 + i * 70} L${860 - (i % 3) * 60},${676 + i * 70}" stroke="#b5a888" stroke-width="5"/>`;
      d += tx(540, 1180, 44, "…tanks shall be forbidden in Germany.", "Fell", INK, 'text-anchor="middle" font-style="italic"') + `</g>`;
      return { w: layer(1, d) + roomGrade(.6), hud: stamp(t, .2, 540, 980, -8, "VERBOTEN", "", 640) };
    } },
    { a: split0, b: L[1].s, draw: (t, u, n) => ({ w: (CAM = K(u, [[0, [700, 1150, 1.25, 0]], [n, [760, 1150, 1.3, 0], "lin"]]), yard(t, 1, lerp(-300, 760, E.out(clamp(u / n * 1.2)))) + roomGrade(.5)) }) },
    { a: L[1].s, b: L[2].s, draw: (t, u, n) => { // very big, very thick
      const cam = K(u, [[0, [500, 1120, 2.2, 3]], [1.4, [620, 1150, 2.0, 3], "io"], [1.6, [1250, 1000, 2.2, -3], "io"], [n, [1300, 990, 2.35, -3], "lin"]]);
      const knock = u > .9 && u < 1.3 ? shake(t, L[1].s + .9, 6, .3) : [0, 0];
      CAM = [cam[0] + knock[0], cam[1] + knock[1], cam[2], cam[3]]; return { w: yard(t) + roomGrade(.5) };
    } },
    { a: L[2].s, b: L[3].s, draw: (t, u, n) => { const cam = K(u, [[0, [380, 900, 1.9, 0]], [n, [360, 880, 2.15, 0], "lin"]]);
      return { w: scene(t, cam, { look: [.2, .7], brow: .3, browK: -.4 }), hud: stamp(t, L[2].s + .3, 540, 360, 4, "KLAUS", "SUPPLIES · READS THE REPORTS", 760) }; } },
    { a: L[3].s, b: L[4].s, draw: (t, u, n) => { const g = K(u, [[0, 0], [.35, 1, "back"]]);
      return { w: scene(t, K(u, [[0, [520, 900, 1.45, 0]], [n, [530, 890, 1.52, 0], "lin"]]), { aR: [lerp(20, 100, g), lerp(30, -10, g)], finger: g > .5, fingerAng: 90, brow: 1, browK: -1, look: [.9, -.1] }) }; } },
    { a: L[4].s, b: L[5].s, draw: (t, u, n) => ({ w: scene(t, K(u, [[0, [1520, 880, 2.1, 0]], [n, [1520, 870, 2.2, 0], "lin"]]), {}, { lid: .45 }) }) },
    { a: L[5].s, b: L[6].s, draw: (t, u, n) => ({ w: scene(t, K(u, [[0, [330, 880, 2.3, 2]], [n, [330, 870, 2.4, 2], "lin"]]), { brow: 1.1, browK: -1.2, look: [.9, -.2], lid: 0 }) }) },
    { a: L[6].s, b: L[6].e + .5, draw: (t, u, n) => { const cam = K(u, [[0, [1520, 880, 2.1, 0]], [.25, [1520, 820, 4.2, 0], "out"], [n, [1520, 815, 4.3, 0], "lin"]]);
      return { w: scene(t, cam, {}, { lid: .55, brow: -.2 }) }; } },
    { a: L[6].e + .5, b: 99, noCap: true, draw: (t, u, n) => { CAM = K(u, [[0, [760, 1150, 1.25, 0]], [n, [760, 1150, 1.3, 0], "lin"]]);
      return { w: yard(t) + roomGrade(.6), hud: stamp(t, L[6].e + .7, 540, 760, -5, "“FARM TRACTOR”", "= PANZER I · 1934", 900) }; } },
  ];
});
