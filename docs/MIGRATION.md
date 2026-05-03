# Migration from the old repos

The original `geo`, `geo-tool`, `aio-tool`, `seo-tool`, `SEO`, and `martech-scanner` repos have been superseded by DM_Tools and deleted. If you still have local copies and want to bring data forward, here's how.

## From `geo` (only repo with persisted data)

The old repo had a SQLite DB at `geo/data/geo.db` with 14 tables. DM_Tools' schema is a refactored superset — same column names with these adjustments:

| Old | New |
|---|---|
| `prompts.profile_id NULL` rows | Auto-seeded if missing |
| `visibility_results.competitors_json` | Same column, same JSON shape |
| `website_analyses.findings_json` | Now stores the full `{score, max_score, categories, recommendations, stats, martech, lighthouse}` blob |
| `domains` / `site_profiles` | Removed for v1 — not in active use |

To migrate:

```bash
# 1. Make sure DM_Tools has run at least once (creates data/dm_tools.db with the schema)
uvicorn backend.main:app --port 8000 &

# 2. Copy the rows you want
sqlite3 data/dm_tools.db <<EOF
ATTACH DATABASE '/path/to/old/geo/data/geo.db' AS old;

INSERT INTO main.prompts          (profile_id, text, description, funnel_stage, created_at)
  SELECT profile_id, text, description, funnel_stage, created_at FROM old.prompts;

INSERT INTO main.competitors      (profile_id, brand_name, domain, competitor_type, created_at)
  SELECT profile_id, brand_name, domain, competitor_type, created_at FROM old.competitors;

INSERT INTO main.profiles         (id, name, brand, website, industry, language, notes, key_ids, custom_json, created_at, updated_at)
  SELECT id, name, brand, website, industry, language, notes, key_ids, custom_json, created_at, updated_at FROM old.profiles;

DETACH DATABASE old;
EOF
```

> **API keys are NOT portable.** The old DB stored them encrypted with a different `ENCRYPTION_KEY`. Re-add them via Settings.

## From `aio-tool`, `seo-tool`, `geo-tool`

Those tools stored everything in browser `localStorage` only. There is nothing on disk to migrate — just open DM_Tools and start using the AIO Optimizer / SEO Toolkit tabs. The analyzer logic is byte-identical.

## From `SEO` (AEO bot tracker backend)

This module isn't ported in v1 (see `docs/FEATURES.md` "Deferred"). If you were running it in production, keep your local copy alive until DM_Tools v2 ships AEO support.

## From `martech-scanner`

It was stateless — no migration needed. Use the new **Analyse · Martech Scanner** tab.
