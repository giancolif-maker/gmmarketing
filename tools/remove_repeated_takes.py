#!/usr/bin/env python3
"""Detect repeated attempts at the same line ("bad takes") and keep only the
last (usually best) one, using Whisper transcription + text similarity.

This is a heuristic: when someone flubs a line and re-says it, the re-said
version is usually the one they wanted kept. That's not always true (e.g. if
they explicitly say "no wait, go back to the first version"), so ALWAYS
run --dry-run first and read the printed decisions before trusting it.

Usage:
    python3 remove_repeated_takes.py input.mp4 output.mp4 --dry-run
    python3 remove_repeated_takes.py input.mp4 output.mp4
"""

from __future__ import annotations

import argparse
import difflib
import sys

from video_edit_lib import Segment, cut_and_concat, get_duration, has_audio_stream, invert_ranges, normalize_word


def normalize_text(text: str) -> str:
    return " ".join(normalize_word(w) for w in text.split() if normalize_word(w))


def transcribe_segments(path: str, model_size: str) -> list[dict]:
    import whisper

    model = whisper.load_model(model_size)
    result = model.transcribe(path, fp16=False)
    return [
        {"start": s["start"], "end": s["end"], "text": s["text"].strip()}
        for s in result.get("segments", [])
        if s["text"].strip()
    ]


def find_repeats(
    segments: list[dict], threshold: float, max_gap: float, min_words: int
) -> tuple[list[Segment], list[tuple[dict, dict, float]]]:
    cut_spans: list[Segment] = []
    decisions: list[tuple[dict, dict, float]] = []

    for i, seg in enumerate(segments):
        norm_i = normalize_text(seg["text"])
        if len(norm_i.split()) < min_words:
            continue
        for j in range(i + 1, len(segments)):
            other = segments[j]
            if other["start"] - seg["end"] > max_gap:
                break
            norm_j = normalize_text(other["text"])
            if len(norm_j.split()) < min_words:
                continue
            ratio = difflib.SequenceMatcher(None, norm_i, norm_j).ratio()
            if ratio >= threshold:
                cut_spans.append(Segment(seg["start"], seg["end"]))
                decisions.append((seg, other, ratio))
                break  # seg superseded; stop looking for more matches for it

    return cut_spans, decisions


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("input")
    parser.add_argument("output")
    parser.add_argument("--model", default="base", help="Whisper model size: tiny, base, small, medium (default: base)")
    parser.add_argument("--threshold", type=float, default=0.75, help="Text similarity ratio to call two segments the same line (default: 0.75)")
    parser.add_argument("--max-gap", type=float, default=15.0, help="Max seconds between two segments to consider them a repeat attempt (default: 15)")
    parser.add_argument("--min-words", type=int, default=3, help="Ignore segments shorter than this many words (default: 3)")
    parser.add_argument("--dry-run", action="store_true", help="Only print what would be cut; don't write output")
    args = parser.parse_args()

    print(f"Transcribing {args.input} with Whisper ({args.model})...", file=sys.stderr)
    segments = transcribe_segments(args.input, args.model)
    print(f"Got {len(segments)} segments.", file=sys.stderr)

    cut_spans, decisions = find_repeats(segments, args.threshold, args.max_gap, args.min_words)

    if not decisions:
        print("No repeated takes found.")
        return 0

    total_cut = sum(s.end - s.start for s in cut_spans)
    print(f"Found {len(decisions)} repeated take(s), ~{total_cut:.1f}s total:")
    for earlier, later, ratio in decisions:
        print(f"  [{earlier['start']:.1f}s-{earlier['end']:.1f}s] CUT (similarity {ratio:.2f}):")
        print(f"    \"{earlier['text']}\"")
        print(f"  kept later version [{later['start']:.1f}s-{later['end']:.1f}s]:")
        print(f"    \"{later['text']}\"")

    if args.dry_run:
        print("\n(dry run - nothing written)")
        return 0

    duration = get_duration(args.input)
    keep_ranges = invert_ranges(cut_spans, duration)
    cut_and_concat(args.input, keep_ranges, args.output, has_audio=has_audio_stream(args.input))
    print(f"Wrote {args.output} ({duration - total_cut:.1f}s, was {duration:.1f}s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
