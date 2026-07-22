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
