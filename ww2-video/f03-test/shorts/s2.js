// Short 2 — "The Coffee": 1923 hyperinflation, told in one café order.
const fmt = n => Math.round(n).toLocaleString("de-DE");
function priceBoard(t, steps, t0, dt) { // flip through a list of prices, one every dt seconds from t0
  const k = clamp(Math.floor((t - t0) / dt), 0, steps.length - 1);
  return { v0: fmt(steps[Math.max(0, k - 1)]), v1: fmt(steps[k]), ft: k > 0 ? t0 + k * dt : 999 };
}
function cafeShot(t, cam, B, cust, wait, grade = .85) {
  CAM = cam;
  let w = cafe(t, { board: B });
  let main = thonet(640, 792, 1) + customer({ x: 690, y: 770, look: [.6, 0], t, ...cust }) + cafeFront(t) + saucer(860, 704);
  if (!cust.cup) main += cupSvg(860, 702, 0, .7, t);
  main += waiter({ x: 1250, y: 1015, s: 1.02, t, aB: [-60, -110], ...wait });
  w += layer(1, main) + layer(1, `<path d="M850,252 L990,252 L1300,1080 L540,1080Z" fill="url(#lampCone)" style="mix-blend-mode:screen" opacity=".55"/>`);
  w += layer(1.7, `<g filter="url(#dof)">${thonet(420, 1000, 1.7)}</g>`) + roomGrade(grade);
  return w;
}
const idleC = (t, extra = {}) => ({ hr: wob(t, 1, .7) * 2, lean: wob(t, 2, .5) * 1.2, sq: Math.sin(t * 2) * .1, aR: [40 + wob(t, 3, .4) * 3, 10], aL: [15, 55], ...extra });
const idleW = (t, extra = {}) => ({ hr: wob(t, 5, .6) * 1.5, lean: wob(t, 7, .5) * .8, sq: Math.sin(t * 2.3 + 1) * .12, aF: [12, 30], lid: .45, look: [-.7, 0], ...extra });
const outrage = (t, t0) => K(t, [[t0 - .05, 0], [t0 + .12, 1, "back"], [t0 + 2, 1]]);
const outC = (t, t0, c) => { const g = outrage(t, t0); return idleC(t, { ...c, curve: -4, brow: g, browK: -g * 1.2, look: [.8, -.1], hr: 6 * g, lean: 3 * g, sq: .6 * g, rise: .55 * g, lid: 0,
  aR: [lerp(40, 140, g), lerp(10, -10, g)], aL: [lerp(15, 150, g), lerp(55, 20, g)],
  hat: K(t, [[t0, 0], [t0 + .18, 1, "out"], [t0 + .5, .05, "in"], [t0 + .7, 0, "el"]]), hatR: t > t0 && t < t0 + .7 ? Math.sin((t - t0) * 20) * 12 * (1 - (t - t0) / .7) : 0 }); };

