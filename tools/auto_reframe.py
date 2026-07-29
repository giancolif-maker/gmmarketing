#!/usr/bin/env python3
"""Reframe a horizontal video to vertical (or any target aspect ratio),
following the main face across the shot, using OpenCV face detection +
ffmpeg's crop filter with a per-frame time expression for x.

Usage:
    python3 auto_reframe.py input.mp4 output.mp4
    python3 auto_reframe.py input.mp4 output.mp4 --aspect 9:16 --scale 1080x1920
    python3 auto_reframe.py input.mp4 output.mp4 --aspect 1:1

If no face is detected anywhere in the video, it falls back to a static
center crop and prints a warning.

Note: ffmpeg's crop filter does not actually support changing x/y at
runtime via sendcmd (it replies "Function not implemented" even though
it's listed as command-capable) - confirmed by testing against ffmpeg
6.1.1. Instead this builds a single piecewise-linear eval expression for
x, using between(t, t0, t1) terms, which crop's x option does support
since it's evaluated per-frame as a function of t.
"""

from __future__ import annotations

import argparse
import sys

from video_edit_lib import has_audio_stream, run


def parse_ratio(text: str) -> float:
    w, h = text.split(":")
    return float(w) / float(h)


def detect_face_centers(path: str, sample_rate: float) -> tuple[list[tuple[float, float]], int, int, float]:
    import cv2

    cap = cv2.VideoCapture(path)
    if not cap.isOpened():
        raise RuntimeError(f"Could not open video: {path}")

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = frame_count / fps if fps else 0.0

    cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    detector = cv2.CascadeClassifier(cascade_path)

    step_frames = max(1, round(fps / sample_rate))
    samples: list[tuple[float, float]] = []

    frame_idx = 0
    while True:
        ok = cap.grab()
        if not ok:
            break
        if frame_idx % step_frames == 0:
            ok, frame = cap.retrieve()
            if not ok:
                break
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = detector.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(40, 40))
            t = frame_idx / fps
            if len(faces):
                fx, fy, fw, fh = max(faces, key=lambda f: f[2] * f[3])
                samples.append((t, fx + fw / 2))
        frame_idx += 1

    cap.release()
    return samples, width, height, duration


def fill_and_smooth(samples: list[tuple[float, float]], smoothing: int) -> list[tuple[float, float]]:
    if not samples:
        return []

    values = [x for _, x in samples]
    smoothed = []
    for i in range(len(values)):
        lo = max(0, i - smoothing // 2)
        hi = min(len(values), i + smoothing // 2 + 1)
        window = values[lo:hi]
        smoothed.append(sum(window) / len(window))

    return [(t, x) for (t, _), x in zip(samples, smoothed)]


def build_pan_expression(points: list[tuple[float, float]], duration: float) -> str:
    """Piecewise-linear crop-x expression as a function of ffmpeg's `t`.

    points must already be clamped to valid crop-x values.
    """
    pts = list(points)
    if pts[0][0] > 0:
        pts.insert(0, (0.0, pts[0][1]))
    if pts[-1][0] < duration:
        pts.append((duration, pts[-1][1]))

    # Half-open intervals [t0, t1) so two adjacent segments never both
    # evaluate true at a shared breakpoint (which would double-count x
    # there - between() is inclusive on both ends and doesn't compose).
    terms = []
    n_segs = len(pts) - 1
    for i in range(n_segs):
        t0, x0 = pts[i]
        t1, x1 = pts[i + 1]
        if t1 <= t0:
            continue
        slope = (x1 - x0) / (t1 - t0)
        linear = f"({x0:.2f}+{slope:.4f}*(t-{t0:.3f}))"
        if i == n_segs - 1:
            cond = f"gte(t,{t0:.3f})"
        else:
            cond = f"gte(t,{t0:.3f})*lt(t,{t1:.3f})"
        terms.append(f"{linear}*{cond}")

    expr = "+".join(terms)
    # Escape commas so ffmpeg's filtergraph parser doesn't treat them as
    # filter/chain separators inside the quoted option value.
    return expr.replace(",", "\\,")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("input")
    parser.add_argument("output")
    parser.add_argument("--aspect", default="9:16", help="Target aspect ratio W:H (default: 9:16)")
    parser.add_argument("--sample-rate", type=float, default=2.0, help="Face-detection samples per second (default: 2)")
    parser.add_argument("--smoothing", type=int, default=9, help="Moving-average window in samples, odd number (default: 9)")
    parser.add_argument("--scale", default=None, help="Optional output resolution WxH, e.g. 1080x1920")
    args = parser.parse_args()

    target_ratio = parse_ratio(args.aspect)

    print(f"Scanning {args.input} for faces ({args.sample_rate}/s)...", file=sys.stderr)
    samples, width, height, duration = detect_face_centers(args.input, args.sample_rate)

    if width / height >= target_ratio:
        crop_h = height
        crop_w = round(height * target_ratio)
        panning_axis = "x"
    else:
        crop_w = width
        crop_h = round(width / target_ratio)
        panning_axis = "y"

    if panning_axis != "x":
        print(
            "Warning: target aspect is wider than a horizontal pan can help with; "
            "falling back to a static center crop (vertical panning isn't implemented).",
            file=sys.stderr,
        )
        crop_x = (width - crop_w) // 2
        crop_y = (height - crop_h) // 2
        vf = f"crop=w={crop_w}:h={crop_h}:x={crop_x}:y={crop_y}"
    elif not samples:
        print("Warning: no faces detected anywhere - using a static center crop.", file=sys.stderr)
        crop_x = (width - crop_w) // 2
        vf = f"crop=w={crop_w}:h={crop_h}:x={crop_x}:y=0"
    else:
        print(f"Found faces in {len(samples)} sampled frame(s); building dynamic crop path.", file=sys.stderr)
        smoothed = fill_and_smooth(samples, args.smoothing)

        half_w = crop_w / 2
        clamped_points = [
            (t, min(max(cx - half_w, 0), width - crop_w)) for t, cx in smoothed
        ]
        expr = build_pan_expression(clamped_points, duration)
        vf = f"crop=w={crop_w}:h={crop_h}:x='{expr}':y=0"

    if args.scale:
        out_w, out_h = args.scale.split("x")
        vf += f",scale={out_w}:{out_h}"

    cmd = [
        "ffmpeg",
        "-y",
        "-i",
        args.input,
        "-vf",
        vf,
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "18",
    ]
    if has_audio_stream(args.input):
        cmd += ["-c:a", "copy"]
    cmd.append(args.output)
    print("Running ffmpeg...", file=sys.stderr)
    run(cmd)
    print(f"Wrote {args.output} ({crop_w}x{crop_h}{' -> ' + args.scale if args.scale else ''})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
