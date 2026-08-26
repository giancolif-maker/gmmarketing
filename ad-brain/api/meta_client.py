"""
Thin wrapper around the Meta Marketing API (facebook-business SDK).

get_campaigns() and get_campaign_insights() return exactly the shape
defined in api/contract.py — the same shape api.mock_client.MockMetaClient
returns — so swapping MockMetaClient() for MetaClient() elsewhere in the
app is a one-line change, not a rewrite. That means this file carries the
job of normalizing away everything quirky about the raw API response:

- spend/impressions/clicks/ctr/cpc/cpm come back from Insights as strings,
  not numbers.
- daily_budget comes back from the Campaign node as a string in minor
  currency units (cents for USD), not a float in dollars.
- there's no single "results" field — Insights returns an `actions` list
  of {action_type, value}, and which action_type counts as a "result"
  depends on the campaign's objective (see _RESULT_ACTION_BY_OBJECTIVE).
  cost_per_action_type is the same shape, for cost-per-result.
- there's no "still calibrating" flag on the Campaign node either — Meta's
  learning-phase status lives per ad set (AdSet.learning_stage_info), so
  it has to be fetched separately and rolled up.
- Insights returns a date_start/date_stop range rather than a single date.

fields not yet needed for those two methods (ad-set/ad-level breakdowns,
etc.) still go through the generic get_insights() below.
"""

from facebook_business.adobjects.adaccount import AdAccount
from facebook_business.adobjects.adset import AdSet
from facebook_business.adobjects.campaign import Campaign
from facebook_business.api import FacebookAdsApi

from api.contract import CAMPAIGN_FIELDS, INSIGHTS_FIELDS, validate_shape
from config.settings import META_ACCESS_TOKEN, META_AD_ACCOUNT_ID, META_APP_ID, META_APP_SECRET

# What Ads Manager shows as a campaign's "Results" isn't a single API field -
# it's whichever `actions` entry matches the campaign's objective. This
# covers the current Outcome-Driven Ad Experiences objectives plus the
# legacy pre-2022 objective names still seen on older campaigns.
_RESULT_ACTION_BY_OBJECTIVE = {
    "OUTCOME_SALES": "purchase",
    "OUTCOME_LEADS": "lead",
    "OUTCOME_ENGAGEMENT": "post_engagement",
    "OUTCOME_TRAFFIC": "link_click",
    "OUTCOME_APP_PROMOTION": "mobile_app_install",
    "OUTCOME_AWARENESS": "landing_page_view",
    "CONVERSIONS": "purchase",
    "LINK_CLICKS": "link_click",
    "LEAD_GENERATION": "lead",
}
_DEFAULT_RESULT_ACTION = "purchase"

_ZERO_INSIGHTS = {
    "campaign_name": "",
    "date": None,
    "spend": 0.0,
    "impressions": 0,
    "clicks": 0,
    "ctr": 0.0,
    "cpc": 0.0,
    "cpm": 0.0,
    "results": 0,
    "cost_per_result": 0.0,
}


