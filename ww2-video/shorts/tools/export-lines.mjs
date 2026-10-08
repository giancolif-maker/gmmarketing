// Writes build/lines.json + build/meta.json from tools/cues.mjs for the TTS step.
import { writeFileSync, mkdirSync } from "node:fs";
import { FRAMES, VOICES, META } from "./cues.mjs";
const out = [];
for (const f of Object.keys(FRAMES).sort()) FRAMES[f].forEach((l, i) => {
  const [voice, speed, lang = "en-us"] = VOICES[l.who];
  out.push({ frame: f, idx: i, who: l.who, text: l.text, voice, speed, lang });
});
mkdirSync(new URL("../build/", import.meta.url), { recursive: true });
writeFileSync(new URL("../build/lines.json", import.meta.url), JSON.stringify(out, null, 1));
writeFileSync(new URL("../build/meta.json", import.meta.url), JSON.stringify(META || {}, null, 1));
console.log(out.length, "lines");
