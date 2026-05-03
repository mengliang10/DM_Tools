"""Unified history feed across all generators / analyzers."""
from __future__ import annotations

from fastapi import APIRouter

from ...database import get_db, rows_to_list
from ..helpers import get_active_profile_id

router = APIRouter()


@router.get("")
async def unified_history(limit: int = 200) -> list[dict]:
    """Return a single timeline of recent activity across modules."""
    pid = get_active_profile_id()
    conn = get_db()
    try:
        clauses: list[tuple[str, str]] = [
            (
                "visibility_runs",
                "SELECT id, 'visibility' AS kind, brand AS subject, "
                "prompt_text AS detail, run_at AS ts FROM visibility_runs "
                f"WHERE {'profile_id=?' if pid else 'profile_id IS NULL'}",
            ),
            (
                "content_generations",
                "SELECT id, 'content' AS kind, topic AS subject, "
                "content_type AS detail, created_at AS ts FROM content_generations "
                f"WHERE {'profile_id=?' if pid else 'profile_id IS NULL'}",
            ),
            (
                "faq_generations",
                "SELECT id, 'faq' AS kind, topic AS subject, "
                "brand AS detail, created_at AS ts FROM faq_generations "
                f"WHERE {'profile_id=?' if pid else 'profile_id IS NULL'}",
            ),
            (
                "website_analyses",
                "SELECT id, 'website' AS kind, url AS subject, "
                "CAST(score AS TEXT) AS detail, created_at AS ts "
                "FROM website_analyses "
                f"WHERE {'profile_id=?' if pid else 'profile_id IS NULL'}",
            ),
            (
                "martech_scans",
                "SELECT id, 'martech' AS kind, url AS subject, "
                "'' AS detail, created_at AS ts FROM martech_scans "
                f"WHERE {'profile_id=?' if pid else 'profile_id IS NULL'}",
            ),
        ]
        union_sql = " UNION ALL ".join(c[1] for c in clauses)
        params = tuple([pid] * sum(1 for _ in clauses)) if pid else ()
        rows = conn.execute(
            f"SELECT * FROM ({union_sql}) ORDER BY ts DESC LIMIT ?",
            (*params, limit),
        ).fetchall()
    finally:
        conn.close()
    return rows_to_list(rows)
