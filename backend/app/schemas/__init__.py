"""Pydantic schemas for API request/response validation."""

from app.schemas.consent import (
    ConsentRequest,
    ConsentResponse,
    ConsentStatusResponse,
    DataRequestBody,
    DataRequestResponse,
)
from app.schemas.conversation import (
    ConversationRequest,
    ConversationResponse,
    MessageSchema,
    SSEEvent,
)
from app.schemas.will import (
    AssetSchema,
    AssetType,
    BeneficiarySchema,
    BequestSchema,
    ExecutorSchema,
    GuardianSchema,
    MaritalSchema,
    MaritalStatus,
    Province,
    ResidueSchema,
    TestatorSchema,
    WillCreateRequest,
    WillResponse,
    WillSectionUpdate,
)

__all__ = [
    # Consent
    "ConsentRequest",
    "ConsentResponse",
    "ConsentStatusResponse",
    "DataRequestBody",
    "DataRequestResponse",
    # Conversation
    "ConversationRequest",
    "ConversationResponse",
    "MessageSchema",
    "SSEEvent",
    # Will
    "AssetSchema",
    "AssetType",
    "BeneficiarySchema",
    "BequestSchema",
    "ExecutorSchema",
    "GuardianSchema",
    "MaritalSchema",
    "MaritalStatus",
    "Province",
    "ResidueSchema",
    "TestatorSchema",
    "WillCreateRequest",
    "WillResponse",
    "WillSectionUpdate",
]
