"""Small reusable helpers: brand detection, sentiment, language suffixes,
active-profile lookup. Kept dependency-free so they can be unit-tested.
"""
from __future__ import annotations

import re

from fastapi import HTTPException

from ..database import get_db
from ..services.security import decrypt

# ---------------------------------------------------------------------------
# Language suffixes (kept compact — full mapping in LANGUAGE_INSTRUCTIONS)
# ---------------------------------------------------------------------------

LANGUAGE_INSTRUCTIONS = {
    "en":    "",
    "ja":    "Write your entire response in Japanese (日本語).",
    "zh-CN": "Write your entire response in Simplified Chinese (简体中文).",
    "zh-TW": "Write your entire response in Traditional Chinese (繁體中文).",
    "ko":    "Write your entire response in Korean (한국어).",
    "de":    "Write your entire response in German (Deutsch).",
    "fr":    "Write your entire response in French (Français).",
    "it":    "Write your entire response in Italian (Italiano).",
    "es":    "Write your entire response in Spanish (Español).",
    "ru":    "Write your entire response in Russian (Русский).",
    "th":    "Write your entire response in Thai (ภาษาไทย).",
    "id":    "Write your entire response in Indonesian (Bahasa Indonesia).",
    "ms":    "Write your entire response in Malay (Bahasa Melayu).",
    "pt":    "Write your entire response in Portuguese (Português).",
}


def lang_suffix(language: str) -> str:
    instruction = LANGUAGE_INSTRUCTIONS.get(language, "")
    return f"\n\nIMPORTANT: {instruction}" if instruction else ""


# ---------------------------------------------------------------------------
# Brand / competitor / sentiment detection
# ---------------------------------------------------------------------------


def brand_mentioned(text: str, brand: str) -> bool:
    if not brand:
        return False
    return bool(re.search(re.escape(brand), text, re.IGNORECASE))


def citation_detected(text: str, website: str) -> bool:
    """Loose check: domain or its base name appears in the text."""
    if not website:
        return False
    clean = (
        website.replace("https://", "")
        .replace("http://", "")
        .replace("www.", "")
        .strip("/")
        .split("/")[0]
        .lower()
    )
    if not clean:
        return False
    if clean in text.lower():
        return True
    parts = clean.split(".")
    main = parts[0] if len(parts) > 1 else clean
    return len(main) > 3 and main in text.lower()


_POSITIVE_WORDS = {
    "recommend", "best", "leading", "top", "excellent", "quality", "reliable",
    "trusted", "innovative", "superior", "premier",
}
_NEGATIVE_WORDS = {
    "poor", "bad", "avoid", "expensive", "slow", "limited", "lacks", "outdated",
    "weak", "buggy",
}


def analyze_sentiment(text: str, brand: str) -> str:
    """Cheap rule-based sentiment for sentences that mention the brand."""
    if not brand:
        return "neutral"
    brand_re = re.compile(re.escape(brand), re.IGNORECASE)
    sentences = re.split(r"[.!?\n]+", text)
    relevant = [s.lower() for s in sentences if brand_re.search(s)]
    if not relevant:
        return "neutral"
    score = 0
    for s in relevant:
        score += sum(1 for w in _POSITIVE_WORDS if w in s)
        score -= sum(1 for w in _NEGATIVE_WORDS if w in s)
    if score > 0:
        return "positive"
    if score < 0:
        return "negative"
    return "neutral"


_COMMON_STOPS = {
    "The", "A", "And", "If", "It", "Is", "Are", "In", "On", "This", "That",
    "When", "Where", "To", "From", "For", "With", "Brand", "Industry",
}


def competitors_in_text(text: str, known: list[str]) -> list[str]:
    """Find known competitors and surface candidate Capitalised tokens."""
    found: set[str] = set()
    for c in known:
        if c and re.search(re.escape(c), text, re.IGNORECASE):
            found.add(c)
    for candidate in re.findall(r"\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b", text):
        if candidate not in _COMMON_STOPS and len(candidate) > 2:
            found.add(candidate)
    return sorted(found)


# ---------------------------------------------------------------------------
# Profile / key helpers
# ---------------------------------------------------------------------------


def get_active_profile_id() -> int | None:
    conn = get_db()
    try:
        row = conn.execute(
            "SELECT value FROM settings WHERE key='active_profile_id'"
        ).fetchone()
    finally:
        conn.close()
    if not row or not row["value"]:
        return None
    try:
        return int(str(row["value"]).strip("'\""))
    except (ValueError, TypeError):
        return None


def get_key_row(key_id: int) -> dict:
    """Fetch an api_keys row, decrypt the key, raise 404 if missing."""
    conn = get_db()
    try:
        row = conn.execute(
            "SELECT * FROM api_keys WHERE id=?", (key_id,)
        ).fetchone()
    finally:
        conn.close()
    if not row:
        raise HTTPException(404, f"API key {key_id} not found")
    out = dict(row)
    out["api_key"] = decrypt(out["api_key"])
    return out


def fetch_competitor_names(profile_id: int | None) -> list[str]:
    conn = get_db()
    try:
        if profile_id:
            rows = conn.execute(
                "SELECT brand_name FROM competitors WHERE profile_id=?", (profile_id,)
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT brand_name FROM competitors WHERE profile_id IS NULL"
            ).fetchall()
    finally:
        conn.close()
    return [r["brand_name"] for r in rows]


def fetch_profile_website(profile_id: int | None) -> str:
    if not profile_id:
        return ""
    conn = get_db()
    try:
        row = conn.execute(
            "SELECT website FROM profiles WHERE id=?", (profile_id,)
        ).fetchone()
    finally:
        conn.close()
    return row["website"] if row else ""
