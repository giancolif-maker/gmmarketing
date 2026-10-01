#!/usr/bin/env bash
# Install Wan2GP (https://github.com/deepbeepmeep/Wan2GP) into a local venv.
# Requires Python 3.11 and an NVIDIA GPU (RTX 20xx-50xx) with CUDA 13 drivers to run.
# Usage: scripts/setup_wan2gp.sh [install_dir]   (default: ../Wan2GP)
set -euo pipefail

INSTALL_DIR="${1:-$(cd "$(dirname "$0")/../.." && pwd)/Wan2GP}"
PYTHON="${PYTHON:-python3.11}"
command -v "$PYTHON" >/dev/null || PYTHON=python3

if [ -d "$INSTALL_DIR/.git" ]; then
  git -C "$INSTALL_DIR" pull --ff-only
else
  git clone --depth 1 https://github.com/deepbeepmeep/Wan2GP.git "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"
[ -d .venv ] || "$PYTHON" -m venv .venv
.venv/bin/pip install -U pip wheel setuptools
.venv/bin/pip install torch==2.10.0 torchvision==0.25.0 torchaudio==2.10.0 \
  --index-url https://download.pytorch.org/whl/cu130
.venv/bin/pip install -r requirements.txt

echo
echo "Wan2GP installed in $INSTALL_DIR"
echo "Start the web UI with: cd \"$INSTALL_DIR\" && .venv/bin/python wgp.py"
