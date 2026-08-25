---
name: newsmcp-newsletter
description: Use when a user asks to create, preview, revise, or publish a NewsMCP newsletter, weekly briefing, or email digest.
---

# NewsMCP Newsletter

Turn NewsMCP evidence into a reviewed newsletter. NewsMCP remains the source of live news, theme rules, validation, rendering, and publishing.

## Choose the path

| Request state | Action |
| --- | --- |
| New articles, summaries, or material changes are needed | Read and apply [NewsMCP Deep Research](../newsmcp-deep-research/SKILL.md) before the first news search or detail call. |
| A completed full-Body NewsMCP research handoff is available | Reuse it after checking that it covers the requested audience, topic, corpus, and dates. |
| Only layout or wording is changing | Reuse the evidence unless the edit introduces or changes factual claims. |

Do not treat a newsletter as a quick scan because its output is visual. If new research is required but the prerequisite skill or NewsMCP news tools are unavailable, stop instead of drafting from retrieval snippets.

For research-backed work, read [the newsletter quality gates](references/quality-gates.md) before drafting.

## Workflow

### 1. Set the brief

Resolve the audience, purpose, topic, country corpus or logical dataset, inclusive date range, reader-facing newsletter language, and requested outcome: draft, preview, revision, or publication. Ask only when a missing choice would materially change the research or publication target.

### 2. Check the evidence handoff

Follow `newsmcp-deep-research` when research is needed. Every included article must have a returned full Body. The handoff must preserve the exact dataset and metadata filters and make query families, pagination, unique candidates, full-Body review, duplicates, exclusions, and stop evidence explainable. It must also include usable source and Body-confirmed image URLs.

For roundups, newsletters, topic discovery, and requests for all or recent relevant news, use the broad-discovery path. Research the candidate pool independently of the desired newsletter length: having enough articles for a draft is not evidence that discovery is complete.

### 3. Get the current theme

Call `newsletter_theme_search`, then `newsletter_theme_get` for the selected `theme_key` before authoring. Follow the returned guide and record its version.

Theme documentation supports `en` (default) and `ko`. Use the same documentation language for both theme calls. It is independent of the reader-facing newsletter language.

Do not copy a theme's typography, layout, image count, MDX shape, or validator rules into this skill. The live theme guide wins over an older draft or local preview.

### 4. Draft and validate

Select articles for audience relevance, independent event coverage, concrete evidence, and material uncertainty rather than a fixed article count. Write from full Bodies, preserve reported names, dates, numbers, conditions, and disagreement, and mark unsupported interpretation as inference. Use only verified source links and images found in the corresponding Body.

Choose the reader-facing `title` as metadata independent from `source_mdx`; do not derive it from a body heading or add a heading solely to supply the title. Call `newsletter_validate` with the exact `title`, `theme_key`, and `source_mdx` after drafting. Repair every blocking issue and validate the changed tuple again. This validation render-check does not store or publish the newsletter.

Never call `newsletter_create` merely to test a draft because it stores and publishes the newsletter. When a rendered preview is available, inspect the complete page for missing articles or links, failed images, and layout overflow.

Before publication, show the draft or preview together with a compact coverage and validation note from the quality gates. Disclose partial research instead of presenting it as exhaustive.

### 5. Publish with approval

Call `newsletter_create` only when the user explicitly asks to publish the reviewed draft. Reuse the exact successfully validated `title`, `theme_key`, and `source_mdx`. Any change requires validation again; if the evidence, article selection, title, or source changes materially after approval, show the change and obtain approval again.

After publication, report the newsletter identifier, viewer URL, theme version, and storage status. Verify the viewer when an authenticated session is available, and distinguish successful storage from an ownership or viewer-session failure.

## Boundaries

- Do not substitute web search unless the user permits another source.
- Do not publish a material evidence gap unless the user accepts the disclosed limitation.
- Do not retry an ambiguous publishing result until existing state is checked, to avoid duplicates.
- Publication approval does not authorize email distribution, ownership transfer, OAuth changes, or code deployment.
