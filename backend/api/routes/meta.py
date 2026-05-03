"""Meta endpoints: provider catalogue, settings, encryption status."""
from __future__ import annotations

from fastapi import APIRouter

from ...config import settings
from ...database import get_db
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
