# Chat-driven video editing with Claude Code (free, using your Pro plan)

A free, local alternative to AI editing plugins like AutoEdit — same rough-cut
automation (silence/filler/repeat removal, auto reframe, captions), driven by
chat instead of a paid Premiere Pro plugin.

## One-time setup

1. Download `setup-ai-video-editor.sh` and the `tools/` folder (keep them together).
2. Open Terminal, `cd` to wherever you saved them.
3. Run: `bash setup-ai-video-editor.sh`
4. Open a **new** terminal window when it finishes (so your PATH updates).

This installs, all free and permanent — no subscriptions beyond your existing Claude Pro:
- **ffmpeg** — does the actual cutting, transitions, overlays, captions burn-in
- **auto-editor** — detects and removes silence/dead air automatically
- **openai-whisper** — speech transcription, used for filler-word cutting, bad-take detection, and captions
- **opencv-python** — face detection, used for auto-reframing to vertical/square
- **Claude Code** — the chat interface that writes and runs all of the above for you

## Every time you want to edit a video

1. Put your video file **and the `tools/` folder** in the same working folder.
2. In Terminal: `cd` into that folder.
3. Run: `claude`
4. Just talk to it. Some examples of what to type:

**Cutting silence**
> "Use auto-editor to cut the dead air and silences out of interview.mp4, output as interview_cut.mp4"

**Cutting filler words ("um", "uh", "like"...)**
> "Run tools/remove_filler_words.py on interview.mp4 with --dry-run first, show me what it would cut, then run it for real as interview_clean.mp4"

This mirrors AutoEdit's filler/clutter removal: it transcribes with Whisper
(word-level timestamps), finds filler words, and cuts them with padding so it
doesn't clip real speech. Default word list is conservative (um, uh, erm,
hmm...); add `--aggressive` to also cut "like", "you know", "basically", etc.
Always review the `--dry-run` list before committing to a cut — it's a
heuristic, not perfect.

**Cutting repeated takes / bad takes**
> "Run tools/remove_repeated_takes.py on interview.mp4 with --dry-run, show me the repeats it found, then apply it as interview_besttakes.mp4"

Transcribes the video, finds segments that are near-duplicates of each other
(you flubbing a line and re-saying it), and keeps the later ("best") attempt.
Same idea as AutoEdit's bad-take detection. Read the dry-run output before
trusting it — always double-check.

**Auto reframe to vertical (TikTok/Reels/Shorts)**
> "Run tools/auto_reframe.py on interview.mp4 to convert it to vertical 9:16, output as interview_vertical.mp4, scaled to 1080x1920"

Tracks the main face across the shot (OpenCV) and pans a 9:16 crop to follow
it, instead of a static center crop. Falls back to a static center crop if no
face is found. Works best on a single clear subject; for multi-person shots,
review the result and consider a manual crop instead.

**Color grading**
> "Run tools/color_grade.py on interview.mp4 with --preset cinematic, preview a frame first before doing the full video"

Presets: `vintage`, `cross-process`, `faded`, `cinematic` (teal/orange),
`warm`, `cool`, `bw`, `vibrant`, `punchy` — or skip the preset and dial in
`--brightness` / `--contrast` / `--saturation` / `--gamma` /
`--temperature` (Kelvin, 6500=neutral, lower=warmer, higher=cooler)
manually. Presets and manual adjustments can be combined. Use `--preview`
to render one frame first instead of the whole video, so you can check the
look before committing to a full re-encode.

**Transitions**
> "I have intro.mp4 and main.mp4 in this folder. Combine them with a 1 second crossfade transition between them."

**Text / graphic overlays**
> "Add a title card that says 'Chapter 1: Getting Started' for the first 3 seconds of the video, white text, black background."

**Captions**
> "Generate burned-in captions for interview_cut.mp4 using Whisper, styled like TikTok captions — bold, centered, yellow text."

**B-roll (manual, since AI generation isn't free)**
> "I have a clip called broll_typing.mp4. Overlay it picture-in-picture in the bottom right corner from 0:15 to 0:20 of main_cut.mp4."
(Grab free B-roll from Pexels or Pixabay first — those are free stock footage libraries, no attribution required.)

**Chaining steps together**
> "First cut the silences out of raw.mp4, then remove filler words, then cut repeated takes, then reframe to vertical, then burn in captions, then export as final.mp4"

Claude Code will write the ffmpeg/auto-editor commands (or run the `tools/`
scripts), run them, and tell you what it did. If something looks wrong, just
say so — "that transition is too long, make it 0.5 seconds" — and it'll redo it.

## The `tools/` scripts

Three standalone Python scripts, meant to be run directly or via Claude Code:

- `tools/remove_filler_words.py` — cut filler words using Whisper word timestamps
- `tools/remove_repeated_takes.py` — cut repeated/bad takes using Whisper + text similarity
- `tools/auto_reframe.py` — face-tracking crop to reframe horizontal → vertical/square
- `tools/color_grade.py` — presets or manual brightness/contrast/saturation/gamma/temperature grading

All three support `--dry-run` or print what they're about to do before writing
output — read that before trusting the result on anything you care about.
Run `python3 tools/<script>.py --help` for the full option list.

## Notes

- This all runs locally on your Mac. Nothing is uploaded anywhere, so there's no per-minute processing fee like the SaaS tools.
- Claude Code usage counts against your existing Pro plan limits — no separate charge.
- The filler-word, bad-take, and auto-reframe tools are heuristics (transcription + text/face matching), not perfect. They're meant to handle the tedious first pass, the same way AutoEdit describes itself — you still review before publishing.
- What's *not* included here, unlike some paid tools: multicam "podcast mode" camera switching, and AI B-roll generation. B-roll stays a manual step (grab free stock footage and ask Claude Code to overlay it, per the example above).
