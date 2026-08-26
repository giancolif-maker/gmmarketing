"""
Mock data engine: generates realistic fake campaign performance, ticking
forward over time so the Dashboard/Mission Control show real-looking
trends instead of static numbers. Everything here is a stand-in for a
real Meta Ads connection — swap it out later per the README, nothing
downstream (rules engine, templates, routes) has to change.

Two ways campaigns get data:
  - seed_campaigns(): called once on first run, backfills history for a
    couple of demo campaigns so the app isn't empty on first load — one
    already "healthy", one already "underperforming".
  - tick_if_due(): called on every Dashboard/Mission Control page load and
    by the polling endpoint, appends one new snapshot per active campaign
    (throttled to MIN_TICK_INTERVAL_SECONDS so rapid page loads don't
    generate a flood of snapshots), re-evaluates status via the rules
    engine, and logs a decision when status changes.

Campaigns launched through the Launch flow start in "calibrating" —
low budget pacing, low impressions, noisy results — and ramp up into
"healthy" or "underperforming" after CALIBRATING_RAMP_TICKS snapshots,
simulating Meta's own ad-set learning phase completing.
"""

import random
from datetime import datetime, timedelta, timezone

from db import get_setting, now_iso, set_setting, spend_credits
from rules.engine import evaluate_campaign

MIN_TICK_INTERVAL_SECONDS = 10
CALIBRATING_RAMP_TICKS = 6
SEED_HISTORY_SNAPSHOTS = 30
SEED_SNAPSHOT_SPACING_MINUTES = 22

DECISION_CREDIT_COST = {
    "pause": 3,
    "increase_budget": 3,
    "alert": 1,
    "none": 0,
}

# action -> whether it needs a human tap before it takes effect
_ACTIONABLE = {"pause", "increase_budget"}

NICHE_TEMPLATES = {
    "ecommerce": {
        "label": "E-commerce",
        "base_cpa": 18.0,
        "baseline_ctr": 2.0,
        "baseline_cpm": 8.0,
        "audience_notes": (
            "Broad targeting performs well early; layer in retargeting for cart "
            "abandoners and warm site visitors, then build a purchaser lookalike "
            "once you clear ~100 conversions."
        ),
    },
    "streetwear": {
        "label": "Streetwear",
        "base_cpa": 22.0,
        "baseline_ctr": 1.8,
        "baseline_cpm": 7.0,
        "audience_notes": (
            "Creative-led category — rotate UGC and drop-style creative often. "
            "Interest-stack sneaker/streetwear culture audiences and expect CTR "
            "to decay fast on any single ad, so plan for frequent refreshes."
        ),
    },
    "beauty": {
        "label": "Beauty & Skincare",
        "base_cpa": 15.0,
        "baseline_ctr": 2.3,
        "baseline_cpm": 9.0,
        "audience_notes": (
            "Video/UGC testimonials outperform static product shots. "
            "Broad + interest audiences both viable; watch for creative fatigue "
            "since this category has above-average CTR decay."
        ),
    },
    "fitness": {
        "label": "Fitness & Wellness",
        "base_cpa": 25.0,
        "baseline_ctr": 1.6,
        "baseline_cpm": 10.0,
        "audience_notes": (
            "Seasonality matters (Jan/summer spikes) — expect above-baseline CPMs "
            "in peak windows. Lean on transformation/results-driven creative."
        ),
    },
    "home_goods": {
        "label": "Home Goods",
        "base_cpa": 20.0,
        "baseline_ctr": 1.9,
        "baseline_cpm": 8.5,
        "audience_notes": (
            "Longer consideration window than fashion — retargeting window should "
            "run 14-30 days. Carousel/collection ad formats tend to outperform "
            "single image here."
        ),
    },
    "local_service": {
        "label": "Local Service",
        "base_cpa": 35.0,
        "baseline_ctr": 1.4,
        "baseline_cpm": 12.0,
        "audience_notes": (
            "Tight radius targeting keeps CPMs high but relevance high too. "
            "Lead-gen forms typically outperform sending traffic to a landing page."
        ),
    },
    "saas": {
        "label": "SaaS / Software",
        "base_cpa": 60.0,
        "baseline_ctr": 1.2,
        "baseline_cpm": 14.0,
        "audience_notes": (
            "Expect a longer sales cycle — optimize toward leads, not purchases. "
            "Job-title/industry targeting outperforms broad; budget for a slower "
            "ramp than consumer niches."
        ),
    },
}

