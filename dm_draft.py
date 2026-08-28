"""
Generates one personalized DM draft per qualified lead, grounded in a real,
specific detail pulled from that account's own recent post caption or bio.

This module only writes text into a CSV column. It never sends a DM,
comment, follow, or message anywhere -- that stays entirely manual, on you.

If no specific-enough detail is available, or the model's draft can't be
tied back to that detail, no draft is generated -- the lead is flagged
"needs_manual_review" instead. A bad fake-personalized DM is worse than
none, per the brief.

Uses an OpenAI-compatible chat completions API -- currently Cerebras
(needs CEREBRAS_API_KEY in .env). See config.DM_DRAFT_API_BASE / DM_DRAFT_MODEL
to point this at a different OpenAI-compatible provider.
"""
import re

import requests

import config

STOPWORDS = {
    "the", "and", "for", "with", "this", "that", "from", "just", "your",
    "our", "are", "was", "were", "have", "has", "will", "you", "all",
    "one", "new", "back", "only", "shop", "store", "into", "over",
    "here", "now", "get", "out", "top", "via", "more", "than",
}

STYLE_EXAMPLE = (
    "hey! came across [Brand] while looking at streetwear brands — the "
    "[SPECIFIC DETAIL] looks really clean. you running any paid ads right "
    "now, or mostly organic/social?"
)

SYSTEM_PROMPT = f"""You draft short, casual Instagram DM openers for someone \
doing manual outreach to streetwear/e-commerce brands about ad help. They \
copy-paste and send these themselves -- you are only drafting, never sending.

Voice/structure reference (match the tone, don't reuse the wording):
"{STYLE_EXAMPLE}"

Rules:
- Casual, low-pressure, curiosity-based. NOT a pitch, NOT salesy.
- One or two sentences max.
- Must reference the specific detail given to you about THIS account --
  never a generic compliment like "clean pieces", "cool vibe", "love your
  feed", or anything that could apply to literally any streetwear brand.
- If the detail given isn't specific enough to write a grounded line,
  respond with exactly: NOT_SPECIFIC_ENOUGH
- Output only the DM text (or NOT_SPECIFIC_ENOUGH), nothing else -- no
  quotes, no preamble, no explanation."""


def _collect_signal(profile):
    """Pull the most specific text available: a recent post caption first
    (more concrete than a bio), falling back to the bio if it's substantial.
    Returns (signal_text, source_label) or (None, None)."""
    media = (profile.get("media") or {}).get("data", [])
    captions = [
        (m.get("caption") or "").strip()
        for m in media
        if (m.get("caption") or "").strip()
    ]
    if captions:
        return captions[0], "recent post caption"

    bio = (profile.get("biography") or "").strip()
    if len(re.findall(r"[a-zA-Z]{2,}", bio)) >= config.DM_MIN_BIO_WORDS_FOR_SIGNAL:
        return bio, "bio"

    return None, None


def _has_generic_phrase(draft):
    lowered = draft.lower()
    return any(phrase in lowered for phrase in config.DM_DRAFT_GENERIC_PHRASE_BLOCKLIST)


def _looks_grounded(draft, signal_text):
    """Heuristic safety net: at least one non-trivial word from the source
    signal should show up in the draft, so we're not shipping an invented
    detail dressed up as personalization."""
    signal_words = {
        w.lower()
        for w in re.findall(r"[a-zA-Z]{4,}", signal_text)
        if w.lower() not in STOPWORDS
    }
    if not signal_words:
        return False
    draft_lower = draft.lower()
    return any(w in draft_lower for w in signal_words)


def generate_dm_draft(handle, profile, api_key):
    """Returns (draft_text_or_None, status).

    status is one of: "ok", "needs_manual_review_no_signal",
    "needs_manual_review_no_api_key", "needs_manual_review_api_error",
    "needs_manual_review_generic_output", "needs_manual_review_ungrounded",
    "needs_manual_review_model_declined".
    """
    signal_text, source = _collect_signal(profile)
    if not signal_text:
        return None, "needs_manual_review_no_signal"

    if not api_key:
        return None, "needs_manual_review_no_api_key"

    user_prompt = (
        f'Account: @{handle}\n'
        f'Source ({source}): "{signal_text}"\n\n'
        "Write one DM opener grounded in that specific detail."
    )

    try:
        resp = requests.post(
            f"{config.DM_DRAFT_API_BASE}/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": config.DM_DRAFT_MODEL,
                "temperature": config.DM_DRAFT_TEMPERATURE,
                "max_tokens": config.DM_DRAFT_MAX_TOKENS,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
            },
            timeout=config.DM_DRAFT_REQUEST_TIMEOUT,
        )
        resp.raise_for_status()
        draft = resp.json()["choices"][0]["message"]["content"].strip().strip('"')
    except (requests.RequestException, KeyError, IndexError, ValueError) as exc:
        print(f"    ! draft generation API error for @{handle}: {exc}")
        return None, "needs_manual_review_api_error"

    if draft == "NOT_SPECIFIC_ENOUGH":
        return None, "needs_manual_review_model_declined"
    if _has_generic_phrase(draft):
        return None, "needs_manual_review_generic_output"
    if not _looks_grounded(draft, signal_text):
        return None, "needs_manual_review_ungrounded"

    return draft, "ok"
