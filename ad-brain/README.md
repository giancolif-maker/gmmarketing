# ad-brain

Self-hosted Meta Ads monitoring/optimization tool (a DIY alternative to
AdLevel.ai).

## Structure

- `api/` — Meta Marketing API client (auth, insights, actions like pause/budget changes)
- `rules/` — rule definitions (YAML) evaluated against pulled metrics, plus the rule engine
- `data/` — local storage for pulled metrics/state (gitignored, except `.gitkeep`)
- `logs/` — runtime logs (gitignored, except `.gitkeep`)
- `config/` — settings, `.env.example` for credentials, environment loading

## Setup

```bash
cd ad-brain
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp config/.env.example config/.env   # then fill in your Meta API credentials
```

## Run

```bash
python main.py
```
