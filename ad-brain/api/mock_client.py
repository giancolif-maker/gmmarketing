"""
Fake Meta Marketing API client for local development.

Mirrors the interface `api.meta_client.MetaClient` will eventually expose,
so the rules engine and anything else built against it can develop against
realistic-looking data before real ad-account credentials are wired up.
Swap `MockMetaClient()` for `MetaClient()` once that's ready — same shape.

Each call re-rolls its numbers within a plausible range of the campaign's
baseline, so repeated polling looks like real day-to-day fluctuation
instead of returning identical numbers forever.

Scenarios
---------
Set MOCK_SCENARIO to switch what "shape" of data comes back, e.g.:

    MOCK_SCENARIO=healthy python test_mock_client.py

  healthy          - strong CTR/CVR, low cost per result. Business as usual.
  underperforming  - spend keeps flowing but CTR/CVR are weak, so CPC/CPM/
                      cost_per_result run high. What a rule engine should
                      catch and flag/pause.
  calibrating      - a campaign in its first days: low budget pacing, low
                      impressions, noisier results (small-sample swings,
                      including the occasional zero-result day).

Defaults to "healthy" if MOCK_SCENARIO is unset or unrecognized. You can
also pass scenario= directly to MockMetaClient(...) to override the env
var for a single instance (handy in tests).
"""

import os
import random
from datetime import date, timedelta

# Baseline daily performance each campaign fluctuates around, at 1x/"healthy".
_CAMPAIGNS = {
    "23851234567890123": {
        "name": "Ecom Brand",
        "status": "ACTIVE",
        "objective": "CONVERSIONS",
        "daily_budget": 150.00,
        "created_time": "2025-11-03T09:00:00-0700",
        "baseline": {
            "spend": 140.0,
            "impressions": 45000,
            "ctr": 2.0,  # percent
            "cvr": 3.9,  # percent of clicks that convert
        },
    },
    "23851234567890456": {
        "name": "Streetwear Brand",
        "status": "ACTIVE",
        "objective": "CONVERSIONS",
        "daily_budget": 90.00,
        "created_time": "2025-12-10T09:00:00-0700",
        "baseline": {
            "spend": 85.0,
            "impressions": 30000,
            "ctr": 1.8,
            "cvr": 3.2,
        },
    },
}

# Multipliers applied to each campaign's baseline before jitter, plus how
# much noise ("fluctuation") is applied on top. Underperforming keeps spend
# flowing into weak CTR/CVR; calibrating pulls spend/impressions way down
# (early days, small budget, learning phase) and adds extra noise since
# small sample sizes swing harder day to day.
_SCENARIOS = {
    "healthy": {
        "spend": 1.0,
        "impressions": 1.0,
        "ctr": 1.15,
        "cvr": 1.2,
        "fluctuation": 0.15,
    },
    "underperforming": {
        "spend": 1.1,
        "impressions": 1.0,
        "ctr": 0.55,
        "cvr": 0.4,
        "fluctuation": 0.20,
    },
    "calibrating": {
        "spend": 0.3,
        "impressions": 0.1,
        "ctr": 0.9,
        "cvr": 0.7,
        "fluctuation": 0.35,
    },
}
_DEFAULT_SCENARIO = "healthy"
_warned_invalid_scenarios = set()


def _resolve_scenario(override=None):
    """Pick a scenario name: explicit override > $MOCK_SCENARIO > default."""
    name = (override or os.environ.get("MOCK_SCENARIO") or _DEFAULT_SCENARIO).strip().lower()
    if name not in _SCENARIOS:
        if name not in _warned_invalid_scenarios:
            print(
                f"[mock_client] Unknown MOCK_SCENARIO={name!r}, "
                f"falling back to {_DEFAULT_SCENARIO!r}. "
                f"Valid options: {', '.join(_SCENARIOS)}"
            )
            _warned_invalid_scenarios.add(name)
        name = _DEFAULT_SCENARIO
    return name


def _jitter(value, pct):
    """Return `value` randomly nudged by up to +/- pct."""
    return value * random.uniform(1 - pct, 1 + pct)


class MockMetaClient:
    """Drop-in fake for MetaClient. No network calls, no credentials needed.

    scenario: "healthy" | "underperforming" | "calibrating" | None.
    None (default) means "read $MOCK_SCENARIO on every call", so flipping
    the env var between calls in the same process takes effect immediately.
    """

    def __init__(self, scenario=None):
        self._scenario_override = scenario

    @property
    def scenario(self):
        return _resolve_scenario(self._scenario_override)

    def get_campaigns(self):
        """List campaigns on the (fake) ad account."""
        scenario = self.scenario
        return [
            {
                "id": campaign_id,
                "name": data["name"],
                "status": data["status"],
                "objective": data["objective"],
                "daily_budget": data["daily_budget"],
                "created_time": data["created_time"],
                "learning_phase": scenario == "calibrating",
            }
            for campaign_id, data in _CAMPAIGNS.items()
        ]

    def get_campaign_insights(self, campaign_id, date_preset="yesterday"):
        """Fake insights for one campaign: spend, reach, and performance ratios."""
        campaign = _CAMPAIGNS.get(campaign_id)
        if campaign is None:
            raise ValueError(f"Unknown campaign_id: {campaign_id!r}")

        scenario = self.scenario
        mult = _SCENARIOS[scenario]
        base = campaign["baseline"]
        fluctuation = mult["fluctuation"]

        spend = round(_jitter(base["spend"] * mult["spend"], fluctuation), 2)
        impressions = max(1, round(_jitter(base["impressions"] * mult["impressions"], fluctuation)))
        ctr = round(max(0.01, _jitter(base["ctr"] * mult["ctr"], fluctuation)), 2)
        clicks = max(0, round(impressions * (ctr / 100)))
        cvr = round(max(0.0, _jitter(base["cvr"] * mult["cvr"], fluctuation)), 2)
        results = max(0, round(clicks * (cvr / 100)))

        cpc = round(spend / clicks, 2) if clicks else 0.0
        cpm = round(spend / impressions * 1000, 2) if impressions else 0.0
        cost_per_result = round(spend / results, 2) if results else 0.0

        return {
            "campaign_id": campaign_id,
            "campaign_name": campaign["name"],
            "scenario": scenario,
            "date": str(date.today() - timedelta(days=1)),
            "date_preset": date_preset,
            "spend": spend,
            "impressions": impressions,
            "clicks": clicks,
            "ctr": ctr,
            "cpc": cpc,
            "cpm": cpm,
            "results": results,
            "cost_per_result": cost_per_result,
        }


if __name__ == "__main__":
    client = MockMetaClient()
    print(f"scenario: {client.scenario}\n")
    for c in client.get_campaigns():
        print(c)
        print(client.get_campaign_insights(c["id"]))
