"""Pydantic schemas for payment API request/response models.

Defines schemas for payment initiation, status polling, and cancellation.
ITN webhook receives raw form POST data and does not need a schema.
"""

from pydantic import BaseModel, Field


class PaymentInitiateRequest(BaseModel):
    """Request to initiate a payment for a will."""

    will_id: str = Field(description="UUID of the will to pay for")


class PaymentInitiateResponse(BaseModel):
    """Response with PayFast form data for redirect."""

    payment_id: str = Field(description="Internal payment UUID")
    m_payment_id: str = Field(description="Merchant payment reference")
    payfast_url: str = Field(description="PayFast URL to POST form data to")
    form_data: dict[str, str] = Field(
        description="All fields for the hidden PayFast form submission"
    )


class PaymentStatusResponse(BaseModel):
    """Response for payment status polling."""

    payment_id: str = Field(description="Internal payment UUID")
    status: str = Field(
        description="Payment status: pending | completed | cancelled | failed"
    )
    download_token: str | None = Field(
        default=None,
        description="Download token (only present when status is completed)",
    )


class PaymentCancelResponse(BaseModel):
    """Response after payment cancellation."""

    message: str = Field(description="Cancellation confirmation message")
