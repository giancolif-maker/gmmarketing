"""
Ad-Brain — Flask entrypoint.

Run with:
    ./venv/bin/python app.py
then open http://localhost:5000
"""

from flask import Flask, g, jsonify, redirect, render_template, request, url_for

import db
from chat import CHAT_CREDIT_COST, get_reply
from config.settings import FLASK_SECRET_KEY
from mock import data_engine as de
from rules.engine import evaluate_campaign

LAUNCH_PLAN_CREDIT_COST = 2
LAUNCH_CONFIRM_CREDIT_COST = 5

app = Flask(__name__)
app.secret_key = FLASK_SECRET_KEY

db.init_db()
_seed_conn = db.get_db()
de.seed_campaigns(_seed_conn)
_seed_conn.close()


def get_conn():
    if "db" not in g:
        g.db = db.get_db()
    return g.db


@app.teardown_appcontext
def close_conn(exception=None):
    conn = g.pop("db", None)
    if conn is not None:
        conn.close()


@app.before_request
def tick_simulation():
    if request.endpoint == "static":
        return
    de.tick_if_due(get_conn())


@app.context_processor
def inject_nav_globals():
    return {"credit_balance": db.credit_balance(get_conn())}


# ---------------------------------------------------------------- helpers

def _campaign_view(conn, campaign_row):
    """One campaign row + its rules-engine evaluation, shaped for templates."""
    campaign = dict(campaign_row)
    snapshots = de.get_snapshots(conn, campaign["id"])
    evaluation = evaluate_campaign(campaign, snapshots)
    latest = snapshots[-1] if snapshots else None
    campaign.update(
        {
            "trend": evaluation["trend"],
            "trend_arrow": evaluation["trend_arrow"],
            "status_message": evaluation["message"],
            "latest": latest,
            "snapshots": snapshots,
        }
    )
    return campaign


STATUS_LABELS = {
    "healthy": "Healthy",
    "watch": "Watch",
    "underperforming": "Underperforming",
    "pause_candidate": "Pause candidate",
    "scale_candidate": "Scale candidate",
    "calibrating": "Calibrating",
}


# -------------------------------------------------------------------- nav

@app.route("/")
def index():
    return redirect(url_for("dashboard"))


# --------------------------------------------------------------- dashboard

@app.route("/dashboard")
def dashboard():
    conn = get_conn()
    rows = conn.execute("SELECT * FROM campaigns ORDER BY created_at DESC").fetchall()
    campaigns = [_campaign_view(conn, r) for r in rows]

    active = [c for c in campaigns if c["is_active"]]
    total_spend = sum(c["latest"]["spend"] for c in active if c["latest"])
    total_results = sum(c["latest"]["results"] for c in active if c["latest"])
    avg_cost_per_result = round(total_spend / total_results, 2) if total_results else 0.0

    return render_template(
        "dashboard.html",
        campaigns=campaigns,
        status_labels=STATUS_LABELS,
        total_spend=round(total_spend, 2),
        total_results=total_results,
        avg_cost_per_result=avg_cost_per_result,
        active_count=len(active),
    )


# ------------------------------------------------------------------ launch

@app.route("/launch")
def launch():
    return render_template(
        "launch.html",
        niches=de.NICHE_TEMPLATES,
        goals=de.GOAL_LABELS,
    )


@app.route("/api/launch/plan", methods=["POST"])
def api_launch_plan():
    conn = get_conn()
    payload = request.get_json(force=True)
    niche = payload.get("niche")
    goal = payload.get("goal")
    daily_budget = float(payload.get("daily_budget", 0))
    duration_days = int(payload.get("duration_days", 14))

    if niche not in de.NICHE_TEMPLATES or goal not in de.GOAL_LABELS or daily_budget <= 0:
        return jsonify({"error": "Invalid niche, goal, or budget."}), 400

    plan = de.generate_launch_plan(niche, goal, daily_budget, duration_days)
    db.spend_credits(conn, LAUNCH_PLAN_CREDIT_COST, "Launch flow: plan generated")
    conn.commit()
    plan["credit_balance"] = db.credit_balance(conn)
    return jsonify(plan)


@app.route("/api/launch/confirm", methods=["POST"])
def api_launch_confirm():
    conn = get_conn()
    payload = request.get_json(force=True)
    required = ("name", "niche", "goal", "target_cpa", "suggested_daily_budget", "duration_days", "audience_notes")
    if any(k not in payload for k in required):
        return jsonify({"error": "Missing fields."}), 400

    plan = {
        "niche": payload["niche"],
        "niche_label": de.NICHE_TEMPLATES[payload["niche"]]["label"],
        "goal": payload["goal"],
        "goal_label": de.GOAL_LABELS[payload["goal"]],
        "target_cpa": float(payload["target_cpa"]),
        "suggested_daily_budget": float(payload["suggested_daily_budget"]),
        "duration_days": int(payload["duration_days"]),
        "audience_notes": payload["audience_notes"],
    }
    campaign_id = de.create_campaign_from_plan(conn, payload["name"], plan)
    db.spend_credits(conn, LAUNCH_CONFIRM_CREDIT_COST, f"Launch flow: launched {payload['name']}")
    conn.commit()
    return jsonify({"campaign_id": campaign_id, "redirect": url_for("dashboard")})


