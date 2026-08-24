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
        cls.windows = load_module(
            "plan_date_windows",
            SKILL_ROOT / "scripts" / "plan_date_windows.py",
        )
        cls.ledger = load_module(
            "validate_research_ledger",
            SKILL_ROOT / "scripts" / "validate_research_ledger.py",
        )

    def test_skill_uses_current_content_contract(self) -> None:
        skill = (SKILL_ROOT / "SKILL.md").read_text(encoding="utf-8")
        contract = (SKILL_ROOT / "references" / "newsmcp.md").read_text(
            encoding="utf-8"
        )

        self.assertIn("name: newsmcp-deep-research", skill)
        self.assertIn("newsboy://content/{content_id}", skill)
        self.assertNotIn("news_id", skill + contract)
        self.assertNotIn("newsboy://news/", skill + contract)

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

    def test_ledger_requires_page_two_or_skip_reason(self) -> None:
        data = self.valid_ledger()
        data["searches"] = [data["searches"][0], data["searches"][2]]

        errors = self.ledger.validate(data)

        self.assertIn(
            "page 1 with has_more=true requires page 2 or pagination_skip_reason",
            errors,
        )

    def test_ledger_accepts_explicit_pagination_skip_reason(self) -> None:
        data = self.valid_ledger()
        data["searches"] = [data["searches"][0], data["searches"][2]]
        data["searches"][0]["pagination_skip_reason"] = "coverage_satisfied"

        self.assertEqual(self.ledger.validate(data), [])

    @staticmethod
    def valid_ledger() -> dict[str, object]:
        return {
            "windows": [{"id": "w01", "start": "2026-01-01", "end": "2026-01-31"}],
            "searches": [
                {
                    "window_id": "w01",
                    "phase": 1,
                    "query": "sample topic",
                    "page": 1,
                    "has_more": True,
                },
                {
                    "window_id": "w01",
                    "phase": 1,
                    "query": "sample topic",
                    "page": 2,
                    "has_more": False,
                },
                {
                    "window_id": "w01",
                    "phase": 2,
                    "query": "sample topic mechanism",
                    "page": 1,
                    "has_more": False,
                },
            ],
            "articles": [
                {"window_id": "w01", "content_id": 101, "full_text_read": True},
                {"window_id": "w01", "content_id": 102, "full_text_read": True},
                {"window_id": "w01", "content_id": 103, "full_text_read": True},
            ],
            "min_details_per_window": 3,
            "status": "complete",
            "stop_reason": "coverage_satisfied",
        }


if __name__ == "__main__":
    unittest.main()
