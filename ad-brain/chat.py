"""
Chat panel backing logic. Always grounded in the real database — never a
generic response — via two paths:

  - ANTHROPIC_API_KEY set: build a system prompt out of current campaign
    state + recent decisions, send it to Claude along with the user's
    message.
  - unset: _fallback_reply() answers straight from the database with
    simple keyword matching. No LLM, but still real numbers, not canned
    text — the chat panel works out of the box before anyone drops in a key.
"""

import re

from config.settings import ANTHROPIC_API_KEY
from mock.data_engine import get_snapshots

CHAT_CREDIT_COST = 2

_SYSTEM_PROMPT_TEMPLATE = """You are the assistant built into Ad-Brain, a self-hosted Meta Ads \
monitoring tool. Answer the user's question about their ad account using ONLY the data below — \
it is the complete, current state of their account. If something isn't in this data (a campaign \
name that doesn't exist, a time period not covered), say so plainly rather than guessing. Be \
concise and concrete: cite the actual numbers. All data is currently simulated/mock data, not a \
live ad account — if asked, say so plainly.

CAMPAIGNS
{campaigns}

RECENT AI DECISIONS (most recent first)
{decisions}
"""


def _campaign_context(conn):
    campaigns = conn.execute("SELECT * FROM campaigns ORDER BY name").fetchall()
    lines = []
    for c in campaigns:
        snaps = get_snapshots(conn, c["id"], limit=1)
        latest = snaps[-1] if snaps else None
        state = "paused" if not c["is_active"] else "active"
        line = (
            f"- {c['name']} (niche: {c['niche']}, goal: {c['goal']}, {state}, status: {c['status']}, "
            f"target CPA: ${c['target_cpa']:.2f}, daily budget: ${c['daily_budget']:.2f})"
        )
        if latest:
            line += (
                f" — latest snapshot: spend ${latest['spend']:.2f}, impressions {latest['impressions']:,}, "
                f"clicks {latest['clicks']}, CTR {latest['ctr']:.2f}%, results {latest['results']}, "
                f"cost/result ${latest['cost_per_result']:.2f}"
            )
        lines.append(line)
    return "\n".join(lines) if lines else "(no campaigns yet)"


def _decisions_context(conn, limit=15):
    rows = conn.execute(
        "SELECT d.*, c.name AS campaign_name FROM decisions_log d "
        "LEFT JOIN campaigns c ON c.id = d.campaign_id "
        "ORDER BY d.ts DESC LIMIT ?",
        (limit,),
    ).fetchall()
    lines = []
    for r in rows:
        lines.append(
            f"- [{r['ts']}] {r['message']} (reason: {r['reason']}; action: {r['action']}; "
            f"status: {r['review_status']})"
        )
    return "\n".join(lines) if lines else "(no decisions logged yet)"


def get_reply(conn, message):
    """Return a plain-text reply grounded in current DB state."""
    if ANTHROPIC_API_KEY:
        return _claude_reply(conn, message)
    return _fallback_reply(conn, message)


def _claude_reply(conn, message):
    import anthropic

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    system_prompt = _SYSTEM_PROMPT_TEMPLATE.format(
        campaigns=_campaign_context(conn),
        decisions=_decisions_context(conn),
    )
    response = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=500,
        system=system_prompt,
        messages=[{"role": "user", "content": message}],
    )
    return "".join(block.text for block in response.content if block.type == "text").strip()


def _find_mentioned_campaign(conn, message):
    """Match a campaign by full name, or by any distinctive (4+ char) word
    from its name — so "how's my streetwear campaign doing" still finds
    "Streetwear Brand" without the user typing the exact name."""
    campaigns = conn.execute("SELECT * FROM campaigns").fetchall()
    lowered = message.lower()
    best, best_score = None, 0
    for c in campaigns:
        name_lower = c["name"].lower()
        if name_lower in lowered:
            return c
        words = [w for w in re.findall(r"[a-z0-9]+", name_lower) if len(w) >= 4]
        score = sum(1 for w in words if w in lowered)
        if score > best_score:
            best, best_score = c, score
    return best


def _fallback_reply(conn, message):
    """No API key configured — answer straight from the DB with simple
    keyword matching. Real numbers, not a canned response."""
    lowered = message.lower()
    campaign = _find_mentioned_campaign(conn, message)

    if re.search(r"\bwhy\b", lowered) and ("pause" in lowered or "paus" in lowered):
        query = "SELECT d.*, c.name AS campaign_name FROM decisions_log d LEFT JOIN campaigns c ON c.id = d.campaign_id WHERE d.action = 'pause'"
        params = []
        if campaign:
            query += " AND d.campaign_id = ?"
            params.append(campaign["id"])
        query += " ORDER BY d.ts DESC LIMIT 1"
        row = conn.execute(query, params).fetchone()
        if row:
            return f"{row['message']}\n\nWhy: {row['reason']}"
        return "I don't have a pause decision on record for that." if campaign else (
            "I don't have any pause decisions on record yet."
        )

    if campaign:
        snaps = get_snapshots(conn, campaign["id"], limit=1)
        latest = snaps[-1] if snaps else None
        state = "paused" if not campaign["is_active"] else "active"
        reply = (
            f"{campaign['name']} is currently {state}, status: {campaign['status']}. "
            f"Target CPA is ${campaign['target_cpa']:.2f}, daily budget ${campaign['daily_budget']:.2f}."
        )
        if latest:
            reply += (
                f"\n\nLatest snapshot: spend ${latest['spend']:.2f}, {latest['impressions']:,} impressions, "
                f"{latest['clicks']} clicks ({latest['ctr']:.2f}% CTR), {latest['results']} results "
                f"at ${latest['cost_per_result']:.2f} cost/result."
            )
        recent = conn.execute(
            "SELECT message, ts FROM decisions_log WHERE campaign_id = ? ORDER BY ts DESC LIMIT 1",
            (campaign["id"],),
        ).fetchone()
        if recent:
            reply += f"\n\nMost recent decision: {recent['message']} ({recent['ts']})"
        return reply

    if "credit" in lowered:
        from db import credit_balance

        return f"Current credit balance: {credit_balance(conn)}."

    campaigns = conn.execute("SELECT name, status, is_active FROM campaigns").fetchall()
    if not campaigns:
        return "No campaigns yet — head to Launch to create one."
    flagged = [c for c in campaigns if c["status"] in ("pause_candidate", "underperforming")]
    summary = ", ".join(f"{c['name']} ({c['status']})" for c in campaigns)
    reply = f"You have {len(campaigns)} campaign(s): {summary}."
    if flagged:
        names = ", ".join(c["name"] for c in flagged)
        reply += f" {names} need attention — ask me about one by name, or check Mission Control."
    else:
        reply += " Nothing needs attention right now. Ask me about a specific campaign by name for detail."
    return reply
