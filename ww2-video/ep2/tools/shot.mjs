// Screenshot an HTML file (or a #frame-NN cell inside it) to PNG: node shot.mjs in.html out.png [selector] [width] [height]
import { chromium } from "playwright";
const [,, inp, out, sel, w = 1920, h = 1080] = process.argv;
const b = await chromium.launch({ executablePath: process.env.PW_CHROME || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const p = await b.newPage({ viewport: { width: +w, height: +h } });
await p.goto("file://" + new URL(inp, "file://" + process.cwd() + "/").pathname);
await p.evaluate(() => document.fonts.ready);
if (sel) await (await p.$(sel)).screenshot({ path: out }); else await p.screenshot({ path: out, fullPage: true });
await b.close();
