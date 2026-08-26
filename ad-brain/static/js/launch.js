(function () {
  const panels = document.querySelectorAll("[data-panel]");
  const dots = document.querySelectorAll(".step-dot span:first-child");
  const nameEl = document.getElementById("f-name");
  const nicheEl = document.getElementById("f-niche");
  const goalEl = document.getElementById("f-goal");
  const budgetEl = document.getElementById("f-budget");
  const budgetDisplay = document.getElementById("budget-display");
  const durationEl = document.getElementById("f-duration");
  const durationDisplay = document.getElementById("duration-display");
  const planLoading = document.getElementById("plan-loading");
  const planResult = document.getElementById("plan-result");
  const confirmBtn = document.getElementById("confirm-btn");

  let currentPlan = null;

  function goto(step) {
    panels.forEach((p) => p.classList.toggle("hidden", p.dataset.panel !== String(step)));
    dots.forEach((d, i) => {
      const active = i + 1 <= step;
      d.classList.toggle("border-teal-400", active);
      d.classList.toggle("text-teal-300", active);
      d.classList.toggle("border-slate-700", !active);
      d.classList.toggle("text-slate-500", !active);
    });
    if (step === 3) generatePlan();
  }

  budgetEl.addEventListener("input", () => (budgetDisplay.textContent = "$" + budgetEl.value));
  durationEl.addEventListener("input", () => (durationDisplay.textContent = durationEl.value + " days"));

  document.querySelectorAll(".next-btn, .back-btn").forEach((btn) => {
    btn.addEventListener("click", () => goto(Number(btn.dataset.goto)));
  });

  async function generatePlan() {
    planResult.classList.add("hidden");
    planLoading.classList.remove("hidden");
    confirmBtn.disabled = true;

    try {
      const res = await fetch("/api/launch/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niche: nicheEl.value,
          goal: goalEl.value,
          daily_budget: Number(budgetEl.value),
          duration_days: Number(durationEl.value),
        }),
      });
      const plan = await res.json();
      if (!res.ok) throw new Error(plan.error || "Failed to generate plan");
      currentPlan = plan;

      document.getElementById("plan-cpa").textContent = "$" + plan.target_cpa.toFixed(2);
      document.getElementById("plan-budget").textContent = "$" + plan.suggested_daily_budget.toFixed(2) + "/day";
      document.getElementById("plan-results").textContent =
        plan.estimated_daily_results_low + "–" + plan.estimated_daily_results_high + " /day";
      document.getElementById("plan-confidence").textContent = plan.confidence;
      document.getElementById("plan-audience").textContent = plan.audience_notes;
      document.getElementById("plan-confidence-note").textContent = plan.confidence_note;

      const creditEl = document.getElementById("credit-balance");
      if (creditEl && typeof plan.credit_balance === "number") creditEl.textContent = plan.credit_balance;

      planResult.classList.remove("hidden");
      confirmBtn.disabled = false;
    } catch (err) {
      planLoading.textContent = "Couldn't generate a plan — go back and try again.";
    } finally {
      planLoading.classList.add("hidden");
    }
  }

  confirmBtn.addEventListener("click", async () => {
    if (!currentPlan) return;
    confirmBtn.disabled = true;
    confirmBtn.textContent = "Launching…";

    const name = nameEl.value.trim() || `${currentPlan.niche_label} — ${currentPlan.goal_label}`;
    try {
      const res = await fetch("/api/launch/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          niche: currentPlan.niche,
          goal: currentPlan.goal,
          target_cpa: currentPlan.target_cpa,
          suggested_daily_budget: currentPlan.suggested_daily_budget,
          duration_days: currentPlan.duration_days,
          audience_notes: currentPlan.audience_notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Launch failed");
      document.getElementById("launch-confirm-text").textContent =
        `“${name}” is now calibrating — check Mission Control to watch it ramp up.`;
      goto(4);
    } catch (err) {
      confirmBtn.disabled = false;
      confirmBtn.textContent = "Confirm & launch";
    }
  });

  goto(1);
})();
