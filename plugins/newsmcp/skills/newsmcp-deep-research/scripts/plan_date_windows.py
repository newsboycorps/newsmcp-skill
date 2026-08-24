#!/usr/bin/env python3
"""Create inclusive, non-overlapping calendar windows for NewsMCP searches."""

from __future__ import annotations

import argparse
import json
from datetime import date, timedelta


def parse_date(value: str) -> date:
    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise argparse.ArgumentTypeError(f"invalid ISO date: {value}") from exc


def add_months(value: date, months: int) -> date:
    month_index = value.year * 12 + value.month - 1 + months
    year, zero_based_month = divmod(month_index, 12)
    return date(year, zero_based_month + 1, 1)


def month_span(start: date, end: date) -> int:
    return (end.year - start.year) * 12 + end.month - start.month + 1


def plan_windows(start: date, end: date) -> list[dict[str, str | int]]:
    if start > end:
        raise ValueError("start must be before or equal to end")

    if (end - start).days + 1 <= 62:
        ranges = [(start, end)]
    else:
        span = month_span(start, end)
        if span > 24:
            raise ValueError(
                "date range creates more than 12 two-month windows; confirm scope"
            )
        months_per_window = 1 if span <= 12 else 2
        ranges = []
        cursor = start
        while cursor <= end:
            boundary = add_months(date(cursor.year, cursor.month, 1), months_per_window)
            window_end = min(end, boundary - timedelta(days=1))
            ranges.append((cursor, window_end))
            cursor = window_end + timedelta(days=1)

    windows = []
    for index, (window_start, window_end) in enumerate(ranges, start=1):
        days = (window_end - window_start).days + 1
        if days > 180:
            raise ValueError("generated window exceeds NewsMCP's 180-day maximum")
        windows.append(
            {
                "id": f"w{index:02d}",
                "start": window_start.isoformat(),
                "end": window_end.isoformat(),
                "days": days,
            }
        )
    return windows


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--start", required=True, type=parse_date)
    parser.add_argument("--end", required=True, type=parse_date)
    args = parser.parse_args()

    try:
        windows = plan_windows(args.start, args.end)
    except ValueError as exc:
        parser.error(str(exc))

    print(json.dumps({"windows": windows}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
