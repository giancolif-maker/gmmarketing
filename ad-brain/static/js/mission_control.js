// Mission Control: renders from window.__MC_INITIAL_DATA__ immediately,
// then polls /api/mission-control/data on an interval and re-renders with
// the same function — one render path, no drift between first paint and updates.
(function () {
  const campaignsEl = document.getElementById("mc-campaigns");
  const pendingEl = document.getElementById("mc-pending");
  const feedEl = document.getElementById("mc-feed");
  const creditEl = document.getElementById("credit-balance");

  function esc(s) {
    const div = document.createElement("div");
    div.textContent = s == null ? "" : String(s);
    return div.innerHTML;
  }

  function campaignCard(c) {
    return `
      <div class="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <div class="flex items-start justify-between gap-2">
          <div>
            <p class="font-medium text-slate-100">${esc(c.name)}</p>
            <p class="text-xs text-slate-500">${esc((c.niche || "").replace("_", " "))}</p>
          </div>
          <span class="status-badge status-${esc(c.status)}">${esc(c.status_label)}</span>
        </div>
        <div class="mt-4 grid grid-cols-3 gap-2 text-center">
          <div>
            <p class="font-mono-metric text-sm font-semibold text-white">$${Number(c.spend).toFixed(2)}</p>
            <p class="text-[10px] uppercase tracking-wide text-slate-500">Spend</p>
          </div>
          <div>
            <p class="font-mono-metric text-sm font-semibold text-white">${c.results}</p>
            <p class="text-[10px] uppercase tracking-wide text-slate-500">Results</p>
          </div>
          <div>
            <p class="font-mono-metric text-sm font-semibold text-white">$${Number(c.cost_per_result).toFixed(2)}</p>
            <p class="text-[10px] uppercase tracking-wide text-slate-500">Cost/Result</p>
          </div>
        </div>
        <div class="mt-3 flex items-center justify-between text-xs text-slate-500">
          <span>${Number(c.impressions).toLocaleString()} impr · ${c.clicks} clicks · ${Number(c.ctr).toFixed(2)}% CTR</span>
          <span class="text-base leading-none">${esc(c.trend_arrow)}</span>
        </div>
      </div>`;
  }

  function pendingCard(d) {
    return `
      <div class="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-3.5" data-decision-id="${d.id}">
        <p class="text-sm font-medium text-slate-100">${esc(d.message)}</p>
        <p class="mt-1 text-xs text-slate-500">${esc(d.reason)}</p>
        <div class="mt-3 flex gap-2">
          <button class="mc-approve rounded-lg bg-teal-400/90 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-teal-300" data-id="${d.id}">Approve</button>
          <button class="mc-dismiss rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800" data-id="${d.id}">Dismiss</button>
        </div>
      </div>`;
  }

  function feedItem(d) {
    const badge =
      d.review_status === "pending_approval"
        ? '<span class="text-amber-400">pending</span>'
        : d.review_status === "approved"
        ? '<span class="text-teal-400">approved</span>'
        : d.review_status === "dismissed"
        ? '<span class="text-slate-500">dismissed</span>'
        : d.review_status === "superseded"
        ? '<span class="text-slate-600">superseded</span>'
        : '<span class="text-slate-500">auto</span>';
    return `
      <div class="rounded-lg border border-slate-800 bg-slate-900/40 p-3 text-xs">
        <p class="text-slate-200">${esc(d.message)}</p>
        <p class="mt-1 flex items-center justify-between text-slate-600">
          <span>${esc(d.ts)}</span>
          ${badge}
        </p>
      </div>`;
  }

  function render(data) {
    campaignsEl.innerHTML =
      data.campaigns.length > 0
        ? data.campaigns.map(campaignCard).join("")
        : '<p class="text-sm text-slate-500">No active campaigns.</p>';

    pendingEl.innerHTML =
      data.pending.length > 0
        ? data.pending.map(pendingCard).join("")
        : '<p class="text-sm text-slate-600">Nothing needs your approval right now.</p>';

    feedEl.innerHTML =
      data.feed.length > 0
        ? data.feed.map(feedItem).join("")
        : '<p class="text-sm text-slate-600">No decisions logged yet.</p>';

    if (creditEl && typeof data.credit_balance === "number") creditEl.textContent = data.credit_balance;
  }

  async function poll() {
    try {
      const res = await fetch("/api/mission-control/data");
      if (!res.ok) return;
      render(await res.json());
    } catch (e) {
      // network hiccup — next poll will retry, no need to surface this
    }
  }

  pendingEl.addEventListener("click", async (e) => {
    const approveBtn = e.target.closest(".mc-approve");
    const dismissBtn = e.target.closest(".mc-dismiss");
    const btn = approveBtn || dismissBtn;
    if (!btn) return;
    btn.disabled = true;
    const id = btn.dataset.id;
    const endpoint = approveBtn ? `/api/decisions/${id}/approve` : `/api/decisions/${id}/dismiss`;
    try {
      await fetch(endpoint, { method: "POST" });
    } finally {
      poll();
    }
  });

  render(window.__MC_INITIAL_DATA__ || { campaigns: [], pending: [], feed: [] });
  setInterval(poll, window.__MC_POLL_INTERVAL_MS__ || 12000);
})();
