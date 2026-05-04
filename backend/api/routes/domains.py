"""Domains + Site-Profiles routes.

A profile can own multiple domains; each domain can hold multiple site_profiles
(individual pages tracked under that domain). Used by the Strategic Analysis
context builder to give the LLM precise per-page context.

    GET    /api/domains                       list (active-profile scoped)
    POST   /api/domains                       add
    PUT    /api/domains/{id}                  update
    DELETE /api/domains/{id}                  delete (cascades site_profiles)
    GET    /api/domains/{id}/profiles         list site profiles under one domain

    GET    /api/site-profiles                 list (active-profile scoped, joined)
    POST   /api/site-profiles                 add
    DELETE /api/site-profiles/{id}            delete
"""
from __future__ import annotations

from fastapi import APIRouter

from ...database import get_db, rows_to_list
from ..helpers import get_active_profile_id
from ..schemas import DomainIn, SiteProfileIn

router = APIRouter()


# ---------------------------------------------------------------------------
# Domains
# ---------------------------------------------------------------------------


@router.get("/domains")
async def list_domains() -> list[dict]:
    pid = get_active_profile_id()
    conn = get_db()
    try:
        rows = []
        if pid:
            rows = conn.execute(
                "SELECT * FROM domains WHERE profile_id=? ORDER BY name",
                (pid,),
            ).fetchall()
        if not rows:
            rows = conn.execute(
                "SELECT * FROM domains WHERE profile_id IS NULL ORDER BY name"
            ).fetchall()
    finally:
        conn.close()
    return rows_to_list(rows)


@router.post("/domains", status_code=201)
async def add_domain(body: DomainIn) -> dict[str, int]:
    pid = get_active_profile_id()
    conn = get_db()
    try:
        cur = conn.execute(
            "INSERT INTO domains (profile_id, name, domain, industry, description) "
            "VALUES (?, ?, ?, ?, ?)",
            (pid, body.name, body.domain, body.industry, body.description),
        )
        conn.commit()
        return {"id": cur.lastrowid}
    finally:
        conn.close()


@router.put("/domains/{domain_id}")
async def update_domain(domain_id: int, body: DomainIn) -> dict[str, bool]:
    conn = get_db()
    try:
        conn.execute(
            "UPDATE domains SET name=?, domain=?, industry=?, description=? "
            "WHERE id=?",
            (body.name, body.domain, body.industry, body.description, domain_id),
        )
        conn.commit()
    finally:
        conn.close()
    return {"ok": True}


@router.delete("/domains/{domain_id}")
async def delete_domain(domain_id: int) -> dict[str, bool]:
    conn = get_db()
    try:
        # Cascade: delete site_profiles first (FK is ON DELETE CASCADE in
        # schema, but we also clear explicitly for clarity).
        conn.execute("DELETE FROM site_profiles WHERE domain_id=?", (domain_id,))
        conn.execute("DELETE FROM domains WHERE id=?", (domain_id,))
        conn.commit()
    finally:
        conn.close()
    return {"ok": True}


@router.get("/domains/{domain_id}/profiles")
async def list_site_profiles_for_domain(domain_id: int) -> list[dict]:
    conn = get_db()
    try:
        rows = conn.execute(
            "SELECT * FROM site_profiles WHERE domain_id=? ORDER BY id",
            (domain_id,),
        ).fetchall()
    finally:
        conn.close()
    return rows_to_list(rows)


# ---------------------------------------------------------------------------
# Site profiles (pages under a domain)
# ---------------------------------------------------------------------------


@router.get("/site-profiles")
async def list_all_site_profiles() -> list[dict]:
    pid = get_active_profile_id()
    conn = get_db()
    try:
        if pid:
            rows = conn.execute(
                "SELECT sp.*, d.name AS domain_name, d.domain AS domain_root "
                "FROM site_profiles sp JOIN domains d ON d.id = sp.domain_id "
                "WHERE sp.profile_id=? "
                "ORDER BY d.name, sp.page_type",
                (pid,),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT sp.*, d.name AS domain_name, d.domain AS domain_root "
                "FROM site_profiles sp JOIN domains d ON d.id = sp.domain_id "
                "WHERE sp.profile_id IS NULL "
                "ORDER BY d.name, sp.page_type"
            ).fetchall()
    finally:
        conn.close()
    return rows_to_list(rows)


@router.post("/site-profiles", status_code=201)
async def add_site_profile(body: SiteProfileIn) -> dict[str, int]:
    pid = get_active_profile_id()
    conn = get_db()
    try:
        cur = conn.execute(
            "INSERT INTO site_profiles "
            "(profile_id, domain_id, page_url, page_type, notes) "
            "VALUES (?, ?, ?, ?, ?)",
            (pid, body.domain_id, body.page_url, body.page_type, body.notes),
        )
        conn.commit()
        return {"id": cur.lastrowid}
    finally:
        conn.close()


@router.delete("/site-profiles/{profile_id}")
async def delete_site_profile(profile_id: int) -> dict[str, bool]:
    conn = get_db()
    try:
        conn.execute("DELETE FROM site_profiles WHERE id=?", (profile_id,))
        conn.commit()
    finally:
        conn.close()
    return {"ok": True}