GOAL_CPA_MULTIPLIER = {
    "conversions": 1.0,
    "leads": 1.35,
    "traffic": 0.02,
    "awareness": 0.01,
}
GOAL_LABELS = {
    "conversions": "Conversions",
    "leads": "Lead generation",
    "traffic": "Traffic",
    "awareness": "Awareness",
}

# Applied to a campaign's baseline before jitter — same shape as
# api/mock_client.py's scenarios, kept separate since this engine tracks
# state per-campaign in the DB rather than per-process via an env var.
_SCENARIOS = {
    "healthy": {"spend": 1.0, "impressions": 1.0, "ctr": 1.15, "cvr": 1.2, "fluctuation": 0.15},
    "underperforming": {"spend": 1.1, "impressions": 1.0, "ctr": 0.55, "cvr": 0.4, "fluctuation": 0.20},
    "calibrating": {"spend": 0.3, "impressions": 0.1, "ctr": 0.9, "cvr": 0.7, "fluctuation": 0.35},
}


def _jitter(value, pct):
    return value * random.uniform(1 - pct, 1 + pct)


def generate_launch_plan(niche, goal, daily_budget, duration_days):
    """Mocked but grounded 'AI recommendation' for the Launch flow's review step."""
    template = NICHE_TEMPLATES[niche]
    goal_mult = GOAL_CPA_MULTIPLIER[goal]
    target_cpa = round(template["base_cpa"] * goal_mult * random.uniform(0.92, 1.08), 2)
    suggested_daily_budget = round(daily_budget * random.uniform(0.95, 1.1), 2)

    daily_result_capacity = suggested_daily_budget / target_cpa if target_cpa else 0
    low = max(1, round(daily_result_capacity * 0.75))
    high = max(low + 1, round(daily_result_capacity * 1.3))

    if daily_result_capacity >= 5:
        confidence, confidence_note = "high", (
            "Budget supports enough daily results to judge performance within a few days."
        )
    elif daily_result_capacity >= 2:
        confidence, confidence_note = "moderate", (
            "Budget is workable but on the lean side — expect the calibration phase to "
            "take a bit longer before trends are reliable."
        )
    else:
        confidence, confidence_note = "low", (
            "This budget is thin for the target CPA — consider raising it, or expect a "
            "slow, noisy calibration phase."
        )

    return {
        "niche": niche,
        "niche_label": template["label"],
        "goal": goal,
        "goal_label": GOAL_LABELS[goal],
        "target_cpa": target_cpa,
        "suggested_daily_budget": suggested_daily_budget,
        "duration_days": duration_days,
        "estimated_daily_results_low": low,
        "estimated_daily_results_high": high,
        "audience_notes": template["audience_notes"],
        "confidence": confidence,
        "confidence_note": confidence_note,
    }


def create_campaign_from_plan(conn, name, plan):
    """Write a new mock campaign (status='calibrating') from a generated plan."""
    template = NICHE_TEMPLATES[plan["niche"]]
    baseline_impressions = max(500, round(plan["suggested_daily_budget"] / template["baseline_cpm"] * 1000))
    baseline_ctr = template["baseline_ctr"]

    # Back out a baseline conversion rate that, on average, lands right on
    # the plan's own target CPA — so the live simulation stays consistent
    # with what Step 3 promised.
    clicks = baseline_impressions * (baseline_ctr / 100)
    results_needed = plan["suggested_daily_budget"] / plan["target_cpa"] if plan["target_cpa"] else 0
    baseline_cvr = round((results_needed / clicks) * 100, 2) if clicks else 1.0

    cur = conn.execute(
        """
        INSERT INTO campaigns (
            name, niche, goal, status, is_active, daily_budget, duration_days,
            target_cpa, audience_notes, baseline_spend, baseline_impressions,
            baseline_ctr, baseline_cvr, scenario, created_at
        ) VALUES (?, ?, ?, 'calibrating', 1, ?, ?, ?, ?, ?, ?, ?, ?, 'calibrating', ?)
        """,
        (
            name,
            plan["niche"],
            plan["goal"],
            plan["suggested_daily_budget"],
            plan["duration_days"],
            plan["target_cpa"],
            plan["audience_notes"],
            plan["suggested_daily_budget"],
            baseline_impressions,
            baseline_ctr,
            baseline_cvr,
            now_iso(),
        ),
    )
    campaign_id = cur.lastrowid
    conn.execute(
        "INSERT INTO decisions_log (campaign_id, ts, message, reason, action, severity, review_status, credits_cost) "
        "VALUES (?, ?, ?, ?, 'none', 'info', 'auto_applied', 0)",
        (
            campaign_id,
            now_iso(),
            f"{name} launched — entering calibration.",
            f"New campaign: niche={plan['niche_label']}, goal={plan['goal_label']}, "
            f"daily_budget=${plan['suggested_daily_budget']:.2f}, target_cpa=${plan['target_cpa']:.2f}.",
        ),
    )
    return campaign_id