# ------------------------------------------------------------ mission control

def _mission_control_payload(conn):
    """Shape shared by the page's first paint and the polling endpoint —
    one source of truth so the two never drift apart."""
    rows = conn.execute("SELECT * FROM campaigns WHERE is_active = 1 ORDER BY name").fetchall()
    campaigns = []
    for r in rows:
        c = _campaign_view(conn, r)
        latest = c["latest"]
        campaigns.append(
            {
                "id": c["id"],
                "name": c["name"],
                "niche": c["niche"],
                "status": c["status"],
                "status_label": STATUS_LABELS.get(c["status"], c["status"]),
                "trend_arrow": c["trend_arrow"],
                "spend": latest["spend"] if latest else 0,
                "impressions": latest["impressions"] if latest else 0,
                "clicks": latest["clicks"] if latest else 0,
                "ctr": latest["ctr"] if latest else 0,
                "results": latest["results"] if latest else 0,
                "cost_per_result": latest["cost_per_result"] if latest else 0,
            }
        )
    pending = conn.execute(
        "SELECT d.*, c.name AS campaign_name FROM decisions_log d "
        "LEFT JOIN campaigns c ON c.id = d.campaign_id "
        "WHERE d.review_status = 'pending_approval' ORDER BY d.ts DESC"
    ).fetchall()
    feed = conn.execute(
        "SELECT d.*, c.name AS campaign_name FROM decisions_log d "
        "LEFT JOIN campaigns c ON c.id = d.campaign_id "
        "ORDER BY d.ts DESC LIMIT 20"
    ).fetchall()
    return {
        "campaigns": campaigns,
        "pending": [dict(p) for p in pending],
        "feed": [dict(f) for f in feed],
        "credit_balance": db.credit_balance(conn),
    }


@app.route("/mission-control")
def mission_control():
    conn = get_conn()
    return render_template(
        "mission_control.html",
        initial_data=_mission_control_payload(conn),
        tick_interval_ms=de.MIN_TICK_INTERVAL_SECONDS * 1000 + 2000,
    )


@app.route("/api/mission-control/data")
def api_mission_control_data():
    return jsonify(_mission_control_payload(get_conn()))


@app.route("/api/decisions/<int:decision_id>/approve", methods=["POST"])
def api_decision_approve(decision_id):
    result = de.apply_decision(get_conn(), decision_id, approve=True)
    if result is None:
        return jsonify({"error": "Decision not found or not pending."}), 404
    return jsonify({"review_status": result})


@app.route("/api/decisions/<int:decision_id>/dismiss", methods=["POST"])
def api_decision_dismiss(decision_id):
    result = de.apply_decision(get_conn(), decision_id, approve=False)
    if result is None:
        return jsonify({"error": "Decision not found or not pending."}), 404
    return jsonify({"review_status": result})


# ----------------------------------------------------------------- decisions

@app.route("/decisions")
def decisions():
    conn = get_conn()
    rows = conn.execute(
        "SELECT d.*, c.name AS campaign_name FROM decisions_log d "
        "LEFT JOIN campaigns c ON c.id = d.campaign_id "
        "ORDER BY d.ts DESC"
    ).fetchall()
    return render_template("decisions.html", decisions=rows)


# ------------------------------------------------------------------ settings

@app.route("/settings")
def settings():
    from config.settings import (
        ANTHROPIC_API_KEY,
        META_ACCESS_TOKEN,
        META_AD_ACCOUNT_ID,
        META_APP_ID,
    )

    return render_template(
        "settings.html",
        meta_app_id=META_APP_ID,
        meta_ad_account_id=META_AD_ACCOUNT_ID,
        meta_connected=bool(META_APP_ID and META_ACCESS_TOKEN),
        chat_configured=bool(ANTHROPIC_API_KEY),
    )


@app.route("/api/settings/reset", methods=["POST"])
def api_settings_reset():
    conn = get_conn()
    conn.executescript(
        "DELETE FROM campaign_snapshots; DELETE FROM decisions_log; "
        "DELETE FROM credits_ledger; DELETE FROM campaigns; DELETE FROM settings;"
    )
    conn.commit()
    de.seed_campaigns(conn)
    return jsonify({"ok": True, "redirect": url_for("dashboard")})


# --------------------------------------------------------------------- chat

@app.route("/api/chat", methods=["POST"])
def api_chat():
    conn = get_conn()
    message = (request.get_json(force=True) or {}).get("message", "").strip()
    if not message:
        return jsonify({"error": "Empty message."}), 400
    reply = get_reply(conn, message)
    db.spend_credits(conn, CHAT_CREDIT_COST, "Chat message")
    conn.commit()
    return jsonify({"reply": reply, "credit_balance": db.credit_balance(conn)})


if __name__ == "__main__":
    app.run(debug=True, port=5000)
