"""Tests that catch the specific user-surfaced bugs from the v0.1 audit."""
from __future__ import annotations

import httpx
import pytest

from backend.api.llm_clients import _wrap_error

# -- LLM error classifier ----------------------------------------------------


def _make_status_error(code: int, body: str = "boom") -> httpx.HTTPStatusError:
    request = httpx.Request("POST", "https://api.example.com/x")
    response = httpx.Response(code, text=body, request=request)
    return httpx.HTTPStatusError(f"HTTP {code}", request=request, response=response)


@pytest.mark.parametrize(
    "code,marker",
    [
        (401, "API key rejected"),
        (403, "forbidden"),
        (404, "model not found"),
        (429, "rate-limited"),
        (502, "provider error"),
    ],
)
def test_wrap_error_classifies_known_http_codes(code, marker):
    err = _wrap_error("openai", _make_status_error(code))
    assert marker in str(err), f"got: {err}"


def test_wrap_error_handles_timeout():
    err = _wrap_error("openai", httpx.ReadTimeout("slow"))
    assert "timed out" in str(err).lower()


def test_wrap_error_handles_connect_error():
    err = _wrap_error("openai", httpx.ConnectError("dns fail"))
    assert "connect" in str(err).lower()


def test_wrap_error_falls_back_for_unknown():
    err = _wrap_error("openai", RuntimeError("weird thing"))
    assert "openai" in str(err)
    assert "weird thing" in str(err)


# -- Encryption error → 400 with `fix` field ---------------------------------


def test_encryption_error_returns_400_with_fix(client, monkeypatch):
    """If ENCRYPTION_KEY is missing at runtime, POST /api/keys must respond
    with a 400 carrying both `detail` and `fix` (not an opaque 500)."""
    from backend.services import security

    # Force the cached fernet to raise as if ENCRYPTION_KEY were unset.
    security._fernet.cache_clear()

    def _broken():
        raise security.EncryptionError("ENCRYPTION_KEY is not set.")

    monkeypatch.setattr(security, "_fernet", _broken)

    r = client.post("/api/keys", json={
        "provider": "openai", "label": "x", "api_key": "k", "model": "gpt-4o-mini",
    })
    assert r.status_code == 400, r.text
    body = r.json()
    assert "ENCRYPTION_KEY" in body["detail"]
    assert "fix" in body and "ENCRYPTION_KEY" in body["fix"]
