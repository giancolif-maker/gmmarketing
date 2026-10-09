"""Episode 2 voice track with ElevenLabs (eleven_v3, inline audio tags for direction).

Reads ../build/lines.json (exported from tools/cues.mjs), voices each line with a fixed voice per
character and a delivery tag per line, then lays every frame out and writes:
  build/vo/frame-NN.wav     one voice track per frame (44.1 kHz mono)
  build/timing.json         per-frame duration + per-line start/end (seconds)
  build/mouth.json          per-frame lip openness per speaker (for the renderer)
Takes are cached by content hash in build/takes/, so re-runs only pay for changed lines.

Auth: the environment's network secret for api.elevenlabs.io (header xi-api-key), or ELEVENLABS_API_KEY.
Usage:  python3 tts_eleven.py --voices          list the account's voices (to fill VOICE_IDS)
        python3 tts_eleven.py [--only 01,02]    synthesize + lay out
"""
import hashlib, json, os, re, subprocess, sys, time, urllib.request
import numpy as np
from directions import D as DIR, NARRATOR as NARR_TAG, STRAIGHT as STRAIGHT_TAG

HERE = os.path.dirname(os.path.abspath(__file__)); B = os.path.join(HERE, "build")
SR, FPS, MODEL = 44100, 30, "eleven_v3"
LEAD, GAP, SWITCH, TAIL = 0.35, 0.14, 0.22, 0.8
STRAIGHT = {"04", "14", "22", "23"}  # Holocaust, Leningrad, Hamburg, Warsaw: no comic direction, slower, plain

# Voice names are matched against the account's voice list (--voices); fill in IDs once the key works.
STOCK = {"George": "JBFqnCBsd6RMkjVDRZzb", "Callum": "N2lVS1w4EtoT3dr4eOWO", "Liam": "TX3LPaxmHKxFdv7VOQHJ", "Daniel": "onwK4e9ZLuTAKqWW03F9",
         "Charlie": "IKne3meq5aSn9XLyUdCD", "Brian": "nPczCjzI2devNBz1zQrb", "Eric": "cjVigY5qzO86Huf0OWal", "Chris": "iP95p4xoKVk53GoZ742B",
         "Will": "bIHbv24MWmeRgasZH58o", "Bill": "pqHfZKP75CvOlQylNhV4", "Roger": "CwhRBWXzGAHq8TQ4Fs17"}  # ElevenLabs premade voices
VOICE_IDS = {}
CASTING = {  # who: (preferred voice name, standing direction tag)
    "NARRATOR": ("George", "[warm, dry, gently amused British documentary narrator]"),
    "HITLER": ("Callum", "[petulant, vain, quick to shout]"), "KLAUS": ("Liam", "[nervous, polite, painfully honest]"),
    "STALIN": ("Daniel", "[slow, flat, menacing calm]"), "MUSSOLINI": ("Charlie", "[pompous, theatrical]"),
    "ENZO": ("Will", "[tired, sarcastic]"), "CHURCHILL": ("Brian", "[gruff, grumbling]"), "FDR": ("Eric", "[confident, warm]"),
    "SOVOFF": ("Roger", ""), "RADAR": ("Will", ""), "DUTY": ("Brian", ""), "PILOTUS": ("Will", ""), "DOOLITTLE": ("Eric", ""), "CODEBREAKERUS": ("Chris", ""), "UBOAT": ("Daniel", ""), "CODEBREAKERUK": ("George", ""), "ROMMEL": ("Brian", ""), "AIDESU": ("Roger", ""), "GERSOLDIER": ("Callum", ""), "SOVSOLDIER": ("Roger", ""), "CHUIKOV": ("Bill", ""), "PILOT": ("Charlie", ""),
    "TOJO": ("Bill", "[brisk, overconfident]"), "YAMAMOTO": ("Chris", "[quiet, worried]"),
}
FALLBACK = ["Roger", "Eric", "Chris", "Will", "Bill", "Brian", "Liam", "Charlie", "Daniel", "Callum"]
TAGS = [  # per-line delivery, keyed by simple text cues
    (r"\?!|!\s*$", "[exclaiming]"), (r"^Sir\b", "[hesitant]"), (r"…|\.\.\.", "[pausing]"),
]

def key_headers():
    h = {"Content-Type": "application/json", "Accept": "audio/mpeg"}
    if os.environ.get("ELEVENLABS_API_KEY"): h["xi-api-key"] = os.environ["ELEVENLABS_API_KEY"]
    return h

def api(path, body=None, accept="application/json"):
    h = key_headers(); h["Accept"] = accept
    req = urllib.request.Request("https://api.elevenlabs.io" + path, json.dumps(body).encode() if body else None, h)
    return urllib.request.urlopen(req, timeout=180).read()

