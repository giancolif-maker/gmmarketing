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
3. **Reject spam bios**: obvious low-quality patterns — "DM for promo",
   follow4follow/f4f, shoutout-for-shoutout, emoji-spam bios, or a bio
   that's just a thin linktree with no real brand description. Blocklist
   lives in `config.py` (`SPAM_BIO_PATTERNS` and friends) — plain
   keywords/regex, edit freely, no code changes needed.
4. **Enrich**: for qualifying accounts with a bio link, run it through
   `find_website()` / `find_email_on_website()` — adapted from
   `email_finder.py`'s site-crawling logic (same homepage/contact/about
   page-check pattern and junk-address filtering, reused rather than
   rebuilt) — to grab a public business email if one's listed.
5. **Draft a DM**: one personalized opener per qualifying lead, grounded in
   a real detail from that account's most recent post caption (or bio, if
   no caption is usable) — see "DM draft generation" below.
6. **Output**: `leads.csv` (handle, followers, last post date, website,
   email, draft DM, draft status) plus the same as a terminal table.

Every rejection at every stage — inactive, out of follower range, spam
bio, profile not found — is logged with a reason code, e.g.
`rejected: spam_bio_pattern (\bdm for promo\b)`.

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

### DM draft generation

For every lead that clears all filters, `dm_draft.py` drafts one casual,
low-pressure, curiosity-based DM opener — **never sent, just written into
the `Draft DM` column for you to review and send yourself.** Uses AI/ML
API (OpenAI-compatible chat completions), needs `GROQ_API_KEY` in `.env`
(get one at console.groq.com/keys). No key → every lead is flagged
`needs_manual_review_no_api_key`, draft left blank, rest of the pipeline
still runs fine. Pass `--no-drafts` to skip this stage entirely.

Every draft must be grounded in something *specific and real* about that
account — a detail from their most recent post caption (preferred) or
their bio — never a generic compliment like "clean pieces" or "cool vibe"
that could apply to any streetwear brand. Three safeguards enforce this,
each of which leaves `Draft DM` blank and sets a `Draft Status` reason
instead of shipping a bad draft:

| Draft Status | Meaning |
|---|---|
| `ok` | Draft generated and grounded — ready to review |
| `needs_manual_review_no_signal` | No usable caption or bio text found (empty/private/thin) |
| `needs_manual_review_no_api_key` | `GROQ_API_KEY` not set |
| `needs_manual_review_model_declined` | Model itself judged the source detail too thin to write a grounded line |
| `needs_manual_review_generic_output` | Draft matched a generic-phrase pattern (`config.DM_DRAFT_GENERIC_PHRASE_BLOCKLIST`) — rejected before it ever reached the CSV |
| `needs_manual_review_ungrounded` | Draft didn't reference any word from the source detail — rejected as a safety net against invented specifics |
| `needs_manual_review_api_error` | Groq call failed (network/rate limit/etc.) |

### Scheduled daily runs (`--daily`)

There's no scheduler already in this codebase to reuse (no APScheduler, no
cron entry, nothing), so this is new: `--daily` is still just
`lead_finder.py`, run with different defaults — the pipeline itself
(discover → filter → spam check → enrich → draft) is identical to a manual
run. It:

- Picks today's hashtag group from `config.SEED_ROTATION` instead of
  reading `--seeds` — a deterministic day-of-calendar rotation (no state
  file needed), so a scheduled run doesn't hit the same discovery pool
  every day. Edit the list in `config.py` to change what it rotates
  through, or add always-on accounts via `DAILY_SEED_ACCOUNTS`.
- Skips any handle already present in `--output` from a previous run
  (checked before the profile fetch, so it never wastes an API call or a
  Groq call on a repeat) and **appends** new leads instead of overwriting
  — so `leads.csv` accumulates across days rather than resetting.
- Stamps a `Date Found` column on every row (including manual runs, for a
  consistent schema) so you can see what's new since yesterday.
- Sends a short push summary via **ntfy** (`NTFY_TOPIC` in `.env`) — new
  lead count, how many got a ready draft vs. `needs_manual_review`. No
  topic set → the run still completes normally, it just skips the ping.

Actually scheduling it needs a persistent host — this sandbox container
gets reclaimed when the session ends, so a cron entry set up *here*
wouldn't survive. See `cron_daily.example` for the crontab line to add
wherever you actually run this (your own machine, a small VPS, etc.).
APScheduler (a long-running Python process instead of relying on system
cron) would work too if that fits your hosting better, but plain cron
needs no new dependency and no daemon to keep alive, so that's what's
documented here.

**Still research-only, unchanged**: `--daily` runs the exact same
read-only pipeline as a manual run, plus one new outbound call — a POST
to ntfy with a plain-text summary for *you*, not a lead. Nothing in this
tool calls an Instagram write endpoint, sends an email, or messages a
prospect, scheduled or not.

### Files (lead finder)

| File | Purpose |
|---|---|
| `lead_finder.py` | Main script: discover → filter → spam check → enrich → draft → CSV/table; `--daily` for scheduled runs |
| `instagram_client.py` | Graph API client + offline mock client, same interface |
| `dm_draft.py` | Grounded DM draft generation via Groq — draft-only, never sends |
| `notify.py` | Daily-run summary push via ntfy — status ping only, never sends to a lead |
| `cron_daily.example` | Crontab line for `--daily` — install wherever you host this repo |
| `sample_data/seeds_sample.txt` | Example seed hashtags/accounts |
| `sample_data/mock_ig_profiles.json` | Fake profile data for `--mock` testing |
| `leads.csv` | Output (gitignored, your own run's results) — accumulates across `--daily` runs |
