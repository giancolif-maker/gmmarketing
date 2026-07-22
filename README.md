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
