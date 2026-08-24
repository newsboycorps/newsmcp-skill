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

## Default depth

Use `standard` unless the user asks for a quick scan or explicitly requests exhaustive research.

| Mode | Full-body quota | Search behavior | Suggested cap |
|---|---|---|---|
| quick | 3 relevant articles overall | One primary search; second pass only if ambiguity remains | 8 articles |
| standard | 3 relevant articles per window and at least 8 overall | First and targeted second pass | 30 articles |
| deep | 5 relevant articles per window and at least 15 overall | Multiple variants and targeted gap searches | 50 articles |

The overall minimum does not override reality. If a window has fewer relevant articles after reasonable page and query expansion, record a `sparse_reason` and continue. Do not count syndicated or substantially duplicate coverage as independent evidence.

If the per-window quota would exceed the suggested cap, tell the user what the requested period implies and either use two-month windows where allowed or confirm a higher budget.

## Pagination

Always inspect page 1. Inspect page 2 with unchanged filters when `has_more` is true and any of these hold:

- the full-body quota is not met;
- the candidate set is dominated by duplicates;
- important viewpoints or periods are missing;
- results are too ambiguous to select evidence.

Do not read page 2 merely to increase the result count after the evidence gate is already satisfied.

## Evidence strength

Prefer evidence that is:

- directly relevant to the user's question;
- explicit in the full body rather than inferred from a headline;
- specific about dates, actors, actions, numbers, and consequences;
- independently corroborated for consequential claims;
- diverse enough to expose disagreement or uncertainty.

Publication date and event date are different fields. State which one is being used when chronology matters.

## Second-pass requirements

Derive second-pass searches from material first-pass gaps. Typical gap types:

- newly identified entity or product;
- claimed cause without direct support;
- disputed metric or timeline;
- policy, legal, or market mechanism needing context;
- predecessor event required for comparison.

Run at least one second-pass query for standard and deep research. Limit each material gap to one initial query and one reformulation.

## Stop reasons

Use one of these explicit stop reasons:

- `coverage_satisfied`: required windows, article bodies, and material gaps are covered.
- `diminishing_returns`: two successive targeted searches add no material evidence after minimum coverage is met.
- `source_scarcity`: reasonable variants and pagination still cannot meet coverage.
- `tool_failure`: authentication, availability, or repeated MCP errors block required work.
- `user_budget`: the user requested a tighter time or article budget.

Only `coverage_satisfied` and `diminishing_returns` support a `complete` status. Other reasons require `partial` unless the missing evidence is immaterial to the answer.
