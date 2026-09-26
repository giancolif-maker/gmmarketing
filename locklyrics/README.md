# LockLyrics

A free, open-source macOS menu-bar app that shows synced lyrics on your **lock
screen**. Words light up one at a time as they're sung. It's a free alternative
to [Verci](https://www.verci.xyz).

- **Players:** Spotify and Apple Music (read via AppleScript, only while they're running)
- **Lyrics:** [LRCLIB](https://lrclib.net), a free, open lyrics database that needs no API key
- **Styles:**
  - **Words** (default): one huge word at a time, with the words just sung
    shrinking away above it and the next word waiting below in a highlight chip
  - **Words + emoji:** the same, with an emoji beside matching words (about 400 words mapped)
  - **Lines:** previous, current and next line
  - **Drift:** a receding 3D wall
  - **Lens:** fisheye-style magnify and blur
- **Colors:** pick lyric, highlight and secondary colors yourself, or turn on
  **Auto Sync** to take them from the album artwork
- **Show on:** lock screen only, or always (as a click-through desktop overlay)
- **Stays lit:** keeps the display awake while lyrics play on the lock screen
- Lyrics offset, text size, position, launch at login, and a 10-second desktop preview

Requires macOS 14 (Sonoma) or later.

## Build and install

You need Xcode or the Command Line Tools (`xcode-select --install`).

```bash
cd locklyrics
./build-app.sh --install     # builds build/LockLyrics.app and copies it to /Applications
./build-app.sh --dmg         # or build a drag-to-install build/LockLyrics.dmg
```

Open **LockLyrics** from Applications. A ♫ icon appears in the menu bar. Play
something, then lock your Mac (⌃⌘Q).

On first run, macOS asks whether LockLyrics can control Spotify or Music. Click
**OK**. If you denied it, the menu shows **Allow access to…**, or you can go to
System Settings → Privacy & Security → Automation.

Since the app is ad-hoc signed and not notarized, a Mac that didn't build it
will block the first launch. Right-click the app → **Open**, or allow it under
System Settings → Privacy & Security.

## How it works

| Piece | File |
| --- | --- |
| Now playing (track, position, artwork) via AppleScript | `Sources/LockLyrics/PlayerReader.swift` |
| Playback clock, lyrics and artwork fetching, lock-state tracking | `Sources/LockLyrics/AppState.swift` |
| LRC and enhanced-LRC parsing, word-timing estimation | `Sources/LyricsCore/LRCParser.swift` |
| LRCLIB lookup (exact match, then fuzzy search with cleaned titles) | `Sources/LyricsCore/LRCLibClient.swift` |
| Lock-screen window (private SkyLight API) | `Sources/LockLyrics/SkyLight.swift` |
| Overlay window, visibility, display-awake assertion | `Sources/LockLyrics/OverlayController.swift` |
| The display styles | `Sources/LockLyrics/LyricsOverlayView.swift` |
| Album-art palette | `Sources/LockLyrics/PaletteExtractor.swift` |

**Word timing.** When LRCLIB has word-level tags (enhanced LRC), those are used
as-is. Most tracks only have line timestamps. For those, the app spreads the
line's time across its words, weighted by word length and pauses at
punctuation. The menu shows which kind the current song has. If highlighting
runs early or late, adjust **Lyrics offset** in Settings.

**Lock screen.** macOS hides normal windows when the screen is locked.
LockLyrics uses the private SkyLight framework to create a window-server space
above the lock screen and moves its overlay there. This is the same technique
other lock-screen widget apps use. Because it's private API, a future macOS
update could break it. If that happens, the menu says so and **Always** mode
still works on the desktop.

## Development

The platform-independent logic lives in `LyricsCore` and has tests. They also
run on Linux:

```bash
swift test
LOCKLYRICS_NETWORK_TESTS=1 swift test   # also hits the real LRCLIB API
```

## Differences from Verci

- Lyrics come from the community LRCLIB database, so word-level timing is
  usually estimated rather than exact, and some tracks have no synced lyrics.
- The Lens style uses SwiftUI scale and blur, not a Metal shader.
- The Words + emoji style uses emoji only, not SF Symbols.
