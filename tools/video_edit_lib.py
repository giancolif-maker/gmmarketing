"""Shared ffmpeg helpers for the AI video editing tools in this folder.

Used by remove_filler_words.py, remove_repeated_takes.py, and auto_reframe.py.
"""

from __future__ import annotations

import json
import subprocess
from dataclasses import dataclass


@dataclass
class Segment:
    start: float
    end: float


def run(cmd: list[str]) -> subprocess.CompletedProcess:
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(
            f"Command failed ({result.returncode}): {' '.join(cmd)}\n{result.stderr}"
        )
    return result


def probe(path: str) -> dict:
    result = run(
        [
            "ffprobe",
            "-v",
            "error",
            "-print_format",
            "json",
            "-show_format",
            "-show_streams",
            path,
        ]
    )
    return json.loads(result.stdout)


def get_duration(path: str) -> float:
    info = probe(path)
    return float(info["format"]["duration"])


def has_audio_stream(path: str) -> bool:
    info = probe(path)
    return any(s.get("codec_type") == "audio" for s in info.get("streams", []))


def invert_ranges(cut_ranges: list[Segment], duration: float, min_gap: float = 0.05) -> list[Segment]:
    """Given ranges to CUT, return the ranges to KEEP (the complement)."""
    cuts = sorted((c for c in cut_ranges if c.end > c.start), key=lambda c: c.start)
    merged: list[Segment] = []
    for c in cuts:
        if merged and c.start <= merged[-1].end + min_gap:
            merged[-1] = Segment(merged[-1].start, max(merged[-1].end, c.end))
        else:
            merged.append(Segment(max(0.0, c.start), min(duration, c.end)))

    keep: list[Segment] = []
    cursor = 0.0
    for c in merged:
        if c.start - cursor > min_gap:
            keep.append(Segment(cursor, c.start))
        cursor = max(cursor, c.end)
    if duration - cursor > min_gap:
        keep.append(Segment(cursor, duration))
    return keep


def cut_and_concat(
    input_path: str,
    keep_ranges: list[Segment],
    output_path: str,
    has_audio: bool = True,
) -> None:
    """Build the input from ffmpeg, keeping only keep_ranges (in order), and re-encode."""
    if not keep_ranges:
        raise ValueError("No segments to keep - refusing to produce an empty video.")

    filter_parts = []
    concat_inputs = []
    for i, seg in enumerate(keep_ranges):
        filter_parts.append(
            f"[0:v]trim=start={seg.start:.3f}:end={seg.end:.3f},"
            f"setpts=PTS-STARTPTS[v{i}]"
        )
        concat_inputs.append(f"[v{i}]")
        if has_audio:
            filter_parts.append(
                f"[0:a]atrim=start={seg.start:.3f}:end={seg.end:.3f},"
                f"asetpts=PTS-STARTPTS[a{i}]"
            )
            concat_inputs.append(f"[a{i}]")

    n = len(keep_ranges)
    a_flag = 1 if has_audio else 0
    concat_filter = f"{''.join(concat_inputs)}concat=n={n}:v=1:a={a_flag}[outv]"
    if has_audio:
        concat_filter += "[outa]"
    filter_complex = ";".join(filter_parts) + ";" + concat_filter

    cmd = [
        "ffmpeg",
        "-y",
        "-i",
        input_path,
        "-filter_complex",
        filter_complex,
        "-map",
        "[outv]",
    ]
    if has_audio:
        cmd += ["-map", "[outa]"]
    cmd += ["-c:v", "libx264", "-preset", "veryfast", "-crf", "18"]
    if has_audio:
        cmd += ["-c:a", "aac", "-b:a", "192k"]
    cmd.append(output_path)

    run(cmd)


def normalize_word(word: str) -> str:
    return "".join(ch for ch in word.lower() if ch.isalnum() or ch == "'").strip("'")
