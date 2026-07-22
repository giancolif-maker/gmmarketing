#!/usr/bin/env python3
"""
Scrapes public contact emails for businesses listed in prospects.csv.

For each row with a Website, checks the homepage plus /contact, /contact-us,
/about, /about-us (stopping early as soon as an email is found) and writes
prospects_with_emails.csv with a new Email column.

Usage:
    python email_finder.py --input prospects.csv --output prospects_with_emails.csv
"""
import argparse
import csv
import random
import re
import time
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup

import config

EMAIL_REGEX = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")

# Placeholder / tracking-pixel / asset addresses that show up in scraped HTML
# but are never real contact emails.
JUNK_SUBSTRINGS = (
    "example.com",
    "yourdomain",
    "domain.com",
    "sentry.io",
    "wixpress.com",
    "godaddy.com",
    "schema.org",
    "w3.org",
    "@2x",
)
JUNK_EXTENSIONS = (".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".css", ".js")


def is_junk_email(email: str) -> bool:
    lowered = email.lower()
    if any(sub in lowered for sub in JUNK_SUBSTRINGS):
        return True
    if lowered.endswith(JUNK_EXTENSIONS):
        return True
    if any(lowered.endswith(ext + "@2x" + ext) for ext in JUNK_EXTENSIONS):
        return True
    return False


def normalize_url(website: str) -> str:
    website = website.strip()
    if not website:
        return ""
    parsed = urlparse(website)
    if not parsed.scheme:
        website = "https://" + website
    return website.rstrip("/")


def fetch_page(url: str):
    headers = {"User-Agent": config.USER_AGENT}
    try:
        resp = requests.get(url, headers=headers, timeout=config.REQUEST_TIMEOUT)
        if resp.status_code == 200:
            return resp.text
    except requests.RequestException as exc:
        print(f"    ! could not fetch {url}: {exc}")
    return None


def extract_emails(html: str):
    soup = BeautifulSoup(html, "html.parser")
    found = set()

    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        if href.lower().startswith("mailto:"):
            addr = href[len("mailto:"):].split("?")[0].strip()
            if addr and not is_junk_email(addr):
                found.add(addr)

    text = soup.get_text(" ")
    for match in EMAIL_REGEX.findall(text):
        if not is_junk_email(match):
            found.add(match)

    return found


def find_email_for_site(base_url: str):
    for i, path in enumerate(config.PAGE_PATHS):
        url = base_url + path
        html = fetch_page(url)
        if i < len(config.PAGE_PATHS) - 1:
            time.sleep(1)  # small courtesy delay between pages on the same site
        if not html:
            continue
        emails = extract_emails(html)
        if emails:
            return "; ".join(sorted(emails))
    return ""


def main():
    parser = argparse.ArgumentParser(description="Find public emails for prospects.csv")
    parser.add_argument("--input", default=config.DEFAULT_PROSPECTS_INPUT)
    parser.add_argument("--output", default=config.DEFAULT_PROSPECTS_OUTPUT)
    args = parser.parse_args()

    with open(args.input, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        fieldnames = list(reader.fieldnames or [])

    if "Email" not in fieldnames:
        fieldnames.append("Email")

    total = len(rows)
    found_count = 0

    with open(args.output, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()

        for idx, row in enumerate(rows, start=1):
            name = row.get("Business Name", "").strip()
            website = row.get("Website", "").strip()
            print(f"[{idx}/{total}] {name}")

            email = ""
            if website:
                base_url = normalize_url(website)
                email = find_email_for_site(base_url)
                if email:
                    found_count += 1
                    print(f"    found: {email}")
                else:
                    print("    no email found")
            else:
                print("    skipped (no website)")

            row["Email"] = email
            writer.writerow(row)
            f.flush()

            if website:
                time.sleep(random.uniform(config.MIN_SCRAPE_DELAY, config.MAX_SCRAPE_DELAY))

    print(f"\nDone. Found emails for {found_count}/{total} businesses.")
    print(f"Wrote {args.output}")


if __name__ == "__main__":
    main()
