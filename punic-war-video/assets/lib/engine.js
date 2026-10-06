// Cue-driven animation engine. Inlined into every frame composition by
// tools/build-frames.mjs as: buildFrame(gsap, document, P, CUE) → paused timeline.
// CUE = { D, lines:[{s,e,el,b,keep}], reveals:[{id,t,hideAt?}], counts:{id:[from,to]}, frame }
// Deterministic: no clocks, no randomness; every loop has a finite repeat count.
function buildFrame(gsap, document, P, CUE) {
  const tl = gsap.timeline({ paused: true });
  const D = CUE.D;
  const $ = (id) => document.getElementById(P + id);
  const cam = document.getElementById(P + "cam");
  const all = (sel) => Array.from(cam.querySelectorAll(sel));
  const base = (el) => ({ x: gsap.getProperty(el, "x"), y: gsap.getProperty(el, "y"), sx: gsap.getProperty(el, "scaleX"), sy: gsap.getProperty(el, "scaleY"), r: gsap.getProperty(el, "rotation") });
  const reps = (period, until) => Math.max(0, Math.floor(until / period) - 1);
  // Set each element's transform origin ONCE, in its natural state, before any tween reads or
  // changes it (GSAP's smoothOrigin otherwise bakes a position offset in mid-animation).
  const origins = new Map();
  const org = (el, o) => { if (el && !origins.has(el)) { origins.set(el, o); gsap.set(el, { transformOrigin: o }); } };
  gsap.set(cam, { svgOrigin: "960 540" });

  // ---------- reveal styles ----------
  const pop = (el, t, d = 0.34) => { const b = base(el); tl.fromTo(el, { opacity: 0, scaleX: b.sx * 0.15, scaleY: b.sy * 0.15 }, { opacity: 1, scaleX: b.sx, scaleY: b.sy, duration: d, ease: "back.out(2.2)" }, t); };
  const slam = (el, t) => { const b = base(el); tl.fromTo(el, { opacity: 0, scaleX: b.sx * 2.4, scaleY: b.sy * 2.4, rotation: b.r - 8 }, { opacity: 1, scaleX: b.sx, scaleY: b.sy, rotation: b.r, duration: 0.28, ease: "power3.in" }, t); tl.to(cam, { x: 10, y: -6, duration: 0.05, yoyo: true, repeat: 3, ease: "none" }, t + 0.28); };
  const rise = (el, t, dy = 40, d = 0.5) => { const b = base(el); tl.fromTo(el, { opacity: 0, y: b.y + dy }, { opacity: 1, y: b.y, duration: d, ease: "power3.out" }, t); };
  const slideX = (el, t, dx, d = 0.7, ease = "power3.out") => { const b = base(el); tl.fromTo(el, { opacity: 1, x: b.x + dx }, { x: b.x, duration: d, ease }, t); };
  const slideY = (el, t, dy, d = 0.7, ease = "power3.out") => { const b = base(el); tl.fromTo(el, { opacity: 1, y: b.y + dy }, { y: b.y, duration: d, ease }, t); };
  const fade = (el, t, d = 0.4) => tl.fromTo(el, { opacity: 0 }, { opacity: 1, duration: d, ease: "power1.out" }, t);
  const hide = (el, t, d = 0.22) => tl.to(el, { opacity: 0, duration: d, ease: "power1.in" }, t);
  const draw = (el, t, d = 1.4) => {
    const paths = el.tagName === "path" ? [el] : Array.from(el.querySelectorAll("path"));
    tl.set(el, { opacity: 1 }, 0);
    paths.forEach((p) => { const L = p.getTotalLength(); const dash = p.getAttribute("stroke-dasharray"); if (dash) { tl.fromTo(p, { opacity: 0 }, { opacity: 1, duration: 0.3 }, t); return; } tl.fromTo(p, { strokeDasharray: L, strokeDashoffset: L }, { strokeDashoffset: 0, duration: d, ease: "power2.inOut" }, t); });
  };
  const counted = new Set();
  const fmt = (v, tpl) => (tpl.startsWith("~") ? "~" : "") + Math.round(v).toLocaleString("en-US");
  const count = (el, t, from, to, d = 1.6) => {
    const txt = el.querySelectorAll("text")[1] || el.querySelector("text"); const tpl = txt.textContent; const o = { v: from };
    if (!counted.has(txt)) { counted.add(txt); txt.textContent = fmt(from, tpl); }
    tl.to(o, { v: to, duration: d, ease: "power2.out", onUpdate: () => { txt.textContent = fmt(o.v, tpl); } }, t);
  };

  const CUSTOM = {
    title: (el, t) => { tl.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.12 }, t); Array.from(cam.children).forEach((c) => { if (c !== el && c.tagName !== "defs") tl.to(c, { opacity: 0, duration: 0.01 }, t + 0.12); }); const kids = el.querySelectorAll("text, g"); tl.from(kids, { opacity: 0, y: 40, duration: 0.4, stagger: 0.12, ease: "back.out(2)" }, t + 0.1); },
    storm: (el, t) => { fade(el, t, 0.3); tl.fromTo(el.querySelectorAll(".rain"), { y: -60 }, { y: 60, duration: 0.5, repeat: 8, ease: "none" }, t); const bolt = el.querySelector("[id$='bolt']"); if (bolt) tl.fromTo(bolt, { opacity: 0 }, { opacity: 1, duration: 0.06, yoyo: true, repeat: 5 }, t + 0.4); },
    hand: (el, t) => slideY(el, t, -700, 0.6, "power2.out"),
    islands: (el, t) => { const b = base(el); tl.fromTo(el, { y: b.y + 60, opacity: 1 }, { y: b.y, duration: 0.6, ease: "back.out(2)" }, t + 0.55); },
    invoice: (el, t) => { const b = base(el); tl.fromTo(el, { opacity: 1, y: b.y + 500, rotation: b.r + 20 }, { y: b.y, rotation: b.r, duration: 0.6, ease: "back.out(1.6)" }, t + 0.8); },
    split: (el, t) => slideX(el, t, -1920, 0.45),
    "split-r": (el, t) => fade(el, t, 0.15),
    coins: (el, t) => { tl.set(el, { opacity: 1 }, 0); Array.from(el.children).forEach((c, i) => { const b = base(c); tl.fromTo(c, { opacity: 0, y: b.y + 40 }, { opacity: 1, y: b.y - 6, duration: 0.4, ease: "back.out(3)" }, t + 0.8 + i * 0.18); }); },
    river: (el, t) => { fade(el, t, 0.12); tl.fromTo(el.querySelectorAll(".bubble"), { y: 40, opacity: 0 }, { y: -60, opacity: 1, duration: 1.2, stagger: 0.3, repeat: 1 }, t + 0.6); },
    deserters: (el, t) => { tl.set(el, { opacity: 1 }, t); tl.fromTo(el, { x: 260 }, { x: -120, duration: 5.5, ease: "none" }, t); },
    raft: (el, t) => { const b = base(el); tl.fromTo(el, { opacity: 1, x: b.x - 80 }, { x: b.x + 120, duration: D - t, ease: "none" }, t); },
    snorkel: (el, t) => slideY(el, t, 260, 1.0, "power2.out"),
    tumbleweed: (el, t) => { const b = base(el); tl.fromTo(el, { opacity: 1, x: b.x + 500, rotation: 0 }, { x: b.x - 200, rotation: -540, duration: 3.5, ease: "none" }, t); },
    mule: (el, t) => { const b = base(el); tl.fromTo(el, { opacity: 1, y: b.y - 160, rotation: 0 }, { y: b.y + 260, rotation: 160, opacity: 0, duration: 1.6, ease: "power2.in" }, t + 2.0); },
    rocks: (el, t) => { tl.set(el, { opacity: 1 }, 0); Array.from(el.children).forEach((c, i) => { const b = base(c); tl.fromTo(c, { opacity: 1, y: b.y - 700, rotation: 0 }, { y: b.y, rotation: 40, duration: 0.9, ease: "bounce.out" }, t + 1.2 + i * 0.5); }); },
    fires: (el, t) => { tl.set(el, { opacity: 1 }, 0); Array.from(el.children).forEach((c, i) => pop(c, t + i * 0.25)); },
    calendar: (el, t) => { rise(el, t); const n = $("cal-n"); if (n) { const o = { v: 1 }; n.textContent = "1"; tl.to(o, { v: 8, duration: 2.4, ease: "none", onUpdate: () => { n.textContent = String(Math.round(o.v)); } }, t + 0.3); } },
    letter: (el, t) => { const b = base(el); tl.fromTo(el, { opacity: 1, x: b.x + 900, rotation: b.r + 25 }, { x: b.x, rotation: b.r, duration: 0.7, ease: "back.out(1.4)" }, t + 2.4); },
    lift: (el, t) => slideY(el, t, 420, 0.9, "back.out(1.4)"),
    numidians: (el, t) => slideX(el, t, 900, 1.2, "power2.out"),
    publius: (el, t) => slideX(el, t, -600, 0.6, "power3.out"),
    ship: (el, t) => slideX(el, t, -800, 1.4, "power2.out"),
    senate: (el, t) => fade(el, t, 0.05),
    dagger: (el, t) => { fade(el, t + 0.8, 0.08); const h = $("hasdrubal"); if (h) { const b = base(h); tl.to(h, { rotation: b.r + 85, duration: 0.45, ease: "power2.in" }, t + 0.9); } },
    smoke: (el, t) => { fade(el, t, 0.8); tl.to(el, { y: "-=60", duration: D - t, ease: "none" }, t); },
    saguntine: (el, t) => { fade(el, t, 0.2); const h = $("saguntine-happy"); if (h) hide(h, t, 0.2); },
    endcard: (el, t) => slideY(el, t, 260, 0.6, "back.out(1.6)"),
    "el-counter": (el, t) => pop(el, t + 0.6),
    "sicily-ring": (el, t) => { pop(el, t); },
    board: (el, t) => slideY(el, t, -500, 0.6, "back.out(1.3)"),
    "box-5": (el, t) => slam(el, t),
    lift2: () => {},
  };
  const DRAW = new Set(["route", "ebro", "sea-plans", "strings", "tape"]);

  // origin pre-pass
  for (const r of CUE.reveals) { const el = $(r.id); if (!el) continue; org(el, r.id.startsWith("st-") || r.id === "score" || r.id === "box-5" || r.id.startsWith("cnt-") || r.id === "el-counter" ? "50% 50%" : "50% 100%"); }
  for (const l of CUE.lines) if (l.el) org($(l.el), "50% 100%");
  for (let i = 0; i < 5; i++) org($("box-" + i), "50% 50%");
  ["glow", "sicily-ring", "helmet"].forEach((id) => org($(id), "50% 50%"));
  ["flame", "hasdrubal"].forEach((id) => org($(id), "50% 100%"));
  all(".campfire").forEach((f) => org(f, "50% 100%"));
  const sp = $("sparkles"); if (sp) Array.from(sp.children).forEach((c) => org(c, "50% 50%"));
  const rk = $("rocks"); if (rk) Array.from(rk.children).forEach((c) => org(c, "50% 50%"));
  const co = $("coins"); if (co) Array.from(co.children).forEach((c) => org(c, "50% 100%"));
  const fi = $("fires"); if (fi) Array.from(fi.children).forEach((c) => org(c, "50% 100%"));

  const moveBase = new Map();
  for (const m of CUE.moves || []) { const el = $(m.id); if (el && !moveBase.has(el)) { org(el, "50% 50%"); moveBase.set(el, base(el)); } }

  // ---------- 1. reveals ----------
  const revealed = new Set();
  for (const r of CUE.reveals) {
    const el = $(r.id); if (!el || revealed.has(r.id)) continue; revealed.add(r.id);
    if (CUSTOM[r.id]) CUSTOM[r.id](el, r.t);
    else if (DRAW.has(r.id)) draw(el, r.t);
    else if (r.id.startsWith("st-") || r.id === "score") slam(el, r.t);
    else if (/^(b-|b\d|a-|offscreen|flaccus-pip|surus-label|ptr|aah)/.test(r.id)) pop(el, r.t);
    else if (/^(cnt-)/.test(r.id)) { pop(el, r.t); const c = (CUE.counts || {})[r.id]; if (c) count(el, r.t + 0.2, c[0], c[1]); }
    else if (/^r-/.test(r.id)) fade(el, r.t, 0.6);
    else rise(el, r.t);
    if (r.hideAt != null && r.hideAt < D - 0.05) hide(el, r.hideAt);
  }
  // Boxes 0–4 on the scoreboard pop one by one during the first line (frame 01)
  for (let i = 0; i < 5; i++) { const b = $("box-" + i); if (b && CUE.lines[0]) pop(b, CUE.lines[0].s + 1.0 + i * 0.75); }

  // ---------- 1b. scripted moves (relative to the element's natural pose) and counter changes ----------
  for (const m of CUE.moves || []) {
    const el = $(m.id); if (!el) continue; const b = moveBase.get(el); const v = { duration: m.d, ease: m.ease || "power2.inOut" };
    if (m.dx != null) v.x = b.x + m.dx; if (m.dy != null) v.y = b.y + m.dy; if (m.dr != null) v.rotation = b.r + m.dr;
    if (m.ds != null) { v.scaleX = b.sx * m.ds; v.scaleY = b.sy * m.ds; } if (m.o != null) v.opacity = m.o;
    tl.to(el, v, m.t);
  }
  for (const c of CUE.counters || []) { const el = $(c.id); if (el) count(el, c.t, c.from, c.to, c.d || 1.4); }

  // ---------- 2. talking: the speaker squashes gently while their line plays ----------
  for (const l of CUE.lines) {
    const el = l.el && $(l.el); if (!el) continue;
    const b = base(el), period = 0.2, n = Math.max(1, Math.floor((l.e - l.s) / period));
    tl.to(el, { scaleY: b.sy * 1.035, scaleX: b.sx * 0.985, duration: period / 2, yoyo: true, repeat: n * 2 - 1, ease: "sine.inOut" }, l.s);
  }

  // ---------- 3. ambience ----------
  all(".cloud").forEach((c, i) => tl.to(c, { x: `+=${60 + i * 25}`, duration: D, ease: "none" }, 0));
  all(".wave").forEach((w, i) => tl.fromTo(w, { x: 0 }, { x: i % 2 ? 60 : -60, duration: 1.6, yoyo: true, repeat: reps(1.6, D), ease: "sine.inOut" }, 0));
  all(".flake").forEach((f, i) => tl.fromTo(f, { y: -40 - (i % 5) * 20 }, { y: 140 + (i % 7) * 30, x: (i % 2 ? 30 : -30), duration: D, ease: "none" }, 0));
  all(".campfire").forEach((f, i) => tl.to(f, { scale: 1.12, duration: 0.3 + (i % 3) * 0.07, yoyo: true, repeat: reps(0.3, D), ease: "sine.inOut" }, 0));
  const glow = $("glow"); if (glow) tl.to(glow, { scale: 1.08, opacity: 0.8, duration: 0.8, yoyo: true, repeat: reps(0.8, D), ease: "sine.inOut" }, 0);
  const flame = $("flame"); if (flame) tl.to(flame, { scaleY: 1.12, duration: 0.25, yoyo: true, repeat: reps(0.25, D), ease: "sine.inOut" }, 0);
  const sparkles = $("sparkles"); if (sparkles) Array.from(sparkles.children).forEach((s, i) => tl.to(s, { scale: 0.4, rotation: 90, duration: 0.5, yoyo: true, repeat: reps(0.5, D), ease: "sine.inOut" }, i * 0.2));
  const helmet = $("helmet"); if (helmet) tl.to(helmet, { y: "+=14", rotation: 6, duration: 0.9, yoyo: true, repeat: reps(0.9, D), ease: "sine.inOut" }, 0);
  const ring = $("sicily-ring"); if (ring) tl.to(ring, { rotation: 360, duration: D, ease: "none" }, 0);
  const army = $("army") || $("column"); if (army) tl.to(army, { x: "+=40", duration: D, ease: "none" }, 0);
  // slow camera push on everything
  tl.fromTo(cam, { scale: 1 }, { scale: 1.035, duration: D, ease: "none" }, 0);
  return tl;
}
