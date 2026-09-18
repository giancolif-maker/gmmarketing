# Free Self-Hosted Video Backend

This is the "free forever, unlimited" tier for the Video Studio in this repo.
It runs an **open-source** video generation model on hardware you control, so
there's no per-generation fee and no vendor account — unlike Muapi/Seedance/
Higgsfield, which meter every request against a paid API.

Read this before you turn it on:

- **"Free" means you supply the compute, not that generation is costless.**
  You need a real GPU (yours, or a rented one) and it'll use real
  electricity/GPU-hours. There's no fee *per video* and no account required,
  but it's not magic — quality and speed are limited by whatever hardware
  you point this at.
- **This will not match Seedance 2.5 / Higgsfield's quality out of the box.**
  Those are large, heavily-optimized, closed models running on datacenter
  GPUs. Open models (LTX-Video, Wan 2.2, HunyuanVideo, CogVideoX, etc.) have
  closed the gap a lot but aren't at that tier yet. This is a genuinely free,
  unlimited alternative — not a drop-in equivalent.
- **This code was written to the documented `diffusers` API but hasn't been
  run end-to-end here** (this repo was assembled in a sandbox with no GPU).
  Before relying on it: `pip install -r requirements.txt`, start it, and
  actually generate a test clip. If your installed `diffusers` version's
  pipeline signature differs from what `app.py` expects, you'll likely need
  to tweak the `pipe(...)` call in `_run_job()`.
- **Check each model's license before you rely on it**, especially for
  commercial use. Model licenses on Hugging Face change over time — look at
  the specific model page for `MODEL_ID` before shipping anything built on
  its output.

## Hardware

| | Minimum | Recommended |
|---|---|---|
| GPU | NVIDIA, 16GB VRAM | 24GB+ VRAM |
| CPU-only | Works, but expect minutes-to-hours per clip | — |
| Disk | ~20-40GB for model weights | — |

No NVIDIA GPU available? See **[Free GPU hosting](#free-gpu-hosting-no-hardware-needed)**
below — you can run this on Kaggle/Colab's free GPUs instead.

## Setup

```bash
cd studio/self-hosted-server
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8000
```

First request will download the model weights (large — this can take a
while) and load them into GPU memory; subsequent requests reuse the loaded
pipeline.

Then in the studio app: **Settings → Free / Self-Hosted Server URL** →
`http://localhost:8000` (the default, already pre-filled). Video Studio
defaults to "⚡ Free Mode", which only shows models tagged `provider: "free"`
in `packages/studio/src/models.js` and routes generation/uploads here
instead of Muapi.

## Swapping the model

Set `MODEL_ID` to any `diffusers`-compatible text/image-to-video pipeline
on Hugging Face, e.g.:

```bash
MODEL_ID="Lightricks/LTX-Video" uvicorn app:app --port 8000       # default — lighter weight
MODEL_ID="Wan-AI/Wan2.2-T2V-A14B-Diffusers" uvicorn app:app --port 8000
```

The two model entries wired up in the studio app (`free-ltx-video-t2v` /
`free-wan2.2-t2v` and their `-i2v` counterparts) both call this same server —
`MODEL_ID` decides which one it actually runs. Point it at whichever model
you have set up.

## API contract (what `selfHosted.js` expects)

- `GET /health` → `{status, model, cuda, loaded}`
- `POST /api/v1/generate` `{model, prompt, aspect_ratio, duration, resolution, image_url?}` → `{job_id}`
- `GET /api/v1/jobs/{job_id}` → `{status: "queued"|"running"|"completed"|"failed", url?, error?}`
- `POST /api/v1/upload` (multipart `file`) → `{url}` — served back from `/files/...`

No auth on any of these. If you expose this server beyond `localhost`, put
it behind your own auth/reverse proxy — as written, anyone who can reach the
port can queue generations and read uploaded files.

## Free GPU hosting (no hardware needed)

Don't own a GPU? **[`free_gpu_notebook.ipynb`](free_gpu_notebook.ipynb)** runs
this exact server on a free Kaggle or Colab GPU and exposes it to your
browser with a free Cloudflare quick tunnel (no ngrok account needed).

Quick version:

1. Upload `free_gpu_notebook.ipynb` to [kaggle.com/code](https://www.kaggle.com/code)
   (New Notebook → File → Import Notebook) or [colab.research.google.com](https://colab.research.google.com).
2. **Kaggle:** in the notebook's Settings panel, set Accelerator → **GPU T4 x2**
   and Internet → **On**.
   **Colab:** Runtime → Change runtime type → **T4 GPU**.
3. Run every cell top to bottom. The last cell prints a `https://*.trycloudflare.com`
   URL.
4. Paste that URL into the studio app's **Settings → Free / Self-Hosted
   Server URL**.

Why Kaggle over the alternatives: it's the only free tier with a fixed,
no-card, resets-every-week allowance (30 GPU-hours/week) rather than a
shrinking promo credit (Modal, Lightning AI) or a quota too small for real
use (Hugging Face Spaces ZeroGPU is ~5 min/day free). It's still not
*unlimited* — treat it as "run a session, generate a batch, close it" rather
than an always-on server, and expect a **new URL every time you restart**
the notebook (update Settings again when that happens).

This pattern (notebook + web server + tunnel) is a widely-used community
workaround, not an officially documented supported use case on Kaggle/Colab
— fine for personal, occasional use; don't expect it to hold up under
heavy, continuous, or commercial traffic.
