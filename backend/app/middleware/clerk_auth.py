"""Clerk session JWT verification middleware.

Validates Clerk session tokens (RS256 via JWKS) on protected endpoints.
Exempt paths (health, consent, privacy, docs) pass through without auth.
When CLERK_JWKS_URL is empty, auth is skipped entirely (dev mode).
"""

import logging

import jwt
from jwt import PyJWKClient
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.config import settings
from app.services.user_service import UserService

logger = logging.getLogger(__name__)

# Paths that do NOT require Clerk authentication.
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

# Prefixes that are always exempt.
EXEMPT_PREFIXES: tuple[str, ...] = (
    "/static/",
    "/favicon",
)

# Singleton JWKS client -- initialised lazily on first request.
_jwks_client: PyJWKClient | None = None


def _get_jwks_client() -> PyJWKClient | None:
    """Return a cached PyJWKClient, or None if Clerk is not configured."""
    global _jwks_client
    if _jwks_client is not None:
        return _jwks_client

    if not settings.CLERK_JWKS_URL:
        return None

    _jwks_client = PyJWKClient(
        settings.CLERK_JWKS_URL,
        cache_keys=True,
        lifespan=3600,
    )
    return _jwks_client


class ClerkAuthMiddleware(BaseHTTPMiddleware):
    """Verify Clerk session JWTs using JWKS public keys (RS256)."""

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        path = request.url.path

        # Allow exempt endpoints through unconditionally.
        if path in EXEMPT_PATHS or path.startswith(EXEMPT_PREFIXES):
            return await call_next(request)

        # Dev mode: skip auth entirely when JWKS URL is not set.
        if not settings.CLERK_JWKS_URL:
            return await call_next(request)

        # Require Authorization header.
        auth_header = request.headers.get("authorization", "")
        if not auth_header.startswith("Bearer "):
            return _auth_required_response()

        token = auth_header[7:]  # Strip "Bearer " prefix.

        try:
            jwks_client = _get_jwks_client()
            if jwks_client is None:
                return await call_next(request)

            signing_key = jwks_client.get_signing_key_from_jwt(token)
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256"],
            )
        except jwt.ExpiredSignatureError:
            logger.debug("Expired Clerk session token on %s", path)
            return _auth_error_response("Session token has expired.")
        except jwt.InvalidTokenError as exc:
            logger.debug("Invalid Clerk token on %s: %s", path, exc)
            return _auth_required_response()
        except Exception:
            logger.exception("JWKS fetch or token verification failed on %s", path)
            return JSONResponse(
                status_code=503,
                content={
                    "error": "auth_service_unavailable",
                    "message": "Authentication service temporarily unavailable. Please retry.",
                },
            )

        # Store Clerk user ID for downstream use.
        clerk_user_id = payload.get("sub", "")
        request.state.clerk_user_id = clerk_user_id

        # Lazy user creation: get or create local user record.
        email = payload.get("email", "") or ""
        try:
            user_service = UserService()
            user = await user_service.get_or_create_user(clerk_user_id, email)
            request.state.user_id = user.id
        except Exception:
            logger.exception("Failed to get/create user for Clerk ID %s", clerk_user_id)
            # Non-fatal: auth succeeded, user creation can retry on next call.
            request.state.user_id = None

        return await call_next(request)


def _auth_required_response() -> JSONResponse:
    return JSONResponse(
        status_code=401,
        content={
            "error": "authentication_required",
            "message": "Valid Clerk session required.",
        },
    )


def _auth_error_response(message: str) -> JSONResponse:
    return JSONResponse(
        status_code=401,
        content={
            "error": "authentication_failed",
            "message": message,
        },
    )
