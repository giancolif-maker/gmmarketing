#!/usr/bin/env python3
"""
Finds and lists qualified streetwear/e-commerce Instagram lead accounts.

RESEARCH ONLY. This tool never sends DMs, comments, follows, likes, emails,
or posts anything. It discovers candidate accounts from seed hashtags/
accounts, filters them on posting activity + follower count, and looks up
a public business email from their linked website (if any) -- so you can
review the list and message people yourself.

Pipeline:
    1. Discover candidates from seed hashtags/accounts (Instagram Graph API
       Hashtag Search, or seed accounts used directly).
    2. Check activity signals: posted within the last X days, follower
       count within your min/max range.
    3. For qualifying accounts with a bio link, run it through
       find_website() / find_email_on_website() -- adapted from the
       home-services pipeline's email_finder.py -- to grab a public email.
    4. Write leads.csv (handle, followers, last post date, website, email)
       and print the same as a terminal table.

Usage:
    python lead_finder.py --seeds sample_data/seeds_sample.txt \\
        --min-followers 2000 --max-followers 150000 --max-days-inactive 14

    Add --mock to run against sample_data/mock_ig_profiles.json instead of
    the live Graph API (useful for testing without API credentials -- the
    website/email lookup in that mode still makes real HTTP requests to
    whatever websites the fixture lists).
"""
import argparse
import csv
import os
import random
import re
import time
from datetime import datetime, timezone

from dotenv import load_dotenv

import config
from email_finder import find_email_for_site, normalize_url
from instagram_client import GraphAPIInstagramClient, InstagramAPIError, MockInstagramClient

# Fallback for accounts whose bio has a bare URL instead of a proper "website" field.
URL_IN_BIO_RE = re.compile(
    r"(https?://[^\s]+|(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:/[^\s]*)?)"
)


def load_seeds(path):
    """Parse a seed file: lines starting with # are hashtags, @ (or bare) are accounts."""
    hashtags, accounts = [], []
    with open(path, encoding="utf-8") as f:
        for raw_line in f:
            line = raw_line.strip()
            if not line or line.startswith("//"):
                continue
            if line.startswith("#"):
                hashtags.append(line)
            else:
                accounts.append(line.lstrip("@"))
    return hashtags, accounts


def find_website(profile):
    """Adapted from the home-services pipeline's find_website() step.

    There, "finding" a website meant a places/maps lookup; here the site is
    already on the profile (the bio link field), so this just extracts and
    normalizes it -- falling back to a bare URL spotted in the bio text.
    """
    website = (profile.get("website") or "").strip()
    if website:
        return normalize_url(website)
    bio = profile.get("biography") or ""
    match = URL_IN_BIO_RE.search(bio)
    if match:
        return normalize_url(match.group(0))
    return ""


def find_email_on_website(website_url):
    """Thin wrapper around email_finder.find_email_for_site -- same page-crawl
    (homepage, /contact, /contact-us, /about, /about-us) and junk filtering,
    reused as-is rather than reimplemented."""
    if not website_url:
        return ""
    return find_email_for_site(website_url)


def last_post_date(profile):
    media = (profile.get("media") or {}).get("data", [])
    timestamps = [m["timestamp"] for m in media if m.get("timestamp")]
    if not timestamps:
        return None
    latest = max(timestamps)
    return datetime.fromisoformat(latest.replace("Z", "+00:00"))


def qualifies(profile, min_followers, max_followers, max_days_inactive):
    """Basic activity signals: follower range + posted recently. Returns (ok, reason)."""
    followers = profile.get("followers_count")
    if followers is None:
        return False, "no follower count"
    if not (min_followers <= followers <= max_followers):
        return False, f"followers {followers} outside {min_followers}-{max_followers}"

    posted = last_post_date(profile)
    if posted is None:
        return False, "no recent posts found"
    days_since = (datetime.now(timezone.utc) - posted).days
    if days_since > max_days_inactive:
        return False, f"inactive {days_since}d (limit {max_days_inactive}d)"

    return True, ""


