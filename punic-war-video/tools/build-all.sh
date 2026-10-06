#!/usr/bin/env bash
# Full Act 1 build: cues → TTS → frames/index → music carve → lint.
# Usage: KOKORO_DIR=/path/to/kokoro-model tools/build-all.sh
set -euo pipefail
cd "$(dirname "$0")/.."
node tools/export-lines.mjs
python3 tools/tts.py --model "${KOKORO_DIR:?set KOKORO_DIR to the folder with kokoro-v1.0.onnx + voices-v1.0.bin}"
[ -f assets/audio/music/bed.wav ] || python3 tools/synth-audio.py --seconds 420
node tools/build-frames.mjs
node tools/build-storyboard.mjs >/dev/null
node "$HOME/.claude/skills/hyperframes-audio/scripts/carve.mjs" --comp index.html --bed music-bed --strength 0.6 --core tools
npx hyperframes lint | tail -1
