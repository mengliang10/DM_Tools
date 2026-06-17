"""SQLite schema + tiny helpers. WAL mode, foreign keys on, idempotent init."""
from __future__ import annotations

import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager

from .config import settings

# ---------------------------------------------------------------------------
# Connection helpers
# ---------------------------------------------------------------------------


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(str(settings.DB_PATH), timeout=30.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def get_db() -> sqlite3.Connection:
    """One-shot connection; caller is responsible for closing it."""
    return _connect()


@contextmanager
def db_session() -> Iterator[sqlite3.Connection]:
    """Context-managed connection: commits on success, rolls back on error."""
    conn = _connect()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def row_to_dict(row: sqlite3.Row | None) -> dict | None:
    return dict(row) if row else None


def rows_to_list(rows) -> list[dict]:
    return [dict(r) for r in rows]


# ---------------------------------------------------------------------------
# Schema
# ---------------------------------------------------------------------------

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS api_keys (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    provider    TEXT NOT NULL,
    label       TEXT,
    api_key     TEXT NOT NULL,         -- Fernet-encrypted at rest
    model       TEXT,
    created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT
);

CREATE TABLE IF NOT EXISTS profiles (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT NOT NULL,
    brand        TEXT DEFAULT '',
    website      TEXT DEFAULT '',
    industry     TEXT DEFAULT '',
    language     TEXT DEFAULT 'en',
    notes        TEXT DEFAULT '',
    key_ids      TEXT DEFAULT '[]',
    custom_json  TEXT DEFAULT '{}',
    created_at   TEXT DEFAULT (datetime('now')),
    updated_at   TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS prompts (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id   INTEGER,
    text         TEXT NOT NULL,
    description  TEXT,
    funnel_stage TEXT DEFAULT 'top_of_funnel',
    created_at   TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS competitors (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id      INTEGER,
    brand_name      TEXT NOT NULL,
    domain          TEXT,
    competitor_type TEXT DEFAULT 'direct',
    created_at      TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS visibility_runs (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id   INTEGER,
    prompt_text  TEXT NOT NULL,
    brand        TEXT NOT NULL,
    language     TEXT DEFAULT 'en',
    funnel_stage TEXT DEFAULT 'top_of_funnel',
    run_at       TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS visibility_results (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id            INTEGER REFERENCES visibility_runs(id) ON DELETE CASCADE,
    provider          TEXT NOT NULL,
    model             TEXT NOT NULL,
    response          TEXT,
    brand_mentioned   INTEGER DEFAULT 0,
    citation_detected INTEGER DEFAULT 0,
    sentiment_label   TEXT DEFAULT 'neutral',
    sov_score         REAL DEFAULT 0,
    competitors_json  TEXT DEFAULT '[]',
    error             TEXT,
    created_at        TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS content_generations (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id   INTEGER,
    topic        TEXT NOT NULL,
    brand        TEXT,
    content_type TEXT,
    tone         TEXT,
    audience     TEXT,
    provider     TEXT,
    model        TEXT,
    content      TEXT,
    language     TEXT DEFAULT 'en',
    created_at   TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS faq_generations (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id  INTEGER,
    topic       TEXT NOT NULL,
    brand       TEXT,
    language    TEXT DEFAULT 'en',
    provider    TEXT,
    model       TEXT,
    content     TEXT,
    created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS website_analyses (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id    INTEGER,
    url           TEXT NOT NULL,
    brand         TEXT,
    score         INTEGER,
    max_score     INTEGER,
    findings_json TEXT DEFAULT '{}',
    created_at    TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS martech_scans (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id  INTEGER,
    url         TEXT NOT NULL,
    detected_json TEXT DEFAULT '[]',
    created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS geo_analyses (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id   INTEGER,
    brand        TEXT,
    industry     TEXT,
    persona      TEXT DEFAULT 'expert',
    market       TEXT DEFAULT 'global',
    provider     TEXT,
    model        TEXT,
    content      TEXT,
    debate_json  TEXT DEFAULT '{}',
    is_debate    INTEGER DEFAULT 0,
    created_at   TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS domains (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id  INTEGER,
    name        TEXT NOT NULL,
    domain      TEXT NOT NULL,
    industry    TEXT,
    description TEXT,
    created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS site_profiles (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id  INTEGER,
    domain_id   INTEGER REFERENCES domains(id) ON DELETE CASCADE,
    page_url    TEXT NOT NULL,
    page_type   TEXT DEFAULT 'homepage',
    notes       TEXT,
    created_at  TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_visibility_runs_profile  ON visibility_runs(profile_id, run_at DESC);
CREATE INDEX IF NOT EXISTS idx_visibility_results_run   ON visibility_results(run_id);
CREATE INDEX IF NOT EXISTS idx_content_profile          ON content_generations(profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_faq_profile              ON faq_generations(profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_website_profile          ON website_analyses(profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_martech_profile          ON martech_scans(profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_geo_analyses_profile     ON geo_analyses(profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_domains_profile          ON domains(profile_id);
CREATE INDEX IF NOT EXISTS idx_site_profiles_domain     ON site_profiles(domain_id);
"""

DEFAULT_PROMPTS = [
    ("What are the best tools for [topic]?",         "Generic discovery prompt",  "top_of_funnel"),
    ("Who are the leading companies in [industry]?", "Industry leaders prompt",   "top_of_funnel"),
    ("What is the best software for [use case]?",    "Software recommendation",   "top_of_funnel"),
    ("Can you recommend a solution for [problem]?",  "Problem-solution prompt",   "middle_of_funnel"),
    ("Compare the top [product category] options",   "Comparison prompt",         "middle_of_funnel"),
    ("How does [brand] compare to its competitors?", "Competitor comparison",     "middle_of_funnel"),
    ("What is [brand] known for?",                   "Brand awareness prompt",    "bottom_of_funnel"),
    ("Where can I buy / sign up for [brand]?",       "Purchase-intent prompt",    "bottom_of_funnel"),
]


def init_db() -> None:
    """Create tables (idempotent) and seed default prompts."""
    with db_session() as conn:
        conn.executescript(SCHEMA_SQL)
        seeded = conn.execute(
            "SELECT 1 FROM prompts WHERE profile_id IS NULL LIMIT 1"
        ).fetchone()
        if not seeded:
            conn.executemany(
                "INSERT INTO prompts (profile_id, text, description, funnel_stage)"
                " VALUES (NULL, ?, ?, ?)",
                DEFAULT_PROMPTS,
            )
