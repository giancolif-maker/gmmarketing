"""
ad-brain entrypoint.

Pulls Meta Ads insights, evaluates them against the rules in /rules,
and logs/acts on anything that triggers.
"""

from loguru import logger

from config.settings import LOGS_DIR

logger.add(LOGS_DIR / "ad_brain.log", rotation="1 day", retention="14 days")


def main():
    logger.info("ad-brain starting up")
    # TODO: wire together api.meta_client.MetaClient + rules engine
    logger.info("ad-brain run complete")


if __name__ == "__main__":
    main()
