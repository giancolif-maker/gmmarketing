"""Free, self-hosted video-generation backend for the Open Higgsfield AI studio.

Runs an open-source text/image-to-video diffusion model on YOUR OWN hardware
and exposes it over the small HTTP API that studio/packages/studio/src/selfHosted.js
expects. There is no API key and no per-generation billing here — the only
cost is whatever compute you point this at (a local GPU, or a rented one).

This is a reference implementation, not the polished, heavily-optimized
pipeline something like Higgsfield/Seedance runs in the cloud. Swap MODEL_ID
for whatever open video model you want to run; adjust the pipeline call
below if your installed `diffusers` version's API differs (video-model
pipelines in `diffusers` change fairly often between releases).

Run:
    pip install -r requirements.txt
    uvicorn app:app --host 0.0.0.0 --port 8000

Then point the studio app's Settings -> "Free / Self-Hosted Server URL" at
http://localhost:8000 (or wherever this is reachable from your browser).
"""

import os
import threading
import uuid
from io import BytesIO
from pathlib import Path
from typing import Optional

import torch
from diffusers import DiffusionPipeline
from diffusers.utils import export_to_video
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from PIL import Image
from pydantic import BaseModel

MODEL_ID = os.environ.get("MODEL_ID", "Lightricks/LTX-Video")
OUTPUT_DIR = Path(os.environ.get("OUTPUT_DIR", "./outputs"))
UPLOAD_DIR = OUTPUT_DIR / "uploads"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*").split(",")

app = FastAPI(title="Open Higgsfield AI — Free Self-Hosted Video Backend")
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/files", StaticFiles(directory=str(OUTPUT_DIR)), name="files")

_pipeline = None
_pipeline_lock = threading.Lock()
_jobs = {}  # job_id -> {"status": ..., "url": ..., "error": ...}


def get_pipeline():
    global _pipeline
    with _pipeline_lock:
        if _pipeline is None:
            print(f"[self-hosted-server] Loading {MODEL_ID} — first run can take a while "
                  f"(downloading + loading weights)...")
            dtype = torch.bfloat16 if torch.cuda.is_available() else torch.float32
            pipe = DiffusionPipeline.from_pretrained(MODEL_ID, torch_dtype=dtype)
            if torch.cuda.is_available():
                if hasattr(pipe, "enable_model_cpu_offload"):
                    pipe.enable_model_cpu_offload()
                else:
                    pipe.to("cuda")
            else:
                print("[self-hosted-server] WARNING: no CUDA GPU detected — running on CPU, "
                      "this will be extremely slow (potentially many minutes per second of video).")
                pipe.to("cpu")
            _pipeline = pipe
        return _pipeline


class GenerateRequest(BaseModel):
    model: Optional[str] = None
    prompt: str = ""
    aspect_ratio: Optional[str] = None
    duration: Optional[int] = None
    resolution: Optional[str] = None
    image_url: Optional[str] = None


def _resolution_to_size(resolution: Optional[str], aspect_ratio: Optional[str]):
    heights = {"480p": 480, "512p": 512, "720p": 720, "768p": 768, "1080p": 1080}
    h = heights.get(resolution, 512)
    w = h
    if aspect_ratio == "16:9":
        w = round(h * 16 / 9)
    elif aspect_ratio == "9:16":
        w = round(h * 9 / 16)
    # most video diffusion models require dimensions divisible by 8 (some need 32)
    w = max(64, (w // 8) * 8)
    h = max(64, (h // 8) * 8)
    return w, h


def _load_image(image_url: str) -> Image.Image:
    if image_url.startswith("data:"):
        import base64
        header, b64data = image_url.split(",", 1)
        return Image.open(BytesIO(base64.b64decode(b64data))).convert("RGB")
    if image_url.startswith("/"):
        # a path served by this same server, e.g. /files/uploads/xxx.png
        local_path = OUTPUT_DIR.parent / image_url.lstrip("/")
        return Image.open(local_path).convert("RGB")
    import requests
    resp = requests.get(image_url, timeout=30)
    resp.raise_for_status()
    return Image.open(BytesIO(resp.content)).convert("RGB")


def _run_job(job_id: str, req: GenerateRequest):
    try:
        _jobs[job_id]["status"] = "running"
        pipe = get_pipeline()
        width, height = _resolution_to_size(req.resolution, req.aspect_ratio)
        fps = 24
        num_frames = max(9, (req.duration or 5) * fps)

        kwargs = dict(
            prompt=req.prompt or "a beautiful cinematic scene, high quality, detailed",
            width=width,
            height=height,
            num_frames=num_frames,
        )

        if req.image_url:
            kwargs["image"] = _load_image(req.image_url)

        result = pipe(**kwargs)
        frames = result.frames[0]

        out_name = f"{job_id}.mp4"
        out_path = OUTPUT_DIR / out_name
        export_to_video(frames, str(out_path), fps=fps)

        _jobs[job_id] = {"status": "completed", "url": f"/files/{out_name}"}
    except Exception as exc:  # noqa: BLE001 - report any failure back to the client
        _jobs[job_id] = {"status": "failed", "error": str(exc)}


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model": MODEL_ID,
        "cuda": torch.cuda.is_available(),
        "loaded": _pipeline is not None,
    }


@app.post("/api/v1/generate")
def generate(req: GenerateRequest):
    job_id = uuid.uuid4().hex
    _jobs[job_id] = {"status": "queued"}
    thread = threading.Thread(target=_run_job, args=(job_id, req), daemon=True)
    thread.start()
    return {"job_id": job_id}


@app.get("/api/v1/jobs/{job_id}")
def get_job(job_id: str):
    job = _jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Unknown job_id")
    return job


@app.post("/api/v1/upload")
async def upload(file: UploadFile = File(...)):
    ext = Path(file.filename or "upload").suffix or ".png"
    name = f"{uuid.uuid4().hex}{ext}"
    dest = UPLOAD_DIR / name
    with open(dest, "wb") as f:
        f.write(await file.read())
    return {"url": f"/files/uploads/{name}"}