runShort(() => {
  const L = TIMING.lines, s6split = L[6].s + (L[6].e - L[6].s) * .5;
  return [
    { a: 0, b: L[1].s, draw: (t, u, n) => { // cold open: the price climbs while he drinks
      const B = priceBoard(t, [5000, 5800, 6700, 7900, 8800, 9600, 10953], .15, .42);
      const cam = K(u, [[0, [1610, 300, 3.2, 2]], [1.5, [1610, 330, 3.0, 2]], [2.1, [1050, 520, 1.55, 0], "io"], [n, [1000, 540, 1.5, 0], "lin"]]);
      const dr = K(t, [[1.6, 0], [2.0, 1, "back"], [3.1, 1]]);
      return { w: cafeShot(t, cam, B, idleC(t, { ...talk("CUSTOMER", t, 11), cup: dr > 0, cupTilt: -38 * dr, aR: dr > 0 ? [lerp(40, 70, dr), lerp(10, 148, dr)] : [40, 10], hr: -14 * dr, look: [.3, -.2] }), idleW(t, talk("WAITER", t, 29))) };
    } },
    { a: L[1].s, b: L[2].s, draw: (t, u, n) => ({ w: cafeShot(t, K(u, [[0, [745, 600, 2.7, 0]], [n, [742, 585, 2.85, 0], "lin"]]), { v0: "5.000", v1: "5.000", ft: 999 },
      idleC(t, { ...talk("CUSTOMER", t, 11), curve: 4, brow: .3 }), idleW(t, talk("WAITER", t, 29))) }) },
    { a: L[2].s, b: L[3].s, draw: (t, u, n) => ({ w: cafeShot(t, K(u, [[0, [1200, 640, 2.05, -3]], [n, [1205, 630, 2.15, -3], "lin"]]), { v0: "5.000", v1: "5.000", ft: 999 },
      idleC(t), idleW(t, { ...talk("WAITER", t, 29), lid: .55, brow: .2 })) }) },
    { a: L[3].s, b: L[4].s, draw: (t, u, n) => { const ft = L[3].s + .35, [a, b] = shake(t, ft, 6);
      const c = K(u, [[0, [1610, 330, 2.75, 2]], [n, [1610, 320, 2.9, 2], "lin"]]);
      return { w: cafeShot(t, [c[0] + a, c[1] + b, c[2], c[3]], { v0: "5.000", v1: "8.000", ft }, idleC(t), idleW(t, talk("WAITER", t, 29))) }; } },
    { a: L[4].s, b: L[5].s, draw: (t, u, n) => { const [a, b] = shake(t, L[4].s, 10, .4), c = K(u, [[0, [790, 420, 2.7, 6]], [.15, [790, 400, 2.35, 6], "back"], [n, [790, 395, 2.4, 6], "lin"]]);
      return { w: cafeShot(t, [c[0] + a, c[1] + b, c[2], c[3]], { v0: "8.000", v1: "8.000", ft: 999 }, outC(t, L[4].s, talk("CUSTOMER", t, 11)), idleW(t)) }; } },
    { a: L[5].s, b: L[6].s, draw: (t, u, n) => { const g = K(t, [[L[5].s + .2, 0], [L[5].s + .55, 1, "back"], [L[5].e, 1]]);
      const B = priceBoard(t, [8000, 9100, 10200, 10953], L[5].s + .3, .6);
      return { w: cafeShot(t, K(u, [[0, [1380, 600, 1.5, -2]], [n, [1390, 580, 1.62, -2], "lin"]]), B, outC(t, L[4].s, {}),
        idleW(t, { ...talk("WAITER", t, 29), lid: .35, brow: .8 * g, browK: .4 * g, curve: 5 * g, skew: 4 * g, hr: -5 * g, lean: -6 * g, aF: [lerp(12, 60, g), lerp(30, 109, g)], finger: g > .5, fingerAng: Math.sin(t * 7) * 8 * g })) }; } },
    { a: L[6].s, b: s6split, draw: (t, u, n) => { // the Reichsbank's presses
      CAM = K(u, [[0, [1080, 560, 1.75, 0]], [n, [1300, 640, 2.0, -2], "lin"]]);
      let fly = ""; const r = rng(77);
      for (let i = 0; i < 18; i++) { const st = r() * n, p = (u - st) / 1.8; if (p < 0 || p > 1) continue; fly += note(lerp(900 + r() * 400, -200 + r() * 2200, p), lerp(700, 1500, p * p) - Math.sin(p * 3) * 200, 220, 104, p * 400 * (r() - .5), i, "1.000.000", Math.cos(p * 9 + i)); }
      return { w: press(t, u + 1) + layer(1.4, `<g filter="url(#soft)">${fly}</g>`) + roomGrade(.7) };
    } },
    { a: s6split, b: L[7].s, draw: (t, u, n) => { // wages in a wheelbarrow
      CAM = K(u, [[0, [900, 700, 1.75, 0]], [n, [1000, 700, 1.8, 0], "lin"]]);
      const bx = lerp(330, 760, u / n), step = Math.sin(u * 9);
      const barrow = `<g transform="translate(${f1(bx + 520)} ${f1(950 + Math.abs(step) * 3)}) scale(-1 1)"><path d="M-130,-60 L120,-60 L90,30 L-100,30Z" fill="#7a5a3a" stroke="${INK}" stroke-width="5"/>${Array.from({ length: 10 }, (_, i) => note(-100 + (i % 5) * 50, -80 - Math.floor(i / 5) * 30 - (i % 2) * 6, 90, 40, (i * 23 % 17) - 8, i, "")).join("")}<circle cx="-110" cy="50" r="30" fill="#5b4630" stroke="${INK}" stroke-width="5"/><path d="M110,-40 L190,-90" stroke="${INK}" stroke-width="10" stroke-linecap="round"/></g>`;
      const worker = man({ x: bx + 240, y: 820, s: .9, flip: false, lean: 14 + step * 2, aR: [55, 5], aL: [50, 10], t, bl: blink(t, 41) },
        { coat: "#5a4a3c", tie: null, shirt: "#cfc6b0", head: P => S(FACE, SKIN) + FACE_SHADE + EAR(SKIN) + eye("wkE", 32, -72, 7.5, 9, P.bl, [.5, .1], SKIN) + brows(-92, .3, "#3a2f24") + S("M40,-70 C50,-56 54,-46 48,-40 C44,-36 38,-38 36,-42", SKIN, 4) + mouthSvg(32, -16, 18, 0, "closed", -2) + S("M-44,-104 C-36,-134 34,-140 52,-108 L70,-104 L-44,-96Z", "#3a3530", 4),
          legs: `<path d="M-10,30 L${f1(-30 + step * 30)},240 M20,30 L${f1(30 - step * 30)},240" stroke="#3a3530" stroke-width="40" stroke-linecap="round"/>` });
      return { w: exterior(t, false) + layer(1, worker + barrow) + roomGrade(.55) };
    } },
    { a: L[7].s, b: L[8].s, draw: (t, u, n) => { // banknote kites
      CAM = K(u, [[0, [980, 560, 1.75, 0]], [n, [1000, 520, 1.85, 0], "lin"]]);
      const kx = 1060 + wob(t, 2, .8) * 30, ky = 360 + wob(t, 5, .7) * 25;
      let kite = `<path d="M960,800 Q${f1(kx - 160)},${f1(ky + 300)} ${f1(kx)},${f1(ky + 110)}" stroke="${INK}" stroke-width="3" fill="none"/><g transform="translate(${f1(kx)} ${f1(ky)}) rotate(${f1(wob(t, 1, 1.2) * 8)})">`;
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) kite += note((i - 1) * 46 - (j - 1) * 46, (i + j - 2) * 38, 64, 32, 40, i + j * 3, "");
      kite += `<path d="M0,110 q-20,40 10,80 q30,40 -10,90" stroke="${INK}" stroke-width="3" fill="none"/></g>`;
      const kid = `<g transform="translate(900 1060) scale(1.8)"><path d="M-14,0 L-10,-70 M14,0 L10,-70" stroke="${INK}" stroke-width="12" stroke-linecap="round"/><path d="M-24,-60 Q0,-140 24,-60Z" fill="#4b3b33" stroke="${INK}" stroke-width="3"/><circle cx="0" cy="-150" r="20" fill="#c9a07a" stroke="${INK}" stroke-width="3"/><path d="M-18,-160 Q0,-178 20,-160Z" fill="#3a3530" stroke="${INK}" stroke-width="3"/><path d="M10,-110 L46,-140" stroke="${INK}" stroke-width="10" stroke-linecap="round"/></g>`;
      return { w: exterior(t, true) + layer(1, kid + kite) + roomGrade(.75) };
    } },
    { a: L[8].s, b: L[9].s, draw: (t, u, n) => { // a dollar
      CAM = K(u, [[0, [960, 600, 1.8, 0]], [n, [960, 620, 2.0, 0], "lin"]]);
      let blow = ""; const r = rng(4);
      for (let i = 0; i < 40; i++) { const sp = .25 + r() * .3, ph = r(), p = (u * sp + ph) % 1, yy = 300 + r() * 800; blow += note(lerp(-200, 2200, p), yy + Math.sin(p * 12 + i) * 40, 150, 72, p * 720 * (r() > .5 ? 1 : -1), i, "", Math.cos(p * 20 + i)); }
      return { w: exterior(t, true) + layer(1.3, `<g filter="url(#soft)">${blow}</g>`) + roomGrade(.85), hud: stamp(t, L[8].s + .9, 540, 700, -5, "1 DOLLAR =", "4.200.000.000.000 MARK", 900) };
    } },
    { a: L[9].s, b: 99, draw: (t, u, n) => { const [a, b] = shake(t, L[9].s, 10, .4), c = K(u, [[0, [790, 420, 2.7, 6]], [.15, [790, 400, 2.35, 6], "back"], [n, [790, 395, 2.4, 6], "lin"]]);
      return { w: cafeShot(t, [c[0] + a, c[1] + b, c[2], c[3]], { v0: "10.953", v1: "10.953", ft: 999 }, outC(t, L[9].s, talk("CUSTOMER", t, 11)), idleW(t)) }; } },
  ];
});
