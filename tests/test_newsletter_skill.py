from __future__ import annotations

import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SKILL_ROOT = ROOT / "skills" / "newsmcp-newsletter"
DEEP_RESEARCH_ROOT = ROOT / "skills" / "newsmcp-deep-research"


class NewsletterSkillTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.skill = (SKILL_ROOT / "SKILL.md").read_text(encoding="utf-8")
        cls.gates = (SKILL_ROOT / "references" / "quality-gates.md").read_text(
            encoding="utf-8"
        )
        cls.openai = (SKILL_ROOT / "agents" / "openai.yaml").read_text(
            encoding="utf-8"
        )

    def test_skill_requires_deep_research_for_new_evidence(self) -> None:
        self.assertIn("../newsmcp-deep-research/SKILL.md", self.skill)
        self.assertIn("before the first news search or detail call", self.skill)
        self.assertTrue((DEEP_RESEARCH_ROOT / "SKILL.md").is_file())

    def test_skill_relies_on_live_theme_contract(self) -> None:
        self.assertIn("`newsletter_theme_search`", self.skill)
        self.assertIn("`newsletter_theme_get`", self.skill)
        self.assertIn("supports `en` (default) and `ko`", self.skill)
        self.assertIn("does not determine the language of the newsletter", self.skill)
        self.assertIn("Do not copy a theme's", self.skill)
        self.assertNotIn("line-style-newsletter", self.skill + self.gates)

    def test_skill_uses_validate_only_flow_and_explicit_title(self) -> None:
        self.assertIn("`newsletter_validate`", self.skill)
        self.assertIn("title` as metadata independent from `source_mdx", self.skill)
        self.assertIn("exact successfully validated `title`, `theme_key`, and `source_mdx`", self.skill)
        self.assertIn("exact title, theme key, and source MDX", self.gates)

    def test_skill_requires_full_bodies_and_publication_approval(self) -> None:
        self.assertIn("Every included article must have a returned full Body", self.skill)
        self.assertIn("explicitly asks to publish", self.skill)
        self.assertIn("Never call `newsletter_create` merely to test", self.skill)

    def test_quality_gate_tracks_research_coverage(self) -> None:
        for field in (
            "content_id",
            "public_url",
            "stop reason",
            "unique candidates",
            "full-Body review",
            "metadata filters",
        ):
            self.assertIn(field, self.gates)
        self.assertIn("Do not impose a fixed search or article count", self.gates)
        self.assertIn("having enough articles for a draft is not evidence", self.skill)
        self.assertIn("use broad discovery", self.gates)

    def test_openai_metadata_declares_newsmcp_dependency(self) -> None:
        self.assertIn('value: "newsmcp"', self.openai)
        self.assertIn('url: "https://mcp.newsmcp.news/mcp"', self.openai)
        self.assertIn("allow_implicit_invocation: true", self.openai)


if __name__ == "__main__":
    unittest.main()
