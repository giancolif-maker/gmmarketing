"""
SQLite access layer for Ad-Brain (data/adbrain.db).

Plain sqlite3 + rows-as-dicts, no ORM — the schema is small and every
query here is simple enough that an ORM would just be ceremony. See
data/schema.sql for the table definitions.
"""

import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from config.settings import DATA_DIR

DB_PATH = DATA_DIR / "adbrain.db"
SCHEMA_PATH = Path(__file__).resolve().parent / "data" / "schema.sql"

STARTING_CREDIT_BALANCE = 500


def now_iso():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def get_db():
    """Open a new connection with row access by column name."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    """Create tables if they don't exist yet. Safe to call on every startup."""
    conn = get_db()
    with conn:
        conn.executescript(SCHEMA_PATH.read_text())
    conn.close()


def credit_balance(conn):
    row = conn.execute("SELECT COALESCE(SUM(delta), 0) AS total FROM credits_ledger").fetchone()
    return STARTING_CREDIT_BALANCE + row["total"]


def spend_credits(conn, amount, reason):
    """Deduct `amount` credits, log why, return the new balance.

    Balance is allowed to go negative — this is a cosmetic local economy,
    not a hard gate — the point is showing the pattern, not enforcing it.
    """
    balance = credit_balance(conn) - amount
    conn.execute(
        "INSERT INTO credits_ledger (ts, delta, reason, balance_after) VALUES (?, ?, ?, ?)",
        (now_iso(), -amount, reason, balance),
    )
    return balance


def get_setting(conn, key, default=None):
    row = conn.execute("SELECT value FROM settings WHERE key = ?", (key,)).fetchone()
    return row["value"] if row else default


def set_setting(conn, key, value):
    conn.execute(
        "INSERT INTO settings (key, value) VALUES (?, ?) "
        "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        (key, value),
    )
