"""Meta endpoints: provider catalogue, settings, encryption status,
dashboard aggregator, knowledge-base file serving."""
from __future__ import annotations

import json

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from ...config import PROJECT_ROOT, settings
from ...database import get_db
from ..helpers import get_active_profile_id
from ..llm_clients import PROVIDER_MODELS
from ..schemas import SettingIn

router = APIRouter()


@router.get("/providers")
async def list_providers() -> dict[str, list[str]]:
    return PROVIDER_MODELS


@router.get("/health")
async def health() -> dict[str, object]:
    return {
        "status": "ok",
        "encryption_configured": bool(settings.ENCRYPTION_KEY),
        "providers": list(PROVIDER_MODELS.keys()),
    }


@router.get("/settings")
async def get_settings_kv() -> dict[str, str]:
    conn = get_db()
    try:
        rows = conn.execute("SELECT key, value FROM settings").fetchall()
    finally:
        conn.close()
    return {r["key"]: r["value"] for r in rows}


@router.post("/settings")
async def save_setting(body: SettingIn) -> dict[str, bool]:
    conn = get_db()
    try:
        conn.execute(
            "INSERT INTO settings (key, value) VALUES (?, ?) "
            "ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            (body.key, body.value),
        )
        conn.commit()
    finally:
        conn.close()
    return {"ok": True}


# ---------------------------------------------------------------------------
# Dashboard aggregator — mirrors the original /api/dashboard/stats
# ---------------------------------------------------------------------------


@router.get("/dashboard/stats")
async def dashboard_stats() -> dict:
    """Aggregate numbers shown on the Dashboard tab (server-side, single round-trip).

    Returns visibility index, citation rate, audit readiness, plus per-funnel-stage
    breakdowns of mention rate, sources, and competitors.
    """
    pid = get_active_profile_id()
    conn = get_db()
    try:
        if pid:
            results = conn.execute(
                "SELECT r.brand_mentioned, r.citation_detected, r.sentiment_label, "
                "       r.sov_score, r.competitors_json, r.response, "
                "       v.brand, v.funnel_stage "
                "FROM visibility_results r "
                "JOIN visibility_runs v ON v.id = r.run_id "
                "WHERE v.profile_id=? "
                "ORDER BY r.id DESC LIMIT 100",
                (pid,),
            ).fetchall()
            audit = conn.execute(
                "SELECT score, max_score FROM website_analyses "
                "WHERE profile_id=? ORDER BY id DESC LIMIT 1",
                (pid,),
            ).fetchone()
        else:
            results = conn.execute(
                "SELECT r.brand_mentioned, r.citation_detected, r.sentiment_label, "
                "       r.sov_score, r.competitors_json, r.response, "
                "       v.brand, v.funnel_stage "
                "FROM visibility_results r "
                "JOIN visibility_runs v ON v.id = r.run_id "
                "WHERE v.profile_id IS NULL "
                "ORDER BY r.id DESC LIMIT 100"
            ).fetchall()
            audit = conn.execute(
                "SELECT score, max_score FROM website_analyses "
                "WHERE profile_id IS NULL ORDER BY id DESC LIMIT 1"
            ).fetchone()
    finally:
        conn.close()

    if not results:
        return {
            "visibility_index": 0,
            "citation_rate": 0,
            "audit_readiness": 0,
            "global_competitors_count": 0,
            "global_competitors_list": [],
            "funnel": {
                "top_of_funnel":    {"mentions": 0, "total": 0, "competitors": []},
                "middle_of_funnel": {"mentions": 0, "total": 0, "competitors": []},
                "bottom_of_funnel": {"mentions": 0, "total": 0, "competitors": []},
            },
        }

    total = len(results)
    mentions = sum(1 for r in results if r["brand_mentioned"])
    cited = sum(1 for r in results if r["citation_detected"])

    funnel: dict[str, dict] = {
        "top_of_funnel":    {"mentions": 0, "total": 0, "competitors": set()},
        "middle_of_funnel": {"mentions": 0, "total": 0, "competitors": set()},
        "bottom_of_funnel": {"mentions": 0, "total": 0, "competitors": set()},
    }
    global_competitors: set[str] = set()

    for r in results:
        stage = r["funnel_stage"] or "top_of_funnel"
        if stage not in funnel:
            stage = "top_of_funnel"
        funnel[stage]["total"] += 1
        if r["brand_mentioned"]:
            funnel[stage]["mentions"] += 1
        for c in json.loads(r["competitors_json"] or "[]"):
            funnel[stage]["competitors"].add(c)
            global_competitors.add(c)

    audit_readiness = 0
    if audit and audit["max_score"]:
        audit_readiness = round((audit["score"] / audit["max_score"]) * 100)

    for stage in funnel:
        funnel[stage]["competitors"] = sorted(funnel[stage]["competitors"])

    return {
        "visibility_index": round((mentions / total) * 100) if total else 0,
        "citation_rate":     round((cited / total) * 100) if total else 0,
        "audit_readiness":   audit_readiness,
        "total_runs":        total,
        "global_competitors_count": len(global_competitors),
        "global_competitors_list":  sorted(global_competitors),
        "funnel": funnel,
    }


# ---------------------------------------------------------------------------
# Knowledge-base files — served from /kb/{filename}
# ---------------------------------------------------------------------------


@router.get("/kb")
async def list_kb_files() -> list[str]:
    """List the available KB files (just the names, no contents)."""
    kb_dir = PROJECT_ROOT / "kb"
    if not kb_dir.exists():
        return []
    return sorted(p.name for p in kb_dir.glob("*.md"))


@router.get("/kb/{filename}")
async def get_kb_file(filename: str):
    """Serve a knowledge-base markdown article. Filenames are validated to
    prevent path traversal."""
    if "/" in filename or ".." in filename or not filename.endswith(".md"):
        raise HTTPException(400, "Invalid filename")
    target = PROJECT_ROOT / "kb" / filename
    if not target.is_file():
        raise HTTPException(404, "KB file not found")
    return FileResponse(target, media_type="text/markdown")
