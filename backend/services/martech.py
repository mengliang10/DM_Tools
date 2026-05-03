"""HTML → list of detected martech vendors.

Wraps `martech_patterns.MARTECH_PATTERNS` (regex library, ~100 vendors).
Compiles each pattern once at import time so repeated scans are fast.
"""
from __future__ import annotations

import re
from functools import lru_cache

from .martech_patterns import MARTECH_PATTERNS

_COMPILED: list[tuple[str, str, list[re.Pattern[str]]]] = []
for entry in MARTECH_PATTERNS:
    compiled: list[re.Pattern[str]] = []
    for raw in entry["patterns"]:
        try:
            compiled.append(re.compile(raw, re.IGNORECASE))
        except re.error:
            continue
    if compiled:
        _COMPILED.append((entry["name"], entry["category"], compiled))


def detect(html: str) -> list[dict[str, str]]:
    """Return a sorted list of `{name, category}` for every vendor matched."""
    if not html:
        return []
    found: list[dict[str, str]] = []
    for name, category, patterns in _COMPILED:
        if any(p.search(html) for p in patterns):
            found.append({"name": name, "category": category})
    return sorted(found, key=lambda x: (x["category"], x["name"]))


@lru_cache(maxsize=1)
def categories() -> list[str]:
    return sorted({c for _, c, _ in _COMPILED})
