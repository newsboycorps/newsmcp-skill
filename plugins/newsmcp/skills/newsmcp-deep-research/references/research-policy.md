# Research Policy

## Date resolution

Resolve dates in this order:

1. Preserve explicit dates from the user.
2. Resolve relative dates against the current date in the user's timezone when known; otherwise use `Asia/Seoul` and disclose it.
3. Interpret `최근`, `요즘`, or equivalent vague recency as the latest 30 days.
4. Interpret `올해` as January 1 through today and `지난해` as the previous calendar year.
5. For a named event without dates, infer a defensible surrounding period only when the event timing is known; otherwise ask.

Ask the user when two plausible ranges would lead to materially different research or when the requested range would create more than 12 two-month windows.

## Windowing

- Use one window for ranges of 62 days or fewer.
- For longer ranges spanning at most 12 calendar months, use one calendar month per window.
- For longer ranges spanning at most 24 calendar months, use two calendar months per window.
- Keep windows inclusive, contiguous, and non-overlapping.
- Never exceed the MCP maximum of 180 days in one search call.

## Dataset and metadata scope

Treat the NewsMCP dataset as part of the research brief, not as an incidental search option.

- Preserve an explicit dataset key supplied by the user or a verified handoff.
- When the user describes a country, region, or corpus without a verified key, call `news_dataset_info` and choose from the live catalog. Do not guess a key or silently use the default dataset.
- Use the combined dataset only when the request genuinely spans its member corpora. If dataset-specific metadata is needed, search the relevant member dataset instead and disclose the resulting scope.
- Call `news_dataset_values` only for a selected field marked `values_discoverable` whose exact values are unknown. Record the returned value used in the search rather than a human paraphrase.
- Keep dataset, publication boundaries, and metadata filters unchanged across pages of one query. If the brief requires multiple datasets or filter variants, treat each as a separate logged path.

Metadata filters narrow retrieval; they do not replace semantic query coverage. Use a filter when it matches the requested scope. When adjacent categories could contain material results, add an unfiltered or complementary search path in the same dataset rather than assuming the catalog field is exhaustive.

## Research depth

Choose depth from the request rather than a default article budget:

- Use a quick path only when the user explicitly asks for a quick scan or supplies a tight time, cost, or article boundary.
- Use focused research for a narrow event, claim, entity, or comparison.
- Use broad discovery for roundups, newsletters, trends, landscape reviews, and requests for all or recent relevant news. Broad discovery prioritizes recall across the scoped topic before editorial selection.

Do not use a fixed full-Body target, search count, or suggested cap. The desired length of the answer or newsletter does not determine research depth. Do not count syndicated or substantially duplicate coverage as independent evidence, but retain distinct reporting that adds facts, limitations, or viewpoints.

Each window with relevant results should contribute full-Body evidence. Record a `sparse_reason` when a window cannot contribute evidence.

Evidence is sufficient when:

- each material claim has full-body support;
- consequential claims are corroborated when another independent report is available;
- relevant windows are represented or marked sparse;
- material facets and query families implied by the scope were searched;
- relevant candidates that could change the synthesis or editorial selection were read in full;
- important disagreement and uncertainty remain visible.

## Pagination

Always inspect page 1. When `has_more` is true and the current page contains relevant independent candidates, continue with the same dataset and unchanged filters into later pages. A draft already having enough articles is not a pagination stop reason.

Stop a pagination path only when:

- the server reports no more results;
- additional pages consistently add no material independent candidates;
- the remaining results are demonstrably outside the requested scope;
- a repeated tool failure blocks the path; or
- the user supplied a boundary that has been reached.

Record the stop reason and the last page inspected. Apply the same rule beyond page 2 rather than treating page 2 as the end of pagination.

## Evidence strength

Prefer evidence that is:

- directly relevant to the user's question;
- explicit in the full body rather than inferred from a headline;
- specific about dates, actors, actions, numbers, and consequences;
- independently corroborated for consequential claims;
- diverse enough to expose disagreement or uncertainty.

Publication date and event date are different fields. State which one is being used when chronology matters.

## Query expansion and second pass

Plan complementary first-pass query families for broad requests, then derive follow-up searches from the candidate map. Useful triggers include:

- newly identified entity or product;
- claimed cause without direct support;
- disputed metric or timeline;
- policy, legal, or market mechanism needing context;
- predecessor event required for comparison.

Follow-up searches are not limited to gaps in already selected claims. Use them when they could uncover missing events, entities, terminology, perspectives, or source types within the requested scope. Do not impose a fixed query or reformulation limit; stop when continued expansion produces diminishing returns or the scope is exhausted.

## Stop reasons

Use one of these explicit stop reasons:

- `coverage_satisfied`: required windows and material facets were searched, relevant candidates were read in full, and pagination paths were exhausted or closed with evidence-based reasons.
- `diminishing_returns`: continued query expansion or pagination consistently adds no material independent candidates or evidence.
- `source_scarcity`: reasonable variants and pagination still cannot meet coverage.
- `tool_failure`: authentication, availability, or repeated MCP errors block required work.
- `user_boundary`: an explicit user-supplied time, cost, or article boundary was reached.

Only `coverage_satisfied` and `diminishing_returns` support a `complete` status. Other reasons require `partial` unless the missing evidence is immaterial to the answer.
