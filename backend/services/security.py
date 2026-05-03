"""Fernet-based encryption for API keys at rest.

Stored values are *always* encrypted before insertion; on read we attempt
to decrypt and fall back to the raw value so legacy / pre-encryption rows
remain readable.
"""
from __future__ import annotations

from functools import lru_cache

from cryptography.fernet import Fernet, InvalidToken

from ..config import settings


class EncryptionError(RuntimeError):
    pass


@lru_cache(maxsize=1)
def _fernet() -> Fernet:
    if not settings.ENCRYPTION_KEY:
        raise EncryptionError(
            "ENCRYPTION_KEY is not set. Generate one with:\n"
            "  python -c \"from cryptography.fernet import Fernet; "
            "print(Fernet.generate_key().decode())\""
        )
    try:
        return Fernet(settings.ENCRYPTION_KEY.encode("utf-8"))
    except (ValueError, TypeError) as e:
        raise EncryptionError(f"ENCRYPTION_KEY is malformed: {e}") from e


def encrypt(value: str) -> str:
    if not value:
        return value
    return _fernet().encrypt(value.encode("utf-8")).decode("utf-8")


def decrypt(value: str) -> str:
    if not value:
        return value
    try:
        return _fernet().decrypt(value.encode("utf-8")).decode("utf-8")
    except (InvalidToken, ValueError):
        # Treat as legacy plaintext rather than raising — callers
        # expect a string back regardless.
        return value
