---
workflow: general-video
flow: automation
storyboard: yes
message: "Rome nearly lost everything to one guy with elephants — and won by refusing to quit and copying his homework."
destination: youtube
aspect: 1920x1080
language: en
audience: general audience who enjoys comedic history
length: 16m (full script) · 4m pilot (Act 1) built first
voice: kokoro (local) — deadpan male narrator + distinct character voices
---

## Intent

User's words: "make me a 16min video on the 2nd punic war, like oversimplified
(https://www.youtube.com/@OverSimplified), same style animation."

A comedic animated history episode in the *style* of OverSimplified: flat
cartoon characters, deadpan sarcastic narration, comic captions, map arrows,
running gags. Original art and characters only — nothing traced or copied from
the channel.

Four acts: (1) Origins → Hannibal crosses the Alps; (2) Trebia, Trasimene,
Cannae; (3) Fabius' delay, Hannibal stuck in Italy, Spain; (4) Scipio → Zama.
Full ~16-minute script is written up front; Act 1 (~4 min) is built and
rendered as a pilot; Acts 2–4 are built only after the pilot is approved.

## Customizations

- Real-feeling map scenes for army movements (Alps route, battle positions, Rome vs Carthage territory).
- Music bed + comic SFX stings (boings, swooshes, record-scratch).
- Dialogue-driven script (STYLE_NOTES.md): narrator + recurring cast (Gisgo, Surus, Hanno, Flaccus), one voice each.
- Narration via local Kokoro TTS (Gemini key not reaching the API in this container), word-timed captions.

## Notes

- No HeyGen sign-in in this container: BGM/SFX catalog retrieval unavailable; music will be generated/synthesized and simple unless the user supplies audio.
- Rendered MP4s are not committed to git.
