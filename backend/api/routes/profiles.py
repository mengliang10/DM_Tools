"""Profiles, prompts, and competitors. All scoped to active profile (or NULL)."""
from __future__ import annotations

import json

from fastapi import APIRouter, HTTPException

from ...database import get_db, row_to_dict, rows_to_list
from ..helpers import get_active_profile_id
from ..schemas import CompetitorIn, ProfileIn, PromptIn

router = APIRouter()


# ---------------------------------------------------------------------------
# Profiles
# ---------------------------------------------------------------------------


@router.get("/profiles")
async def list_profiles() -> list[dict]:
    conn = get_db()
    try:
        rows = conn.execute("SELECT * FROM profiles ORDER BY name").fetchall()
    finally:
        conn.close()
    out = rows_to_list(rows)
    for r in out:
        r["key_ids"] = json.loads(r.get("key_ids") or "[]")
        r["custom_json"] = json.loads(r.get("custom_json") or "{}")
    return out


@router.post("/profiles", status_code=201)
async def create_profile(body: ProfileIn) -> dict[str, int]:
    conn = get_db()
    try:
        cur = conn.execute(
            """INSERT INTO profiles
               (name, brand, website, industry, language, notes, key_ids, custom_json)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                body.name, body.brand, body.website, body.industry,
                body.language, body.notes,
                json.dumps(body.key_ids), json.dumps(body.custom_json),
            ),
        )
        conn.commit()
        return {"id": cur.lastrowid}
    finally:
        conn.close()


@router.get("/profiles/{profile_id}")
async def get_profile(profile_id: int) -> dict:
    conn = get_db()
    try:
        row = conn.execute(
            "SELECT * FROM profiles WHERE id=?", (profile_id,)
        ).fetchone()
    finally:
        conn.close()
    if not row:
        raise HTTPException(404, "Profile not found")
    out = row_to_dict(row) or {}
    out["key_ids"] = json.loads(out.get("key_ids") or "[]")
    out["custom_json"] = json.loads(out.get("custom_json") or "{}")
    return out


@router.put("/profiles/{profile_id}")
async def update_profile(profile_id: int, body: ProfileIn) -> dict[str, bool]:
    conn = get_db()
    try:
        conn.execute(
            """UPDATE profiles SET
                 name=?, brand=?, website=?, industry=?, language=?, notes=?,
                 key_ids=?, custom_json=?, updated_at=datetime('now')
               WHERE id=?""",
            (
                body.name, body.brand, body.website, body.industry,
                body.language, body.notes,
                json.dumps(body.key_ids), json.dumps(body.custom_json),
                profile_id,
            ),
        )
        conn.commit()
    finally:
        conn.close()
    return {"ok": True}


@router.delete("/profiles/{profile_id}")
async def delete_profile(profile_id: int) -> dict[str, bool]:
    conn = get_db()
    try:
        for table in (
            "prompts", "competitors", "visibility_runs",
            "content_generations", "faq_generations",
            "website_analyses", "martech_scans",
            "geo_analyses", "site_profiles", "domains",
        ):
            conn.execute(f"DELETE FROM {table} WHERE profile_id=?", (profile_id,))
        conn.execute("DELETE FROM profiles WHERE id=?", (profile_id,))
        conn.execute(
            "DELETE FROM settings WHERE key='active_profile_id' AND value=?",
            (str(profile_id),),
        )
        conn.commit()
    finally:
        conn.close()
    return {"ok": True}


@router.post("/profiles/{profile_id}/activate")
async def activate_profile(profile_id: int) -> dict[str, bool]:
    conn = get_db()
    try:
        if not conn.execute(
            "SELECT 1 FROM profiles WHERE id=?", (profile_id,)
        ).fetchone():
            raise HTTPException(404, "Profile not found")
        conn.execute(
            "INSERT INTO settings (key, value) VALUES ('active_profile_id', ?) "
            "ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            (str(profile_id),),
        )
        conn.commit()
    finally:
        conn.close()
    return {"ok": True}


@router.post("/profiles/active/deactivate")
async def deactivate_profile() -> dict[str, bool]:
    conn = get_db()
    try:
        conn.execute("DELETE FROM settings WHERE key='active_profile_id'")
        conn.commit()
    finally:
        conn.close()
    return {"ok": True}


@router.get("/profiles/active/current")
async def get_active_profile() -> dict:
    pid = get_active_profile_id()
    if pid is None:
        return {"active_profile_id": None, "profile": None}
    conn = get_db()
    try:
        row = conn.execute("SELECT * FROM profiles WHERE id=?", (pid,)).fetchone()
    finally:
        conn.close()
    out = row_to_dict(row) if row else None
    if out:
        out["key_ids"] = json.loads(out.get("key_ids") or "[]")
        out["custom_json"] = json.loads(out.get("custom_json") or "{}")
    return {"active_profile_id": pid, "profile": out}


# ---------------------------------------------------------------------------
# Prompts (scoped to active profile, fall back to NULL = global defaults)
# ---------------------------------------------------------------------------


@router.get("/prompts")
async def list_prompts() -> list[dict]:
    pid = get_active_profile_id()
    conn = get_db()
    try:
        rows = []
        if pid:
            rows = conn.execute(
                "SELECT * FROM prompts WHERE profile_id=? ORDER BY id", (pid,)
            ).fetchall()
        if not rows:
            rows = conn.execute(
                "SELECT * FROM prompts WHERE profile_id IS NULL ORDER BY id"
            ).fetchall()
    finally:
        conn.close()
    return rows_to_list(rows)


@router.post("/prompts", status_code=201)
async def add_prompt(body: PromptIn) -> dict[str, int]:
    pid = get_active_profile_id()
    conn = get_db()
    try:
        cur = conn.execute(
            "INSERT INTO prompts (profile_id, text, description, funnel_stage) "
            "VALUES (?, ?, ?, ?)",
            (pid, body.text, body.description, body.funnel_stage),
        )
        conn.commit()
        return {"id": cur.lastrowid}
    finally:
        conn.close()


@router.put("/prompts/{prompt_id}")
async def update_prompt(prompt_id: int, body: PromptIn) -> dict[str, bool]:
    conn = get_db()
    try:
        conn.execute(
            "UPDATE prompts SET text=?, description=?, funnel_stage=? WHERE id=?",
            (body.text, body.description, body.funnel_stage, prompt_id),
        )
        conn.commit()
    finally:
        conn.close()
    return {"ok": True}


@router.delete("/prompts/{prompt_id}")
async def delete_prompt(prompt_id: int) -> dict[str, bool]:
    conn = get_db()
    try:
        conn.execute("DELETE FROM prompts WHERE id=?", (prompt_id,))
        conn.commit()
    finally:
        conn.close()
    return {"ok": True}


# ---------------------------------------------------------------------------
# Competitors
# ---------------------------------------------------------------------------


@router.get("/competitors")
async def list_competitors() -> list[dict]:
    pid = get_active_profile_id()
    conn = get_db()
    try:
        rows = []
        if pid:
            rows = conn.execute(
                "SELECT * FROM competitors WHERE profile_id=? ORDER BY brand_name",
                (pid,),
            ).fetchall()
        if not rows:
            rows = conn.execute(
                "SELECT * FROM competitors WHERE profile_id IS NULL ORDER BY brand_name"
            ).fetchall()
    finally:
        conn.close()
    return rows_to_list(rows)


@router.post("/competitors", status_code=201)
async def add_competitor(body: CompetitorIn) -> dict[str, int]:
    pid = get_active_profile_id()
    conn = get_db()
    try:
        cur = conn.execute(
            "INSERT INTO competitors (profile_id, brand_name, domain, competitor_type) "
            "VALUES (?, ?, ?, ?)",
            (pid, body.brand_name, body.domain, body.competitor_type),
        )
        conn.commit()
        return {"id": cur.lastrowid}
    finally:
        conn.close()


@router.put("/competitors/{comp_id}")
async def update_competitor(comp_id: int, body: CompetitorIn) -> dict[str, bool]:
    conn = get_db()
    try:
        conn.execute(
            "UPDATE competitors SET brand_name=?, domain=?, competitor_type=? WHERE id=?",
            (body.brand_name, body.domain, body.competitor_type, comp_id),
        )
        conn.commit()
    finally:
        conn.close()
    return {"ok": True}


@router.delete("/competitors/{comp_id}")
async def delete_competitor(comp_id: int) -> dict[str, bool]:
    conn = get_db()
    try:
        conn.execute("DELETE FROM competitors WHERE id=?", (comp_id,))
        conn.commit()
    finally:
        conn.close()
    return {"ok": True}
