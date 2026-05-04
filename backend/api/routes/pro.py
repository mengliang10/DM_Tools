"""Pro Tools — citation grading + advanced JSON-LD schema generation.

    POST /api/pro/cite-grade    fetch URL, score citation probability for active brand
    POST /api/pro/generate-schema generate Organization JSON-LD from active profile
"""
from __future__ import annotations

import httpx
from fastapi import APIRouter, HTTPException

from ...database import get_db, row_to_dict
from ...services.geo_logic import calculate_citation_probability, generate_advanced_schema
from ..helpers import get_active_profile_id
from ..schemas import ProCiteGradeIn

router = APIRouter()


@router.post("/cite-grade")
async def cite_grade(body: ProCiteGradeIn) -> dict:
    url = str(body.url)
    if not url.startswith("http"):
        url = "https://" + url

    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            r = await client.get(url, headers={"User-Agent": "DM_Tools/0.2"})
            content = r.text
    except Exception as e:
        raise HTTPException(502, f"Failed to fetch URL: {e}") from e

    pid = get_active_profile_id()
    brand = ""
    if pid:
        conn = get_db()
        try:
            row = conn.execute(
                "SELECT brand FROM profiles WHERE id=?", (pid,)
            ).fetchone()
        finally:
            conn.close()
        if row:
            brand = row["brand"] or ""

    score, findings = calculate_citation_probability(content, brand)
    return {"url": url, "brand": brand, "score": score, "findings": findings}


@router.post("/generate-schema")
async def generate_schema() -> dict:
    pid = get_active_profile_id()
    if not pid:
        raise HTTPException(400, "No active profile — pick one in Settings first.")
    conn = get_db()
    try:
        row = conn.execute(
            "SELECT * FROM profiles WHERE id=?", (pid,)
        ).fetchone()
    finally:
        conn.close()
    if not row:
        raise HTTPException(404, "Active profile not found.")
    profile = row_to_dict(row) or {}
    return {"schema": generate_advanced_schema(profile)}
