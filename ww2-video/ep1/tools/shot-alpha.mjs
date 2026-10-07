import { chromium } from "playwright";
const [,, inp, out] = process.argv;
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.goto("file://" + new URL(inp, "file://" + process.cwd() + "/").pathname);
await p.evaluate(() => document.fonts.ready);
await p.screenshot({ path: out, omitBackground: true });
await b.close();