def voices():
    try: return {v["name"].split(" - ")[0]: v["voice_id"] for v in json.loads(api("/v1/voices"))["voices"]} | STOCK
    except Exception: return dict(STOCK)  # key without voices_read
    return {v["name"].split(" - ")[0]: v["voice_id"] for v in json.loads(api("/v1/voices"))["voices"]}

def clean(t):
    t = t.replace("—", ", ").replace("“", "").replace("”", "").replace('"', "")
    t = re.sub(r"\bAF\b", "A.F.", t).replace("US ", "U.S. ")
    return re.sub(r"\s+", " ", t).strip()

def direct(l):
    if l["frame"] in STRAIGHT: return STRAIGHT_TAG
    if l["who"] == "NARRATOR": return NARR_TAG
    return DIR.get(l["gi"], CASTING.get(l["who"], ("", ""))[1])

def synth(text, vid):
    k = hashlib.sha1(f"{MODEL}|{vid}|{text}".encode()).hexdigest()[:16]
    p = os.path.join(B, "takes", k + ".mp3")
    if not os.path.exists(p):
        for a in range(5):
            try:
                mp3 = api(f"/v1/text-to-speech/{vid}?output_format=mp3_44100_128", {"text": text, "model_id": MODEL, "voice_settings": {"stability": 0.5 if text.startswith(STRAIGHT_TAG) else 0.0}}, "audio/mpeg"); break
            except Exception as e:
                if a == 4: raise
                print("  retry:", e); time.sleep(3 * 2 ** a)
        os.makedirs(os.path.dirname(p), exist_ok=True); open(p, "wb").write(mp3)
    raw = subprocess.run(["ffmpeg", "-v", "quiet", "-i", p, "-f", "s16le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    a = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768
    idx = np.where(np.abs(a) > .008)[0]
    return a if not len(idx) else a[max(0, idx[0] - 1300): idx[-1] + 4400]

def main():
    if "--voices" in sys.argv:
        for n, v in sorted(voices().items()): print(f"{n:30s} {v}")
        return
    lines = json.load(open(os.path.join(HERE, "../build/lines.json")))
    for i, l in enumerate(lines): l["gi"] = i
    only = sys.argv[sys.argv.index("--only") + 1].split(",") if "--only" in sys.argv else None
    have = voices(); fb = [have[n] for n in FALLBACK if n in have] or list(have.values())
    vid = {}
    for i, who in enumerate(sorted({l["who"] for l in lines})):
        pref = CASTING.get(who, (None,))[0]
        vid[who] = VOICE_IDS.get(who) or have.get(pref) or fb[i % len(fb)]
    os.makedirs(os.path.join(B, "vo"), exist_ok=True)
    tp = os.path.join(B, "timing.json"); timing = json.load(open(tp)) if os.path.exists(tp) else {}
    for f in sorted({l["frame"] for l in lines}):
        if only and f not in only: continue
        fl = [l for l in lines if l["frame"] == f]; takes = []
        for l in fl:
            print(f"  {f} {l['who']}: {l['text'][:60]}")
            tag = re.match(r"(\[[^\]]*\])", direct(l)); takes.append(synth(f"{tag.group(1) if tag else ''} {clean(l['text'])}".strip(), vid[l["who"]]))
        t, segs, prev = LEAD, [], None
        for l, a in zip(fl, takes):
            if prev: t += SWITCH if prev != l["who"] else GAP
            segs.append({"s": round(t, 3), "e": round(t + len(a) / SR, 3), "who": l["who"], "text": l["text"]}); t += len(a) / SR; prev = l["who"]
        dur = round(t + TAIL, 3); buf = np.zeros(int(dur * SR) + 1, np.float32)
        for s, a in zip(segs, takes): i = int(s["s"] * SR); buf[i:i + len(a)] += a
        buf *= .89 / (np.abs(buf).max() or 1)
        subprocess.run(["ffmpeg", "-y", "-v", "quiet", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", os.path.join(B, "vo", f"frame-{f}.wav")], input=buf.tobytes(), check=True)
        hop = SR // FPS; n = int(dur * FPS) + 1
        rms = np.array([np.sqrt(np.mean(buf[i * hop:(i + 1) * hop] ** 2)) if i * hop < len(buf) else 0 for i in range(n)])
        mouth = {}
        for s in segs:
            m = mouth.setdefault(s["who"], [0.0] * n); a, b = int(s["s"] * FPS), min(n, int(s["e"] * FPS) + 1); seg = rms[a:b]; pk = np.percentile(seg, 95) or 1
            for i, v in enumerate(seg): m[a + i] = round(float(min(1, (v / pk) ** .7)), 3)
        timing[f] = {"duration": dur, "lines": segs, "mouth": mouth}
        json.dump(timing, open(tp, "w"))
    print(f"{len(timing)} frames, {sum(v['duration'] for v in timing.values()) / 60:.1f} min")

main()
