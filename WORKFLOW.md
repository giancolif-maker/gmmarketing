# Chat-driven video editing with Claude Code (free, using your Pro plan)

## One-time setup

1. Download `setup-ai-video-editor.sh`.
2. Open Terminal, `cd` to wherever you saved it.
3. Run: `bash setup-ai-video-editor.sh`
4. Open a **new** terminal window when it finishes (so your PATH updates).

This installs three things, all free and permanent — no subscriptions beyond your existing Claude Pro:
- **ffmpeg** — does the actual cutting, transitions, overlays, captions burn-in
- **auto-editor** — detects and removes silence/dead air automatically
- **Claude Code** — the chat interface that writes and runs the ffmpeg/auto-editor commands for you

## Every time you want to edit a video

1. Put your video file in its own folder.
2. In Terminal: `cd` into that folder.
3. Run: `claude`
4. Just talk to it. Some examples of what to type:

**Cutting silence / filler words**
> "Use auto-editor to cut the dead air and silences out of interview.mp4, output as interview_cut.mp4"

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
> "First cut the silences out of raw.mp4, then add the intro.mp4 before it with a crossfade, then burn in captions, then export as final.mp4"

Claude Code will write the ffmpeg/auto-editor commands, run them, and tell you what it did. If something looks wrong, just say so — "that transition is too long, make it 0.5 seconds" — and it'll redo it.

## Notes

- This all runs locally on your Mac. Nothing is uploaded anywhere, so there's no per-minute processing fee like the SaaS tools.
- Claude Code usage counts against your existing Pro plan limits — no separate charge.
- Whisper-based captioning needs an extra one-time install; just ask Claude Code to "install whisper for captioning" the first time you request captions and it'll handle it.
