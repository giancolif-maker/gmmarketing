"""Voice the F03 test scene with Gemini TTS, one directed take per line.

Writes:
  build/vo.wav        the scene's voice track (24 kHz mono)
  build/timing.json   per-line start/end in seconds, plus the scene duration
  build/mouth.json    per-video-frame mouth openness (0..1) for each speaker, used for lip sync

Usage:
  GEMINI_API_KEY=... python3 tts_gemini.py            # synthesize (takes are cached in build/takes/)
  python3 tts_gemini.py --placeholder                 # no key: reuse ep1's Kokoro track + timing, so visuals can be built
"""
import base64, hashlib, json, os, subprocess, sys, time, urllib.request, wave
import numpy as np

ROOT = os.path.dirname(os.path.abspath(__file__))
BUILD = os.path.join(ROOT, "build")
SR, FPS = 24000, 30
MODEL = os.environ.get("GEMINI_TTS_MODEL", "gemini-2.5-pro-preview-tts")

# Casting. Voices are Gemini prebuilt voices; each speaker also gets a standing character note.
CAST = {
    "NARRATOR": ("Charon", "A warm, dry British documentary narrator in his fifties. Unhurried, faintly amused, never theatrical. Like a favourite history teacher telling a story he loves."),
    "CUSTOMER": ("Puck", "A thin, polite Berlin office clerk in 1923, slightly nervous, trying hard to stay dignified. Light German accent."),
    "WAITER":   ("Algieba", "A stout, unflappable Berlin cafe waiter in 1923. Deadpan, world-weary, a little smug. Light German accent."),
}

# (speaker, text, direction for this line, pause before this line in seconds)
LINES = [
    ("NARRATOR", "In 1923, Germany fell behind on the bill. France occupied the Ruhr, Germany's industrial heart. So the government paid the striking workers there... by printing money.",
     "Steady and matter-of-fact. Slight pause before 'by printing money', then deliver it with a dry, raised-eyebrow understatement.", 0.4),
    ("CUSTOMER", "One coffee, please.", "Cheerful and ordinary, a man ordering his usual. Small and polite.", 0.35),
    ("WAITER", "Five thousand marks.", "Flat, bored, as if this is perfectly normal.", 0.25),
    ("WAITER", "That'll be eight thousand.", "Same flat boredom, not even looking up. Slightly slower.", 0.55),
    ("CUSTOMER", "I was drinking it!", "Genuinely outraged and baffled, voice cracking upward on 'drinking'. Quick.", 0.2),
    ("WAITER", "And while you were drinking it, it got more expensive.", "Patient, deadpan, explaining the obvious to a child. A tiny smug lift at the end.", 0.3),
    ("NARRATOR", "By November 1923, one U.S. dollar cost four point two trillion marks. Whole life savings vanished.",
     "The humour drains out. Quiet and plain on the number, then sober and slower on 'Whole life savings vanished.'", 0.7),
]
TAIL = 1.4


def synth(who, text, direction):
    voice, character = CAST[who]
    prompt = f"Read this line as the character described.\nCharacter: {character}\nDelivery: {direction}\nLine: {text}"
    key = hashlib.sha1(f"{MODEL}|{voice}|{prompt}".encode()).hexdigest()[:16]
    path = os.path.join(BUILD, "takes", key + ".pcm")
    if os.path.exists(path):
        return np.frombuffer(open(path, "rb").read(), dtype=np.int16).astype(np.float32) / 32768
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseModalities": ["AUDIO"],
                             "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": voice}}}},
    }
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"
    headers = {"Content-Type": "application/json"}
    if os.environ.get("GEMINI_API_KEY"):
        headers["x-goog-api-key"] = os.environ["GEMINI_API_KEY"]
    for attempt in range(5):
        try:
            req = urllib.request.Request(url, json.dumps(body).encode(), headers)
            res = json.load(urllib.request.urlopen(req, timeout=180))
            pcm = base64.b64decode(res["candidates"][0]["content"]["parts"][0]["inlineData"]["data"])
            break
        except Exception as e:  # rate limits and transient 5xx
            if attempt == 4: raise
            print(f"  retry {who}: {e}"); time.sleep(4 * 2 ** attempt)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, "wb").write(pcm)
    return np.frombuffer(pcm, dtype=np.int16).astype(np.float32) / 32768


def trim(a, thr=0.01):
    idx = np.where(np.abs(a) > thr)[0]
    return a if not len(idx) else a[max(0, idx[0] - int(0.03 * SR)): idx[-1] + int(0.1 * SR)]


def load_placeholder():
    """ep1's existing Kokoro F03 track, with the line times ep1 laid out for it."""
    src = os.path.join(ROOT, "../ep1/assets/audio/mp3/vo-f03.mp3")
    raw = subprocess.run(["ffmpeg", "-v", "quiet", "-i", src, "-f", "s16le", "-ac", "1", "-ar", str(SR), "-"],
                         capture_output=True, check=True).stdout
    buf = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768
    segs = [(0.4, 10.89), (11.09, 12.333), (12.533, 14.119), (14.259, 15.75), (15.95, 17.171), (17.371, 19.9), (20.1, 26.247)]
    return buf, segs, 27.047


def main():
    os.makedirs(BUILD, exist_ok=True)
    if "--placeholder" in sys.argv:
        buf, segs, dur = load_placeholder()
        source = "placeholder (ep1 Kokoro)"
    else:
        takes = []
        for who, text, direction, _ in LINES:
            print(f"  {who}: {text[:50]}")
            takes.append(trim(synth(who, text, direction)))
        t, segs = 0.0, []
        for (who, _, _, pause), a in zip(LINES, takes):
            t += pause; segs.append((round(t, 3), round(t + len(a) / SR, 3))); t += len(a) / SR
        dur = round(t + TAIL, 3)
        buf = np.zeros(int(dur * SR) + 1, dtype=np.float32)
        for (s, _), a in zip(segs, takes):
            i = int(s * SR); buf[i:i + len(a)] += a
        buf *= 0.89 / (np.max(np.abs(buf)) or 1)
        source = f"gemini {MODEL}"

    with wave.open(os.path.join(BUILD, "vo.wav"), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(buf, -1, 1) * 32767).astype(np.int16).tobytes())

    # Mouth openness per video frame and speaker, from the RMS of a 1/30 s window, smoothed and normalised per line.
    n = int(dur * FPS) + 1
    hop = SR // FPS
    rms = np.array([np.sqrt(np.mean(buf[i * hop:(i + 1) * hop] ** 2)) if i * hop < len(buf) else 0 for i in range(n)])
    mouth = {k: [0.0] * n for k in CAST}
    for (who, *_), (s, e) in zip(LINES, segs):
        a, b = int(s * FPS), min(n, int(e * FPS) + 1)
        seg = rms[a:b]; peak = np.percentile(seg, 95) or 1
        for i, v in enumerate(seg):
            mouth[who][a + i] = round(float(min(1, (v / peak) ** 0.7)), 3)
    json.dump({"source": source, "duration": dur,
               "lines": [{"who": w, "text": tx, "s": s, "e": e} for (w, tx, *_), (s, e) in zip(LINES, segs)]},
              open(os.path.join(BUILD, "timing.json"), "w"), indent=1)
    json.dump(mouth, open(os.path.join(BUILD, "mouth.json"), "w"))
    print(f"{source}: {len(LINES)} lines, {dur:.1f}s")


main()
