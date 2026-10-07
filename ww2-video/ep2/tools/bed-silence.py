"""Pull the music bed out under the straight sections (production rule: serious beats get no music).
Run after synth-audio.py and before build-frames.mjs. Fades over 1.2 s, back in 1.5 s after the section."""
import json, os, numpy as np, soundfile as sf
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# frame → line indices told straight (None = the whole frame)
STRAIGHT = {"04": None, "05": [0], "14": None, "22": None, "23": None}  # Holocaust, Nanjing line, Leningrad, firestorm, Warsaw 1943
T = json.load(open(os.path.join(ROOT, "build/timing.json")))
p = os.path.join(ROOT, "assets/audio/music/bed.wav")
a, sr = sf.read(p)
g = np.ones(len(a)); cur = 0.0; spans = []
for f in sorted(T):
    fr = T[f]
    if f in STRAIGHT:
        idx = STRAIGHT[f]
        s, e = (0.0, fr["duration"]) if idx is None else (fr["lines"][idx[0]]["start"] - 0.6, fr["lines"][idx[-1]]["end"] + (fr["duration"] - fr["lines"][idx[-1]]["end"] if idx[-1] == len(fr["lines"]) - 1 else 0.3))
        spans.append((cur + s, cur + e))
    cur += fr["duration"]
# merge spans that touch (F12 → F13 is separate, but F14/4-5 runs to the frame end)
for s, e in spans:
    i0, i1 = int(max(0, s - 1.2) * sr), int(e * sr)
    ramp = np.linspace(1, 0, int(1.2 * sr))
    seg = g[i0:i0 + len(ramp)]; g[i0:i0 + len(seg)] = np.minimum(seg, ramp[:len(seg)])
    g[i0 + len(ramp):i1] = 0
    up = np.linspace(0, 1, int(1.5 * sr)); seg = g[i1:i1 + len(up)]; g[i1:i1 + len(seg)] = np.minimum(seg, up[:len(seg)])
a = a * (g[:, None] if a.ndim == 2 else g)
sf.write(p, a.astype(np.float32), sr, subtype="PCM_16")
print("bed silenced under", ", ".join(f"{s:.1f}-{e:.1f}s" for s, e in spans))
