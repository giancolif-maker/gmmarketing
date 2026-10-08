"""For each Short: copy its existing voice track (ww2-video/shorts) and turn its line timing into
build/<id>/timing.json + mouth.json (per-frame lip openness per speaker) for the renderer."""
import json, os, subprocess, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); SRC = os.path.join(HERE, "../../shorts")
SR, FPS = 24000, 30
T = json.load(open(os.path.join(SRC, "build/timing.json")))
TEXT = json.load(open(os.path.join(SRC, "build/lines.json")))
for sid in ("s1", "s2", "s3"):
    out = os.path.join(HERE, "build", sid); os.makedirs(out, exist_ok=True)
    wav = os.path.join(SRC, f"assets/audio/vo/{sid}.wav")
    raw = subprocess.run(["ffmpeg", "-v", "quiet", "-i", wav, "-f", "s16le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    buf = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768
    import shutil; shutil.copy(wav, os.path.join(out, "vo.wav"))
    t = T[sid]; texts = [l["text"] for l in TEXT if l["frame"] == sid]
    lines = [{"who": l["who"], "text": tx, "s": l["start"], "e": l["end"]} for l, tx in zip(t["lines"], texts)]
    n = int(t["duration"] * FPS) + 1; hop = SR // FPS
    rms = np.array([np.sqrt(np.mean(buf[i * hop:(i + 1) * hop] ** 2)) if i * hop < len(buf) else 0 for i in range(n)])
    mouth = {}
    for l in lines:
        m = mouth.setdefault(l["who"], [0.0] * n)
        a, b = int(l["s"] * FPS), min(n, int(l["e"] * FPS) + 1); seg = rms[a:b]; pk = np.percentile(seg, 95) or 1
        for i, v in enumerate(seg): m[a + i] = round(float(min(1, (v / pk) ** 0.7)), 3)
    json.dump({"source": "chatterbox placeholder", "duration": t["duration"], "lines": lines}, open(os.path.join(out, "timing.json"), "w"), indent=1)
    json.dump(mouth, open(os.path.join(out, "mouth.json"), "w"))
    print(sid, t["duration"], len(lines))
