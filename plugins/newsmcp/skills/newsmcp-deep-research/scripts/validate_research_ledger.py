#!/usr/bin/env python3
"""Validate the completion gates of a NewsMCP deep-research ledger."""

from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path
from typing import Any


COMPLETE_STOP_REASONS = {"coverage_satisfied", "diminishing_returns"}


def validate(data: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    windows = data.get("windows")
    searches = data.get("searches")
    articles = data.get("articles")

    if not isinstance(windows, list) or not windows:
        errors.append("windows must be a non-empty list")
        windows = []
    if not isinstance(searches, list):
        errors.append("searches must be a list")
        searches = []
    if not isinstance(articles, list):
        errors.append("articles must be a list")
        articles = []

    window_ids = {item.get("id") for item in windows if isinstance(item, dict)}
    phase_one_windows = {
        item.get("window_id")
        for item in searches
        if isinstance(item, dict) and item.get("phase") == 1
    }
    for window_id in sorted(identifier for identifier in window_ids if identifier):
        if window_id not in phase_one_windows:
            errors.append(f"{window_id} has no first-pass search")

    for search in searches:
        if not isinstance(search, dict):
            errors.append("each search must be an object")
            continue
        if search.get("page") != 1 or search.get("has_more") is not True:
            continue
        has_next_page = any(
            isinstance(candidate, dict)
            and candidate.get("window_id") == search.get("window_id")
            and candidate.get("phase") == search.get("phase")
            and candidate.get("query") == search.get("query")
            and candidate.get("page") == 2
            for candidate in searches
        )
        if not has_next_page and not search.get("pagination_skip_reason"):
            errors.append(
                "page 1 with has_more=true requires page 2 or "
                "pagination_skip_reason"
            )

    detail_counts = Counter(
        item.get("window_id")
        for item in articles
        if isinstance(item, dict) and item.get("full_text_read") is True
    )
    for window in windows:
        if not isinstance(window, dict):
            errors.append("each window must be an object")
            continue
        window_id = window.get("id")
        if detail_counts[window_id] < 1 and not window.get("sparse_reason"):
            errors.append(
                f"{window_id} has {detail_counts[window_id]} full articles; "
                "requires one or sparse_reason"
            )

    for article in articles:
        if isinstance(article, dict) and article.get("full_text_read") is not True:
            errors.append(f"article {article.get('content_id')} lacks a full body")

    material_gaps = data.get("material_gaps", [])
    if not isinstance(material_gaps, list):
        errors.append("material_gaps must be a list")
        material_gaps = []
    has_second_pass = any(
        isinstance(item, dict) and item.get("phase") == 2 for item in searches
    )
    if material_gaps and not has_second_pass and data.get("status") == "complete":
        errors.append("material gaps require a second-pass search or partial status")

    status = data.get("status")
    stop_reason = data.get("stop_reason")
    if status not in {"complete", "partial"}:
        errors.append("status must be complete or partial")
    if not isinstance(stop_reason, str) or not stop_reason:
        errors.append("stop_reason is required")
    if status == "complete" and stop_reason not in COMPLETE_STOP_REASONS:
        errors.append("complete status requires a completion-compatible stop_reason")

    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("ledger", type=Path)
    args = parser.parse_args()

    try:
        data = json.loads(args.ledger.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        parser.error(str(exc))
    if not isinstance(data, dict):
        parser.error("ledger root must be a JSON object")

    errors = validate(data)
    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1

    print("Research ledger is valid.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
