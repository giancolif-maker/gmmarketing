"""Bakes build/paper.png: aged paper (pigment blotches, grain, fibres, foxing, vignette), multiplied over every frame."""
import numpy as np, subprocess, os
W, H = 1920, 1080; r = np.random.default_rng(7)
def noise(scale):
    g = r.random((H // scale + 2, W // scale + 2))
    ys, xs = np.linspace(0, H / scale, H), np.linspace(0, W / scale, W)
    y0, x0 = ys.astype(int), xs.astype(int); fy, fx = (ys - y0)[:, None], (xs - x0)[None, :]
    fy, fx = fy * fy * (3 - 2 * fy), fx * fx * (3 - 2 * fx)
    a = g[y0][:, x0]; b = g[y0][:, x0 + 1]; c = g[y0 + 1][:, x0]; d = g[y0 + 1][:, x0 + 1]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy
n = noise(260) * .5 + noise(90) * .3 + noise(25) * .2
grain = r.random((H, W))
v = 1 - .10 * (n - .5) * 2 - .05 * (grain - .5)
img = np.stack([v * 1.0, v * .965, v * .9], -1)
for _ in range(60):  # fibres
    x, y, a, l = r.random() * W, r.random() * H, r.random() * 6.28, 20 + r.random() * 60
    for s in np.linspace(0, l, int(l)):
        xi, yi = int(x + np.cos(a) * s), int(y + np.sin(a) * s)
        if 0 <= xi < W and 0 <= yi < H: img[yi, xi] *= .9
yy, xx = np.mgrid[0:H, 0:W]
for _ in range(14):  # foxing spots
    cx, cy, rad = r.random() * W, r.random() * H, 6 + r.random() * 26
    m = np.exp(-((xx - cx) ** 2 + (yy - cy) ** 2) / (2 * rad ** 2))[..., None]
    img *= 1 - m * np.array([.10, .16, .25]) * r.random()
d = np.sqrt(((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2)
img *= (1 - .38 * np.clip(d - .55, 0, 1) ** 1.6)[..., None]
img = (np.clip(img, 0, 1) * 255).astype(np.uint8)
os.makedirs("build", exist_ok=True)
subprocess.run(["ffmpeg", "-y", "-v", "quiet", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-i", "-", "build/paper.png"], input=img.tobytes(), check=True)
print("paper ok")
