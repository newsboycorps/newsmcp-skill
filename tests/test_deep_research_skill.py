from __future__ import annotations

import importlib.util
import unittest
from datetime import date
from pathlib import Path
from types import ModuleType


ROOT = Path(__file__).resolve().parents[1]
SKILL_ROOT = ROOT / "skills" / "newsmcp-deep-research"


def load_module(name: str, path: Path) -> ModuleType:
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"unable to load {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class DeepResearchSkillTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.skill_text = (SKILL_ROOT / "SKILL.md").read_text(encoding="utf-8")
        cls.policy_text = (SKILL_ROOT / "references" / "research-policy.md").read_text(
            encoding="utf-8"
        )
        cls.contract_text = (SKILL_ROOT / "references" / "newsmcp.md").read_text(
            encoding="utf-8"
        )
        cls.windows = load_module(
            "plan_date_windows",
            SKILL_ROOT / "scripts" / "plan_date_windows.py",
        )
        cls.ledger = load_module(
            "validate_research_ledger",
            SKILL_ROOT / "scripts" / "validate_research_ledger.py",
        )

    def test_skill_uses_current_content_contract(self) -> None:
        skill = self.skill_text
        contract = self.contract_text

        self.assertIn("name: newsmcp-deep-research", skill)
        self.assertIn("newsboy://content/{content_id}", skill)
        self.assertNotIn("news_id", skill + contract)
        self.assertNotIn("newsboy://news/", skill + contract)

    def test_skill_discovers_and_preserves_dataset_scope(self) -> None:
        combined = self.skill_text + self.policy_text + self.contract_text
        for phrase in (
            "`news_dataset_info`",
            "`news_dataset_values`",
            "Do not infer a dataset key from a country name",
            "same dataset and unchanged filters",
            "search_quota_exceeded",
        ):
            self.assertIn(phrase, combined)
        self.assertIn("values_discoverable", self.contract_text)
        self.assertIn("filters.metadata", self.contract_text)

    def test_skill_relative_markdown_links_exist(self) -> None:
        for relative_path in (
            "references/newsmcp.md",
            "references/research-policy.md",
            "references/output-contract.md",
        ):
            self.assertTrue((SKILL_ROOT / relative_path).is_file(), relative_path)

    def test_window_planner_creates_contiguous_months(self) -> None:
        result = self.windows.plan_windows(date(2026, 1, 15), date(2026, 4, 5))

        self.assertEqual(result[0]["start"], "2026-01-15")
        self.assertEqual(result[-1]["end"], "2026-04-05")
        self.assertEqual(len(result), 4)

    def test_research_depth_has_no_fixed_article_target_or_cap(self) -> None:
        for phrase in (
            "Full-body target",
            "Suggested cap",
            "Stop below the target",
            "Do not read page 2",
            "reformulate an unproductive query at most once",
        ):
            self.assertNotIn(phrase, self.skill_text + self.policy_text)
        self.assertIn(
            "desired length of the answer or newsletter does not determine research depth",
            self.policy_text,
        )

    def test_broad_discovery_continues_pagination_and_full_body_review(self) -> None:
        self.assertIn("Broad discovery prioritizes recall", self.policy_text)
        self.assertIn(
            "continue with the same dataset and unchanged filters into later pages",
            self.policy_text,
        )
        self.assertIn(
            "relevant candidates that could change the synthesis or editorial selection were read in full",
            self.policy_text,
        )

    def test_ledger_requires_next_page_or_stop_reason(self) -> None:
        data = self.valid_ledger()
        data["searches"] = [data["searches"][0], data["searches"][2]]

        errors = self.ledger.validate(data)

        self.assertIn(
            "search page with has_more=true requires the next page or pagination_stop_reason",
            errors,
        )

    def test_ledger_rejects_coverage_satisfied_as_pagination_stop(self) -> None:
        data = self.valid_ledger()
        data["searches"] = [data["searches"][0], data["searches"][2]]
        data["searches"][0]["pagination_stop_reason"] = "coverage_satisfied"

        self.assertIn(
            "pagination_stop_reason must be one of: diminishing_returns, out_of_scope_results, tool_failure, user_boundary",
            self.ledger.validate(data),
        )

    def test_ledger_accepts_evidence_based_pagination_stop(self) -> None:
        data = self.valid_ledger()
        data["searches"] = [data["searches"][0], data["searches"][2]]
        data["searches"][0]["pagination_stop_reason"] = "diminishing_returns"

        self.assertEqual(self.ledger.validate(data), [])

    def test_ledger_requires_explicit_dataset(self) -> None:
        data = self.valid_ledger()
        data["searches"][0].pop("dataset")

        self.assertIn(
            "each search requires an explicit dataset",
            self.ledger.validate(data),
        )

    def test_ledger_does_not_accept_changed_dataset_as_next_page(self) -> None:
        data = self.valid_ledger()
        data["searches"][1]["dataset"] = "different-dataset"

        self.assertIn(
            "search page with has_more=true requires the next page or pagination_stop_reason",
            self.ledger.validate(data),
        )

    def test_ledger_does_not_accept_changed_filters_as_next_page(self) -> None:
        data = self.valid_ledger()
        data["searches"][1]["filters"]["metadata"] = {
            "feed_slug": ["different-value"]
        }

        self.assertIn(
            "search page with has_more=true requires the next page or pagination_stop_reason",
            self.ledger.validate(data),
        )

    def test_ledger_does_not_force_second_pass_without_material_gap(self) -> None:
        data = self.valid_ledger()
        data["searches"] = data["searches"][:2]
        data["material_gaps"] = []

        self.assertEqual(self.ledger.validate(data), [])

    def test_ledger_requires_second_pass_for_material_gap(self) -> None:
        data = self.valid_ledger()
        data["searches"] = data["searches"][:2]

        errors = self.ledger.validate(data)

        self.assertIn(
            "material gaps require a second-pass search or partial status",
            errors,
        )

    @staticmethod
    def valid_ledger() -> dict[str, object]:
        return {
            "windows": [{"id": "w01", "start": "2026-01-01", "end": "2026-01-31"}],
            "searches": [
                {
                    "window_id": "w01",
                    "phase": 1,
                    "query": "sample topic",
                    "dataset": "sample-dataset",
                    "filters": {
                        "published_at": {
                            "start": "2026-01-01",
                            "end": "2026-01-31",
                        },
                        "metadata": {"sample_field": ["sample-value"]},
                    },
                    "page": 1,
                    "has_more": True,
                },
                {
                    "window_id": "w01",
                    "phase": 1,
                    "query": "sample topic",
                    "dataset": "sample-dataset",
                    "filters": {
                        "published_at": {
                            "start": "2026-01-01",
                            "end": "2026-01-31",
                        },
                        "metadata": {"sample_field": ["sample-value"]},
                    },
                    "page": 2,
                    "has_more": False,
                },
                {
                    "window_id": "w01",
                    "phase": 2,
                    "query": "sample topic mechanism",
                    "dataset": "sample-dataset",
                    "filters": {
                        "published_at": {
                            "start": "2026-01-01",
                            "end": "2026-01-31",
                        },
                        "metadata": {"sample_field": ["sample-value"]},
                    },
                    "page": 1,
                    "has_more": False,
                },
            ],
            "articles": [
                {"window_id": "w01", "content_id": 101, "full_text_read": True},
                {"window_id": "w01", "content_id": 102, "full_text_read": True},
                {"window_id": "w01", "content_id": 103, "full_text_read": True},
            ],
            "material_gaps": ["sample topic mechanism"],
            "status": "complete",
            "stop_reason": "coverage_satisfied",
        }


if __name__ == "__main__":
    unittest.main()
