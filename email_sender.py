#!/usr/bin/env python3
"""
Sends cold outreach emails from prospects_with_emails.csv via rotating Gmail
SMTP accounts, logs every attempt locally, and appends successful/failed
sends to a Google Sheet.

Usage:
    python email_sender.py --dry-run
    python email_sender.py
"""
import argparse
import csv
import logging
import os
import random
import re
import smtplib
import ssl
import sys
import time
from collections import defaultdict
from datetime import datetime, date
from email.mime.text import MIMEText
from pathlib import Path

from dotenv import load_dotenv

import config

GMAIL_VAR_RE = re.compile(r"^GMAIL_(\d+)_ADDRESS$")


# --------------------------------------------------------------------------
# Setup
# --------------------------------------------------------------------------
def setup_logging():
    Path(config.ATTEMPT_LOG_PATH).parent.mkdir(parents=True, exist_ok=True)
    logger = logging.getLogger("email_sender")
    logger.setLevel(logging.INFO)
    logger.handlers.clear()

    file_handler = logging.FileHandler(config.ATTEMPT_LOG_PATH)
    file_handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
    logger.addHandler(file_handler)

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(logging.Formatter("%(message)s"))
    logger.addHandler(console_handler)

    return logger


def load_accounts():
    """Discover GMAIL_N_ADDRESS / GMAIL_N_APP_PASSWORD pairs from the environment."""
    indices = sorted(
        int(m.group(1)) for k in os.environ if (m := GMAIL_VAR_RE.match(k))
    )
    accounts = []
    for i in indices:
        address = os.environ.get(f"GMAIL_{i}_ADDRESS", "").strip()
        password = os.environ.get(f"GMAIL_{i}_APP_PASSWORD", "").strip()
        if address and password:
            accounts.append({"address": address, "password": password})
    return accounts


# --------------------------------------------------------------------------
# Template
# --------------------------------------------------------------------------
def load_template(path):
    with open(path, encoding="utf-8") as f:
        content = f.read()

    lines = content.splitlines()
    if not lines or not lines[0].lower().startswith("subject:"):
        raise ValueError(f"{path} must start with a 'Subject: ...' line")

    subject_template = lines[0][len("subject:"):].strip()
    body_lines = lines[1:]
    if body_lines and body_lines[0].strip() == "":
        body_lines = body_lines[1:]
    body_template = "\n".join(body_lines)
    return subject_template, body_template


def render(template_str, row):
    return (
        template_str.replace("{business_name}", row.get("Business Name", "") or "")
        .replace("{city}", row.get("City", "") or "")
        .replace("{niche}", row.get("Niche", "") or "")
        .replace("{outreach_message}", row.get("Outreach Message", "") or "")
    )


# --------------------------------------------------------------------------
# Sent log (dedup ledger, keyed by email address)
# --------------------------------------------------------------------------
SENT_LOG_FIELDS = ["email", "business_name", "account_used", "timestamp", "status"]


