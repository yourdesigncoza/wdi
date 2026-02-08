"""Additional document service for living will and funeral wishes.

Handles CRUD operations and PDF generation via Jinja2+WeasyPrint
pipeline, reusing the same thread pool executor pattern as the
main document generation service.
"""

import asyncio
import logging
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path

from fastapi import Depends, HTTPException
from jinja2 import Environment, FileSystemLoader
from sqlalchemy import select
from sqlmodel.ext.asyncio.session import AsyncSession
from weasyprint import HTML

from app.database import get_session
from app.models.additional_document import AdditionalDocument

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Module-level setup
# ---------------------------------------------------------------------------

TEMPLATE_DIR = Path(__file__).parent.parent / "templates"

_pdf_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="addoc-pdf")

_jinja_env = Environment(
    loader=FileSystemLoader(str(TEMPLATE_DIR)),
    autoescape=True,
)

# Valid document types
_VALID_TYPES = {"living_will", "funeral_wishes"}


# ---------------------------------------------------------------------------
# Synchronous PDF rendering (runs in thread pool)
# ---------------------------------------------------------------------------


def _render_pdf_sync(html_string: str) -> bytes:
    """Render HTML to PDF bytes via WeasyPrint (CPU-bound)."""
    return HTML(
        string=html_string,
        base_url=str(TEMPLATE_DIR),
    ).write_pdf()


# ---------------------------------------------------------------------------
# Service class
# ---------------------------------------------------------------------------


class AdditionalDocumentService:
    """CRUD and PDF generation for additional documents."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(
        self,
        user_id: uuid.UUID,
        document_type: str,
        will_id: uuid.UUID | None = None,
    ) -> AdditionalDocument:
        """Create a new additional document.

        Optionally pre-populates personal details from the linked will's
        testator data if a will_id is provided.
        """
        if document_type not in _VALID_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid document_type. Must be one of: {', '.join(sorted(_VALID_TYPES))}",
            )

        content: dict = {}

        # Pre-populate from linked will if available
        if will_id:
            content = await self._prepopulate_from_will(will_id, user_id, document_type)

        doc = AdditionalDocument(
            user_id=user_id,
            will_id=will_id,
            document_type=document_type,
            content=content,
        )
        self._session.add(doc)
        await self._session.flush()
        await self._session.refresh(doc)
        return doc

    async def get(
        self,
        doc_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> AdditionalDocument:
        """Get a single document with ownership check."""
        stmt = select(AdditionalDocument).where(
            AdditionalDocument.id == doc_id,
            AdditionalDocument.user_id == user_id,
        )
        result = await self._session.execute(stmt)
        doc = result.scalar_one_or_none()
        if doc is None:
            raise HTTPException(status_code=404, detail="Document not found")
        return doc

    async def list_by_user(
        self,
        user_id: uuid.UUID,
    ) -> list[AdditionalDocument]:
        """List all additional documents for a user."""
        stmt = (
            select(AdditionalDocument)
            .where(AdditionalDocument.user_id == user_id)
            .order_by(AdditionalDocument.created_at.desc())
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def update(
        self,
        doc_id: uuid.UUID,
        user_id: uuid.UUID,
        content: dict,
        status: str | None = None,
    ) -> AdditionalDocument:
        """Update document content and optionally status."""
        doc = await self.get(doc_id, user_id)
        doc.content = content
        if status is not None:
            doc.status = status
        doc.updated_at = datetime.now(timezone.utc)
        self._session.add(doc)
        await self._session.flush()
        await self._session.refresh(doc)
        return doc

    async def delete(
        self,
        doc_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> None:
        """Delete a document with ownership check."""
        doc = await self.get(doc_id, user_id)
        await self._session.delete(doc)
        await self._session.flush()

    async def generate_pdf(
        self,
        doc_id: uuid.UUID,
        user_id: uuid.UUID,
        is_preview: bool = True,
    ) -> bytes:
        """Generate PDF from document content via Jinja2+WeasyPrint.

        Selects the template directory based on document_type,
        renders HTML, and converts to PDF in a thread executor.
        If not preview, updates status to 'generated'.
        """
        doc = await self.get(doc_id, user_id)

        # Build template context from JSONB content
        context = dict(doc.content)
        context["is_preview"] = is_preview
        context["generation_date"] = datetime.now(timezone.utc).strftime("%d %B %Y")

        # Select and render template
        template_name = f"{doc.document_type}/base.html"
        template = _jinja_env.get_template(template_name)
        html_string = template.render(**context)

        # Generate PDF in thread pool
        loop = asyncio.get_event_loop()
        pdf_bytes: bytes = await loop.run_in_executor(
            _pdf_executor, _render_pdf_sync, html_string
        )

        # Update status if final generation
        if not is_preview:
            doc.status = "generated"
            doc.updated_at = datetime.now(timezone.utc)
            self._session.add(doc)
            await self._session.flush()

        logger.info(
            "Generated %s PDF for %s %s (%d bytes)",
            "preview" if is_preview else "final",
            doc.document_type,
            doc.id,
            len(pdf_bytes),
        )

        return pdf_bytes

    async def _prepopulate_from_will(
        self,
        will_id: uuid.UUID,
        user_id: uuid.UUID,
        document_type: str,
    ) -> dict:
        """Extract personal details from linked will for pre-population."""
        from app.models.will import Will

        stmt = select(Will).where(Will.id == will_id, Will.user_id == user_id)
        result = await self._session.execute(stmt)
        will = result.scalar_one_or_none()

        if will is None:
            return {}

        testator = will.testator or {}
        first = testator.get("first_name", "")
        last = testator.get("last_name", "")
        full_name = f"{first} {last}".strip()

        content: dict = {
            "full_name": full_name,
            "id_number": testator.get("id_number", ""),
        }

        if document_type == "living_will":
            content["date_of_birth"] = testator.get("date_of_birth", "")
            content["address"] = testator.get("address", "")

        return content


# ---------------------------------------------------------------------------
# FastAPI dependency
# ---------------------------------------------------------------------------


def get_additional_document_service(
    session: AsyncSession = Depends(get_session),
) -> AdditionalDocumentService:
    """FastAPI dependency that provides an AdditionalDocumentService instance."""
    return AdditionalDocumentService(session=session)
