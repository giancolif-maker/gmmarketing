// Shorts animation engine (vertical cousin of ep1's engine.js). Inlined by tools/build-shorts.mjs:
//   buildShort(gsap, document, CUE) → paused timeline.
// CUE = { D, shots:[{id,t,end}], reveals:[{id,t}], cams:[{t,s,px,py,d}], counts:[{id,t,from,to,d}],
//         talk:[{id,s,e}], hud:[{t,i}], caps:[{s,h}], endT }
// Deterministic: no clocks, no randomness; every loop has a finite repeat count.
function buildShort(gsap, document, CUE) {
  const tl = gsap.timeline({ paused: true });
  const D = CUE.D, CX = 540, CY = 960;
  const $ = (id) => document.getElementById(id);
  const base = (el) => ({ x: gsap.getProperty(el, "x"), y: gsap.getProperty(el, "y"), sx: gsap.getProperty(el, "scaleX"), sy: gsap.getProperty(el, "scaleY"), r: gsap.getProperty(el, "rotation") });
  const shotAt = (t) => { let s = CUE.shots[0]; for (const x of CUE.shots) if (x.t <= t + 1e-6) s = x; return s; };

  // ---- 1. shots: hard cuts, each with a slow push-in and a small landing bump so nothing sits still ----
  for (const s of CUE.shots) {
    const el = $("sh-" + s.id), d = $("sh-" + s.id + "-d"), z = $("sh-" + s.id + "-z");
    if (!el) continue;
    gsap.set([d, z], { svgOrigin: CX + " " + CY });
    tl.set(el, { opacity: 1 }, s.t);
    tl.set(el, { opacity: 0 }, s.end);
    tl.fromTo(d, { scale: 1.05 }, { scale: 1.0, duration: 0.22, ease: "power2.out", immediateRender: false }, s.t);
    tl.to(d, { scale: 1.07, duration: Math.max(0.3, s.end - s.t - 0.22), ease: "none" }, s.t + 0.22);
  }
  // ---- 2. punch-ins on the shot that is live at that moment (zoom toward px,py) ----
  for (const c of CUE.cams) {
    const z = $("sh-" + shotAt(c.t).id + "-z"); if (!z) continue;
    tl.to(z, { scale: c.s, x: (CX - c.px) * (c.s - 1), y: (CY - c.py) * (c.s - 1), duration: c.d, ease: c.d < 0.15 ? "none" : "power3.out" }, c.t);
  }
  // ---- 3. reveals ----
  for (const r of CUE.reveals) {
    const el = $(r.id); if (!el) continue;
    const b = base(el);
    tl.set(el, { opacity: 0 }, 0);
    if (r.id.startsWith("st-")) {
      gsap.set(el, { transformOrigin: "50% 50%" });
      tl.fromTo(el, { opacity: 0, scaleX: b.sx * 2.4, scaleY: b.sy * 2.4, rotation: b.r - 8 }, { opacity: 1, scaleX: b.sx, scaleY: b.sy, rotation: b.r, duration: 0.24, ease: "power3.in", immediateRender: false }, r.t);
      const z = $("sh-" + shotAt(r.t).id + "-d");
      tl.to(z, { x: 14, y: -10, duration: 0.05, yoyo: true, repeat: 3, ease: "none" }, r.t + 0.24);
    } else if (r.id.startsWith("pop-")) {
      gsap.set(el, { transformOrigin: "50% 50%" });
      tl.fromTo(el, { opacity: 0, scaleX: b.sx * 0.15, scaleY: b.sy * 0.15 }, { opacity: 1, scaleX: b.sx, scaleY: b.sy, duration: 0.32, ease: "back.out(2.2)", immediateRender: false }, r.t);
    } else if (r.id.startsWith("drop-")) {
      tl.set(el, { opacity: 1 }, r.t);
      tl.fromTo(el, { y: b.y - 1500 }, { y: b.y, duration: 0.5, ease: "bounce.out", immediateRender: false }, r.t);
    } else if (r.id.startsWith("inr-") || r.id.startsWith("inl-")) {
      tl.set(el, { opacity: 1 }, r.t);
      tl.fromTo(el, { x: b.x + (r.id.startsWith("inr-") ? 1200 : -1200) }, { x: b.x, duration: 0.38, ease: "power3.out", immediateRender: false }, r.t);
    } else if (r.id.startsWith("fall-")) {
      tl.set(el, { opacity: 1 }, 0);
      gsap.set(el, { transformOrigin: "100% 0%" });
      tl.to(el, { rotation: 28, duration: 0.25, ease: "power2.in" }, r.t);
      tl.to(el, { y: 900, rotation: 70, duration: 0.6, ease: "power2.in" }, r.t + 0.25);
    } else tl.to(el, { opacity: 1, duration: 0.2 }, r.t);
  }
  // ---- 4. number boards ----
  for (const c of CUE.counts) {
    const el = $(c.id); if (!el) continue;
    const o = { v: c.from }, fmt = (v) => Math.round(v).toLocaleString("en-US");
    tl.to(o, { v: c.to, duration: c.d, ease: c.d > 2 ? "power1.in" : "power2.out", onUpdate: () => { el.textContent = fmt(o.v); }, onStart: () => { el.textContent = fmt(o.v); } }, c.t);
    gsap.set(el, { transformOrigin: "50% 50%" });
    tl.fromTo(el, { scale: 1.18 }, { scale: 1, duration: 0.3, ease: "back.out(2)", immediateRender: false }, c.t + c.d);
  }
  // ---- 5. talking: the speaker squashes while their line plays ----
  for (const l of CUE.talk) {
    const el = $(l.id); if (!el) continue;
    const b = base(el), period = 0.2, n = Math.max(1, Math.floor((l.e - l.s) / period));
    gsap.set(el, { transformOrigin: "50% 100%" });
    tl.to(el, { scaleY: b.sy * 1.035, scaleX: b.sx * 0.985, duration: period / 2, yoyo: true, repeat: n * 2 - 1, ease: "sine.inOut" }, l.s);
  }
  // ---- 6. corner counter (one element per value, toggled) ----
  CUE.hud.forEach((h, k) => {
    const el = $("hud-" + h.i); if (!el) return;
    const next = CUE.hud[k + 1];
    gsap.set(el, { transformOrigin: "0% 50%" });
    tl.fromTo(el, { opacity: 0, scale: 1.5 }, { opacity: 1, scale: 1, duration: 0.25, ease: "back.out(2.5)", immediateRender: false }, h.t);
    tl.set(el, { opacity: 0 }, next ? next.t : CUE.endT);
  });
  // ---- 7. captions: pop on with the voice, off at the next card ----
  CUE.caps.forEach((c, i) => {
    const el = $("cap-" + i); if (!el) return;
    gsap.set(el, { transformOrigin: "50% 50%" });
    const b = base(el);
    tl.fromTo(el, { opacity: 1, scaleX: 0.82, scaleY: 0.82, y: b.y + 18 }, { scaleX: 1, scaleY: 1, y: b.y, duration: 0.14, ease: "back.out(2.5)", immediateRender: false }, Math.max(0, c.s - 0.04));
    tl.set(el, { opacity: 1 }, Math.max(0, c.s - 0.04));
    tl.set(el, { opacity: 0 }, Math.max(c.s + 0.1, c.h - 0.02));
  });
  // ---- 8. last 1.5 s: the full-episode line ----
  const et = $("endtxt");
  if (et) tl.fromTo(et, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.25, ease: "power2.out", immediateRender: false }, CUE.endT);
  tl.set({}, {}, D);
  return tl;
}
