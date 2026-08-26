"""
Thin wrapper around the Meta Marketing API (facebook-business SDK).

Fill this in with the calls ad-brain needs: pulling campaign/ad-set/ad
insights, and applying actions (pause, budget changes) decided by the
rules engine.
"""

from facebook_business.adobjects.adaccount import AdAccount
from facebook_business.api import FacebookAdsApi

from config.settings import META_ACCESS_TOKEN, META_AD_ACCOUNT_ID, META_APP_ID, META_APP_SECRET


class MetaClient:
    def __init__(self):
        FacebookAdsApi.init(META_APP_ID, META_APP_SECRET, META_ACCESS_TOKEN)
        self.account = AdAccount(META_AD_ACCOUNT_ID)

    def get_insights(self, level="ad", fields=None, params=None):
        """Fetch insights at the given level (account/campaign/adset/ad)."""
        fields = fields or ["campaign_name", "adset_name", "ad_name", "spend", "impressions", "ctr"]
        params = params or {"level": level, "date_preset": "yesterday"}
        return list(self.account.get_insights(fields=fields, params=params))
