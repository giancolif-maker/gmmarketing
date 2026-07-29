#!/usr/bin/env python3
"""Local web app: upload a video, describe an edit in chat, watch the
timeline update live as cuts are found, then preview/download the result.

Runs entirely locally - nothing is uploaded anywhere except to this
process's own uploads/ folder on your machine.

Usage:
    python3 webapp/server.py
Then open http://127.0.0.1:5057 in a browser.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import time
import uuid

import numpy as np
from flask import Flask, Response, abort, jsonify, request, send_file, send_from_directory, stream_with_context

TOOLS_DIR = os.path.join(os.path.dirname(__file__), "..", "tools")
sys.path.insert(0, os.path.abspath(TOOLS_DIR))

from video_edit_lib import Segment, cut_and_concat, get_duration, has_audio_stream, probe, invert_ranges  # noqa: E402
from remove_filler_words import DEFAULT_FILLERS, find_filler_spans, transcribe_words  # noqa: E402
from remove_repeated_takes import find_repeats, transcribe_segments  # noqa: E402

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = Flask(__name__, static_folder=os.path.join(BASE_DIR, "static"), static_url_path="/static")


def video_folder(video_id: str) -> str:
    safe_id = "".join(ch for ch in video_id if ch.isalnum())
    if not safe_id or safe_id != video_id:
        abort(400, "invalid video id")
    folder = os.path.join(UPLOAD_DIR, safe_id)
    if not os.path.isdir(folder):
        abort(404, "unknown video id")
    return folder


def extract_waveform_peaks(path: str, n_buckets: int = 800) -> list[float]:
    if not has_audio_stream(path):
        return [0.0] * n_buckets
    cmd = ["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", "4000", "-f", "s16le", "-"]
    result = subprocess.run(cmd, capture_output=True)
    data = np.frombuffer(result.stdout, dtype=np.int16).astype(np.float32)
    if len(data) == 0:
        return [0.0] * n_buckets
    bucket_size = max(1, len(data) // n_buckets)
    peaks = []
    for i in range(n_buckets):
        chunk = data[i * bucket_size : (i + 1) * bucket_size]
        peaks.append(float(np.abs(chunk).max()) / 32768.0 if len(chunk) else 0.0)
    return peaks


def detect_silence(path: str, noise_db: int = -30, min_duration: float = 0.3) -> list[tuple[float, float]]:
    cmd = [
        "ffmpeg", "-i", path,
        "-af", f"silencedetect=noise={noise_db}dB:d={min_duration}",
        "-f", "null", "-",
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    spans = []
    cur_start = None
    for line in result.stderr.splitlines():
        if "silence_start:" in line:
            try:
                cur_start = float(line.split("silence_start:")[1].strip())
            except ValueError:
                cur_start = None
        elif "silence_end:" in line and cur_start is not None:
            try:
                end = float(line.split("silence_end:")[1].split("|")[0].strip())
                spans.append((cur_start, end))
            except ValueError:
                pass
            cur_start = None
    return spans


def parse_intents(message: str) -> dict:
    msg = message.lower()
    intents = {
        "silence": "silence" in msg or "dead air" in msg,
        "filler": "filler" in msg or " um " in f" {msg} " or " uh " in f" {msg} ",
        "repeat": "repeat" in msg or "bad take" in msg or "best take" in msg,
        "reframe": any(w in msg for w in ["vertical", "reframe", "9:16", "tiktok", "portrait"]),
        "grade": any(w in msg for w in ["color grade", "grading", "cinematic", "vintage", "warm tone", "cool tone", "vibrant", "punchy", "black and white", "b&w"]),
    }
    if not any(intents.values()):
        intents["silence"] = True
        intents["filler"] = True
    return intents


@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")


@app.route("/api/upload", methods=["POST"])
def upload():
    f = request.files.get("video")
    if f is None or f.filename == "":
        return jsonify({"error": "no file"}), 400

    video_id = uuid.uuid4().hex[:12]
    folder = os.path.join(UPLOAD_DIR, video_id)
    os.makedirs(folder, exist_ok=True)
    orig_path = os.path.join(folder, "original.mp4")
    f.save(orig_path)

    try:
        duration = get_duration(orig_path)
        info = probe(orig_path)
        vstream = next((s for s in info.get("streams", []) if s.get("codec_type") == "video"), None)
        width = int(vstream["width"]) if vstream else 0
        height = int(vstream["height"]) if vstream else 0
    except Exception as e:
        return jsonify({"error": f"could not read video: {e}"}), 400

    peaks = extract_waveform_peaks(orig_path)

    return jsonify({
        "video_id": video_id,
        "duration": duration,
        "width": width,
        "height": height,
        "has_audio": has_audio_stream(orig_path),
        "peaks": peaks,
    })


@app.route("/api/stream")
def stream():
    video_id = request.args.get("video_id", "")
    message = request.args.get("message", "")
    folder = video_folder(video_id)
    orig_path = os.path.join(folder, "original.mp4")

    def sse(event: str, data: dict) -> str:
        return f"event: {event}\ndata: {json.dumps(data)}\n\n"

    def generate():
        intents = parse_intents(message)
        duration = get_duration(orig_path)
        cut_spans: list[Segment] = []

        yield sse("status", {"text": "Analyzing " + message.strip()[:80] if message.strip() else "Analyzing video..."})
        time.sleep(0.2)

        if intents["silence"]:
            yield sse("status", {"text": "Scanning for silence..."})
            for s, e in detect_silence(orig_path):
                cut_spans.append(Segment(s, e))
                yield sse("cut", {"start": s, "end": e, "label": "silence", "track": "A1"})
                time.sleep(0.1)

        if intents["filler"]:
            yield sse("status", {"text": "Transcribing with Whisper..."})
            words = transcribe_words(orig_path, "base")
            phrases = [(w,) for w in DEFAULT_FILLERS]
            spans, matches = find_filler_spans(words, phrases, 0.06)
            yield sse("status", {"text": f"Found {len(matches)} filler word(s)"})
            for seg, (_, _, text) in zip(spans, matches):
                cut_spans.append(seg)
                yield sse("cut", {"start": seg.start, "end": seg.end, "label": text.strip(), "track": "V1"})
                time.sleep(0.15)

        if intents["repeat"]:
            yield sse("status", {"text": "Checking for repeated takes..."})
            segments = transcribe_segments(orig_path, "base")
            spans, decisions = find_repeats(segments, 0.75, 15.0, 3)
            yield sse("status", {"text": f"Found {len(decisions)} repeated take(s)"})
            for seg, (earlier, later, ratio) in zip(spans, decisions):
                cut_spans.append(seg)
                yield sse("cut", {"start": seg.start, "end": seg.end, "label": "repeated take", "track": "V1"})
                time.sleep(0.15)

        edited_path = os.path.join(folder, "edited.mp4")

        if intents["reframe"] or intents["grade"]:
            yield sse("status", {"text": "Rendering (reframe/color grade)..."})
            current = orig_path
            if cut_spans:
                keep = invert_ranges(cut_spans, duration)
                cut_and_concat(orig_path, keep, edited_path, has_audio=has_audio_stream(orig_path))
                current = edited_path
            # Each step writes to a temp file, never in place - ffmpeg can't
            # safely read and write the same path in one invocation.
            if intents["reframe"]:
                tmp = os.path.join(folder, "_tmp_reframe.mp4")
                _run_reframe(current, tmp)
                os.replace(tmp, edited_path)
                current = edited_path
            if intents["grade"]:
                tmp = os.path.join(folder, "_tmp_grade.mp4")
                _run_grade(current, tmp)
                os.replace(tmp, edited_path)
                current = edited_path
            yield sse("done", {"edited_url": f"/media/{video_id}/edited", "cuts": len(cut_spans)})
            return

        if cut_spans:
            yield sse("status", {"text": "Rendering edited video..."})
            keep = invert_ranges(cut_spans, duration)
            cut_and_concat(orig_path, keep, edited_path, has_audio=has_audio_stream(orig_path))
            yield sse("done", {"edited_url": f"/media/{video_id}/edited", "cuts": len(cut_spans)})
        else:
            yield sse("done", {"edited_url": None, "cuts": 0})

    return Response(stream_with_context(generate()), mimetype="text/event-stream")


def _run_reframe(src: str, dst: str) -> None:
    script = os.path.join(TOOLS_DIR, "auto_reframe.py")
    subprocess.run([sys.executable, script, src, dst, "--aspect", "9:16"], check=True, cwd=TOOLS_DIR)


def _run_grade(src: str, dst: str) -> None:
    script = os.path.join(TOOLS_DIR, "color_grade.py")
    subprocess.run([sys.executable, script, src, dst, "--preset", "cinematic"], check=True, cwd=TOOLS_DIR)


@app.route("/media/<video_id>/<which>")
def media(video_id, which):
    folder = video_folder(video_id)
    fname = "original.mp4" if which == "original" else "edited.mp4"
    path = os.path.join(folder, fname)
    if not os.path.isfile(path):
        abort(404)
    return send_file(path, mimetype="video/mp4", conditional=True)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5057))
    print(f"Open http://127.0.0.1:{port} in your browser.")
    app.run(host="127.0.0.1", port=port, threaded=True, debug=False)
