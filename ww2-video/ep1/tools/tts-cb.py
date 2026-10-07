"""Expressive voice track: synthesize every line in build/lines.json with Chatterbox TTS, then lay
each frame's lines out exactly like tools/tts.py and write the same outputs:
  assets/audio/vo/frame-NN.wav   one voice track per frame
  build/timing.json              per-frame duration + per-line start/end (seconds)
The narrator uses Chatterbox's own voice; every character is cloned from a short Kokoro clip of
their Kokoro voice (build/vo-ref/WHO.wav, made by --refs), so the cast keeps its timbres.
Every new line is checked with speech recognition and re-generated (new seed) if it drifts.
Usage:
  python tools/tts-cb.py --refs --kokoro DIR   make character reference clips (needs kokoro_onnx)
  python tools/tts-cb.py [--only 01,02]        synthesize + lay out
  python tools/tts-cb.py --redo 21/1,36/0      re-take slurred lines with calmer settings
Lines are cached by content hash in build/vo-cache-cb/."""
import json, hashlib, re, sys, os, difflib
import numpy as np, soundfile as sf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 24000
LEAD, GAP, SWITCH, TAIL = 0.4, 0.14, 0.2, 0.8
NARR = dict(exaggeration=0.8, cfg_weight=0.35)
CHAR = dict(exaggeration=0.85, cfg_weight=0.4)
SPEED = {"NARRATOR": 1.08}  # light time-compression (pitch kept) for a quicker read
REF_TEXT = "Well, here we are again! I really can't believe it. Honestly, this is the best plan I have ever heard. Or the worst."
lines = json.load(open(os.path.join(ROOT, "build/lines.json")))
refdir = os.path.join(ROOT, "build/vo-ref"); os.makedirs(refdir, exist_ok=True)

def clean(t):
    t = t.replace("—", ", ").replace("…", "... ").replace('"', "").replace(" BC", " B.C.")
    t = re.sub(r"\b([A-Z]{2,})\b", lambda m: m.group(1).lower() if m.group(1) not in ("BC",) else m.group(1), t)
    t = t.replace("221 B.C.", "two twenty-one B.C.").replace("218 B.C.", "two eighteen B.C.").replace("216 B.C.", "two sixteen B.C.")
    t = t.replace("204 B.C.", "two oh four B.C.").replace("202 B.C.", "two oh two B.C.").replace("201 B.C.", "two oh one B.C.").replace("183 B.C.", "one eighty-three B.C.")
    t = re.sub(r"\bIn (2\d\d),", lambda m: "In " + {"211": "two eleven", "206": "two oh six", "209": "two oh nine"}.get(m.group(1), m.group(1)) + ",", t)
    return re.sub(r"\s+", " ", t).strip(" ,")

def words(t):
    return re.sub(r"[^a-z ]", " ", t.lower().replace("-", " ")).split()

def trim(a, thr=0.006):
    idx = np.where(np.abs(a) > thr)[0]
    if not len(idx): return a
    s, e = max(0, idx[0] - int(0.03 * SR)), min(len(a), idx[-1] + int(0.1 * SR))
    return a[s:e]

if "--refs" in sys.argv:
    from kokoro_onnx import Kokoro
    model = sys.argv[sys.argv.index("--kokoro") + 1]
    k = Kokoro(os.path.join(model, "kokoro-v1.0.onnx"), os.path.join(model, "voices-v1.0.bin"))
    seen = {}
    for l in lines:
        if l["who"] == "NARRATOR" or l["who"] in seen: continue
        seen[l["who"]] = 1
        a, sr = k.create(REF_TEXT, voice=l["voice"], speed=l["speed"], lang=l["lang"])
        sf.write(os.path.join(refdir, l["who"] + ".wav"), a, sr)
    print("refs:", ", ".join(seen)); sys.exit()

import torch, torchaudio as ta, librosa
from chatterbox.tts import ChatterboxTTS
from faster_whisper import WhisperModel
only = set(sys.argv[sys.argv.index("--only") + 1].split(",")) if "--only" in sys.argv else None
# --redo 21/1,36/0: re-take slurred lines with calmer settings and no speed-up
REDO = set(sys.argv[sys.argv.index("--redo") + 1].split(",")) if "--redo" in sys.argv else set()
CALM = dict(exaggeration=0.5, cfg_weight=0.5)
cache = os.path.join(ROOT, "build/vo-cache-cb"); os.makedirs(cache, exist_ok=True)
tts = asr = None
def key(l): return hashlib.sha1(f"cb2|{l['who']}|{clean(l['text'])}".encode()).hexdigest()[:16]

