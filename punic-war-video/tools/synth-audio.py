"""Procedural SFX + music bed (no sample library available in this environment).
Writes assets/audio/sfx/<name>.wav and assets/audio/music/bed.wav (length = --seconds).
Deterministic: fixed RNG seed."""
import sys, os, numpy as np, soundfile as sf
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 44100
rng = np.random.default_rng(7)
t_ = lambda d: np.arange(int(d * SR)) / SR
env = lambda d, a=0.005, r=None: np.minimum(1, t_(d) / a) * np.exp(-t_(d) / (r or d / 4))
noise = lambda d: rng.uniform(-1, 1, int(d * SR))
def lp(x, k=0.1):  # one-pole lowpass
    y = np.empty_like(x); acc = 0.0
    for i, v in enumerate(x): acc += k * (v - acc); y[i] = acc
    return y
def norm(x, g=0.9): return (x / (np.max(np.abs(x)) or 1) * g).astype(np.float32)
def save(name, x): sf.write(os.path.join(ROOT, f"assets/audio/sfx/{name}.wav"), norm(x), SR)

d = 0.12; t = t_(d); save("pop", np.sin(2 * np.pi * (500 + 900 * t / d) * t) * env(d, 0.002, 0.03))
d = 0.5; t = t_(d); save("slam", np.sin(2 * np.pi * 70 * t * (1 - t)) * env(d, 0.002, 0.09) + lp(noise(d), 0.3) * env(d, 0.001, 0.03))
d = 0.6; w = noise(d); sweep = np.sin(np.pi * t_(d) / d) ** 2; save("whoosh", lp(w, 0.08) * sweep)
d = 1.2; t = t_(d); save("ding", sum(np.sin(2 * np.pi * f * t) * a for f, a in [(1320, 1), (2640, .4), (3960, .2)]) * env(d, 0.002, 0.35))
d = 1.0; t = t_(d); save("splash", lp(noise(d), 0.25) * env(d, 0.01, 0.25) + lp(noise(d), 0.05) * env(d, 0.05, 0.5))
d = 2.5; t = t_(d); save("thunder", lp(noise(d), 0.02) * env(d, 0.02, 0.9) + lp(noise(d), 0.4) * env(d, 0.001, 0.05))
d = 0.35; t = t_(d); save("stab", np.sin(2 * np.pi * (2400 - 1800 * t / d) * t) * env(d, 0.001, 0.08) * 0.6 + lp(noise(d), 0.5) * env(d, 0.001, 0.04))
d = 2.0; t = t_(d); crowd = sum(np.sin(2 * np.pi * (180 + 40 * i) * t + 3 * np.sin(2 * np.pi * (2 + i) * t)) for i in range(8)); save("cheer", (lp(noise(d), 0.15) * 0.8 + crowd * 0.05) * np.sin(np.pi * t / d))
d = 1.6; t = t_(d); save("boom", np.sin(2 * np.pi * 50 * t) * env(d, 0.003, 0.4) + lp(noise(d), 0.06) * env(d, 0.003, 0.5))
d = 0.7; t = t_(d); save("boing", np.sin(2 * np.pi * (180 + 120 * np.sin(2 * np.pi * 9 * t) * np.exp(-t * 4)) * t) * env(d, 0.005, 0.25))
d = 0.55; t = t_(d); save("scratch", lp(noise(d), 0.6) * np.abs(np.sin(2 * np.pi * 5 * t)) * np.sin(np.pi * t / d) + np.sin(2 * np.pi * (900 - 700 * t / d) * t) * 0.3 * np.sin(np.pi * t / d))
d = 3.0; t = t_(d); save("wind", lp(noise(d), 0.03 + 0.02 * np.sin(2 * np.pi * 0.7 * t).mean()) * np.sin(np.pi * t / d) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.9 * t)))
d = 2.0; t = t_(d); save("rumble", lp(noise(d), 0.015) * np.minimum(1, t / 0.3) * np.exp(-t / 1.2))
d = 1.0; t = t_(d); save("crash", lp(noise(d), 0.35) * env(d, 0.001, 0.18) + np.sin(2 * np.pi * 60 * t) * env(d, 0.002, 0.2))
d = 0.6; t = t_(d); save("crack", noise(d) * env(d, 0.0005, 0.02) + lp(noise(d), 0.1) * env(d, 0.002, 0.15))
d = 1.6; t = t_(d); save("sting", sum(np.sign(np.sin(2 * np.pi * f * t)) * 0.25 + np.sin(2 * np.pi * f * t) for f in [262, 330, 392, 523]) * env(d, 0.01, 0.5))
d = 0.5; t = t_(d); save("spit", lp(noise(d), 0.5) * env(d, 0.002, 0.1) + np.sin(2 * np.pi * 300 * t) * env(d, 0.001, 0.05) * 0.4)
d = 2.0; t = t_(d); hoof = np.zeros_like(t)
for k in range(16): i = int((k * 0.125 + (0.03 if k % 2 else 0)) * SR); s = np.sin(2 * np.pi * 120 * t_(0.06)) * env(0.06, 0.001, 0.015); hoof[i:i + len(s)] += s[: len(hoof) - i]
save("gallop", hoof)

