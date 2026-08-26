"""
Configurable thresholds the rules engine (rules/engine.py) evaluates
campaigns against. Tune these here rather than in engine.py so the logic
and the numbers stay separate.
"""

# A campaign needs at least this many snapshots before it's judged on
# performance at all — below this, it's still "calibrating" regardless
# of what the numbers say (too little data to trust).
MIN_SNAPSHOTS_TO_JUDGE = 5

# How many of the most recent snapshots count as "current performance"
# (averaged, to smooth out single-snapshot noise) vs. how many before
# that count as the "prior" window used to detect a trend.
CURRENT_WINDOW = 3
TREND_WINDOW = 3

# Cost-per-result relative to the campaign's target_cpa.
# cost_per_result >= target_cpa * PAUSE_CPA_MULTIPLIER  -> pause_candidate
# cost_per_result >= target_cpa * WATCH_CPA_MULTIPLIER  -> watch
# cost_per_result <= target_cpa * SCALE_CPA_MULTIPLIER
#   AND trending flat/improving                          -> scale_candidate
# otherwise                                              -> healthy
PAUSE_CPA_MULTIPLIER = 1.5
WATCH_CPA_MULTIPLIER = 1.15
SCALE_CPA_MULTIPLIER = 0.85

# A cost_per_result trend is "improving" if current avg is at least this
# fraction below the prior window's avg; "worsening" if it's at least this
# fraction above. Between the two, it's "flat".
TREND_SIGNIFICANCE = 0.08  # 8%

# CTR below this (percent) alongside a borderline CPA nudges watch -> underperforming.
LOW_CTR_PCT = 1.0
