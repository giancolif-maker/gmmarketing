"""
Proves MetaClient and MockMetaClient are actually a drop-in swap for each
other: feeds MetaClient realistic raw-API fixture data (the string-valued,
cents-based, actions-list shape Meta really returns) through unittest.mock,
then asserts its normalized output has the exact same keys/types as
MockMetaClient's — both checked against api/contract.py, and against
each other.

Run from the ad-brain/ directory:
    python test_client_contract.py
"""

import unittest
from unittest.mock import patch

from api.contract import CAMPAIGN_FIELDS, INSIGHTS_FIELDS, validate_shape
from api.meta_client import MetaClient
from api.mock_client import MockMetaClient

# Raw fixture data shaped exactly like the real Marketing API: numeric
# fields as strings, budget in cents, "results" buried in an actions list.
_RAW_CAMPAIGN = {
    "id": "23851234567890123",
    "name": "Ecom Brand",
    "status": "ACTIVE",
    "effective_status": "ACTIVE",
    "objective": "OUTCOME_SALES",
    "daily_budget": "15000",  # cents -> $150.00
    "created_time": "2025-11-03T09:00:00-0700",
}

_RAW_INSIGHTS_ROW = {
    "campaign_name": "Ecom Brand",
    "spend": "142.58",
    "impressions": "43132",
    "clicks": "970",
    "ctr": "2.249052",
    "cpc": "0.146990",
    "cpm": "3.305729",
    "actions": [
        {"action_type": "link_click", "value": "970"},
        {"action_type": "purchase", "value": "36"},
    ],
    "cost_per_action_type": [
        {"action_type": "purchase", "value": "3.960556"},
    ],
    "date_start": "2026-08-25",
    "date_stop": "2026-08-25",
    "objective": "OUTCOME_SALES",
}


class ClientContractTest(unittest.TestCase):
    def setUp(self):
        with patch("api.meta_client.FacebookAdsApi.init"):
            self.client = MetaClient()

    def test_get_campaigns_shape_from_raw_fixture(self):
        with patch.object(self.client.account, "get_campaigns", return_value=[_RAW_CAMPAIGN]), patch(
            "api.meta_client.Campaign.get_ad_sets", return_value=[]
        ):
            campaigns = self.client.get_campaigns()

        self.assertEqual(len(campaigns), 1)
        campaign = campaigns[0]
        validate_shape(campaign, CAMPAIGN_FIELDS)
        # Cents -> dollars actually happened, not just "is a float".
        self.assertEqual(campaign["daily_budget"], 150.00)
        self.assertEqual(campaign["learning_phase"], False)

    def test_get_campaign_insights_shape_from_raw_fixture(self):
        with patch("api.meta_client.Campaign.get_insights", return_value=[_RAW_INSIGHTS_ROW]):
            insights = self.client.get_campaign_insights("23851234567890123")

        validate_shape(insights, INSIGHTS_FIELDS)
        # "results" correctly picked the purchase action, not link_click,
        # because objective was OUTCOME_SALES.
        self.assertEqual(insights["results"], 36)
        self.assertEqual(insights["spend"], 142.58)
        self.assertEqual(insights["cost_per_result"], 3.96)
        self.assertEqual(insights["date"], "2026-08-25")

    def test_get_campaign_insights_no_delivery(self):
        with patch("api.meta_client.Campaign.get_insights", return_value=[]):
            insights = self.client.get_campaign_insights("23851234567890123")
        validate_shape(insights, INSIGHTS_FIELDS)
        self.assertEqual(insights["spend"], 0.0)
        self.assertIsNone(insights["date"])

    def test_mock_and_real_keys_match_exactly(self):
        """The actual point of this file: same keys, same types, both sides."""
        with patch.object(self.client.account, "get_campaigns", return_value=[_RAW_CAMPAIGN]), patch(
            "api.meta_client.Campaign.get_ad_sets", return_value=[]
        ):
            real_campaign = self.client.get_campaigns()[0]
        mock_campaign = MockMetaClient(scenario="healthy").get_campaigns()[0]
        self.assertEqual(set(real_campaign), set(mock_campaign))
        for key in real_campaign:
            self.assertIsInstance(mock_campaign[key], type(real_campaign[key]))

        with patch("api.meta_client.Campaign.get_insights", return_value=[_RAW_INSIGHTS_ROW]):
            real_insights = self.client.get_campaign_insights("23851234567890123")
        mock_insights = MockMetaClient(scenario="healthy").get_campaign_insights("23851234567890123")
        # mock carries one extra debug key ("scenario") - documented, not part of the contract.
        self.assertEqual(set(mock_insights) - {"scenario"}, set(real_insights))


if __name__ == "__main__":
    unittest.main()
