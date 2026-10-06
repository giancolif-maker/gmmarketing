#!/usr/bin/env bash
# Full build: cues → expressive TTS (Chatterbox) → frames/index → music carve → lint.
# Usage: CB_PY=/path/to/chatterbox-venv/bin/python KOKORO_DIR=/path/to/kokoro-model tools/build-all.sh
# (Kokoro is only needed once, to make the character reference clips in build/vo-ref/.)
set -euo pipefail
cd "$(dirname "$0")/.."
node tools/export-lines.mjs
[ -d build/vo-ref ] || python3 tools/tts-cb.py --refs --kokoro "${KOKORO_DIR:?set KOKORO_DIR to the folder with kokoro-v1.0.onnx + voices-v1.0.bin}"
TQDM_DISABLE=1 "${CB_PY:?set CB_PY to a python with chatterbox-tts, faster-whisper, librosa}" tools/tts-cb.py
python3 tools/synth-audio.py --seconds 1180
node tools/build-frames.mjs
node tools/build-storyboard.mjs >/dev/null
node "$HOME/.claude/skills/hyperframes-audio/scripts/carve.mjs" --comp index.html --bed music-bed --strength 0.6 --core tools
npx hyperframes lint | tail -1