def synth(l, seed):
    global tts
    if tts is None: tts = ChatterboxTTS.from_pretrained(device="cpu")
    torch.manual_seed(seed)
    ref = None if l["who"] == "NARRATOR" else os.path.join(refdir, l["who"] + ".wav")
    calm = f"{l['frame']}/{l['idx']}" in REDO
    w = tts.generate(clean(l["text"]), audio_prompt_path=ref, **(CALM if calm else NARR if ref is None else CHAR))
    a = trim(w.squeeze(0).numpy().astype(np.float32))
    sp = SPEED.get(l["who"])
    if sp and not calm: a = librosa.effects.time_stretch(a, rate=sp)
    return a

def score(a, text):
    global asr
    if asr is None: asr = WhisperModel("base.en", device="cpu", compute_type="int8")
    segs, _ = asr.transcribe(librosa.resample(a, orig_sr=SR, target_sr=16000), language="en")
    heard = " ".join(s.text for s in segs)
    return difflib.SequenceMatcher(None, words(clean(text)), words(heard)).ratio(), heard

for l in lines:
    if f"{l['frame']}/{l['idx']}" in REDO and os.path.exists(os.path.join(cache, key(l) + ".wav")): os.remove(os.path.join(cache, key(l) + ".wav"))
todo = [l for l in lines if (only is None or l["frame"] in only)]
log = open(os.path.join(ROOT, "build/tts-cb.log"), "a")
for n, l in enumerate(todo):
    p = os.path.join(cache, key(l) + ".wav")
    if os.path.exists(p): continue
    best = None
    for attempt in range(4):
        a = synth(l, 1000 + attempt * 7919 + n)
        dur, words_n = len(a) / SR, len(words(l["text"]))
        r, heard = score(a, l["text"])
        too_long = dur > 1.2 + words_n * 0.62
        print(f"{l['frame']}/{l['idx']} {l['who']} try{attempt} r={r:.2f} {dur:.1f}s | {heard.strip()}", file=log, flush=True)
        if best is None or (r - (0.3 if too_long else 0)) > best[0]: best = (r - (0.3 if too_long else 0), a)
        if r >= 0.8 and not too_long: break
    sf.write(p, best[1], SR)
    print(f"[{n + 1}/{len(todo)}] {l['frame']}/{l['idx']} {l['who']} score {best[0]:.2f}", flush=True)

audio = {}
for l in lines:
    p = os.path.join(cache, key(l) + ".wav")
    if os.path.exists(p): audio[(l["frame"], l["idx"])] = sf.read(p)[0]
meta_p = os.path.join(ROOT, "build/meta.json")
META = json.load(open(meta_p)) if os.path.exists(meta_p) else {}
timing = {}
for f in sorted({l["frame"] for l in lines}):
    fl = [l for l in lines if l["frame"] == f]
    if any((f, l["idx"]) not in audio for l in fl): continue
    t, segs, prev = META.get(f, {}).get("lead", LEAD), [], None
    for l in fl:
        if prev is not None: t += SWITCH if prev != l["who"] else GAP
        d = len(audio[(f, l["idx"])]) / SR
        segs.append({"start": round(t, 3), "end": round(t + d, 3), "who": l["who"]})
        t += d; prev = l["who"]
    dur = round(t + META.get(f, {}).get("tail", TAIL), 3)
    buf = np.zeros(int(dur * SR) + 1, dtype=np.float32)
    for l, s in zip(fl, segs):
        a = audio[(f, l["idx"])].astype(np.float32)
        a = a * (0.25 / max(1e-4, float(np.sqrt(np.mean(a ** 2)))))  # level-match lines (RMS)
        i = int(s["start"] * SR); buf[i:i + len(a)] += a
    peak = np.max(np.abs(buf)) or 1
    sf.write(os.path.join(ROOT, f"assets/audio/vo/frame-{f}.wav"), (buf * (0.89 / max(peak, 0.89))).astype(np.float32), SR, subtype="PCM_16")
    timing[f] = {"duration": dur, "lines": segs}
json.dump(timing, open(os.path.join(ROOT, "build/timing.json"), "w"), indent=1)
tot = sum(v["duration"] for v in timing.values())
print(f"{len(timing)} frames laid out, total {tot:.1f}s ({tot / 60:.2f} min)")
