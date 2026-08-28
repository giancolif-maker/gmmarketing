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

# --- Spam/junk bio filter (lead_finder.py) ---
# Simple keyword/pattern blocklist -- edit this list freely, no code changes
# needed. Matched case-insensitively against the account's bio text.
SPAM_BIO_PATTERNS = [
    r"\bdm for promo\b",
    r"\bdm for shoutout\b",
    r"\bdm for collab\b",
    r"\bfollow4follow\b",
    r"\bf4f\b",
    r"\bfollow for follow\b",
    r"\bfollowback\b",
    r"\bfollow back\b",
    r"\bshoutout for shoutout\b",
    r"\bs4s\b",
    r"\bspam4spam\b",
    r"\bgiveaway everyday\b",
    r"\blike4like\b",
    r"\bl4l\b",
    r"\bfollow for shoutout\b",
]
# Bios with more emoji than actual words read as low-effort/spam.
SPAM_BIO_MAX_EMOJI_RATIO = 0.3  # emoji count / word count
# A bio under this many real words, combined with a link-aggregator site
# below, reads as a linktree/reseller page rather than an actual brand.
SPAM_BIO_MIN_DESCRIPTIVE_WORDS = 6
SPAM_LINK_AGGREGATOR_DOMAINS = [
    "linktr.ee",
    "bio.link",
    "beacons.ai",
    "campsite.bio",
    "lnk.bio",
    "linkin.bio",
    "milkshake.app",
    "shorby.com",
]

# --- DM draft generation (lead_finder.py) ---
# Drafts only -- never sent automatically. Uses Groq's OpenAI-compatible
# chat completions API (free tier). Get a key at console.groq.com/keys and
# put it in .env as GROQ_API_KEY.
GROQ_API_BASE = "https://api.groq.com/openai/v1"
DM_DRAFT_MODEL = "llama-3.3-70b-versatile"
DM_DRAFT_TEMPERATURE = 0.85  # some variation per lead so drafts don't read like a mail-merge
DM_DRAFT_MAX_TOKENS = 150
DM_DRAFT_REQUEST_TIMEOUT = 20
# A bio needs at least this many real words to count as a usable signal on
# its own (a caption is preferred when one exists -- it's more specific).
DM_MIN_BIO_WORDS_FOR_SIGNAL = 6
# If the model's draft contains any of these, it's too generic to ship --
# reject it and flag the lead for manual review instead. Edit freely.
DM_DRAFT_GENERIC_PHRASE_BLOCKLIST = [
    "clean pieces",
    "cool vibe",
    "cool aesthetic",
    "great content",
    "awesome brand",
    "love your feed",
    "amazing aesthetic",
    "love the vibe",
    "great vibe",
    "nice feed",
    "your brand is",
]
