"""
Shared return-shape contract for the two Meta Ads clients:
api.mock_client.MockMetaClient and api.meta_client.MetaClient.

Meta's raw Marketing API is full of quirks the rest of ad-brain shouldn't
have to know about: numeric fields come back as strings, budgets are in
minor currency units (cents), "results" isn't a field at all (you get an
`actions` list and have to pick out the action_type that matches the
campaign's objective), and dates are a date_start/date_stop range. Both
clients are responsible for normalizing that away and returning exactly
the shape defined here - that's what makes MetaClient() a drop-in swap
for MockMetaClient() later, instead of a rewrite of everything built
against the mock.

Both `get_campaigns()` and `get_campaign_insights()` end by calling
`validate_shape()` on their own output, so a drift between the two
implementations fails loudly (as an AssertionError) the moment it happens,
rather than being discovered later in the rules engine.
"""

CAMPAIGN_FIELDS = {
    "id": str,
    "name": str,
    "status": str,  # ACTIVE / PAUSED / DELETED / ARCHIVED - what was set
    "effective_status": str,  # what's actually delivering (may differ from status)
    "objective": str,
    "daily_budget": float,  # normalized to major currency units, e.g. dollars
    "created_time": str,
    "learning_phase": bool,
}

INSIGHTS_FIELDS = {
    "campaign_id": str,
    "campaign_name": str,
    "date": (str, type(None)),  # None when a campaign had no delivery in the window
    "date_preset": str,
    "spend": float,
    "impressions": int,
    "clicks": int,
    "ctr": float,
    "cpc": float,
    "cpm": float,
    "results": int,
    "cost_per_result": float,
}


def validate_shape(data, fields, extra_allowed=()):
    """Raise AssertionError if `data`'s keys/types don't match `fields`.

    extra_allowed: keys permitted beyond the contract (e.g. mock-only debug
    fields) that callers shouldn't build logic around, but that don't
    themselves break the drop-in guarantee.
    """
    required = set(fields)
    present = set(data)
    missing = required - present
    unexpected = present - required - set(extra_allowed)
    if missing:
        raise AssertionError(f"Missing contract keys: {sorted(missing)}")
    if unexpected:
        raise AssertionError(f"Unexpected keys not in contract: {sorted(unexpected)}")
    for key, expected_type in fields.items():
        value = data[key]
        if not isinstance(value, expected_type):
            raise AssertionError(
                f"{key!r} should be {expected_type}, got {type(value).__name__} ({value!r})"
            )