def _generate_snapshot(campaign, scenario, ts):
    mult = _SCENARIOS[scenario]
    fluctuation = mult["fluctuation"]

    spend = round(_jitter(campaign["baseline_spend"] * mult["spend"], fluctuation), 2)
    impressions = max(1, round(_jitter(campaign["baseline_impressions"] * mult["impressions"], fluctuation)))
    reach = max(1, round(impressions * random.uniform(0.55, 0.85)))
    ctr = round(max(0.01, _jitter(campaign["baseline_ctr"] * mult["ctr"], fluctuation)), 2)
    clicks = max(0, round(impressions * (ctr / 100)))
    cvr = round(max(0.0, _jitter(campaign["baseline_cvr"] * mult["cvr"], fluctuation)), 2)
    results = max(0, round(clicks * (cvr / 100)))

    cpc = round(spend / clicks, 2) if clicks else 0.0
    cpm = round(spend / impressions * 1000, 2) if impressions else 0.0
    cost_per_result = round(spend / results, 2) if results else 0.0

    return {
        "ts": ts,
        "spend": spend,
        "impressions": impressions,
        "reach": reach,
        "clicks": clicks,
        "ctr": ctr,
        "cpc": cpc,
        "cpm": cpm,
        "results": results,
        "cost_per_result": cost_per_result,
    }


def _insert_snapshot(conn, campaign_id, snap):
    conn.execute(
        "INSERT INTO campaign_snapshots "
        "(campaign_id, ts, spend, impressions, reach, clicks, ctr, cpc, cpm, results, cost_per_result) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (
            campaign_id,
            snap["ts"],
            snap["spend"],
            snap["impressions"],
            snap["reach"],
            snap["clicks"],
            snap["ctr"],
            snap["cpc"],
            snap["cpm"],
            snap["results"],
            snap["cost_per_result"],
        ),
    )


def get_snapshots(conn, campaign_id, limit=200):
    rows = conn.execute(
        "SELECT * FROM campaign_snapshots WHERE campaign_id = ? ORDER BY ts ASC LIMIT ?",
        (campaign_id, limit),
    ).fetchall()
    return [dict(r) for r in rows]


