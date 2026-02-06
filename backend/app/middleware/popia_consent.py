"""POPIA consent verification middleware.

Blocks access to protected endpoints unless the request carries a valid
consent JWT in the ``popia_consent`` cookie.
"""

import logging

from jose import JWTError, jwt
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.config import settings

logger = logging.getLogger(__name__)

# Paths that do NOT require a consent token.
EXEMPT_PATHS: set[str] = {
    "/api/health",
    "/api/consent",
    "/api/consent/status",
    "/api/consent/withdraw",
    "/api/privacy-policy",
    "/api/info-officer",
    "/api/data-request",
    "/docs",
    "/openapi.json",
    "/redoc",
}

# Prefixes that are always exempt (e.g. static, favicon).
EXEMPT_PREFIXES: tuple[str, ...] = (
    "/static/",
    "/favicon",
)

CONSENT_COOKIE_NAME = "popia_consent"
JWT_ALGORITHM = "HS256"


class POPIAConsentMiddleware(BaseHTTPMiddleware):
    """Reject requests to protected endpoints lacking valid POPIA consent."""

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        path = request.url.path

        # Allow exempt endpoints through unconditionally.
        if path in EXEMPT_PATHS or path.startswith(EXEMPT_PREFIXES):
            return await call_next(request)

        # Read the consent cookie.
        token = request.cookies.get(CONSENT_COOKIE_NAME)
        if not token:
            return _consent_required_response()

        # Validate the JWT.
        try:
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=[JWT_ALGORITHM],
            )
            # Ensure the token was issued for consent.
            if payload.get("type") != "popia_consent":
                return _consent_required_response()
        except JWTError:
            logger.debug("Invalid or expired consent JWT on %s", path)
            return _consent_required_response()

        return await call_next(request)


def _consent_required_response() -> JSONResponse:
    return JSONResponse(
        status_code=403,
        content={
            "error": "consent_required",
            "message": "POPIA consent is required before accessing this resource.",
            "consent_url": "/api/consent",
        },
    )