class MetaClient:
    def __init__(self):
        FacebookAdsApi.init(META_APP_ID, META_APP_SECRET, META_ACCESS_TOKEN)
        self.account = AdAccount(META_AD_ACCOUNT_ID)

    def get_insights(self, level="ad", fields=None, params=None):
        """Fetch raw insights at the given level (account/campaign/adset/ad).

        Unlike get_campaign_insights(), this returns the SDK's raw
        AdsInsights objects (string-valued numeric fields and all) — use it
        for breakdowns get_campaign_insights() doesn't cover yet.
        """
        fields = fields or ["campaign_name", "adset_name", "ad_name", "spend", "impressions", "ctr"]
        params = params or {"level": level, "date_preset": "yesterday"}
        return list(self.account.get_insights(fields=fields, params=params))

    def get_campaigns(self):
        """List campaigns on the ad account.

        Return shape matches api.mock_client.MockMetaClient.get_campaigns()
        exactly (see api/contract.py).
        """
        raw_campaigns = self.account.get_campaigns(
            fields=[
                Campaign.Field.id,
                Campaign.Field.name,
                Campaign.Field.status,
                Campaign.Field.effective_status,
                Campaign.Field.objective,
                Campaign.Field.daily_budget,
                Campaign.Field.created_time,
            ]
        )

        campaigns = []
        for c in raw_campaigns:
            campaign_id = c[Campaign.Field.id]
            campaign = {
                "id": campaign_id,
                "name": c[Campaign.Field.name],
                "status": c[Campaign.Field.status],
                "effective_status": c.get(Campaign.Field.effective_status, c[Campaign.Field.status]),
                "objective": c.get(Campaign.Field.objective, ""),
                # Minor currency units (cents for USD) -> major units (dollars).
                "daily_budget": round(int(c.get(Campaign.Field.daily_budget, 0)) / 100, 2),
                "created_time": c[Campaign.Field.created_time],
                "learning_phase": self._is_learning(campaign_id),
            }
            validate_shape(campaign, CAMPAIGN_FIELDS)
            campaigns.append(campaign)
        return campaigns

    def _is_learning(self, campaign_id):
        """True if any ad set under this campaign is still in Meta's learning phase.

        There's no "still calibrating" field on the Campaign node itself -
        it has to be derived from each ad set's learning_stage_info.status.
        """
        ad_sets = Campaign(campaign_id).get_ad_sets(fields=[AdSet.Field.learning_stage_info])
        return any(
            (ad_set.get(AdSet.Field.learning_stage_info) or {}).get("status") == "LEARNING"
            for ad_set in ad_sets
        )

    def get_campaign_insights(self, campaign_id, date_preset="yesterday"):
        """Spend/reach/performance for one campaign.

        Return shape matches api.mock_client.MockMetaClient.get_campaign_insights()
        exactly (see api/contract.py) — minus the mock's extra "scenario" key.
        """
        rows = Campaign(campaign_id).get_insights(
            fields=[
                "campaign_name",
                "spend",
                "impressions",
                "clicks",
                "ctr",
                "cpc",
                "cpm",
                "actions",
                "cost_per_action_type",
                "date_start",
                "date_stop",
                "objective",
            ],
            params={"date_preset": date_preset},
        )

        insights = {"campaign_id": campaign_id, "date_preset": date_preset}
        if not rows:
            # No delivery in the window - zeroed insights, not an error.
            insights.update(_ZERO_INSIGHTS)
            validate_shape(insights, INSIGHTS_FIELDS)
            return insights

        row = rows[0]
        result_action = _RESULT_ACTION_BY_OBJECTIVE.get(row.get("objective", ""), _DEFAULT_RESULT_ACTION)
        results = _sum_action(row.get("actions"), result_action)
        cost_per_result = _lookup_cost_per_action(row.get("cost_per_action_type"), result_action)

        spend = float(row.get("spend", 0))
        if cost_per_result is None:
            cost_per_result = round(spend / results, 2) if results else 0.0

        insights.update(
            {
                "campaign_name": row.get("campaign_name", ""),
                "date": row.get("date_stop"),
                "spend": round(spend, 2),
                "impressions": int(row.get("impressions", 0)),
                "clicks": int(row.get("clicks", 0)),
                "ctr": round(float(row.get("ctr", 0)), 2),
                "cpc": round(float(row.get("cpc", 0)), 2),
                "cpm": round(float(row.get("cpm", 0)), 2),
                "results": results,
                "cost_per_result": round(cost_per_result, 2),
            }
        )
        validate_shape(insights, INSIGHTS_FIELDS)
        return insights


def _sum_action(actions, action_type):
    """Sum the `value` of every entry in an insights `actions` list matching action_type."""
    if not actions:
        return 0
    return sum(int(float(a["value"])) for a in actions if a.get("action_type") == action_type)


def _lookup_cost_per_action(cost_per_action_type, action_type):
    """Look up Meta's own cost-per-result for action_type, if it reported one."""
    if not cost_per_action_type:
        return None
    for entry in cost_per_action_type:
        if entry.get("action_type") == action_type:
            return float(entry["value"])
    return None