def seed_campaigns(conn):
    """Backfill two demo campaigns with history, if the DB is empty."""
    existing = conn.execute("SELECT COUNT(*) AS n FROM campaigns").fetchone()["n"]
    if existing:
        return

    seeds = [
        ("Ecom Brand", "ecommerce", "conversions", "healthy", 150.0),
        ("Streetwear Brand", "streetwear", "conversions", "underperforming", 90.0),
    ]
    start_ts = datetime.now(timezone.utc) - timedelta(minutes=SEED_HISTORY_SNAPSHOTS * SEED_SNAPSHOT_SPACING_MINUTES)

    for name, niche, goal, scenario, budget in seeds:
        template = NICHE_TEMPLATES[niche]
        target_cpa = round(template["base_cpa"] * random.uniform(0.95, 1.05), 2)
        baseline_impressions = max(500, round(budget / template["baseline_cpm"] * 1000))

        cur = conn.execute(
            """
            INSERT INTO campaigns (
                name, niche, goal, status, is_active, daily_budget, duration_days,
                target_cpa, audience_notes, baseline_spend, baseline_impressions,
                baseline_ctr, baseline_cvr, scenario, created_at
            ) VALUES (?, ?, ?, 'calibrating', 1, ?, 30, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                name,
                niche,
                goal,
                budget,
                target_cpa,
                template["audience_notes"],
                budget,
                baseline_impressions,
                template["baseline_ctr"],
                3.6,  # baseline_cvr - generic starting point, tuned per-niche isn't critical for seed data
                scenario,
                now_iso(),
            ),
        )
        campaign_id = cur.lastrowid
        campaign = dict(conn.execute("SELECT * FROM campaigns WHERE id = ?", (campaign_id,)).fetchone())

        for i in range(SEED_HISTORY_SNAPSHOTS):
            ts = (start_ts + timedelta(minutes=i * SEED_SNAPSHOT_SPACING_MINUTES)).isoformat(timespec="seconds")
            snap = _generate_snapshot(campaign, scenario, ts)
            _insert_snapshot(conn, campaign_id, snap)

        snapshots = get_snapshots(conn, campaign_id)
        evaluation = evaluate_campaign(campaign, snapshots)
        conn.execute("UPDATE campaigns SET status = ? WHERE id = ?", (evaluation["status"], campaign_id))
        _log_decision(conn, campaign_id, campaign["name"], evaluation)

    conn.commit()


def _severity_for(status):
    return {
        "pause_candidate": "critical",
        "underperforming": "critical",
        "watch": "watch",
        "scale_candidate": "watch",
    }.get(status, "info")


def _log_decision(conn, campaign_id, campaign_name, evaluation):
    """Write one decisions_log row for a rules-engine evaluation, deducting
    credits and routing it to pending_approval when the action is one a
    human needs to sign off on (pause / increase_budget)."""
    action = evaluation["action"]
    review_status = "pending_approval" if action in _ACTIONABLE else "auto_applied"

    if review_status == "pending_approval":
        # Don't let a campaign that keeps flip-flopping (e.g. status toggling
        # between healthy and scale_candidate as it fluctuates) pile up
        # multiple stale asks — only the newest recommendation should be
        # sitting in "pending your review" at a time.
        conn.execute(
            "UPDATE decisions_log SET review_status = 'superseded' "
            "WHERE campaign_id = ? AND review_status = 'pending_approval'",
            (campaign_id,),
        )

    credits_cost = DECISION_CREDIT_COST.get(action, 0)
    if credits_cost:
        spend_credits(conn, credits_cost, f"AI decision: {evaluation['status']} — {campaign_name}")
    conn.execute(
        "INSERT INTO decisions_log (campaign_id, ts, message, reason, action, severity, review_status, credits_cost) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (
            campaign_id,
            now_iso(),
            evaluation["message"],
            evaluation["reason"],
            action,
            _severity_for(evaluation["status"]),
            review_status,
            credits_cost,
        ),
    )


def tick_if_due(conn, force=False):
    """Advance the simulation by one snapshot per active campaign, if enough
    wall-clock time has passed since the last tick (or `force`). Returns
    True if a tick actually happened."""
    last_tick = get_setting(conn, "last_tick_ts")
    now = datetime.now(timezone.utc)
    if not force and last_tick:
        elapsed = (now - datetime.fromisoformat(last_tick)).total_seconds()
        if elapsed < MIN_TICK_INTERVAL_SECONDS:
            return False

    set_setting(conn, "last_tick_ts", now.isoformat())

    campaigns = [dict(r) for r in conn.execute("SELECT * FROM campaigns WHERE is_active = 1").fetchall()]
    for campaign in campaigns:
        scenario = campaign["scenario"]
        snap = _generate_snapshot(campaign, scenario, now.isoformat(timespec="seconds"))
        _insert_snapshot(conn, campaign["id"], snap)

        snapshot_count = conn.execute(
            "SELECT COUNT(*) AS n FROM campaign_snapshots WHERE campaign_id = ?", (campaign["id"],)
        ).fetchone()["n"]
        if scenario == "calibrating" and snapshot_count >= CALIBRATING_RAMP_TICKS:
            scenario = random.choices(["healthy", "underperforming"], weights=[0.7, 0.3])[0]
            conn.execute("UPDATE campaigns SET scenario = ? WHERE id = ?", (scenario, campaign["id"]))

        snapshots = get_snapshots(conn, campaign["id"])
        evaluation = evaluate_campaign(campaign, snapshots)

        if evaluation["status"] != campaign["status"]:
            conn.execute("UPDATE campaigns SET status = ? WHERE id = ?", (evaluation["status"], campaign["id"]))
            _log_decision(conn, campaign["id"], campaign["name"], evaluation)

    conn.commit()
    return True


def apply_decision(conn, decision_id, approve):
    """Approve or dismiss a pending decision. Approving actually applies the
    recommended action (pause the campaign / bump its budget)."""
    decision = conn.execute("SELECT * FROM decisions_log WHERE id = ?", (decision_id,)).fetchone()
    if decision is None or decision["review_status"] != "pending_approval":
        return None

    new_status = "approved" if approve else "dismissed"
    conn.execute("UPDATE decisions_log SET review_status = ? WHERE id = ?", (new_status, decision_id))

    if approve and decision["campaign_id"] is not None:
        if decision["action"] == "pause":
            conn.execute("UPDATE campaigns SET is_active = 0 WHERE id = ?", (decision["campaign_id"],))
        elif decision["action"] == "increase_budget":
            conn.execute(
                "UPDATE campaigns SET daily_budget = ROUND(daily_budget * 1.2, 2) WHERE id = ?",
                (decision["campaign_id"],),
            )

    conn.commit()
    return new_status
