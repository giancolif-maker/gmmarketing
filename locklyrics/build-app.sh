#!/usr/bin/env bash
# Builds LockLyrics.app (and optionally a .dmg) on macOS. Requires Xcode or the
# Xcode Command Line Tools (Swift 5.9+).
#
#   ./build-app.sh            -> build/LockLyrics.app
#   ./build-app.sh --dmg      -> also build/LockLyrics.dmg
#   ./build-app.sh --install  -> also copy to /Applications
set -euo pipefail
cd "$(dirname "$0")"

swift build -c release --arch arm64 --arch x86_64 2>/dev/null \
  || swift build -c release   # fall back to the host architecture only
BIN_DIR="$(swift build -c release --show-bin-path 2>/dev/null)"
if [[ -f .build/apple/Products/Release/LockLyrics ]]; then
  BIN_DIR=.build/apple/Products/Release   # universal build output
fi

APP=build/LockLyrics.app
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
cp "$BIN_DIR/LockLyrics" "$APP/Contents/MacOS/LockLyrics"
cp Resources/Info.plist "$APP/Contents/Info.plist"

# Ad-hoc signature so macOS remembers the Automation (Apple Events) permission.
codesign --force --deep --sign - "$APP"
echo "Built $APP"

for arg in "$@"; do
  case "$arg" in
    --dmg)
      STAGE=$(mktemp -d)
      cp -R "$APP" "$STAGE/"
      ln -s /Applications "$STAGE/Applications"
      hdiutil create -volname LockLyrics -srcfolder "$STAGE" -ov -format UDZO build/LockLyrics.dmg
      rm -rf "$STAGE"
      echo "Built build/LockLyrics.dmg"
      ;;
    --install)
      rm -rf /Applications/LockLyrics.app
      cp -R "$APP" /Applications/
      echo "Installed to /Applications/LockLyrics.app"
      ;;
  esac
done
