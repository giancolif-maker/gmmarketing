"""
Deterministic checks for rules/engine.py — same inputs must always produce
the same status. Run: python test_rules_engine.py
"""

import unittest

from rules.engine import evaluate_campaign

CAMPAIGN = {"name": "Ecom Brand", "target_cpa": 5.00}


def _snapshot(results, cost_per_result, ctr=2.0, spend=None):
    spend = spend if spend is not None else round(results * cost_per_result, 2)
    return {
        "spend": spend,
        "impressions": 10000,
        "clicks": 200,
        "ctr": ctr,
        "results": results,
        "cost_per_result": cost_per_result,
    }


class RulesEngineTest(unittest.TestCase):
    def test_too_few_snapshots_is_calibrating(self):
        snaps = [_snapshot(10, 4.0)] * 2
        result = evaluate_campaign(CAMPAIGN, snaps)
        self.assertEqual(result["status"], "calibrating")
        self.assertEqual(result["action"], "none")

    def test_on_target_is_healthy(self):
        snaps = [_snapshot(10, 4.8)] * 8
        result = evaluate_campaign(CAMPAIGN, snaps)
        self.assertEqual(result["status"], "healthy")

    def test_high_cpa_is_pause_candidate(self):
        # 5.00 * 1.5 = 7.50 threshold
        snaps = [_snapshot(10, 4.8)] * 5 + [_snapshot(10, 8.5)] * 3
        result = evaluate_campaign(CAMPAIGN, snaps)
        self.assertEqual(result["status"], "pause_candidate")
        self.assertEqual(result["action"], "pause")

    def test_moderately_high_cpa_is_watch(self):
        # 5.00 * 1.15 = 5.75 threshold, below the 7.50 pause threshold
        snaps = [_snapshot(10, 6.0, ctr=2.0)] * 8
        result = evaluate_campaign(CAMPAIGN, snaps)
        self.assertEqual(result["status"], "watch")

    def test_moderately_high_cpa_with_low_ctr_is_underperforming(self):
        snaps = [_snapshot(10, 6.0, ctr=0.5)] * 8
        result = evaluate_campaign(CAMPAIGN, snaps)
        self.assertEqual(result["status"], "underperforming")
        self.assertEqual(result["action"], "alert")

    def test_low_cpa_steady_is_scale_candidate(self):
        # 5.00 * 0.85 = 4.25 threshold, flat trend
        snaps = [_snapshot(10, 4.0)] * 8
        result = evaluate_campaign(CAMPAIGN, snaps)
        self.assertEqual(result["status"], "scale_candidate")
        self.assertEqual(result["action"], "increase_budget")

    def test_low_cpa_but_worsening_trend_is_not_scaled(self):
        # cheap now, but rising sharply from a much cheaper prior window —
        # don't recommend scaling into a worsening trend even if still under target.
        snaps = [_snapshot(10, 2.0)] * 5 + [_snapshot(10, 4.0)] * 3
        result = evaluate_campaign(CAMPAIGN, snaps)
        self.assertEqual(result["trend"], "worsening")
        self.assertNotEqual(result["status"], "scale_candidate")

    def test_zero_results_despite_spend_is_pause_candidate(self):
        snaps = [_snapshot(10, 4.0)] * 5 + [_snapshot(0, 0.0, spend=50.0)] * 3
        result = evaluate_campaign(CAMPAIGN, snaps)
        self.assertEqual(result["status"], "pause_candidate")
        self.assertIn("zero results", result["message"])

    def test_improving_trend_arrow(self):
        snaps = [_snapshot(10, 8.0)] * 5 + [_snapshot(10, 4.0)] * 3
        result = evaluate_campaign(CAMPAIGN, snaps)
        self.assertEqual(result["trend"], "improving")
        self.assertEqual(result["trend_arrow"], "▼")

    def test_same_inputs_same_output(self):
        snaps = [_snapshot(10, 6.0, ctr=1.8)] * 8
        first = evaluate_campaign(CAMPAIGN, snaps)
        second = evaluate_campaign(CAMPAIGN, snaps)
        self.assertEqual(first, second)


if __name__ == "__main__":
    unittest.main()
