"""Optional Google PageSpeed Insights wrapper.

Returns a dict of category scores + a few core audit values, or None on
any failure (the caller is expected to degrade gracefully).
"""
from __future__ import annotations

import logging
import urllib.parse
from typing import Any

import httpx

from ..config import settings

logger = logging.getLogger(__name__)


async def fetch_lighthouse(url: str) -> dict[str, Any] | None:
    params: list[tuple[str, str]] = [
        ("url", url),
        ("category", "PERFORMANCE"),
        ("category", "ACCESSIBILITY"),
        ("category", "BEST_PRACTICES"),
        ("category", "SEO"),
    ]
    if settings.PAGESPEED_API_KEY:
        params.append(("key", settings.PAGESPEED_API_KEY))
    qs = urllib.parse.urlencode(params, doseq=True)
    endpoint = f"https://www.googleapis.com/pagespeedonline/v5/runPagespeed?{qs}"

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            r = await client.get(endpoint)
            if r.status_code != 200:
                logger.warning("PageSpeed %d: %s", r.status_code, r.text[:200])
                return None
            data = r.json().get("lighthouseResult", {})
            cats = data.get("categories", {})
            audits = data.get("audits", {})
            return {
                "performance":     (cats.get("performance",     {}).get("score") or 0) * 100,
                "accessibility":   (cats.get("accessibility",   {}).get("score") or 0) * 100,
                "best_practices":  (cats.get("best-practices",  {}).get("score") or 0) * 100,
                "seo":             (cats.get("seo",             {}).get("score") or 0) * 100,
                "audits": {
                    "first-contentful-paint":   audits.get("first-contentful-paint",   {}).get("displayValue"),
                    "speed-index":              audits.get("speed-index",              {}).get("displayValue"),
                    "largest-contentful-paint": audits.get("largest-contentful-paint", {}).get("displayValue"),
                    "interactive":              audits.get("interactive",              {}).get("displayValue"),
                },
            }
    except Exception as e:
        logger.warning("PageSpeed fetch failed: %s", e)
        return None