def load_sent_log(path):
    already_sent = set()
    counts_today = defaultdict(int)
    today = date.today().isoformat()

    if os.path.exists(path):
        with open(path, newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                email = (row.get("email") or "").strip().lower()
                if email:
                    already_sent.add(email)
                ts = row.get("timestamp", "")
                if ts.startswith(today):
                    counts_today[row.get("account_used", "")] += 1

    return already_sent, counts_today


def append_sent_log(path, email, business_name, account_used, timestamp):
    exists = os.path.exists(path)
    with open(path, "a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=SENT_LOG_FIELDS)
        if not exists:
            writer.writeheader()
        writer.writerow(
            {
                "email": email,
                "business_name": business_name,
                "account_used": account_used,
                "timestamp": timestamp,
                "status": "sent",
            }
        )


# --------------------------------------------------------------------------
# Google Sheets
# --------------------------------------------------------------------------
def open_sheet(sheet_id, service_account_json, logger):
    try:
        import gspread

        gc = gspread.service_account(filename=service_account_json)
        sheet = gc.open_by_key(sheet_id).sheet1
        values = sheet.get_all_values()
        if not values:
            sheet.append_row(config.GOOGLE_SHEET_COLUMNS)
        return sheet
    except Exception as exc:
        logger.error(f"Could not open Google Sheet ({exc}). Sends will continue without sheet logging.")
        return None


def log_to_sheet(sheet, logger, email, business_name, niche, city, account_used, status, timestamp):
    if sheet is None:
        return
    try:
        sheet.append_row([email, business_name, niche, city, account_used, status, timestamp])
    except Exception as exc:
        logger.error(f"Failed to log to Google Sheet for {email}: {exc}")


# --------------------------------------------------------------------------
# SMTP
# --------------------------------------------------------------------------
def send_email(account, to_email, subject, body):
    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = account["address"]
    msg["To"] = to_email

    context = ssl.create_default_context()
    with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context) as server:
        server.login(account["address"], account["password"])
        server.sendmail(account["address"], [to_email], msg.as_string())


# --------------------------------------------------------------------------
# Account rotation with daily-cap enforcement
# --------------------------------------------------------------------------
class AccountRotator:
    def __init__(self, accounts, daily_cap, counts_today):
        self.accounts = accounts
        self.daily_cap = daily_cap
        self.counts = defaultdict(int)
        for acct in accounts:
            self.counts[acct["address"]] = counts_today.get(acct["address"], 0)
        self._idx = 0

    def next_available(self):
        for _ in range(len(self.accounts)):
            acct = self.accounts[self._idx % len(self.accounts)]
            self._idx += 1
            if self.counts[acct["address"]] < self.daily_cap:
                return acct
        return None

    def record_send(self, acct):
        self.counts[acct["address"]] += 1


# --------------------------------------------------------------------------
# Main
# --------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(description="Send cold outreach emails")
    parser.add_argument("--input", default=config.DEFAULT_PROSPECTS_OUTPUT)
    parser.add_argument("--template", default=config.DEFAULT_TEMPLATE_PATH)
    parser.add_argument("--sent-log", default=config.SENT_LOG_PATH)
    parser.add_argument("--daily-cap", type=int, default=config.DAILY_CAP_PER_ACCOUNT)
    parser.add_argument("--sheet-id", default=os.environ.get("GOOGLE_SHEET_ID"))
    parser.add_argument(
        "--service-account",
        default=os.environ.get("GOOGLE_SERVICE_ACCOUNT_JSON"),
    )
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    load_dotenv()
    logger = setup_logging()

    accounts = load_accounts()
    if not accounts:
        logger.error(
            "No Gmail accounts found in .env (expected GMAIL_1_ADDRESS / "
            "GMAIL_1_APP_PASSWORD, etc). Aborting."
        )
        sys.exit(1)
    logger.info(f"Loaded {len(accounts)} sending account(s).")

    subject_template, body_template = load_template(args.template)

    already_sent, counts_today = load_sent_log(args.sent_log)
    rotator = AccountRotator(accounts, args.daily_cap, counts_today)

    sheet = None
    if not args.dry_run:
        if args.sheet_id and args.service_account:
            sheet = open_sheet(args.sheet_id, args.service_account, logger)
        else:
            logger.error(
                "GOOGLE_SHEET_ID / GOOGLE_SERVICE_ACCOUNT_JSON not set - "
                "continuing without Google Sheet logging."
            )

    with open(args.input, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    to_send = []
    for row in rows:
        email = (row.get("Email") or "").strip()
        if not email:
            continue
        if email.lower() in already_sent:
            logger.info(f"Skipping {email} (already emailed per sent log).")
            continue
        to_send.append(row)

    logger.info(f"{len(to_send)} row(s) eligible to send out of {len(rows)} total.")
    if args.dry_run:
        logger.info("=== DRY RUN: no emails will actually be sent ===")

    sent_count = 0
    failed_count = 0

    for row in to_send:
        email = row["Email"].strip()
        business_name = row.get("Business Name", "").strip()
        niche = row.get("Niche", "").strip()
        city = row.get("City", "").strip()

        acct = rotator.next_available()
        if acct is None:
            logger.warning(
                f"WARNING: all {len(accounts)} account(s) have reached the "
                f"daily cap of {args.daily_cap}/day. Stopping run."
            )
            break

        subject = render(subject_template, row)
        body = render(body_template, row)
        timestamp = datetime.now().isoformat(timespec="seconds")

        if args.dry_run:
            rotator.record_send(acct)
            logger.info(
                f"[DRY RUN] Would send to {email} ({business_name}) "
                f"from {acct['address']}\n  Subject: {subject}\n  Body:\n{body}\n"
            )
            sent_count += 1
            continue

        try:
            send_email(acct, email, subject, body)
            rotator.record_send(acct)
            append_sent_log(args.sent_log, email, business_name, acct["address"], timestamp)
            logger.info(f"SENT {email} via {acct['address']}")
            log_to_sheet(sheet, logger, email, business_name, niche, city, acct["address"], "sent", timestamp)
            sent_count += 1
        except Exception as exc:
            logger.error(f"FAILED {email} via {acct['address']}: {exc}")
            log_to_sheet(sheet, logger, email, business_name, niche, city, acct["address"], "failed", timestamp)
            failed_count += 1

        time.sleep(random.uniform(config.MIN_SEND_DELAY, config.MAX_SEND_DELAY))

    if args.dry_run:
        logger.info(f"Dry run complete. Would have sent {sent_count}/{len(to_send)} eligible email(s).")
    else:
        logger.info(f"Run complete. Sent: {sent_count}, Failed: {failed_count}.")


if __name__ == "__main__":
    main()
