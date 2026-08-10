# ULTRON Orb UI

> Vendored from [SAGAR-TAMANG/ultron-by-sagar-builds](https://github.com/SAGAR-TAMANG/ultron-by-sagar-builds) (MIT License, see `LICENSE`), added here as a standalone project.

An Iron Man–inspired holographic orb built with **Next.js**, **Three.js**, and **MediaPipe** hand tracking — control it with your bare hands through your webcam.

> 🔮 This is the open-source **interface** of [ULTRON](https://sagartamang.com/projects/ultron) — my AI that talks in real time and controls Android devices by itself. **[Read the write-up](https://sagartamang.com/projects/ultron)** or **[the X post](https://x.com/sagar_builds/status/2077277583646101921)**

> 📱 **[Watch the demo on Instagram](https://www.instagram.com/p/DayJ17OTwvx/)**

![ULTRON orb UI](docs/screenshot.png)

https://github.com/user-attachments/assets/91578a83-9a27-44e8-84b0-96defcfd7366

> 🧠 This fork adds a real **brain and a pair of hands**: talk to the orb and it
> replies out loud, and it can drive its own web browser — open sites, read
> them, click, type — to actually do what you ask. See
> [Brain & browser control](#brain--browser-control) below.

## Getting started

```bash
npm install
npx playwright install chromium   # one-time, downloads the browser ULTRON drives
cp .env.example .env               # then fill in LLM_API_KEY (see below)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Controls

### Mouse / touch

| Input | Action |
| --- | --- |
| Drag | Spin the orb |
| Scroll / pinch | Zoom in & out |

### Hand gestures (webcam)

Click **GESTURES OFF** (or press `G`) and allow camera access, then:

| Gesture | Action |
| --- | --- |
| Pinch (thumb + index) one hand and move it | Spin the orb |
| Pinch with **both** hands, spread apart / bring together | Zoom in / out |

### Keyboard

| Key | Action |
| --- | --- |
| `G` | Toggle hand gestures |
| `R` | Reset the view |
| `+` / `−` | Zoom in / out |

## Brain & browser control

The panel in the top-right lets you **talk** to ULTRON (or type, as a
fallback) and watch it act. Under the hood:

1. **Speech in/out** — the browser's built-in Web Speech API
   (`SpeechRecognition` for mic → text, `speechSynthesis` for text → voice).
   Free, no extra keys, works in Chrome/Edge today. Typing always works too,
   even in browsers without speech support.
2. **The brain** — `POST /api/agent` sends your message + conversation history
   to an LLM with tool-calling, using **any OpenAI-compatible provider**
   (OpenRouter or Groq both work out of the box — see `.env.example`). The
   model decides what to do and calls tools to do it.
3. **The hands** — `lib/browserAgent.ts` drives a dedicated Chromium instance
   via [Playwright](https://playwright.dev). The model gets tools to
   `read_page`, `browser_navigate`, `browser_click`, `browser_type`,
   `browser_scroll`, and `browser_go_back`; each page read tags every visible
   clickable/typeable element with a ­numeric id the model can act on.
4. **The eyes (for you)** — click **SHOW VIEW** in the panel to open a live
   feed (`GET /api/agent/screenshot`, polled) of exactly what ULTRON's
   browser is looking at, alongside a running log of every action it took.

**Important — this is a separate, dedicated browser, not your personal
Chrome.** It opens its own fresh, empty automated profile (visible on your
screen by default, since seeing it is the point) with no access to your
existing logins, cookies, or history unless you sign in inside that window
yourself. That's intentional: it keeps an autonomous agent from silently
reusing your real accounts. It's also restricted to `http(s)` URLs, and the
system prompt tells it to describe risky/irreversible actions (payments,
deleting things, messaging others) and ask before doing them rather than
just doing them — but it's still an LLM-driven agent, so keep an eye on the
live view, especially the first few times.

Set `ULTRON_BROWSER_HEADLESS=true` in `.env` to run without a visible window
(e.g. on a headless server) — it falls back to headless automatically if no
display is available anyway.

## How it works

- **`lib/orbScene.ts`** — the Three.js scene: layered wireframe shells, a spiral
  inner core, floating code-text sprites, orbiting debris, dust particles, scan
  rings, and a bloom + chromatic-aberration post-processing stack. Also
  exposes `setActivity(level)`, which the voice panel uses to make the orb
  glow harder while listening/thinking/speaking.
- **`lib/handTracker.ts`** — MediaPipe HandLandmarker running on the webcam
  feed. Pinch detection with hysteresis: one pinched hand spins the orb, two
  pinched hands zoom by spreading apart or together.
- **`components/JarvisOrb.tsx`** — the HUD and glue between the scene, the
  tracker, and your inputs.
- **`components/VoiceControl.tsx`** — mic/type input, TTS playback, action
  log, and the live browser-view panel.
- **`lib/llmClient.ts`** — minimal fetch-based OpenAI-compatible
  chat-completions client (works with OpenRouter, Groq, or anything else
  speaking that wire format).
- **`lib/browserAgent.ts`** — the Playwright-backed browser session
  (singleton, survives dev-server hot reload) plus page-state extraction.
- **`lib/agentTools.ts`** — tool schemas + dispatcher bridging the model's
  tool calls to `browserAgent`.
- **`app/api/agent/route.ts`** — the tool-calling loop (up to 8 steps/turn).

## License

MIT
