"""Unit tests for UPLFilterService.

Covers ALLOW, REPLACE, BLOCK, and REFER actions as well as edge cases.
"""

from __future__ import annotations

import pytest

from app.services.upl_filter import FALLBACK_MESSAGE, FilterAction, UPLFilterService


# ---------------------------------------------------------------------------
# ALLOW cases -- informational / factual text should pass through
# ---------------------------------------------------------------------------


class TestAllow:
    """Text that does NOT contain advice patterns should be allowed."""

    @pytest.mark.asyncio
    async def test_informational_statement(self, upl_filter: UPLFilterService):
        result = await upl_filter.filter_output(
            "The executor manages the estate.",
            context={"category": "executor"},
        )
        assert result.action == FilterAction.ALLOW
        assert result.filtered_text == "The executor manages the estate."
        assert result.patterns_matched == []

    @pytest.mark.asyncio
    async def test_factual_statement(self, upl_filter: UPLFilterService):
        result = await upl_filter.filter_output(
            "A will must be signed by two witnesses.",
            context={"category": "witness"},
        )
        assert result.action == FilterAction.ALLOW
        assert result.filtered_text == "A will must be signed by two witnesses."

    @pytest.mark.asyncio
    async def test_neutral_beneficiary_text(self, upl_filter: UPLFilterService):
        result = await upl_filter.filter_output(
            "You can list multiple beneficiaries.",
            context={"category": "beneficiary"},
        )
        assert result.action == FilterAction.ALLOW


# ---------------------------------------------------------------------------
# REPLACE cases -- advice detected AND a matching clause exists
# ---------------------------------------------------------------------------


class TestReplace:
    """Advice patterns should be replaced when a matching clause is found."""

    @pytest.mark.asyncio
    async def test_should_include_with_clause(self, upl_filter: UPLFilterService):
        result = await upl_filter.filter_output(
            "You should include a residuary clause.",
            context={"category": "residue", "will_type": "basic"},
        )
        assert result.action == FilterAction.REPLACE
        assert result.clause_code == "RES-01"
        assert "residue_beneficiary" in result.filtered_text

    @pytest.mark.asyncio
    async def test_recommend_executor(self, upl_filter: UPLFilterService):
        result = await upl_filter.filter_output(
            "I recommend you appoint an executor.",
            context={"category": "executor", "will_type": "basic"},
        )
        assert result.action == FilterAction.REPLACE
        assert result.clause_code == "EXEC-01"
        assert "executor_name" in result.filtered_text

    @pytest.mark.asyncio
    async def test_patterns_matched_populated(self, upl_filter: UPLFilterService):
        result = await upl_filter.filter_output(
            "You should include a trust clause.",
            context={"category": "trust", "will_type": "basic"},
        )
        assert result.action == FilterAction.REPLACE
        assert len(result.patterns_matched) >= 1


# ---------------------------------------------------------------------------
# BLOCK cases -- advice detected but NO matching clause available
# ---------------------------------------------------------------------------


class TestBlock:
    """Advice patterns without a matching clause should be blocked."""

    @pytest.mark.asyncio
    async def test_must_specify_no_clause(self, upl_filter: UPLFilterService):
        result = await upl_filter.filter_output(
            "You must specify exact percentages.",
            context={"category": "beneficiary"},
        )
        # beneficiary category is not in SAMPLE_CLAUSES -> BLOCK
        assert result.action == FilterAction.BLOCK
        assert result.filtered_text == FALLBACK_MESSAGE

    @pytest.mark.asyncio
    async def test_best_approach_no_clause(self, upl_filter: UPLFilterService):
        result = await upl_filter.filter_output(
            "The best approach is to create a guardian provision.",
            context={"category": "guardian"},
        )
        assert result.action == FilterAction.BLOCK
        assert result.filtered_text == FALLBACK_MESSAGE

    @pytest.mark.asyncio
    async def test_block_no_context_category(self, upl_filter: UPLFilterService):
        result = await upl_filter.filter_output(
            "You should add a special bequest.",
            context={},
        )
        assert result.action == FilterAction.BLOCK
        assert result.filtered_text == FALLBACK_MESSAGE


# ---------------------------------------------------------------------------
# REFER cases -- complex matters requiring attorney consultation
# ---------------------------------------------------------------------------


