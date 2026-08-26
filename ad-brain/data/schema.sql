-- Ad-Brain SQLite schema.
-- Loaded once by db.init_db() against data/adbrain.db.

CREATE TABLE IF NOT EXISTS campaigns (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    name                TEXT    NOT NULL,
    niche               TEXT    NOT NULL,          -- e.g. ecommerce, streetwear
    goal                TEXT    NOT NULL,           -- e.g. conversions, leads, traffic, awareness
    status              TEXT    NOT NULL DEFAULT 'calibrating',
                        -- healthy | watch | underperforming | pause_candidate | scale_candidate | calibrating
    is_active           INTEGER NOT NULL DEFAULT 1, -- 0 once paused (auto or by approval)
    daily_budget        REAL    NOT NULL,
    duration_days       INTEGER NOT NULL,
    target_cpa          REAL    NOT NULL,
    audience_notes      TEXT    NOT NULL DEFAULT '',
    -- baseline shape the mock data engine's snapshots fluctuate around
    baseline_spend        REAL    NOT NULL,
    baseline_impressions  INTEGER NOT NULL,
    baseline_ctr           REAL    NOT NULL,        -- percent
    baseline_cvr            REAL    NOT NULL,        -- percent of clicks that convert
    scenario            TEXT    NOT NULL DEFAULT 'calibrating', -- drives this campaign's simulated data
    created_at          TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS campaign_snapshots (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id     INTEGER NOT NULL REFERENCES campaigns(id),
    ts              TEXT    NOT NULL,
    spend           REAL    NOT NULL,
    impressions     INTEGER NOT NULL,
    reach           INTEGER NOT NULL,
    clicks          INTEGER NOT NULL,
    ctr             REAL    NOT NULL,
    cpc             REAL    NOT NULL,
    cpm             REAL    NOT NULL,
    results         INTEGER NOT NULL,
    cost_per_result REAL    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_snapshots_campaign_ts ON campaign_snapshots(campaign_id, ts);

CREATE TABLE IF NOT EXISTS decisions_log (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id     INTEGER REFERENCES campaigns(id),
    ts              TEXT    NOT NULL,
    message         TEXT    NOT NULL,   -- plain-English summary, e.g. "Paused Streetwear Brand — CPA exceeded threshold"
    reason          TEXT    NOT NULL,   -- the numbers that triggered it, plain text
    action          TEXT    NOT NULL,   -- pause | resume | increase_budget | decrease_budget | alert | none
    severity        TEXT    NOT NULL DEFAULT 'info', -- info | watch | critical
    review_status   TEXT    NOT NULL DEFAULT 'auto_applied', -- auto_applied | pending_approval | approved | dismissed
    credits_cost    INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_decisions_ts ON decisions_log(ts);

CREATE TABLE IF NOT EXISTS credits_ledger (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    ts              TEXT    NOT NULL,
    delta           INTEGER NOT NULL,   -- negative = spend, positive = grant/refund
    reason          TEXT    NOT NULL,
    balance_after   INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
    key             TEXT PRIMARY KEY,
    value           TEXT NOT NULL
);
