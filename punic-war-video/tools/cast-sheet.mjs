import { writeFileSync } from "node:fs";
await import("../assets/lib/toon.js");
const { Toon } = globalThis, { CAST, place, placeEl, elephant, C } = Toon;
const names = Object.keys(CAST);
let s = "";
names.forEach((n, i) => { const x = 130 + (i % 8) * 230, y = 360 + Math.floor(i / 8) * 380;
  s += place(CAST[n](), x, y, 0.95) + `<text x="${x}" y="${y + 40}" text-anchor="middle" class="t-map">${n}</text>`; });
s += placeEl(elephant({ rider: "" }), 1500, 1080 - 30, 0.9) + placeEl(elephant({ trunk: "up", brows: "happy", mouth: "smile" }), 1100, 1050, 0.6);
writeFileSync("/tmp/claude-0/-home-user-gmmarketing/b3e6c01a-0209-5212-9578-6cc98b82eb2c/scratchpad/cast.html",
`<!doctype html><style>@font-face{font-family:Fredoka;src:url(/home/user/gmmarketing/punic-war-video/assets/fonts/Fredoka-latin.woff2)}body{margin:0;background:${C.paper}}${Toon.STYLE}</style><svg viewBox="0 0 1920 1200" width="1920" height="1200">${s}</svg>`);
