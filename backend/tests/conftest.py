"""Test fixtures: isolated SQLite DB + Fernet key per test session."""
from __future__ import annotations

import os

import pytest
from cryptography.fernet import Fernet


@pytest.fixture(scope="session", autouse=True)
def _isolate_env(tmp_path_factory):
    """Point DM_Tools at a throw-away DB and a freshly generated Fernet key.

    Must run BEFORE any backend module is imported, so we set env vars and
    monkey-patch `settings.DB_PATH` afterwards.
    """
    tmp = tmp_path_factory.mktemp("dm_tools_test")
    os.environ["ENCRYPTION_KEY"] = Fernet.generate_key().decode()

    from backend import config as cfg
    cfg.settings.DB_PATH = tmp / "test.db"
    cfg.settings.DATA_DIR = tmp
    cfg.settings.ENCRYPTION_KEY = os.environ["ENCRYPTION_KEY"]

    # Clear cached fernet from earlier modules (if any).
    from backend.services import security
    security._fernet.cache_clear()

    from backend.database import init_db
    init_db()
    yield
    # tmp dir cleaned up automatically


@pytest.fixture
def client():
    from fastapi.testclient import TestClient

    from backend.main import app
    with TestClient(app) as c:
        yield c
