"""Mix a Short: voice + low music bed + timed SFX → build/<id>/<id>.mp4.  Usage: python3 mix.py s1 [s2 s3]"""
import json, os, subprocess, sys
H = os.path.dirname(os.path.abspath(__file__)); SFX = os.path.join(H, "../../shorts/assets/audio/sfx"); BED = os.path.join(H, "../../shorts/assets/audio/music/bed.wav")
def cues(sid, L, D):
    s = lambda i: L[i]["s"]; e = lambda i: L[i]["e"]
    if sid == "s1": return [("slam", .32, .7), ("slam", s(1) + .3, .55), ("slam", s(3) + .3, .55), ("whoosh", s(4) + .7, .3), ("scratch", s(5) + .5, .35), ("slam", s(6) + .68, .6),
                            ("slam", s(7) + .2, .55), ("whoosh", s(8) + .5, .45), ("pop", s(9) + .85 * (e(9) - s(9)) * 0 + s(9) - s(9) + .85, .5), ("boom", e(10) + .5, .7), ("slam", e(10) + .5, .7)]
    if sid == "s2": return [("ding", .15 + .42 * k, .28) for k in range(1, 7)] + [("ding", s(3) + .35, .6), ("pop", s(4), .6), ("boing", s(4) + .05, .35)] + \
                           [("ding", s(5) + .3 + .6 * k, .4) for k in range(1, 4)] + [("whoosh", s(6), .4), ("wind", s(7), .35), ("slam", s(8) + .9, .6), ("pop", s(9), .6), ("boing", s(9) + .05, .35)]
    if sid == "s3": return [("slam", .2, .7), ("rumble", 1.25, .6), ("crash", s(1) + .9, .35), ("slam", s(2) + .3, .5), ("sting", s(6), .5), ("slam", e(6) + .7, .65)]
for sid in sys.argv[1:]:
    B = os.path.join(H, "build", sid); T = json.load(open(os.path.join(B, "timing.json"))); D = T["duration"]; C = cues(sid, T["lines"], D)
    ins = ["-i", os.path.join(B, "silent.mp4"), "-i", os.path.join(B, "vo.wav"), "-i", BED]
    fl = [f"[1]volume=1.0[vo]", f"[2]atrim=0:{D},volume=0.12,afade=t=in:d=0.4,afade=t=out:st={D - 1.2}:d=1.2[bed]"]; tags = ["[vo]", "[bed]"]
    for i, (name, at, vol) in enumerate(C):
        ins += ["-i", os.path.join(SFX, name + ".wav")]; ms = int(at * 1000)
        fl.append(f"[{i + 3}]adelay={ms}|{ms},volume={vol}[x{i}]"); tags.append(f"[x{i}]")
    fl.append("".join(tags) + f"amix=inputs={len(tags)}:normalize=0,alimiter=limit=0.95[a]")
    out = os.path.join(B, f"{sid}.mp4")
    subprocess.run(["ffmpeg", "-y", "-v", "error", *ins, "-filter_complex", ";".join(fl), "-map", "0:v", "-map", "[a]", "-c:v", "libx264", "-crf", "21", "-preset", "medium", "-c:a", "aac", "-b:a", "192k", "-shortest", out], check=True)
    print(out)