# ---- music bed: plucky pizzicato + bass + soft shaker, 104 bpm, C major I–vi–IV–V ----
secs = float(sys.argv[sys.argv.index("--seconds") + 1]) if "--seconds" in sys.argv else 420
bpm = 104; beat = 60 / bpm; n = int(secs * SR) + SR
out = np.zeros(n, dtype=np.float64)
def pluck(f, d=0.45, amp=1.0):
    t = t_(d); return amp * sum(np.sin(2 * np.pi * f * h * t) / h ** 1.6 for h in (1, 2, 3, 4)) * np.minimum(1, t / 0.004) * np.exp(-t / 0.12)
def mtof(m): return 440 * 2 ** ((m - 69) / 12)
prog = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]]  # C Am F G
melody = [[72, 76, 79, 76, 74, 72, 71, 72], [69, 72, 76, 72, 74, 72, 69, 67], [65, 69, 72, 69, 70, 69, 67, 65], [67, 71, 74, 71, 72, 71, 69, 67]]
bar = 4 * beat; nbars = int(secs / bar) + 1
for b in range(nbars):
    ch = prog[b % 4]; t0 = b * bar
    for k in range(8):  # eighth-note arpeggio
        i = int((t0 + k * beat / 2) * SR); note = ch[k % 3] + (12 if k % 4 == 3 else 0)
        s = pluck(mtof(note), amp=0.35); out[i:i + len(s)] += s[: max(0, min(len(s), n - i))]
    if (b // 8) % 2 == 1:  # melody every other 8-bar section
        for k, m in enumerate(melody[b % 4]):
            i = int((t0 + k * beat / 2) * SR); s = pluck(mtof(m), 0.5, 0.45); out[i:i + len(s)] += s[: max(0, min(len(s), n - i))]
    for k in (0, 2):  # bass on 1 and 3
        i = int((t0 + k * beat) * SR); d = beat * 0.9; t = t_(d)
        s = np.sin(2 * np.pi * mtof(ch[0] - 24) * t) * np.minimum(1, t / 0.01) * np.exp(-t / 0.35) * 0.8; out[i:i + len(s)] += s[: max(0, min(len(s), n - i))]
    for k in range(8):  # shaker
        i = int((t0 + k * beat / 2) * SR); d = 0.05; s = rng.uniform(-1, 1, int(d * SR)) * np.exp(-t_(d) / 0.012) * (0.12 if k % 2 else 0.06); out[i:i + len(s)] += s[: max(0, min(len(s), n - i))]
fade = int(2 * SR); out[-fade:] *= np.linspace(1, 0, fade)
sf.write(os.path.join(ROOT, "assets/audio/music/bed.wav"), norm(out[: int(secs * SR)], 0.8), SR, subtype="PCM_16")
print("sfx + bed written,", secs, "s")
