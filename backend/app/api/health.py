"""Health check endpoint."""

from fastapi import APIRouter

from app.config import settings

router = APIRouter(tags=["health"])


@router.get("/api/health")
async def health_check() -> dict:
    """Basic liveness probe."""
    return {"status": "healthy", "version": settings.APP_VERSION}
