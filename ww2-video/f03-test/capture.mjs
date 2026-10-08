// Renders scene.html frame by frame. node capture.mjs --still 1.0,12.5  → build/stills/*.png
//                                     node capture.mjs                  → build/video.mp4 (with mixed audio from mix.sh)
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { spawn } from "node:child_process";
const ROOT = path.dirname(new URL(import.meta.url).pathname), FPS = 30;
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split("?")[0])); fs.readFile(f, (e, d) => { if (e) { r.statusCode = 404; return r.end(); } r.setHeader("content-type", f.endsWith(".html") ? "text/html" : f.endsWith(".png") ? "image/png" : "font/ttf"); r.end(d); }); }).listen(0);
const port = srv.address().port;
const timing = JSON.parse(fs.readFileSync(path.join(ROOT, "build/timing.json"))), mouth = JSON.parse(fs.readFileSync(path.join(ROOT, "build/mouth.json")));
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" }).catch(() => chromium.launch());
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on("pageerror", e => console.error("PAGE", e.message));
await page.goto(`http://127.0.0.1:${port}/scene.html`); await page.evaluate(() => document.fonts.ready);
await page.evaluate(([a, b]) => window.init(a, b), [timing, mouth]);
const si = process.argv.indexOf("--still");
if (si > 0) {
  fs.mkdirSync(path.join(ROOT, "build/stills"), { recursive: true });
  for (const t of process.argv[si + 1].split(",").map(Number)) { await page.evaluate(t => window.renderAt(t), t); await page.screenshot({ path: path.join(ROOT, `build/stills/t${t.toFixed(2)}.png`) }); }
} else {
  const n = Math.round(timing.duration * FPS);
  const ff = spawn("ffmpeg", ["-y", "-v", "error", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", path.join(ROOT, "build/silent.mp4")], { stdio: ["pipe", "inherit", "inherit"] });
  for (let i = 0; i < n; i++) {
    await page.evaluate(t => window.renderAt(t), i / FPS);
    const buf = await page.screenshot({ type: "jpeg", quality: 93 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once("drain", r));
    if (i % 90 === 0) console.log(`frame ${i}/${n}`);
  }
  ff.stdin.end(); await new Promise(r => ff.on("close", r));
}
await browser.close(); srv.close();
