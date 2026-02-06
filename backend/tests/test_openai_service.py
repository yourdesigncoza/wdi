"""Unit tests for OpenAI service, system prompts, and extraction schemas.

Covers:
- build_system_prompt: section-specific prompts with base personality
- format_will_summary: will state formatting for system prompt context
- Extraction Pydantic models: validation of structured output schemas
- OpenAIService: constructor, stream_response, extract_will_data (mocked)
"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from pydantic import ValidationError

from app.prompts.extraction import (
    EXTRACTION_SYSTEM_PROMPT,
    ExtractedAsset,
    ExtractedBeneficiary,
    ExtractedExecutor,
    ExtractedGuardian,
    ExtractedWillData,
)
from app.prompts.system import (
    BASE_PERSONALITY,
    SECTION_PROMPTS,
    UPL_BOUNDARY,
    build_system_prompt,
    format_will_summary,
)
from app.services.openai_service import OpenAIService


# ---------------------------------------------------------------------------
# build_system_prompt tests
# ---------------------------------------------------------------------------


class TestBuildSystemPrompt:
    """System prompt builder includes base personality, section guidance, and will state."""

    def test_includes_base_personality_for_beneficiaries(self):
        prompt = build_system_prompt("beneficiaries", {})
        assert BASE_PERSONALITY in prompt

    def test_includes_base_personality_for_assets(self):
        prompt = build_system_prompt("assets", {})
        assert BASE_PERSONALITY in prompt

    def test_includes_base_personality_for_guardians(self):
        prompt = build_system_prompt("guardians", {})
        assert BASE_PERSONALITY in prompt

    def test_includes_base_personality_for_executor(self):
        prompt = build_system_prompt("executor", {})
        assert BASE_PERSONALITY in prompt

    def test_includes_base_personality_for_bequests(self):
        prompt = build_system_prompt("bequests", {})
        assert BASE_PERSONALITY in prompt

    def test_includes_base_personality_for_residue(self):
        prompt = build_system_prompt("residue", {})
        assert BASE_PERSONALITY in prompt

    def test_includes_upl_boundary(self):
        prompt = build_system_prompt("beneficiaries", {})
        assert UPL_BOUNDARY in prompt

    def test_includes_section_specific_guidance_beneficiaries(self):
        prompt = build_system_prompt("beneficiaries", {})
        assert SECTION_PROMPTS["beneficiaries"] in prompt

    def test_includes_section_specific_guidance_assets(self):
        prompt = build_system_prompt("assets", {})
        assert SECTION_PROMPTS["assets"] in prompt

    def test_includes_section_specific_guidance_guardians(self):
        prompt = build_system_prompt("guardians", {})
        assert SECTION_PROMPTS["guardians"] in prompt

    def test_includes_section_specific_guidance_executor(self):
        prompt = build_system_prompt("executor", {})
        assert SECTION_PROMPTS["executor"] in prompt

    def test_includes_section_specific_guidance_bequests(self):
        prompt = build_system_prompt("bequests", {})
        assert SECTION_PROMPTS["bequests"] in prompt

    def test_includes_section_specific_guidance_residue(self):
        prompt = build_system_prompt("residue", {})
        assert SECTION_PROMPTS["residue"] in prompt

    def test_unknown_section_uses_base_only(self):
        prompt = build_system_prompt("unknown_section", {})
        assert BASE_PERSONALITY in prompt
        assert UPL_BOUNDARY in prompt

    def test_includes_will_context_summary(self):
        will_ctx = {"testator": {"firstName": "John", "lastName": "Doe"}}
        prompt = build_system_prompt("beneficiaries", will_ctx)
        assert "John Doe" in prompt

    def test_includes_no_reask_instruction(self):
        prompt = build_system_prompt("beneficiaries", {})
        assert "Do not re-ask" in prompt

    def test_guardians_includes_empathetic_tone(self):
        guidance = SECTION_PROMPTS["guardians"]
        assert "empathetic" in guidance.lower() or "sensitive" in guidance.lower()


# ---------------------------------------------------------------------------
# format_will_summary tests
# ---------------------------------------------------------------------------


class TestFormatWillSummary:
    """Will state formatting for embedding in system prompt."""

    def test_empty_context_returns_no_data_message(self):
        result = format_will_summary({})
        assert result == "No data collected yet."

    def test_testator_name_included(self):
        result = format_will_summary(
            {"testator": {"firstName": "John", "lastName": "Doe"}}
        )
        assert "John Doe" in result

    def test_beneficiaries_listed(self):
        result = format_will_summary(
            {
                "beneficiaries": [
                    {"fullName": "Sarah Doe"},
                    {"fullName": "Mark Smith"},
                ]
            }
        )
        assert "Sarah Doe" in result
        assert "Mark Smith" in result

    def test_executor_included(self):
        result = format_will_summary({"executor": {"name": "ABC Trust Company"}})
        assert "ABC Trust Company" in result

    def test_assets_listed(self):
        result = format_will_summary(
            {"assets": [{"description": "House in Cape Town"}]}
        )
        assert "House in Cape Town" in result

    def test_guardians_listed(self):
        result = format_will_summary(
            {"guardians": [{"fullName": "Jane Doe", "isPrimary": True}]}
        )
        assert "Jane Doe" in result

    def test_partial_context(self):
        """Multiple sections present produce multi-line summary."""
        result = format_will_summary(
            {
                "testator": {"firstName": "John", "lastName": "Doe"},
                "beneficiaries": [{"fullName": "Sarah Doe"}],
            }
        )
        assert "John Doe" in result
        assert "Sarah Doe" in result

    def test_testator_missing_fields_handled(self):
        """Missing first/last name should not crash."""
        result = format_will_summary({"testator": {}})
        assert "Testator" in result


# ---------------------------------------------------------------------------
# Extraction schema tests
# ---------------------------------------------------------------------------


class TestExtractedBeneficiary:
    """ExtractedBeneficiary Pydantic model validation."""

    def test_valid_beneficiary(self):
        b = ExtractedBeneficiary(
            full_name="Sarah Doe",
            relationship="daughter",
            is_charity=False,
        )
        assert b.full_name == "Sarah Doe"
        assert b.relationship == "daughter"
        assert b.is_charity is False

    def test_optional_fields_default_none(self):
        b = ExtractedBeneficiary(
            full_name="Mark Smith",
            relationship="friend",
        )
        assert b.id_number is None
        assert b.share_percent is None

    def test_with_all_fields(self):
        b = ExtractedBeneficiary(
            full_name="Jane Doe",
            relationship="spouse",
            id_number="8501015009087",
            share_percent=50.0,
            is_charity=False,
        )
        assert b.share_percent == 50.0

    def test_charity_beneficiary(self):
        b = ExtractedBeneficiary(
            full_name="SPCA South Africa",
            relationship="charity",
            is_charity=True,
        )
        assert b.is_charity is True

    def test_missing_required_field_raises(self):
        with pytest.raises(ValidationError):
            ExtractedBeneficiary(relationship="child")  # type: ignore[call-arg]


class TestExtractedAsset:
    """ExtractedAsset Pydantic model validation."""

    def test_valid_asset(self):
        a = ExtractedAsset(
            asset_type="property",
            description="House at 123 Main St, Cape Town",
        )
        assert a.asset_type == "property"

    def test_optional_details(self):
        a = ExtractedAsset(
            asset_type="vehicle",
            description="Toyota Hilux 2022",
            details="Registration CA 123-456",
        )
        assert a.details == "Registration CA 123-456"

    def test_missing_required_raises(self):
        with pytest.raises(ValidationError):
            ExtractedAsset(asset_type="property")  # type: ignore[call-arg]


class TestExtractedGuardian:
    """ExtractedGuardian Pydantic model validation."""

    def test_valid_primary_guardian(self):
        g = ExtractedGuardian(
            full_name="Jane Doe",
            relationship="sister",
            is_primary=True,
        )
        assert g.is_primary is True

    def test_backup_guardian(self):
        g = ExtractedGuardian(
            full_name="Bob Smith",
            relationship="friend",
            is_primary=False,
        )
        assert g.is_primary is False

    def test_default_is_primary(self):
        g = ExtractedGuardian(
            full_name="Jane Doe",
            relationship="mother",
        )
        assert g.is_primary is True


class TestExtractedExecutor:
    """ExtractedExecutor Pydantic model validation."""

    def test_personal_executor(self):
        e = ExtractedExecutor(
            name="John Smith",
            relationship="brother",
            is_professional=False,
        )
        assert e.is_professional is False

    def test_professional_executor(self):
        e = ExtractedExecutor(
            name="ABC Trust Company",
            is_professional=True,
        )
        assert e.is_professional is True
        assert e.relationship is None

    def test_with_backup(self):
        e = ExtractedExecutor(
            name="John Smith",
            relationship="friend",
            is_professional=False,
            backup_name="Jane Doe",
        )
        assert e.backup_name == "Jane Doe"


class TestExtractedWillData:
    """ExtractedWillData composite schema validation."""

    def test_empty_extraction(self):
        data = ExtractedWillData()
        assert data.beneficiaries == []
        assert data.assets == []
        assert data.guardians == []
        assert data.executor is None
        assert data.bequests == []
        assert data.needs_clarification == []

    def test_full_extraction(self):
        data = ExtractedWillData(
            beneficiaries=[
                ExtractedBeneficiary(
                    full_name="Sarah Doe",
                    relationship="daughter",
                    share_percent=50.0,
                ),
            ],
            assets=[
                ExtractedAsset(
                    asset_type="property",
                    description="House in Sandton",
                ),
            ],
            guardians=[
                ExtractedGuardian(
                    full_name="Jane Doe",
                    relationship="sister",
                    is_primary=True,
                ),
            ],
            executor=ExtractedExecutor(
                name="Bob Smith",
                relationship="friend",
                is_professional=False,
            ),
            bequests=[{"item": "Gold watch", "recipient": "Mark Smith"}],
            needs_clarification=["Share for second beneficiary unclear"],
        )
        assert len(data.beneficiaries) == 1
        assert len(data.assets) == 1
        assert len(data.guardians) == 1
        assert data.executor is not None
        assert len(data.bequests) == 1
        assert len(data.needs_clarification) == 1

    def test_extraction_system_prompt_exists(self):
        assert EXTRACTION_SYSTEM_PROMPT
        assert "extract" in EXTRACTION_SYSTEM_PROMPT.lower()


# ---------------------------------------------------------------------------
# OpenAIService tests (mocked client)
# ---------------------------------------------------------------------------


class TestOpenAIServiceInit:
    """OpenAIService constructor creates AsyncOpenAI client."""

    def test_constructor_stores_model(self):
        service = OpenAIService(api_key="test-key", model="gpt-4o-mini")
        assert service._model == "gpt-4o-mini"

    def test_default_model(self):
        service = OpenAIService(api_key="test-key")
        assert service._model == "gpt-4o-mini"

    def test_custom_model(self):
        service = OpenAIService(api_key="test-key", model="gpt-4o")
        assert service._model == "gpt-4o"


class TestOpenAIServiceStream:
    """stream_response yields text chunks from OpenAI."""

    @pytest.mark.asyncio
    async def test_stream_response_yields_chunks(self):
        service = OpenAIService(api_key="test-key")

        # Mock the async streaming response
        mock_chunk_1 = MagicMock()
        mock_chunk_1.choices = [MagicMock()]
        mock_chunk_1.choices[0].delta.content = "Hello"

        mock_chunk_2 = MagicMock()
        mock_chunk_2.choices = [MagicMock()]
        mock_chunk_2.choices[0].delta.content = " there"

        mock_chunk_3 = MagicMock()
        mock_chunk_3.choices = [MagicMock()]
        mock_chunk_3.choices[0].delta.content = None

        async def mock_stream():
            for chunk in [mock_chunk_1, mock_chunk_2, mock_chunk_3]:
                yield chunk

        mock_create = AsyncMock(return_value=mock_stream())
        service._client = MagicMock()
        service._client.chat.completions.create = mock_create

        chunks = []
        async for text in service.stream_response(
            messages=[{"role": "user", "content": "Hi"}],
            section="beneficiaries",
            will_context={},
        ):
            chunks.append(text)

        assert chunks == ["Hello", " there"]

    @pytest.mark.asyncio
    async def test_stream_uses_correct_temperature(self):
        service = OpenAIService(api_key="test-key")

        async def mock_stream():
            return
            yield  # noqa: unreachable -- makes this an async generator

        mock_create = AsyncMock(return_value=mock_stream())
        service._client = MagicMock()
        service._client.chat.completions.create = mock_create

        async for _ in service.stream_response(
            messages=[], section="beneficiaries", will_context={}
        ):
            pass

        call_kwargs = mock_create.call_args.kwargs
        assert call_kwargs["temperature"] == 0.7
        assert call_kwargs["stream"] is True


class TestOpenAIServiceExtract:
    """extract_will_data uses structured output parsing."""

    @pytest.mark.asyncio
    async def test_extract_returns_parsed_data(self):
        service = OpenAIService(api_key="test-key")

        expected = ExtractedWillData(
            beneficiaries=[
                ExtractedBeneficiary(
                    full_name="Sarah Doe",
                    relationship="daughter",
                ),
            ],
            needs_clarification=["Share percentage unclear"],
        )

        mock_parsed = MagicMock()
        mock_parsed.choices = [MagicMock()]
        mock_parsed.choices[0].message.parsed = expected

        mock_parse = AsyncMock(return_value=mock_parsed)
        service._client = MagicMock()
        service._client.chat.completions.parse = mock_parse

        result = await service.extract_will_data(
            conversation_history=[
                {"role": "user", "content": "My daughter Sarah should get everything"}
            ],
            latest_message="My daughter Sarah should get everything",
        )

        assert len(result.beneficiaries) == 1
        assert result.beneficiaries[0].full_name == "Sarah Doe"

    @pytest.mark.asyncio
    async def test_extract_uses_low_temperature(self):
        service = OpenAIService(api_key="test-key")

        mock_parsed = MagicMock()
        mock_parsed.choices = [MagicMock()]
        mock_parsed.choices[0].message.parsed = ExtractedWillData()

        mock_parse = AsyncMock(return_value=mock_parsed)
        service._client = MagicMock()
        service._client.chat.completions.parse = mock_parse

        await service.extract_will_data(
            conversation_history=[],
            latest_message="test",
        )

        call_kwargs = mock_parse.call_args.kwargs
        assert call_kwargs["temperature"] == 0.2
