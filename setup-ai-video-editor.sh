#!/usr/bin/env bash
# One-time setup for chat-driven video editing with Claude Code.
# Installs (all free, permanent, no subscriptions beyond your existing Claude Pro plan):
#   - ffmpeg       (video cutting, transitions, overlays, caption burn-in)
#   - auto-editor  (auto-detects and removes silence/dead air)
#   - Claude Code  (the chat interface that writes/runs the ffmpeg/auto-editor commands)
#
# Usage:
#   bash setup-ai-video-editor.sh
# Then open a NEW terminal window so your PATH picks up the newly installed tools.

set -euo pipefail

log() { printf '\n==> %s\n' "$1"; }

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This script is written for macOS. Detected: $(uname -s)." >&2
  echo "You can still install the pieces manually: ffmpeg, auto-editor (pip), and Claude Code (npm)." >&2
  exit 1
fi

# 1. Homebrew (package manager for ffmpeg, python, node)
if ! command -v brew &>/dev/null; then
  log "Installing Homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  if [[ -x /opt/homebrew/bin/brew ]]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
  elif [[ -x /usr/local/bin/brew ]]; then
    eval "$(/usr/local/bin/brew shellenv)"
  fi
else
  log "Homebrew already installed."
fi

# 2. ffmpeg
if ! command -v ffmpeg &>/dev/null; then
  log "Installing ffmpeg..."
  brew install ffmpeg
else
  log "ffmpeg already installed ($(ffmpeg -version | head -n1))."
fi

# 3. Python + pip (needed for auto-editor)
if ! command -v python3 &>/dev/null; then
  log "Installing Python..."
  brew install python
else
  log "Python already installed ($(python3 --version))."
fi

# 4. auto-editor
if ! command -v auto-editor &>/dev/null; then
  log "Installing auto-editor..."
  python3 -m pip install --user --upgrade auto-editor
else
  log "auto-editor already installed ($(auto-editor --version))."
fi

# 5. Node.js (needed for Claude Code)
if ! command -v node &>/dev/null; then
  log "Installing Node.js..."
  brew install node
else
  log "Node.js already installed ($(node --version))."
fi

# 6. Claude Code
if ! command -v claude &>/dev/null; then
  log "Installing Claude Code..."
  npm install -g @anthropic-ai/claude-code
else
  log "Claude Code already installed ($(claude --version 2>/dev/null || echo installed))."
fi

log "Done!"
cat <<'EOF'

Next steps:
  1. Close this terminal and open a NEW one (so your PATH updates).
  2. Put your video file in its own folder.
  3. cd into that folder.
  4. Run: claude
  5. Tell it what edit you want, e.g.:
     "Use auto-editor to cut the dead air out of interview.mp4, output as interview_cut.mp4"

If a command above needed 'sudo' or failed due to permissions, re-run this
script and follow the on-screen instructions from Homebrew/npm.
EOF
