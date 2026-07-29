(() => {
  const TRACKS = ["V4", "V3", "V2", "V1", "A1", "A2", "A3", "A4", "Mix"];
  const ROW_HEIGHT = 32;
  const PX_PER_SEC_MIN = 40;
  const TOTAL_HEIGHT = ROW_HEIGHT * TRACKS.length;

  let videoId = null;
  let duration = 0;
  let peaks = [];
  let cuts = []; // {start, end, label, track, ts}
  let animating = false;

  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("file-input");
  const editor = document.getElementById("editor");
  const canvas = document.getElementById("timeline-canvas");
  const ctx = canvas.getContext("2d");
  const trackHeaders = document.getElementById("track-headers");
  const statusBar = document.getElementById("status-bar");
  const previewVideo = document.getElementById("preview-video");
  const btnOriginal = document.getElementById("btn-original");
  const btnEdited = document.getElementById("btn-edited");
  const downloadLink = document.getElementById("download-link");
  const chatInput = document.getElementById("chat-input");
  const chatSend = document.getElementById("chat-send");

  function buildTrackHeaders() {
    trackHeaders.innerHTML = "";
    TRACKS.forEach((t) => {
      const row = document.createElement("div");
      if (t === "Mix") {
        row.className = "track-header mix";
        row.innerHTML = `<span>Mix</span><span>0.0</span>`;
      } else {
        const selected = t === "V1" || t === "A1";
        row.className = "track-header" + (selected ? " selected" : "");
        const icons = t.startsWith("V") ? "&#128274; &#127909; &#128065;" : "&#128274; M S &#127908;";
        row.innerHTML = `<span class="tnum">${t}</span><span class="icons">${icons}</span>`;
      }
      trackHeaders.appendChild(row);
    });
  }

  // --- Upload ---

  dropzone.addEventListener("click", () => fileInput.click());
  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.classList.add("drag");
  });
  dropzone.addEventListener("dragleave", () => dropzone.classList.remove("drag"));
  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("drag");
    if (e.dataTransfer.files.length) uploadFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener("change", () => {
    if (fileInput.files.length) uploadFile(fileInput.files[0]);
  });

  async function uploadFile(file) {
    dropzone.classList.add("uploading");
    const fd = new FormData();
    fd.append("video", file);
    let data;
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      data = await res.json();
    } catch (err) {
      alert("Upload failed: " + err);
      dropzone.classList.remove("uploading");
      return;
    }
    if (data.error) {
      alert(data.error);
      dropzone.classList.remove("uploading");
      return;
    }
    videoId = data.video_id;
    duration = data.duration;
    peaks = data.peaks;
    previewVideo.src = `/media/${videoId}/original`;
    dropzone.classList.add("hidden");
    editor.classList.remove("hidden");
    buildTrackHeaders();
    resizeCanvas();
    draw();
  }

  // --- Canvas / timeline ---

  function timelineWidth() {
    const scrollEl = document.querySelector(".timeline-scroll");
    const visible = scrollEl.clientWidth;
    return Math.max(visible, duration * PX_PER_SEC_MIN);
  }

  function resizeCanvas() {
    const width = timelineWidth();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = TOTAL_HEIGHT * dpr;
    canvas.style.width = width + "px";
    canvas.style.height = TOTAL_HEIGHT + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function timeToX(t) {
    const width = parseFloat(canvas.style.width || "0");
    if (!duration) return 0;
    return (t / duration) * width;
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function draw() {
    if (!duration) return;
    const width = timelineWidth();
    ctx.clearRect(0, 0, width, TOTAL_HEIGHT);

    TRACKS.forEach((track, i) => {
      const y = i * ROW_HEIGHT;
      ctx.fillStyle = i % 2 === 0 ? "#171a20" : "#14161b";
      ctx.fillRect(0, y, width, ROW_HEIGHT);
      if (track === "V1") drawVideoClip(y, width);
      if (track === "A1") drawWaveform(y, width);
    });

    drawCutOverlays(width);
    drawPlayhead(width);
  }

  function drawVideoClip(y, width) {
    const pad = 4;
    const w = timeToX(duration);
    ctx.fillStyle = "#1f6f7a";
    roundRect(pad, y + pad, Math.max(2, w - 2 * pad), ROW_HEIGHT - 2 * pad, 3);
    ctx.fill();

    cuts
      .filter((c) => c.track === "V1")
      .forEach((c) => {
        const x = timeToX((c.start + c.end) / 2);
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.font = "italic 10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("fx", x, y + 13);
      });
  }

  function drawWaveform(y, width) {
    const pad = 4;
    const innerH = ROW_HEIGHT - 2 * pad;
    const midY = y + ROW_HEIGHT / 2;
    const w = timeToX(duration);
    ctx.fillStyle = "#0f2d33";
    roundRect(pad, y + pad, Math.max(2, w - 2 * pad), innerH, 3);
    ctx.fill();

    if (!peaks.length) return;
    ctx.strokeStyle = "#5fd0e0";
    ctx.lineWidth = 1;
    const n = peaks.length;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const t = (i / n) * duration;
      const x = timeToX(t);
      const h = Math.max(1, peaks[i] * innerH * 0.9);
      ctx.moveTo(x, midY - h / 2);
      ctx.lineTo(x, midY + h / 2);
    }
    ctx.stroke();
  }

  function drawCutOverlays(width) {
    const now = performance.now();
    let stillFading = false;
    cuts.forEach((c) => {
      const x0 = timeToX(c.start);
      const x1 = timeToX(c.end);
      const w = Math.max(2, x1 - x0);
      const age = now - c.ts;
      const flash = Math.max(0, 1 - age / 700);
      if (flash > 0) stillFading = true;
      ["V1", "A1"].forEach((trackName) => {
        const idx = TRACKS.indexOf(trackName);
        const y = idx * ROW_HEIGHT;
        ctx.fillStyle = `rgba(239,68,68,${0.25 + 0.55 * flash})`;
        ctx.fillRect(x0, y + 3, w, ROW_HEIGHT - 6);
      });
    });
    if (stillFading && !animating) {
      animating = true;
      requestAnimationFrame(() => {
        animating = false;
        draw();
      });
    }
  }

  function drawPlayhead(width) {
    const x = timeToX(previewVideo.currentTime || 0);
    ctx.strokeStyle = "#3b6fe0";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, TOTAL_HEIGHT);
    ctx.stroke();
  }

  previewVideo.addEventListener("timeupdate", draw);
  window.addEventListener("resize", () => {
    resizeCanvas();
    draw();
  });

  // --- Chat / SSE ---

  function sendMessage() {
    const msg = chatInput.value.trim();
    if (!msg || !videoId) return;
    chatInput.value = "";
    cuts = [];
    statusBar.classList.remove("hidden");
    statusBar.textContent = "Starting...";
    btnEdited.disabled = true;
    downloadLink.classList.add("hidden");
    draw();

    const es = new EventSource(`/api/stream?video_id=${encodeURIComponent(videoId)}&message=${encodeURIComponent(msg)}`);

    es.addEventListener("status", (e) => {
      const data = JSON.parse(e.data);
      statusBar.textContent = data.text;
    });

    es.addEventListener("cut", (e) => {
      const data = JSON.parse(e.data);
      cuts.push(Object.assign({}, data, { ts: performance.now() }));
      draw();
    });

    es.addEventListener("done", (e) => {
      const data = JSON.parse(e.data);
      statusBar.textContent = data.cuts
        ? `Done - ${data.cuts} cut(s) made.`
        : "Done - nothing to change.";
      if (data.edited_url) {
        btnEdited.disabled = false;
        downloadLink.href = data.edited_url;
        downloadLink.classList.remove("hidden");
        btnEdited.click();
      }
      es.close();
    });

    es.onerror = () => {
      statusBar.textContent = "Connection error - is the server still running?";
      es.close();
    };
  }

  chatSend.addEventListener("click", sendMessage);
  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessage();
  });

  btnOriginal.addEventListener("click", () => {
    previewVideo.src = `/media/${videoId}/original`;
    btnOriginal.classList.add("active");
    btnEdited.classList.remove("active");
  });
  btnEdited.addEventListener("click", () => {
    previewVideo.src = `/media/${videoId}/edited?t=${Date.now()}`;
    btnEdited.classList.add("active");
    btnOriginal.classList.remove("active");
  });
})();
