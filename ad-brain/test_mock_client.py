"""
Quick manual check for api.mock_client.MockMetaClient: pulls campaigns,
fetches insights for each, and prints a summary table.

Run from the ad-brain/ directory:
    python test_mock_client.py
    MOCK_SCENARIO=healthy python test_mock_client.py
    MOCK_SCENARIO=underperforming python test_mock_client.py
    MOCK_SCENARIO=calibrating python test_mock_client.py
"""

from api.mock_client import MockMetaClient

COLUMNS = [
    ("Campaign", "campaign_name", "<", 18),
    ("Spend", "spend", ">", 10),
    ("Impr.", "impressions", ">", 8),
    ("Clicks", "clicks", ">", 7),
    ("CTR%", "ctr", ">", 6),
    ("CPC", "cpc", ">", 7),
    ("CPM", "cpm", ">", 7),
    ("Results", "results", ">", 8),
    ("Cost/Result", "cost_per_result", ">", 12),
]


def print_table(rows):
    header = " | ".join(f"{label:{align}{width}}" for label, _, align, width in COLUMNS)
    print(header)
    print("-" * len(header))
    for row in rows:
        cells = []
        for _, key, align, width in COLUMNS:
            value = row[key]
            if key == "spend":
                text = f"${value:,.2f}"
            elif key in ("cpc", "cpm", "cost_per_result"):
                text = f"${value:,.2f}"
            elif key == "ctr":
                text = f"{value:.2f}"
            elif key == "impressions":
                text = f"{value:,}"
            else:
                text = str(value)
            cells.append(f"{text:{align}{width}}")
        print(" | ".join(cells))


def main():
    client = MockMetaClient()
    print(f"scenario: {client.scenario}")

    campaigns = client.get_campaigns()
    print(f"Fetched {len(campaigns)} campaign(s)\n")

    insights = [client.get_campaign_insights(c["id"]) for c in campaigns]
    print_table(insights)


if __name__ == "__main__":
    main()