class TestRefer:
    """Complex legal matters should trigger an attorney referral."""

    @pytest.mark.asyncio
    async def test_tax_implications(self, upl_filter: UPLFilterService):
        result = await upl_filter.filter_output(
            "Consider the tax implications of this bequest.",
            context={"category": "beneficiary"},
        )
        assert result.action == FilterAction.REFER
        assert result.filtered_text == FALLBACK_MESSAGE
        assert "tax_implications" in result.patterns_matched

    @pytest.mark.asyncio
    async def test_estate_duty(self, upl_filter: UPLFilterService):
        result = await upl_filter.filter_output(
            "This may trigger estate duty concerns.",
            context={"category": "residue"},
        )
        assert result.action == FilterAction.REFER

    @pytest.mark.asyncio
    async def test_offshore_assets(self, upl_filter: UPLFilterService):
        result = await upl_filter.filter_output(
            "For offshore assets, you should consult a specialist.",
            context={"category": "trust"},
        )
        assert result.action == FilterAction.REFER
        assert "offshore_assets" in result.patterns_matched

    @pytest.mark.asyncio
    async def test_litigation(self, upl_filter: UPLFilterService):
        result = await upl_filter.filter_output(
            "This estate is in litigation and cannot be divided simply.",
            context={"category": "residue"},
        )
        assert result.action == FilterAction.REFER

    @pytest.mark.asyncio
    async def test_disputed_will(self, upl_filter: UPLFilterService):
        result = await upl_filter.filter_output(
            "A disputed will requires formal legal proceedings.",
            context={"category": "executor"},
        )
        assert result.action == FilterAction.REFER

    @pytest.mark.asyncio
    async def test_refer_takes_precedence_over_advice(
        self, upl_filter: UPLFilterService
    ):
        """Attorney-required patterns should win even if advice patterns also match."""
        result = await upl_filter.filter_output(
            "You should consider the tax implications carefully.",
            context={"category": "executor"},
        )
        assert result.action == FilterAction.REFER


# ---------------------------------------------------------------------------
# Edge cases
# ---------------------------------------------------------------------------


class TestEdgeCases:
    """Edge cases and boundary conditions."""

    @pytest.mark.asyncio
    async def test_empty_text(self, upl_filter: UPLFilterService):
        result = await upl_filter.filter_output("", context={})
        assert result.action == FilterAction.ALLOW
        assert result.filtered_text == ""

    @pytest.mark.asyncio
    async def test_whitespace_only(self, upl_filter: UPLFilterService):
        result = await upl_filter.filter_output("   ", context={})
        assert result.action == FilterAction.ALLOW

    @pytest.mark.asyncio
    async def test_very_long_text(self, upl_filter: UPLFilterService):
        long_text = "This is neutral information. " * 5000
        result = await upl_filter.filter_output(long_text, context={})
        assert result.action == FilterAction.ALLOW
        assert result.filtered_text == long_text

    @pytest.mark.asyncio
    async def test_multiple_advice_patterns(self, upl_filter: UPLFilterService):
        result = await upl_filter.filter_output(
            "You should include a trust. I recommend you also add a residue clause.",
            context={"category": "trust", "will_type": "basic"},
        )
        assert result.action == FilterAction.REPLACE
        assert len(result.patterns_matched) >= 2

    @pytest.mark.asyncio
    async def test_invalid_will_type_defaults(self, upl_filter: UPLFilterService):
        result = await upl_filter.filter_output(
            "I advise you to include an executor clause.",
            context={"category": "executor", "will_type": "nonexistent"},
        )
        # Should still find executor clause via WillType.BASIC fallback
        assert result.action == FilterAction.REPLACE
        assert result.clause_code == "EXEC-01"


# ---------------------------------------------------------------------------
# Audit logging
# ---------------------------------------------------------------------------


class TestAuditLogging:
    """Verify that non-ALLOW filter results are logged."""

    @pytest.mark.asyncio
    async def test_refer_logs_audit(self, upl_filter: UPLFilterService, mock_audit_service):
        await upl_filter.filter_output(
            "Consider the tax implications.",
            context={"category": "trust", "session_id": "test-session"},
        )
        mock_audit_service.log_event.assert_called()
        call_args = mock_audit_service.log_event.call_args
        # The service calls log_event with keyword arguments
        assert call_args.kwargs.get("event_type") == "upl_filter_activated"
        assert call_args.kwargs.get("event_category") == "compliance"

    @pytest.mark.asyncio
    async def test_allow_does_not_log(self, upl_filter: UPLFilterService, mock_audit_service):
        await upl_filter.filter_output(
            "The executor manages the estate.",
            context={"category": "executor"},
        )
        mock_audit_service.log_event.assert_not_called()

    @pytest.mark.asyncio
    async def test_block_logs_audit(self, upl_filter: UPLFilterService, mock_audit_service):
        await upl_filter.filter_output(
            "You must specify exact percentages.",
            context={"category": "beneficiary"},
        )
        mock_audit_service.log_event.assert_called_once()
