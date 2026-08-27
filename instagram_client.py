"""
Read-only Instagram data access for the streetwear/e-commerce lead finder.

There is no compliant public API for scraping arbitrary Instagram accounts
or hashtags. Instagram's private web endpoints require a logged-in session,
are aggressively anti-bot, and hitting them without authorization violates
Instagram's Terms of Service. The only sanctioned way to do hashtag
discovery and profile lookups programmatically is the official Instagram
Graph API (Hashtag Search + Business Discovery), which requires a Facebook
App and an Instagram Business/Creator account. See README.md for setup.

This module never posts, comments, follows, likes, or messages anything.
Every method here is a read-only lookup.

Two clients, same interface (discover_by_hashtag, get_profile):

- GraphAPIInstagramClient: real calls against the Graph API. Needs
  IG_ACCESS_TOKEN + IG_BUSINESS_ACCOUNT_ID in .env.
- MockInstagramClient: reads canned profiles from a local JSON fixture
  (sample_data/mock_ig_profiles.json) so the rest of the pipeline can be
  built and tested without API credentials. Used via `--mock`.
"""
import json
import re

import requests

GRAPH_API_VERSION = "v19.0"
GRAPH_API_BASE = f"https://graph.facebook.com/{GRAPH_API_VERSION}"

# Graph API's hashtag recent_media edge doesn't expose the author's username
# directly for accounts you don't own -- it's recovered from the media
# permalink (https://www.instagram.com/<username>/p/<shortcode>/).
PERMALINK_USERNAME_RE = re.compile(r"instagram\.com/([^/]+)/p/")


class InstagramAPIError(RuntimeError):
    pass


class GraphAPIInstagramClient:
    """Real Instagram Graph API client (Hashtag Search + Business Discovery)."""

    def __init__(self, access_token, business_account_id, timeout=10):
        if not access_token or not business_account_id:
            raise InstagramAPIError(
                "IG_ACCESS_TOKEN and IG_BUSINESS_ACCOUNT_ID must be set in .env to "
                "use live Instagram data. Run with --mock to test without them, or "
                "see README.md for the Graph API setup steps."
            )
        self.access_token = access_token
        self.business_account_id = business_account_id
        self.timeout = timeout

    def _get(self, path, params):
        params = {**params, "access_token": self.access_token}
        try:
            resp = requests.get(f"{GRAPH_API_BASE}/{path}", params=params, timeout=self.timeout)
        except requests.RequestException as exc:
            raise InstagramAPIError(f"request to {path} failed: {exc}") from exc
        data = resp.json()
        if resp.status_code != 200 or "error" in data:
            raise InstagramAPIError(f"Graph API error on {path}: {data.get('error', data)}")
        return data

    def discover_by_hashtag(self, hashtag, limit=25):
        """Return usernames that recently posted under `hashtag`.

        Note: Instagram limits hashtag search to 30 unique hashtags per
        rolling 7 days per IG Business account (Graph API platform limit).
        """
        tag = hashtag.lstrip("#")
        search = self._get("ig_hashtag_search", {"user_id": self.business_account_id, "q": tag})
        results = search.get("data", [])
        if not results:
            return []
        hashtag_id = results[0]["id"]
        media = self._get(
            f"{hashtag_id}/recent_media",
            {"user_id": self.business_account_id, "fields": "permalink", "limit": limit},
        )
        usernames = []
        for item in media.get("data", []):
            m = PERMALINK_USERNAME_RE.search(item.get("permalink", ""))
            if m:
                usernames.append(m.group(1))
        return usernames

    def get_profile(self, username):
        """Business Discovery lookup: followers, bio, website, recent post timestamps.

        Only works for public Business/Creator accounts (most storefront
        brands are). Personal accounts return nothing here.
        """
        fields = (
            "business_discovery.username({username})"
            "{{username,followers_count,biography,website,media_count,"
            "media.limit(5){{timestamp}}}}"
        ).format(username=username)
        data = self._get(self.business_account_id, {"fields": fields})
        return data.get("business_discovery")


class MockInstagramClient:
    """Offline stand-in for testing the pipeline without API credentials.

    Reads a JSON list of fake/illustrative profiles from `fixture_path`.
    Not live Instagram data -- see sample_data/mock_ig_profiles.json.
    """

    def __init__(self, fixture_path):
        with open(fixture_path, encoding="utf-8") as f:
            self._profiles = {p["username"].lower(): p for p in json.load(f)}

    def discover_by_hashtag(self, hashtag, limit=25):
        tag = hashtag.lstrip("#").lower()
        matches = [
            p["username"]
            for p in self._profiles.values()
            if tag in [t.lower() for t in p.get("seed_hashtags", [])]
        ]
        return matches[:limit]

    def get_profile(self, username):
        return self._profiles.get(username.lstrip("@").lower())
