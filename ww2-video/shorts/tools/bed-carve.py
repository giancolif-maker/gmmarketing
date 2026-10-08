"""Per-Short music bed, carved under the voice: assets/audio/music/bed-sN.wav.
Bed sits at full level in the gaps and dips to 30% under every spoken line (60 ms in, 250 ms out),
fades out over the last 1.2 s. Run after tts-cb.py (needs build/timing.json) and synth-audio.py."""
import json, os, numpy as np, soundfile as sf
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
T = json.load(open(os.path.join(ROOT, "build/timing.json")))
bed, sr = sf.read(os.path.join(ROOT, "assets/audio/music/bed.wav"))
for n, fr in T.items():
    dur = fr["duration"] + 0.5; N = int(dur * sr)
    a = np.resize(bed, N) if len(bed) < N else bed[:N].copy()
    g = np.ones(N)
    for l in fr["lines"]:
        i0, i1 = int(max(0, l["start"] - 0.06) * sr), int((l["end"] + 0.25) * sr)
        g[i0:i1] = 0.3
    k = int(0.08 * sr); g = np.convolve(g, np.ones(k) / k, mode="same")
    f = int(1.2 * sr); g[-f:] *= np.linspace(1, 0, f)
    sf.write(os.path.join(ROOT, f"assets/audio/music/bed-{n}.wav"), (a * g).astype(np.float32), sr, subtype="PCM_16")
    print(n, f"{dur:.1f}s")
