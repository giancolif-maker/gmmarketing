"""Synthesize every line in build/lines.json with Kokoro, then lay each frame's
lines out on a timeline (lead-in, gaps, tail) and write:
  assets/audio/vo/frame-NN.wav   one voice track per frame
  build/timing.json              per-frame duration + per-line start/end (seconds)
Usage: python3 tools/tts.py --model DIR   (DIR holds kokoro-v1.0.onnx + voices-v1.0.bin)
Lines are cached by content hash in build/vo-cache/."""
import json, hashlib, re, sys, os
import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
model = sys.argv[sys.argv.index("--model") + 1]
SR = 24000
LEAD, GAP, SWITCH, TAIL = 0.4, 0.16, 0.24, 0.8

def clean(t):
    t = t.replace("—", ", ").replace("…", "... ").replace('"', "").replace(" BC", " B.C.")
    t = re.sub(r"\b([A-Z]{2,})\b", lambda m: m.group(1) if m.group(1) in ("BC",) else m.group(1).lower(), t)
    return re.sub(r"\s+", " ", t).strip(" ,")

def trim(a, thr=0.004):
    idx = np.where(np.abs(a) > thr)[0]
    if not len(idx): return a
    s, e = max(0, idx[0] - int(0.03 * SR)), min(len(a), idx[-1] + int(0.08 * SR))
    return a[s:e]

lines = json.load(open(os.path.join(ROOT, "build/lines.json")))
cache = os.path.join(ROOT, "build/vo-cache"); os.makedirs(cache, exist_ok=True)
k = None
audio = {}
for l in lines:
    key = hashlib.sha1(f"{l['voice']}|{l['speed']}|{l['lang']}|{clean(l['text'])}".encode()).hexdigest()[:16]
    p = os.path.join(cache, key + ".wav")
    if not os.path.exists(p):
        if k is None: k = Kokoro(os.path.join(model, "kokoro-v1.0.onnx"), os.path.join(model, "voices-v1.0.bin"))
        a, sr = k.create(clean(l["text"]), voice=l["voice"], speed=l["speed"], lang=l["lang"])
        sf.write(p, trim(a), sr)
    audio[(l["frame"], l["idx"])] = sf.read(p)[0]

timing = {}
for f in sorted({l["frame"] for l in lines}):
    fl = [l for l in lines if l["frame"] == f]
    t, segs, prev = LEAD, [], None
    for l in fl:
        if prev is not None: t += SWITCH if prev != l["who"] else GAP
        d = len(audio[(f, l["idx"])]) / SR
        segs.append({"start": round(t, 3), "end": round(t + d, 3), "who": l["who"]})
        t += d; prev = l["who"]
    dur = round(t + TAIL, 3)
    buf = np.zeros(int(dur * SR) + 1, dtype=np.float32)
    for l, s in zip(fl, segs):
        a = audio[(f, l["idx"])].astype(np.float32); i = int(s["start"] * SR); buf[i:i + len(a)] += a
    peak = np.max(np.abs(buf)) or 1
    sf.write(os.path.join(ROOT, f"assets/audio/vo/frame-{f}.wav"), (buf * (0.89 / peak)).astype(np.float32), SR, subtype="PCM_16")
    timing[f] = {"duration": dur, "lines": segs}
json.dump(timing, open(os.path.join(ROOT, "build/timing.json"), "w"), indent=1)
tot = sum(v["duration"] for v in timing.values())
print(f"{len(lines)} lines, {len(timing)} frames, total {tot:.1f}s ({tot/60:.2f} min)")
for f, v in timing.items(): print(f, v["duration"])