def print_table(rows):
    if not rows:
        print("(no qualified leads)")
        return
    print(f"{'Handle':<24} {'Followers':>10}  {'Last Post':<11} {'Website':<30} Email")
    print("-" * 110)
    for r in rows:
        print(
            f"{r['Handle']:<24} {r['Followers']:>10}  {r['Last Post']:<11} "
            f"{(r['Website'] or '-'):<30} {r['Email'] or '-'}"
        )


def main():
    parser = argparse.ArgumentParser(
        description="Find qualified streetwear/e-commerce IG leads. Research only -- never sends anything."
    )
    parser.add_argument("--seeds", default=config.DEFAULT_SEEDS_PATH)
    parser.add_argument("--output", default=config.DEFAULT_LEADS_OUTPUT)
    parser.add_argument("--min-followers", type=int, default=config.LEAD_MIN_FOLLOWERS)
    parser.add_argument("--max-followers", type=int, default=config.LEAD_MAX_FOLLOWERS)
    parser.add_argument("--max-days-inactive", type=int, default=config.LEAD_MAX_DAYS_INACTIVE)
    parser.add_argument("--limit-per-hashtag", type=int, default=config.LEAD_LIMIT_PER_HASHTAG)
    parser.add_argument(
        "--mock",
        action="store_true",
        help="Use sample_data/mock_ig_profiles.json instead of the live Instagram Graph API",
    )
    args = parser.parse_args()

    load_dotenv()

    if args.mock:
        client = MockInstagramClient(config.MOCK_IG_PROFILES_PATH)
        print(f"=== MOCK mode: reading {config.MOCK_IG_PROFILES_PATH} instead of live Instagram ===\n")
    else:
        try:
            client = GraphAPIInstagramClient(
                os.environ.get("IG_ACCESS_TOKEN"), os.environ.get("IG_BUSINESS_ACCOUNT_ID")
            )
        except InstagramAPIError as exc:
            print(f"ERROR: {exc}")
            return

    hashtags, seed_accounts = load_seeds(args.seeds)
    print(f"Seeds: {len(hashtags)} hashtag(s), {len(seed_accounts)} account(s)")

    candidates = set(seed_accounts)
    for tag in hashtags:
        print(f"Discovering via {tag} ...")
        try:
            found = client.discover_by_hashtag(tag, limit=args.limit_per_hashtag)
        except InstagramAPIError as exc:
            print(f"  ! {exc}")
            found = []
        print(f"  found {len(found)} candidate(s)")
        candidates.update(found)

    print(f"\n{len(candidates)} unique candidate account(s) to check "
          f"(followers {args.min_followers}-{args.max_followers}, "
          f"active within {args.max_days_inactive}d)\n")

    rows = []
    for idx, handle in enumerate(sorted(candidates), start=1):
        print(f"[{idx}/{len(candidates)}] @{handle}")
        try:
            profile = client.get_profile(handle)
        except InstagramAPIError as exc:
            print(f"    ! could not fetch profile: {exc}")
            continue
        if not profile:
            print("    skipped (profile not found / not a public business account)")
            continue

        ok, reason = qualifies(profile, args.min_followers, args.max_followers, args.max_days_inactive)
        if not ok:
            print(f"    skipped ({reason})")
            continue

        website = find_website(profile)
        email = ""
        if website:
            email = find_email_on_website(website)
            time.sleep(random.uniform(config.MIN_SCRAPE_DELAY, config.MAX_SCRAPE_DELAY))

        posted = last_post_date(profile)
        row = {
            "Handle": f"@{handle}",
            "Followers": profile.get("followers_count", ""),
            "Last Post": posted.date().isoformat() if posted else "",
            "Website": website,
            "Email": email,
        }
        rows.append(row)
        print(
            f"    QUALIFIED  followers={row['Followers']}  last_post={row['Last Post']}  "
            f"website={website or '-'}  email={email or '-'}"
        )

    fieldnames = ["Handle", "Followers", "Last Post", "Website", "Email"]
    with open(args.output, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"\n{len(rows)}/{len(candidates)} candidate(s) qualified. Wrote {args.output}\n")
    print_table(rows)


if __name__ == "__main__":
    main()
