"""CRUD for the api_keys table. Keys are stored Fernet-encrypted."""
from __future__ import annotations

from fastapi import APIRouter

from ...database import get_db, rows_to_list
from ...services.security import encrypt
from ..schemas import ApiKeyIn

router = APIRouter()


@router.get("")
async def list_keys() -> list[dict]:
    conn = get_db()
    try:
        rows = conn.execute(
            "SELECT id, provider, label, model, created_at FROM api_keys ORDER BY id"
        ).fetchall()
    finally:
        conn.close()
    return rows_to_list(rows)


@router.post("", status_code=201)
async def add_key(body: ApiKeyIn) -> dict[str, int]:
    conn = get_db()
    try:
        cur = conn.execute(
            "INSERT INTO api_keys (provider, label, api_key, model) VALUES (?, ?, ?, ?)",
            (body.provider, body.label, encrypt(body.api_key), body.model),
        )
        conn.commit()
        return {"id": cur.lastrowid}
    finally:
        conn.close()


@router.put("/{key_id}")
async def update_key(key_id: int, body: ApiKeyIn) -> dict[str, bool]:
    conn = get_db()
    try:
        conn.execute(
            "UPDATE api_keys SET provider=?, label=?, api_key=?, model=? WHERE id=?",
            (body.provider, body.label, encrypt(body.api_key), body.model, key_id),
        )
        conn.commit()
    finally:
        conn.close()
    return {"ok": True}


@router.delete("/{key_id}")
async def delete_key(key_id: int) -> dict[str, bool]:
    conn = get_db()
    try:
        conn.execute("DELETE FROM api_keys WHERE id=?", (key_id,))
        conn.commit()
    finally:
        conn.close()
    return {"ok": True}
