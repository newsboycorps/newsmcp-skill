# Newsletter Quality Gates

Use these gates only for research-backed newsletters. The research depth, pagination, and stop rules remain owned by `newsmcp-deep-research`; the theme format remains owned by the live NewsMCP theme guide.

## Ready to draft

Confirm that:

- the audience, topic, exact dataset and material metadata filters, and inclusive date range are clear;
- searched query families, pages, unique candidates, and pagination stop reasons are recorded well enough to explain coverage;
- `has_more` paths continued while new pages added relevant independent candidates; an already sufficient draft length was not used as a stop reason;
- every selected `content_id` returned a full Body;
- material candidates that could change the synthesis or selection were also read in full before exclusion;
- selected items represent independent events, with material duplicates and exclusions explained;
- each event has the reported action, result, key evidence, limitations, `public_url`, and any Body-confirmed image URL;
- material gaps, research status, and stop reason are visible.

Use the depth rules from `newsmcp-deep-research`. Broad roundups and requests for all relevant news use broad discovery. Do not impose a fixed search or article count, but do not let the desired newsletter length cap candidate discovery or full-Body review.

## Ready to publish

Confirm that:

- the draft follows the currently returned theme guide and version;
- factual claims and visual assets trace to the evidence handoff;
- `newsletter_validate` passes for the exact title, theme key, and source MDX being reviewed;
- the title is explicit metadata and is not inferred from or inserted solely as a body heading;
- an available preview has the expected article and headline count, working source links and images, and no material overflow;
- partial research or unresolved limitations are visible to the user;
- the reviewed draft has explicit publication approval.

## Coverage note

Keep the pre-publication note compact. Include only useful values:

```text
Coverage: <period; dataset and metadata filters; query families/pages; unique candidates; full Bodies read; selected events>
Excluded: <material count and reasons>
Theme and validation: <theme key/version; validated title; pass or issues>
Limitations: <material gaps or none>
Publication: awaiting approval
```

Counts describe the work performed; they do not prove importance or corpus-wide completeness.
