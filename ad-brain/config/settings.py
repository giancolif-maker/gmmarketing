"""
Central configuration for ad-brain.

Loads environment variables (see config/.env.example) and exposes
project-wide constants/paths used by the api, rules, and logging layers.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / "config" / ".env")

# Meta Marketing API
META_APP_ID = os.getenv("META_APP_ID", "")
META_APP_SECRET = os.getenv("META_APP_SECRET", "")
META_ACCESS_TOKEN = os.getenv("META_ACCESS_TOKEN", "")
META_AD_ACCOUNT_ID = os.getenv("META_AD_ACCOUNT_ID", "")

# Paths
DATA_DIR = BASE_DIR / "data"
LOGS_DIR = BASE_DIR / "logs"
RULES_DIR = BASE_DIR / "rules"

# Notifications
SLACK_WEBHOOK_URL = os.getenv("SLACK_WEBHOOK_URL", "")
ALERT_EMAIL_TO = os.getenv("ALERT_EMAIL_TO", "")

# Chat panel (falls back to a grounded, non-AI responder when unset)
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

# Flask
FLASK_SECRET_KEY = os.getenv("FLASK_SECRET_KEY", "dev-only-not-for-production")
