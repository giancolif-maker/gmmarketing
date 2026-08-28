"""
Sends a short push notification summarizing a lead_finder.py --daily run,
via ntfy (https://ntfy.sh).

This is a one-way status ping to your own phone/desktop -- "N new leads are
waiting for you to review." It has no path to Instagram, email, or any
lead's inbox, and no read access to anything but the numbers it's given.
It cannot be used to message a prospect.
"""
import requests

import config


def send_daily_summary(new_count, ok_drafts, needs_review, topic, server=None):
    """Posts a short summary notification for a --daily run.

    No-op (returns False) if no topic is configured, so a scheduled run
    never fails just because notifications haven't been set up yet.
    """
    if not topic:
        print("    (NTFY_TOPIC not set in .env -- skipping daily summary notification)")
        return False

    server = (server or config.NTFY_SERVER).rstrip("/")

    if new_count == 0:
        message = "No new qualified leads found today."
    else:
        message = (
            f"{new_count} new lead(s) found today.\n"
            f"{ok_drafts} with a ready draft DM, {needs_review} need manual review."
        )

    try:
        requests.post(
            f"{server}/{topic}",
            data=message.encode("utf-8"),
            headers={"Title": "Streetwear lead finder - daily run"},
            timeout=config.NTFY_REQUEST_TIMEOUT,
        )
        print(f"    sent daily summary notification to ntfy topic '{topic}'")
        return True
    except requests.RequestException as exc:
        print(f"    ! could not send ntfy notification: {exc}")
        return False
