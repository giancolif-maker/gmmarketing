"""
Fake Meta Marketing API client for local development.

Mirrors the interface `api.meta_client.MetaClient` will eventually expose,
so the rules engine and anything else built against it can develop against
realistic-looking data before real ad-account credentials are wired up.
Swap `MockMetaClient()` for `MetaClient()` once that's ready — same shape.

Each call re-rolls its numbers within a plausible range of the campaign's
baseline, so repeated polling looks like real day-to-day fluctuation
instead of returning identical numbers forever.
"""

import random
from datetime import date, timedelta

# Baseline daily performance each campaign fluctuates around.
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

_FLUCTUATION = 0.15  # +/- 15% noise on each metric


def _jitter(value, pct=_FLUCTUATION):
    """Return `value` randomly nudged by up to +/- pct."""
    return value * random.uniform(1 - pct, 1 + pct)


class MockMetaClient:
    """Drop-in fake for MetaClient. No network calls, no credentials needed."""

    def get_campaigns(self):
        """List campaigns on the (fake) ad account."""
        return [
            {
                "id": campaign_id,
                "name": data["name"],
                "status": data["status"],
                "objective": data["objective"],
                "daily_budget": data["daily_budget"],
                "created_time": data["created_time"],
            }
            for campaign_id, data in _CAMPAIGNS.items()
        ]

    def get_campaign_insights(self, campaign_id, date_preset="yesterday"):
        """Fake insights for one campaign: spend, reach, and performance ratios."""
        campaign = _CAMPAIGNS.get(campaign_id)
        if campaign is None:
            raise ValueError(f"Unknown campaign_id: {campaign_id!r}")

        base = campaign["baseline"]

        spend = round(_jitter(base["spend"]), 2)
        impressions = max(1, round(_jitter(base["impressions"])))
        ctr = round(_jitter(base["ctr"]), 2)
        clicks = max(0, round(impressions * (ctr / 100)))
        cvr = round(_jitter(base["cvr"]), 2)
        results = max(0, round(clicks * (cvr / 100)))

        cpc = round(spend / clicks, 2) if clicks else 0.0
        cpm = round(spend / impressions * 1000, 2) if impressions else 0.0
        cost_per_result = round(spend / results, 2) if results else 0.0

        return {
            "campaign_id": campaign_id,
            "campaign_name": campaign["name"],
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
    for c in client.get_campaigns():
        print(c)
        print(client.get_campaign_insights(c["id"]))
