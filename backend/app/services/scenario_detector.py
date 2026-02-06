"""Deterministic scenario detection from will data.

Analyses testator's marital status, beneficiaries, and assets to determine
which complex estate scenarios apply. Each scenario unlocks additional
will sections for the user to complete.

Detected scenarios:
  - blended_family: married with step-children
  - testamentary_trust: minor beneficiaries present
  - usufruct: property assets + married status
  - business_assets: business-type assets present

Joint will is user-selected (not auto-detected) via will_type="joint".
"""


class ScenarioDetector:
    """Deterministic scenario detection from will data."""

    # Step-child relationship values (normalised to lowercase)
    _STEP_CHILD_RELATIONSHIPS = frozenset({
        "step_child",
        "step_son",
        "step_daughter",
        "stepchild",
        "stepson",
        "stepdaughter",
    })

    @staticmethod
    def detect(will_data: dict) -> list[str]:
        """Return a list of applicable scenario strings based on will data.

        Args:
            will_data: Dict with keys 'marital', 'beneficiaries', 'assets'
                       matching the corresponding JSONB columns on the Will model.

        Returns:
            List of scenario identifier strings, e.g.
            ["blended_family", "testamentary_trust", "usufruct"].
        """
        scenarios: list[str] = []
        marital = will_data.get("marital", {})
        beneficiaries = will_data.get("beneficiaries", [])
        assets = will_data.get("assets", [])

        is_married = marital.get("status", "").startswith("married")

        # Blended family: married + step-children in beneficiaries
        has_step_children = any(
            b.get("relationship", "").lower()
            in ScenarioDetector._STEP_CHILD_RELATIONSHIPS
            for b in beneficiaries
        )
        if is_married and has_step_children:
            scenarios.append("blended_family")

        # Testamentary trust: any minor beneficiary
        has_minors = any(b.get("is_minor", False) for b in beneficiaries)
        if has_minors:
            scenarios.append("testamentary_trust")

        # Usufruct: has property + is married
        has_property = any(
            a.get("asset_type") == "property" for a in assets
        )
        if has_property and is_married:
            scenarios.append("usufruct")

        # Business assets: has business-type assets
        has_business = any(
            a.get("asset_type") == "business" for a in assets
        )
        if has_business:
            scenarios.append("business_assets")

        return scenarios
