"""Request-level audit middleware.

Logs method, path, status code, and duration for every non-trivial request.
Logging is fire-and-forget so it never adds latency to the response.
"""

import asyncio
import logging
import time

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from app.services.audit_service import AuditService

logger = logging.getLogger(__name__)

# Paths we skip to keep audit noise low.
_SKIP_PATHS: set[str] = {"/api/health"}
_SKIP_PREFIXES: tuple[str, ...] = ("/static/", "/favicon")


class AuditMiddleware(BaseHTTPMiddleware):
    """Non-blocking audit trail for every API request."""

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        path = request.url.path

        if path in _SKIP_PATHS or path.startswith(_SKIP_PREFIXES):
            return await call_next(request)

        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = round((time.perf_counter() - start) * 1000, 2)

        # Fire and forget -- failures are logged but never block.
        asyncio.create_task(
            _log_request(request, response.status_code, duration_ms)
        )
        return response


async def _log_request(
    request: Request, status_code: int, duration_ms: float
) -> None:
    """Write a single audit row for the request."""
    try:
        audit = AuditService()
        await audit.log_event(
            event_type="api_request",
            event_category="system",
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            details={
                "method": request.method,
                "path": request.url.path,
                "status_code": status_code,
                "duration_ms": duration_ms,
            },
        )
    except Exception:
        logger.exception("Failed to log audit event for %s %s", request.method, request.url.path)
