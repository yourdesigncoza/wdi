"""PayFast payment gateway integration service.

Handles signature generation for checkout form submission and
ITN (Instant Transaction Notification) callback validation.
All functions are pure/stateless — no class needed.
"""

import hashlib
import hmac
import ipaddress
import logging
import urllib.parse
from typing import Optional

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

# --------------------------------------------------------------------------- #
# Constants
# --------------------------------------------------------------------------- #

PAYFAST_FIELD_ORDER: list[str] = [
    "merchant_id",
    "merchant_key",
    "return_url",
    "cancel_url",
    "notify_url",
    "name_first",
    "name_last",
    "email_address",
    "cell_number",
    "m_payment_id",
    "amount",
    "item_name",
    "item_description",
    "custom_str1",
    "custom_str2",
    "custom_str3",
    "custom_str4",
    "custom_str5",
    "custom_int1",
    "custom_int2",
    "custom_int3",
    "custom_int4",
    "custom_int5",
    "email_confirmation",
    "confirmation_address",
    "payment_method",
]

PAYFAST_SANDBOX_URL = "https://sandbox.payfast.co.za/eng/process"
PAYFAST_LIVE_URL = "https://www.payfast.co.za/eng/process"

PAYFAST_SANDBOX_VALIDATE = "https://sandbox.payfast.co.za/eng/query/validate"
PAYFAST_LIVE_VALIDATE = "https://www.payfast.co.za/eng/query/validate"

# Known PayFast server IP ranges (for ITN source validation)
PAYFAST_IP_RANGES: list[ipaddress.IPv4Network] = [
    ipaddress.ip_network("197.97.145.144/28"),
    ipaddress.ip_network("41.74.179.192/27"),
]


# --------------------------------------------------------------------------- #
# Signature generation
# --------------------------------------------------------------------------- #


def generate_signature(
    data: dict[str, str],
    passphrase: Optional[str] = None,
) -> str:
    """Build an MD5 signature from *data* following PayFast's algorithm.

    1. Order fields according to ``PAYFAST_FIELD_ORDER``.
    2. Filter out keys with empty / None values.
    3. URL-encode each value with ``quote_plus``.
    4. Append passphrase (if provided) as the last parameter.
    5. Return the MD5 hex digest of the resulting param string.
    """
    pairs: list[str] = []
    for key in PAYFAST_FIELD_ORDER:
        value = data.get(key)
        if value is not None and str(value) != "":
            pairs.append(
                f"{key}={urllib.parse.quote_plus(str(value).strip())}"
            )

    param_string = "&".join(pairs)

    if passphrase:
        param_string += f"&passphrase={urllib.parse.quote_plus(passphrase.strip())}"

    return hashlib.md5(param_string.encode("utf-8")).hexdigest()


# --------------------------------------------------------------------------- #
# Form data builder
# --------------------------------------------------------------------------- #


def build_payment_form_data(
    m_payment_id: str,
    amount: str,
    item_name: str,
    buyer_email: str,
    buyer_first: str,
    buyer_last: str,
) -> dict[str, str]:
    """Return a complete dict of hidden-form fields for PayFast checkout.

    Includes a computed ``signature`` field so the frontend can POST
    directly to PayFast without any server-side redirect.
    """
    data: dict[str, str] = {
        "merchant_id": settings.PAYFAST_MERCHANT_ID,
        "merchant_key": settings.PAYFAST_MERCHANT_KEY,
        "return_url": settings.PAYFAST_RETURN_URL,
        "cancel_url": settings.PAYFAST_CANCEL_URL,
        "notify_url": settings.PAYFAST_NOTIFY_URL,
        "name_first": buyer_first,
        "name_last": buyer_last,
        "email_address": buyer_email,
        "m_payment_id": m_payment_id,
        "amount": amount,
        "item_name": item_name,
    }

    passphrase = settings.PAYFAST_PASSPHRASE or None
    data["signature"] = generate_signature(data, passphrase)
    return data


# --------------------------------------------------------------------------- #
# PayFast URL helper
# --------------------------------------------------------------------------- #


def get_payfast_url() -> str:
    """Return the sandbox or live PayFast process URL."""
    return PAYFAST_SANDBOX_URL if settings.PAYFAST_SANDBOX else PAYFAST_LIVE_URL


# --------------------------------------------------------------------------- #
# ITN validation helpers
# --------------------------------------------------------------------------- #


def validate_itn_signature(
    post_data: dict[str, str],
    passphrase: Optional[str] = None,
) -> bool:
    """Validate an ITN callback signature (timing-safe comparison).

    Unlike checkout signatures, ITN validation preserves the *received*
    field order and excludes the ``signature`` field before hashing.
    """
    received_signature = post_data.get("signature", "")

    pairs: list[str] = []
    for key, value in post_data.items():
        if key == "signature":
            continue
        if value is not None and str(value) != "":
            pairs.append(
                f"{key}={urllib.parse.quote_plus(str(value).strip())}"
            )

    param_string = "&".join(pairs)

    if passphrase:
        param_string += f"&passphrase={urllib.parse.quote_plus(passphrase.strip())}"

    computed = hashlib.md5(param_string.encode("utf-8")).hexdigest()
    return hmac.compare_digest(computed, received_signature)


def is_valid_payfast_ip(ip_str: str) -> bool:
    """Check whether *ip_str* belongs to a known PayFast server range."""
    try:
        addr = ipaddress.ip_address(ip_str)
    except ValueError:
        return False
    return any(addr in network for network in PAYFAST_IP_RANGES)


async def validate_itn_server_confirmation(post_data: dict[str, str]) -> bool:
    """POST received ITN data back to PayFast for server-to-server validation.

    Returns ``True`` only if PayFast responds with ``"VALID"``.
    """
    validate_url = (
        PAYFAST_SANDBOX_VALIDATE
        if settings.PAYFAST_SANDBOX
        else PAYFAST_LIVE_VALIDATE
    )

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(validate_url, data=post_data)
            return response.text.strip() == "VALID"
    except Exception:
        logger.warning(
            "PayFast server confirmation failed", exc_info=True
        )
        return False
