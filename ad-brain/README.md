# Ad-Brain

A self-hosted Meta Ads campaign command center — a DIY alternative to tools
like AdLevel. Flask + SQLite + a rules-based "AI" that watches campaign
performance and recommends (or auto-applies) actions. Everything currently
runs on realistic **mock data** — there's no live ad account connection yet,
by design, so the whole product (Launch flow, Dashboard, Mission Control,
Decision log, chat) can be built, demoed, and trusted before real ad spend
touches it.

## Structure

```
app.py                   Flask entrypoint — routes, request lifecycle
db.py                    SQLite connection/schema/credits helpers
chat.py                  Chat panel logic (Claude, or a grounded fallback)
data/
  schema.sql             Table definitions
  adbrain.db              The SQLite file itself (gitignored, created on first run)
mock/
  data_engine.py          Generates + ticks forward fake campaign performance
rules/
  thresholds.py           Tunable numeric thresholds
  engine.py                Deterministic status evaluation (the "AI")
  example_rules.yaml       (earlier scaffold; not used by the web app)
api/
  mock_client.py           Lower-level fake Meta client (get_campaigns/get_campaign_insights)
  meta_client.py            Real Meta Marketing API client, same interface as mock_client
  contract.py                Shared return-shape contract the two are checked against
templates/                Jinja templates (base.html + one per page + partials/)
static/
  css/input.css            Tailwind source (custom layer + @tailwind directives)
  css/app.css               Compiled, self-contained stylesheet actually served (no CDN)
  js/                        chat.js, launch.js, mission_control.js
config/
  settings.py               Env var loading
  .env.example               Template for config/.env (Meta creds, Anthropic key, Flask secret)
logs/                      Reserved for future file-based logging (decisions_log in SQLite is the web app's actual audit trail)
test_*.py                  Unit tests (rules engine, mock/meta client contract parity)
```

Two things named "mock" and "rules" coexist here for historical reasons:
`api/mock_client.py` + `api/meta_client.py` are a lower-level, general-purpose
Meta API client pair built earlier in this project (useful for scripts/
automation outside the web app). `mock/data_engine.py` is the web app's own
self-contained simulation — it writes directly into SQLite rather than going
through `api/`. See **Swapping in a real Meta connection** below for how
these come together later.

## Setup

```bash
cd ad-brain
python3 -m venv venv          # if you don't already have one
source venv/bin/activate
pip install -r requirements.txt
cp config/.env.example config/.env   # optional — see below
```

`config/.env` is optional to start:
- Leave `ANTHROPIC_API_KEY` unset and the chat panel still works, answering
  straight from the database with keyword matching instead of a live model.
- Leave the `META_*` vars unset — the app never touches them; it's all mock
  data until you deliberately wire up a real connection.
- Set `FLASK_SECRET_KEY` to something random before running this anywhere
  other than your own machine.

## Run

```bash
./venv/bin/python app.py
```

Open `http://localhost:5000`. The database is created and seeded with two
demo campaigns (one healthy, one underperforming) automatically on first
run — nothing else to set up.

### Rebuilding the stylesheet

The UI's Tailwind CSS is compiled ahead of time into `static/css/app.css` —
no CDN script, so the app renders identically with or without internet
access (a self-hosted tool shouldn't need a network connection just to
render its own UI). If you change any class names in `templates/` or
`static/js/`, rebuild it:

```bash
npm install                 # first time only — installs the Tailwind CLI
npx tailwindcss -i static/css/input.css -o static/css/app.css --minify
```

## How the simulation works

`mock/data_engine.py` is the whole engine:

- **Launch flow** (`generate_launch_plan` / `create_campaign_from_plan`) —
  turns a niche + goal + budget into a mocked-but-grounded recommendation
  (target CPA, suggested budget, audience notes, confidence), then writes a
  new campaign row in status `calibrating`.
- **Ticking** (`tick_if_due`) — every page load (throttled to once per
  ~10s) appends one new performance snapshot per active campaign, jittered
  around that campaign's baseline. A campaign launched via the wizard starts
  in `calibrating` (low budget pacing, low impressions, noisy) and, after a
  handful of snapshots, "finishes ramping up" into either `healthy` or
  `underperforming` — simulating Meta's own ad-set learning phase completing.
- **Evaluation** (`rules/engine.py`) — after every new snapshot, each
  campaign's recent + trending cost-per-result is evaluated into one of six
  statuses (`calibrating`, `healthy`, `watch`, `underperforming`,
  `scale_candidate`, `pause_candidate`) against the thresholds in
  `rules/thresholds.py`. This is pure, deterministic, and unit-tested
  (`test_rules_engine.py`) — no randomness in the *decision*, only in the
  underlying fake metrics.
- **Decisions** — a status change gets written to `decisions_log` in plain
  English with the numbers that triggered it. `pause` and `increase_budget`
  route to `pending_approval` (they need a tap in Mission Control before
  they take effect); everything else logs as `auto_applied`. A new pending
  recommendation for a campaign supersedes any earlier one still waiting,
  so a flip-flopping campaign doesn't pile up duplicate asks.

## Swapping in a real Meta connection

Nothing here needs restructuring to go live later — that was the point of
keeping `api/` separate from `mock/`:

1. Fill in `META_APP_ID`, `META_APP_SECRET`, `META_ACCESS_TOKEN`, and
   `META_AD_ACCOUNT_ID` in `config/.env`.
2. Add a `meta_campaign_id` column to the `campaigns` table (`data/schema.sql`)
   mapping each internal campaign to a real Meta campaign.
3. In `mock/data_engine.py`, replace the body of `_generate_snapshot()` (the
   jitter math) with a call to `api.meta_client.MetaClient().get_campaign_insights(meta_campaign_id)`
   — it already returns the exact same dict shape (`spend`, `impressions`,
   `clicks`, `ctr`, `cpc`, `cpm`, `results`, `cost_per_result`), enforced by
   `api/contract.py` and proven by `test_client_contract.py`, so nothing
   downstream (`rules/engine.py`, the templates, the routes) has to change.
4. Have `apply_decision()`'s `pause` / `increase_budget` branches call the
   real client's write actions (pause a campaign, update `daily_budget`)
   instead of just updating local rows.
5. Retire `tick_if_due`'s scenario-ramping logic (`calibrating` →
   `healthy`/`underperforming`) — a real campaign's learning phase is
   already reflected in `MetaClient.get_campaigns()`'s `learning_phase`
   field.

Everything else — Launch, Dashboard, Mission Control, Decisions, the chat
panel, credits — keeps working unchanged, because they were all built
against the database and the rules engine, never against the mock data
generator directly.

## Testing

```bash
./venv/bin/python -m unittest test_rules_engine.py test_client_contract.py -v
./venv/bin/python test_mock_client.py
```
