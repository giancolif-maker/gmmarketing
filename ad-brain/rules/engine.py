"""
The "AI" in Ad-Brain: a plain, deterministic rules engine. No model calls,
no randomness — evaluate_campaign() is a pure function of a campaign's
config and its snapshot history, so it's fully unit-testable (see
test_rules_engine.py) and every status/decision it produces can be traced
back to the exact numbers that caused it.

This is what decides:
  - the status badge shown on the Dashboard and Mission Control
  - the trend arrow next to it
  - the plain-English message/reason written to decisions_log
  - what action (if any) gets recommended: pause, increase_budget, alert
"""

from statistics import mean

from rules import thresholds as t

STATUSES = (
    "calibrating",
    "healthy",
    "watch",
    "underperforming",
    "scale_candidate",
    "pause_candidate",
)

_ARROW = {"improving": "▼", "worsening": "▲", "flat": "▬"}


def evaluate_campaign(campaign, snapshots):
    """
    campaign: dict with at least "name" and "target_cpa".
    snapshots: list of dicts (oldest -> newest) with spend/impressions/
               clicks/ctr/results/cost_per_result, as stored in
               campaign_snapshots.

    Returns a dict: status, trend, trend_arrow, message, reason, action,
    avg_cost_per_result, avg_ctr.
    """
    name = campaign["name"]
    target = campaign["target_cpa"]

    if len(snapshots) < t.MIN_SNAPSHOTS_TO_JUDGE:
        return _result(
            status="calibrating",
            trend="flat",
            action="none",
            message=f"{name} is still calibrating — {len(snapshots)}/{t.MIN_SNAPSHOTS_TO_JUDGE} snapshots collected so far.",
            reason=f"Only {len(snapshots)} snapshot(s) recorded; need {t.MIN_SNAPSHOTS_TO_JUDGE} before judging performance.",
            avg_cost_per_result=None,
            avg_ctr=None,
        )

    recent = snapshots[-t.CURRENT_WINDOW:]
    prior_end = len(snapshots) - t.CURRENT_WINDOW
    prior_start = max(0, prior_end - t.TREND_WINDOW)
    prior = snapshots[prior_start:prior_end] or recent

    avg_ctr = round(mean(s["ctr"] for s in recent), 2)
    recent_results_total = sum(s["results"] for s in recent)
    recent_spend_total = sum(s["spend"] for s in recent)

    avg_cpr = _priced_average(recent)
    prior_avg_cpr = _priced_average(prior)
    if prior_avg_cpr is None:
        prior_avg_cpr = avg_cpr
    trend = _trend(avg_cpr, prior_avg_cpr)

    if avg_cpr is None:
        # Real spend, zero results — the clearest possible bad signal.
        return _result(
            status="pause_candidate",
            trend="worsening",
            action="pause",
            message=f"{name} — zero results from ${recent_spend_total:.2f} spend over the last {len(recent)} snapshots.",
            reason=(
                f"results=0 across the last {len(recent)} snapshots despite "
                f"${recent_spend_total:.2f} spend (target CPA ${target:.2f})."
            ),
            avg_cost_per_result=None,
            avg_ctr=avg_ctr,
        )

    ratio = avg_cpr / target if target else float("inf")

    if avg_cpr >= target * t.PAUSE_CPA_MULTIPLIER:
        return _result(
            status="pause_candidate",
            trend=trend,
            action="pause",
            message=f"{name} — cost per result (${avg_cpr:.2f}) is {ratio:.1f}x target (${target:.2f}). Recommend pausing.",
            reason=f"avg_cost_per_result=${avg_cpr:.2f}, target_cpa=${target:.2f}, ratio={ratio:.2f}x, trend={trend}.",
            avg_cost_per_result=avg_cpr,
            avg_ctr=avg_ctr,
        )

    if avg_cpr >= target * t.WATCH_CPA_MULTIPLIER:
        if avg_ctr < t.LOW_CTR_PCT:
            return _result(
                status="underperforming",
                trend=trend,
                action="alert",
                message=(
                    f"{name} is underperforming — CTR ({avg_ctr:.2f}%) is weak and cost per "
                    f"result (${avg_cpr:.2f}) is above target (${target:.2f})."
                ),
                reason=f"avg_ctr={avg_ctr:.2f}% (< {t.LOW_CTR_PCT}%), avg_cost_per_result=${avg_cpr:.2f}, target_cpa=${target:.2f}, trend={trend}.",
                avg_cost_per_result=avg_cpr,
                avg_ctr=avg_ctr,
            )
        return _result(
            status="watch",
            trend=trend,
            action="alert",
            message=f"{name} cost per result (${avg_cpr:.2f}) is drifting above target (${target:.2f}) — worth watching.",
            reason=f"avg_cost_per_result=${avg_cpr:.2f}, target_cpa=${target:.2f}, ratio={ratio:.2f}x, trend={trend}.",
            avg_cost_per_result=avg_cpr,
            avg_ctr=avg_ctr,
        )

    if avg_cpr <= target * t.SCALE_CPA_MULTIPLIER and trend != "worsening":
        return _result(
            status="scale_candidate",
            trend=trend,
            action="increase_budget",
            message=f"{name} is beating target CPA (${avg_cpr:.2f} vs ${target:.2f}) and holding steady — recommend increasing budget.",
            reason=f"avg_cost_per_result=${avg_cpr:.2f}, target_cpa=${target:.2f}, ratio={ratio:.2f}x, trend={trend}.",
            avg_cost_per_result=avg_cpr,
            avg_ctr=avg_ctr,
        )

    return _result(
        status="healthy",
        trend=trend,
        action="none",
        message=f"{name} is performing within target — avg cost per result ${avg_cpr:.2f} vs ${target:.2f} target.",
        reason=f"avg_cost_per_result=${avg_cpr:.2f}, target_cpa=${target:.2f}, ratio={ratio:.2f}x, trend={trend}.",
        avg_cost_per_result=avg_cpr,
        avg_ctr=avg_ctr,
    )


def _priced_average(window):
    """Mean cost_per_result over snapshots that actually had results.
    None if none of them did (caller treats that as its own signal)."""
    priced = [s["cost_per_result"] for s in window if s["results"] > 0]
    return round(mean(priced), 2) if priced else None


def _trend(current, prior):
    """'improving' | 'worsening' | 'flat', based on cost_per_result moving
    (lower cost = improving). None-safe: no signal -> 'flat'."""
    if current is None or prior in (None, 0):
        return "flat"
    change = (current - prior) / prior
    if change <= -t.TREND_SIGNIFICANCE:
        return "improving"
    if change >= t.TREND_SIGNIFICANCE:
        return "worsening"
    return "flat"


def _result(status, trend, action, message, reason, avg_cost_per_result, avg_ctr):
    return {
        "status": status,
        "trend": trend,
        "trend_arrow": _ARROW.get(trend, "▬"),
        "action": action,
        "message": message,
        "reason": reason,
        "avg_cost_per_result": avg_cost_per_result,
        "avg_ctr": avg_ctr,
    }
