# Cold Email Outreach Tool

B2B outreach tool for home services agency prospecting (HVAC, roofing, garage
doors, plumbing, electrical, pest control). Two stages: find public contact
emails on prospect websites, then send templated outreach through rotating
Gmail accounts with daily caps, dedup tracking, and Google Sheets logging.

## Setup

```bash
pip install -r requirements.txt
cp .env.example .env   # fill in real Gmail app passwords + Sheet ID
```

Put your Google service account JSON key in `credentials/` and point
`GOOGLE_SERVICE_ACCOUNT_JSON` at it in `.env`. Share the target Google Sheet
with the service account's `client_email` (Editor access).

## 1. Find emails

```bash
python email_finder.py --input prospects.csv --output prospects_with_emails.csv
```

For every row with a `Website`, checks the homepage, `/contact`,
`/contact-us`, `/about`, `/about-us` (stopping as soon as an email is found).
Uses a real browser User-Agent and a 1-2s delay between businesses. Writes
the original columns plus a new `Email` column.

A sample input file is in `sample_data/prospects_sample.csv`.

**Limitation:** this fetches static HTML only (no JavaScript execution). Sites
that render their contact info client-side (common on some React/Vue
marketing sites) won't yield an email even if one is shown in the browser.

## 2. Send outreach emails

Edit `template.txt` — it needs a `Subject:` line, a blank line, then the
body. Available merge fields: `{business_name}`, `{city}`, `{niche}`,
`{outreach_message}` (from the CSV's `Outreach Message` column, blank if
none).

**Always dry-run first:**

```bash
python email_sender.py --dry-run
```

Prints exactly what would be sent (recipient, account, subject, body) with
no SMTP connections and no Sheet/log writes.

Then send for real:

```bash
python email_sender.py
```

Behavior:
- Only rows with a non-empty `Email` column are sent to (the `Qualified`
  column is currently ignored per your instruction).
- Rotates evenly across every `GMAIL_N_ADDRESS` / `GMAIL_N_APP_PASSWORD`
  pair found in `.env`.
- Caps sends per account per day at `DAILY_CAP_PER_ACCOUNT` in `config.py`
  (default 40). If every account has hit its cap, the run stops immediately
  with a warning — it never sends anything over the limit.
- Waits 30-60 random seconds between individual sends.
- Skips any email address already present in `sent_log.csv` (a successful
  send's ledger keyed by email address), so re-importing/deleting leads in
  base44 won't cause duplicate sends. Failed sends are **not** added to the
  ledger, so they're retried on the next run.
- Appends one row per send attempt (success or failure) to your Google
  Sheet: `email, business_name, niche, city, account_used, status,
  timestamp`. If the Sheet API call fails, the error is logged locally and
  the run continues — it never crashes the whole batch.
- Every attempt (success or fail) is also logged to
  `logs/send_attempts.log` for your own records.

## Files

| File | Purpose |
|---|---|
| `config.py` | Daily cap, delay ranges, scrape paths, file paths — edit here |
| `template.txt` | Email subject + body with merge fields |
| `email_finder.py` | Scrapes prospect websites for emails |
| `email_sender.py` | Sends outreach, rotates accounts, logs to Sheets |
| `sent_log.csv` | Auto-created dedup ledger (gitignored) |
| `logs/send_attempts.log` | Auto-created attempt log (gitignored) |
| `.env` | Your real credentials (gitignored, never commit) |

---

## Streetwear IG Lead Finder

A **separate, research-only** tool: `lead_finder.py`. It finds and lists
qualified streetwear/e-commerce Instagram accounts for you to review and DM
yourself. **It never sends a DM, comment, follow, like, email, or post —
it only reads public data and writes a CSV.** It shares no code path with
`email_sender.py`.

### Pipeline

1. **Discover** candidate accounts from seed hashtags (Instagram Graph API
   Hashtag Search) and/or seed accounts you list directly.
2. **Filter** on basic activity signals: posted within the last X days
   (default 14) and follower count within a min/max you set.
3. **Enrich**: for qualifying accounts with a bio link, run it through
   `find_website()` / `find_email_on_website()` — adapted from
   `email_finder.py`'s site-crawling logic (same homepage/contact/about
   page-check pattern and junk-address filtering, reused rather than
   rebuilt) — to grab a public business email if one's listed.
4. **Output**: `leads.csv` (handle, followers, last post date, website,
   email) plus the same as a terminal table.

### Why this needs API setup (and why it isn't a scraper)

Instagram has no public, unauthenticated API for hashtag or account
discovery. Hitting Instagram's private web endpoints without logging in
violates their Terms of Service and gets blocked almost immediately, so
this tool doesn't do that. The compliant path is the official **Instagram
Graph API** (Hashtag Search + Business Discovery), which requires:

1. A Facebook App (developers.facebook.com) with the Instagram Graph API product added.
2. An Instagram **Business or Creator** account, linked to a Facebook Page you control.
3. A user access token for that setup (`IG_ACCESS_TOKEN`) and the linked
   Instagram Business Account ID (`IG_BUSINESS_ACCOUNT_ID`), both in `.env`.

Two real limitations worth knowing going in:
- **Hashtag Search is rate-limited** to 30 unique hashtags per rolling 7
  days per IG Business account — plan your seed hashtag list accordingly.
- **Business Discovery only returns data for public Business/Creator
  accounts.** Personal accounts return nothing — which is fine, since a
  personal account isn't a business lead anyway.

### Testing without API credentials

```bash
python lead_finder.py --mock --seeds sample_data/seeds_sample.txt \
    --min-followers 2000 --max-followers 200000 --max-days-inactive 14
```

`--mock` reads `sample_data/mock_ig_profiles.json` (fake/illustrative
account, follower, and post-date data — clearly not live Instagram data)
instead of calling the Graph API, so you can see the discovery → filter →
output stages work. The website/email lookup step still makes **real**
HTTP requests to whatever website each mock profile lists, so that half of
the pipeline is exercised against real live sites even in mock mode.

### Running for real

```bash
cp .env.example .env   # fill in IG_ACCESS_TOKEN + IG_BUSINESS_ACCOUNT_ID
python lead_finder.py --seeds sample_data/seeds_sample.txt \
    --min-followers 2000 --max-followers 150000 --max-days-inactive 14 \
    --output leads.csv
```

Seed file format (`sample_data/seeds_sample.txt`): one hashtag or account
per line — `#hashtag` lines get discovered via Hashtag Search, everything
else (`@account` or bare `account`) is checked directly as a candidate.
Lines starting with `//` are comments.

### Files (lead finder)

| File | Purpose |
|---|---|
| `lead_finder.py` | Main script: discover → filter → enrich → CSV/table |
| `instagram_client.py` | Graph API client + offline mock client, same interface |
| `sample_data/seeds_sample.txt` | Example seed hashtags/accounts |
| `sample_data/mock_ig_profiles.json` | Fake profile data for `--mock` testing |
| `leads.csv` | Output (gitignored, your own run's results) |
