"""Download token management service.

Generates and verifies time-limited, URL-safe tokens for secure
will-document downloads using itsdangerous.
"""

import logging
from typing import Optional

from itsdangerous import BadData, SignatureExpired, URLSafeTimedSerializer

from app.config import settings

logger = logging.getLogger(__name__)

_SALT = "will-download"


def _get_serializer() -> URLSafeTimedSerializer:
    """Return a serializer keyed to the download token secret."""
    secret = settings.DOWNLOAD_TOKEN_SECRET or settings.SECRET_KEY
    return URLSafeTimedSerializer(secret)


def generate_download_token(will_id: str, payment_id: str) -> str:
    """Create a URL-safe, time-limited token encoding *will_id* and *payment_id*."""
    serializer = _get_serializer()
    return serializer.dumps(
        {"will_id": will_id, "payment_id": payment_id},
        salt=_SALT,
    )


def verify_download_token(token: str) -> Optional[dict]:
    """Decode and verify *token*, returning the payload dict or ``None``.

    Returns ``None`` when the token is expired (older than
    ``DOWNLOAD_TOKEN_MAX_AGE`` seconds) or tampered with.
    """
    serializer = _get_serializer()
    try:
        data = serializer.loads(
            token,
            salt=_SALT,
            max_age=settings.DOWNLOAD_TOKEN_MAX_AGE,
        )
        return data  # type: ignore[return-value]
    except SignatureExpired:
        logger.info("Download token expired")
        return None
    except BadData:
        logger.warning("Invalid download token received")
        return None
