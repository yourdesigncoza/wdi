"""Email notification service.

Uses fastapi-mail with Jinja2 templates to send transactional emails.
Designed for fire-and-forget usage via ``asyncio.create_task()``.
"""

import logging
from pathlib import Path

from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType

from app.config import settings

logger = logging.getLogger(__name__)

_TEMPLATE_FOLDER = Path(__file__).parent.parent / "templates" / "email"


def _get_mail_config() -> ConnectionConfig:
    """Build fastapi-mail ConnectionConfig from application settings."""
    return ConnectionConfig(
        MAIL_USERNAME=settings.MAIL_USERNAME,
        MAIL_PASSWORD=settings.MAIL_PASSWORD,
        MAIL_FROM=settings.MAIL_FROM,
        MAIL_FROM_NAME=settings.MAIL_FROM_NAME,
        MAIL_PORT=settings.MAIL_PORT,
        MAIL_SERVER=settings.MAIL_SERVER,
        MAIL_STARTTLS=settings.MAIL_STARTTLS,
        MAIL_SSL_TLS=settings.MAIL_SSL_TLS,
        TEMPLATE_FOLDER=_TEMPLATE_FOLDER,
        SUPPRESS_SEND=settings.MAIL_SUPPRESS_SEND,
    )


async def send_download_email(
    recipient_email: str,
    testator_name: str,
    download_url: str,
) -> bool:
    """Send a download-ready notification email.

    Returns ``True`` on success, ``False`` on any error (logged, never crashes).
    Callers should use ``asyncio.create_task()`` for fire-and-forget delivery.
    """
    try:
        config = _get_mail_config()

        message = MessageSchema(
            subject="Your WillCraft SA Will Document is Ready",
            recipients=[recipient_email],
            template_body={
                "testator_name": testator_name,
                "download_url": download_url,
            },
            subtype=MessageType.html,
        )

        fm = FastMail(config)
        await fm.send_message(message, template_name="download_ready.html")

        logger.info("Download email sent to %s", recipient_email)
        return True
    except Exception:
        logger.error(
            "Failed to send download email to %s", recipient_email, exc_info=True
        )
        return False
