"""Shared configuration for the cold email outreach tool."""

# --- Sender caps / pacing ---
DAILY_CAP_PER_ACCOUNT = 40      # max emails per Gmail account per calendar day
MIN_SEND_DELAY = 30             # seconds, min delay between individual sends
MAX_SEND_DELAY = 60             # seconds, max delay between individual sends

# --- Finder pacing ---
MIN_SCRAPE_DELAY = 1            # seconds, min delay between businesses
MAX_SCRAPE_DELAY = 2            # seconds, max delay between businesses
PAGE_PATHS = ["", "/contact", "/contact-us", "/about", "/about-us"]
REQUEST_TIMEOUT = 10            # seconds
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)

# --- File paths (defaults, all overridable via CLI flags) ---
DEFAULT_PROSPECTS_INPUT = "prospects.csv"
DEFAULT_PROSPECTS_OUTPUT = "prospects_with_emails.csv"
SENT_LOG_PATH = "sent_log.csv"
ATTEMPT_LOG_PATH = "logs/send_attempts.log"
DEFAULT_TEMPLATE_PATH = "template.txt"

# --- Google Sheets ---
GOOGLE_SHEET_COLUMNS = [
    "email",
    "business_name",
    "niche",
    "city",
    "account_used",
    "status",
    "timestamp",
]

# --- Streetwear/e-commerce IG lead finder (research only, never sends anything) ---
LEAD_MIN_FOLLOWERS = 2000
LEAD_MAX_FOLLOWERS = 200000
LEAD_MAX_DAYS_INACTIVE = 14
LEAD_LIMIT_PER_HASHTAG = 25
DEFAULT_SEEDS_PATH = "sample_data/seeds_sample.txt"
DEFAULT_LEADS_OUTPUT = "leads.csv"
MOCK_IG_PROFILES_PATH = "sample_data/mock_ig_profiles.json"
