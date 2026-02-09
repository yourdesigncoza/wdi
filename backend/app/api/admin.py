"""Admin utility endpoints for testing.

POST /api/admin/reset-database -- Truncate all data tables (password-protected)
"""

import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import text

from app.database import async_session

logger = logging.getLogger(__name__)

router = APIRouter(tags=["admin"])

ADMIN_PASSWORD = "ydcoza1013"

# Tables to truncate in dependency order (children first).
# Clauses are preserved — they're seeded reference data, not user data.
_TRUNCATE_TABLES = [
    "payments",
    "conversations",
    "additional_documents",
    "wills",
    "consent_records",
    "audit_logs",
    "users",
]


class ResetRequest(BaseModel):
    password: str


@router.post("/api/admin/reset-database")
async def reset_database(body: ResetRequest):
    """Truncate all user data tables. Password-protected."""
    if body.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid password.")

    async with async_session() as session:
        for table in _TRUNCATE_TABLES:
            await session.execute(text(f"TRUNCATE TABLE {table} CASCADE"))
        await session.commit()

    logger.warning("Database reset: all user data tables truncated.")
    return {
        "status": "success",
        "message": "All user data has been deleted.",
        "tables_cleared": _TRUNCATE_TABLES,
    }
