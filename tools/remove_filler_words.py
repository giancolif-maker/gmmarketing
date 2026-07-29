#!/usr/bin/env python3
"""Cut filler words ("um", "uh", "like", ...) out of a video using Whisper
word-level timestamps + ffmpeg trim/concat.

Usage:
    python3 remove_filler_words.py input.mp4 output.mp4
    python3 remove_filler_words.py input.mp4 output.mp4 --aggressive
    python3 remove_filler_words.py input.mp4 output.mp4 --dry-run
    python3 remove_filler_words.py input.mp4 output.mp4 --words um,uh,you know

This is a heuristic, not magic: run with --dry-run first on anything you
care about, skim the list of cuts it prints, then re-run for real.
"""

from __future__ import annotations

import argparse
import sys

from video_edit_lib import Segment, cut_and_concat, get_duration, has_audio_stream, invert_ranges, normalize_word

# Conservative default: words that are almost never meaningful on their own.
DEFAULT_FILLERS = {"um", "umm", "uh", "uhh", "uhm", "erm", "er", "hmm"}

# Opt-in via --aggressive: legitimate words that are *often* filler, but
# cutting them blindly risks removing real content. Includes short phrases.
AGGRESSIVE_PHRASES = [
    ("you", "know"),
    ("i", "mean"),
    ("sort", "of"),
    ("kind", "of"),
    ("like",),
    ("basically",),
    ("actually",),
    ("literally",),
]


def parse_word_list(raw: str) -> list[tuple[str, ...]]:
    phrases = []
    for chunk in raw.split(","):
        words = tuple(normalize_word(w) for w in chunk.strip().split())
        if words:
            phrases.append(words)
    return phrases


def transcribe_words(path: str, model_size: str) -> list[dict]:
    import whisper

    model = whisper.load_model(model_size)
    result = model.transcribe(path, word_timestamps=True, fp16=False)
    words = []
    for segment in result.get("segments", []):
        for w in segment.get("words", []):
            words.append({"word": w["word"], "start": w["start"], "end": w["end"]})
    return words


def find_filler_spans(
    words: list[dict], filler_phrases: list[tuple[str, ...]], padding: float
) -> list[Segment]:
    normalized = [normalize_word(w["word"]) for w in words]
    max_len = max((len(p) for p in filler_phrases), default=1)
    phrase_set = {p for p in filler_phrases}

    spans: list[Segment] = []
    matches: list[tuple[int, int, str]] = []
    i = 0
    n = len(words)
    while i < n:
        matched = False
        for length in range(min(max_len, n - i), 0, -1):
            window = tuple(normalized[i : i + length])
            if window in phrase_set:
                start = words[i]["start"] - padding
                end = words[i + length - 1]["end"] + padding
                spans.append(Segment(max(0.0, start), end))
                matches.append((i, i + length, " ".join(w["word"] for w in words[i : i + length]).strip()))
                i += length
                matched = True
                break
        if not matched:
            i += 1
    return spans, matches


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("input")
    parser.add_argument("output")
    parser.add_argument("--model", default="base", help="Whisper model size: tiny, base, small, medium (default: base)")
    parser.add_argument("--aggressive", action="store_true", help="Also cut 'like', 'you know', 'basically', etc.")
    parser.add_argument("--words", default=None, help="Comma-separated custom filler word/phrase list (overrides defaults)")
    parser.add_argument("--padding", type=float, default=0.06, help="Seconds of padding kept around each cut (default: 0.06)")
    parser.add_argument("--dry-run", action="store_true", help="Only print what would be cut; don't write output")
    args = parser.parse_args()

    if args.words:
        filler_phrases = parse_word_list(args.words)
    else:
        filler_phrases = [(w,) for w in DEFAULT_FILLERS]
        if args.aggressive:
            filler_phrases += AGGRESSIVE_PHRASES

    print(f"Transcribing {args.input} with Whisper ({args.model}) for word-level timestamps...", file=sys.stderr)
    words = transcribe_words(args.input, args.model)
    print(f"Got {len(words)} words.", file=sys.stderr)

    cut_spans, matches = find_filler_spans(words, filler_phrases, args.padding)

    if not matches:
        print("No filler words found with the current word list.")
        return 0

    total_cut = sum(s.end - s.start for s in cut_spans)
    print(f"Found {len(matches)} filler word(s)/phrase(s), ~{total_cut:.1f}s total:")
    for _, _, text in matches:
        print(f"  - \"{text}\"")

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
