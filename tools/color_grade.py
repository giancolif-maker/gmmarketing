#!/usr/bin/env python3
"""Color grade a video with ffmpeg's built-in color filters - presets or
manual brightness/contrast/saturation/gamma/temperature control.

Usage:
    python3 color_grade.py input.mp4 output.mp4 --preset cinematic
    python3 color_grade.py input.mp4 output.mp4 --saturation 1.2 --contrast 1.1
    python3 color_grade.py input.mp4 output.mp4 --preset warm --temperature 4200
    python3 color_grade.py input.mp4 output.mp4 --preset vintage --preview

Use --preview to render a single frame instead of the whole video, so you
can check the look before committing to a full re-encode. It writes a .png
next to the requested output path.
"""

from __future__ import annotations

import argparse
import sys

from video_edit_lib import get_duration, has_audio_stream, run

PRESETS: dict[str, list[str]] = {
    "vintage": ["curves=preset=vintage"],
    "cross-process": ["curves=preset=cross_process"],
    "faded": ["eq=contrast=0.85:brightness=0.05:saturation=0.75", "curves=preset=lighter"],
    "cinematic": ["colorbalance=rs=-0.08:bs=0.10:rh=0.10:bh=-0.08", "eq=contrast=1.1:saturation=1.05"],
    "warm": ["colortemperature=temperature=4500"],
    "cool": ["colortemperature=temperature=9000"],
    "bw": ["hue=s=0"],
    "vibrant": ["vibrance=intensity=0.3", "eq=saturation=1.2"],
    "punchy": ["eq=contrast=1.2:saturation=1.15:brightness=0.02"],
}


def build_filter_chain(
    preset: str | None,
    brightness: float | None,
    contrast: float | None,
    saturation: float | None,
    gamma: float | None,
    temperature: float | None,
) -> str:
    filters: list[str] = []
    if preset:
        filters.extend(PRESETS[preset])

    eq_parts = []
    if brightness is not None:
        eq_parts.append(f"brightness={brightness}")
    if contrast is not None:
        eq_parts.append(f"contrast={contrast}")
    if saturation is not None:
        eq_parts.append(f"saturation={saturation}")
    if gamma is not None:
        eq_parts.append(f"gamma={gamma}")
    if eq_parts:
        filters.append("eq=" + ":".join(eq_parts))

    if temperature is not None:
        filters.append(f"colortemperature=temperature={temperature}")

    if not filters:
        raise ValueError("No grading options given - pass --preset and/or manual adjustments.")

    return ",".join(filters)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("input")
    parser.add_argument("output")
    parser.add_argument("--preset", choices=sorted(PRESETS), default=None, help="Named grading preset")
    parser.add_argument("--brightness", type=float, default=None, help="eq brightness, -1 to 1 (default: unset)")
    parser.add_argument("--contrast", type=float, default=None, help="eq contrast, 0 to 2 typical (default: unset)")
    parser.add_argument("--saturation", type=float, default=None, help="eq saturation, 0 (b&w) to 3 (default: unset)")
    parser.add_argument("--gamma", type=float, default=None, help="eq gamma, 0.1 to 10 (default: unset)")
    parser.add_argument("--temperature", type=float, default=None, help="White balance in Kelvin, 1000-40000 (6500=neutral, lower=warmer, higher=cooler)")
    parser.add_argument("--preview", action="store_true", help="Render a single frame instead of the whole video")
    parser.add_argument("--preview-time", type=float, default=None, help="Timestamp (s) for --preview (default: middle of the video)")
    args = parser.parse_args()

    try:
        vf = build_filter_chain(args.preset, args.brightness, args.contrast, args.saturation, args.gamma, args.temperature)
    except ValueError as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1
    print(f"Filter chain: {vf}", file=sys.stderr)

    if args.preview:
        t = args.preview_time
        if t is None:
            t = get_duration(args.input) / 2
        preview_path = args.output
        if not preview_path.lower().endswith(".png"):
            preview_path = preview_path.rsplit(".", 1)[0] + ".png"
        cmd = ["ffmpeg", "-y", "-i", args.input, "-ss", f"{t:.3f}", "-vf", vf, "-update", "1", "-frames:v", "1", preview_path]
        run(cmd)
        print(f"Wrote preview frame {preview_path} (t={t:.1f}s)")
        return 0

    cmd = ["ffmpeg", "-y", "-i", args.input, "-vf", vf, "-c:v", "libx264", "-preset", "veryfast", "-crf", "18"]
    if has_audio_stream(args.input):
        cmd += ["-c:a", "copy"]
    cmd.append(args.output)
    run(cmd)
    print(f"Wrote {args.output}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
