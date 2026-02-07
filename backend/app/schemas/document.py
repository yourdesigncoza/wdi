"""Pydantic schemas for document generation requests and responses."""

from pydantic import BaseModel


class GeneratePreviewRequest(BaseModel):
    """Request body for generating a preview PDF.

    The user must acknowledge the legal disclaimer before generating.
    """

    disclaimer_acknowledged: bool  # Must be True to generate


class DocumentInfo(BaseModel):
    """Metadata about a generated document."""

    will_id: str
    document_reference: str  # WC-{short_id}-{timestamp}
    generated_at: str
    is_preview: bool
    page_count: int | None = None
