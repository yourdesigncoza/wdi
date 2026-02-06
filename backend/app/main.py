"""WillCraft SA -- FastAPI application entry-point."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.config import settings
from app.database import engine
from app.middleware.clerk_auth import ClerkAuthMiddleware
from app.middleware.popia_consent import POPIAConsentMiddleware
from app.middleware.audit import AuditMiddleware
from app.api import ai, consent, conversation, privacy, health, clauses, verification, will

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    # Startup: verify database connectivity.
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        logger.info("Database connection verified.")
    except Exception:
        logger.warning(
            "Database is not reachable -- the app will start but "
            "database-dependent routes will fail."
        )
    yield
    # Shutdown: dispose of connection pool.
    await engine.dispose()


app = FastAPI(
    title="WillCraft SA API",
    description="AI-powered will generation platform for South Africa.",
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# Middleware (applied bottom-to-top: last added runs first)
# Execution order: Audit -> POPIA -> ClerkAuth -> CORS
# ---------------------------------------------------------------------------

# 1. CORS -- must be outermost so preflight requests succeed.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Clerk auth gate -- verifies session JWT (RS256 via JWKS).
app.add_middleware(ClerkAuthMiddleware)

# 3. POPIA consent gate -- blocks protected routes without consent cookie.
app.add_middleware(POPIAConsentMiddleware)

# 4. Audit trail -- logs every non-trivial request.
app.add_middleware(AuditMiddleware)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

app.include_router(health.router)
app.include_router(consent.router)
app.include_router(privacy.router)
app.include_router(clauses.router)
app.include_router(ai.router)
app.include_router(conversation.router)
app.include_router(verification.router)
app.include_router(will.router)
