# Architecture

DM_Tools is a **monolithic FastAPI backend + static SPA frontend**. Everything runs on one machine, persists to one SQLite file, and talks to LLM providers directly over HTTPS.

## Two processes in dev, one in production

```
DEV
  Vite (5173) ──proxy /api──▶ FastAPI (8000) ──HTTPS──▶ LLM providers
                              │
                              └─▶ data/dm_tools.db (SQLite, WAL)

PROD (or after `npm run build`)
  FastAPI (8000) ──static /assets──▶ frontend/dist
                  ──HTTPS──▶ LLM providers
                  └─▶ data/dm_tools.db
```

The Vite dev proxy is configured in `vite.config.js`; in production FastAPI serves the bundle directly via `StaticFiles`.

## Backend layout

| File | Responsibility |
|---|---|
| `main.py` | Builds the `FastAPI` app, mounts routers, serves the SPA |
| `config.py` | Single `Settings` class (`pydantic-settings`); reads `.env` |
| `database.py` | One SQLite file, WAL mode, foreign keys on, idempotent `init_db()` |
| `api/llm_clients.py` | Unified async client for 15 providers, retries via `tenacity`, shared `httpx.AsyncClient` closed on shutdown |
| `api/helpers.py` | Pure functions: brand match, sentiment, competitor discovery, language suffix, profile lookup |
| `api/schemas.py` | All Pydantic request bodies in one place |
| `api/routes/meta.py` | `/api/providers`, `/api/health`, `/api/settings` |
| `api/routes/keys.py` | CRUD for `api_keys` (writes go through `services.security.encrypt`) |
| `api/routes/profiles.py` | Profiles, prompts, competitors |
| `api/routes/geo.py` | Visibility runs, content gen, FAQ gen |
| `api/routes/analyzers.py` | Website 15-point scorer, martech scan |
| `api/routes/history.py` | Unified UNION ALL across all generator/analyzer tables |
| `services/security.py` | Fernet encrypt/decrypt with caching + legacy-plaintext fallback |
| `services/martech.py` | Loads `martech_patterns.py`, precompiles regexes once |
| `services/martech_patterns.py` | 746-line library of vendor signatures (Wappalyzer-derived) |
| `services/pagespeed.py` | Optional Google PageSpeed Insights wrapper |

### Why monolithic instead of microservices

- One user, one machine, one DB → no inter-service plumbing needed
- Refactoring across module boundaries is trivial when it all ships in one process
- Migrating to multi-service is straightforward later because the routes are already grouped by domain

## Frontend layout

The frontend is **vanilla ES modules + Tailwind v4 + a tiny hash router**. No framework, no build-time route generation, no virtual DOM.

| File | Responsibility |
|---|---|
| `main.js` | Hash router (`#dashboard`, `#visibility`, …), sidebar build, theme + health wiring |
| `utils/api.js` | Tiny `fetch` wrapper; throws on non-2xx with the server's `detail` |
| `utils/theme.js` | `data-theme` toggle, persisted in `localStorage`, respects `prefers-color-scheme` first time |
| `utils/format.js` | `escapeHtml`, `renderMarkdown` (marked + DOMPurify), `gradeFromScore`, `pct` |
| `utils/storage.js` | Small `prefs` API for non-secret UI state |
| `components/toast.js` | Top-right toast notifier |
| `components/modal.js` | Click-outside-to-close, Escape-to-close modal helper |
| `components/settings.js` | The settings modal (active profile + key CRUD) |
| `modules/dashboard.js` | At-a-glance metrics + last 15 events |
| `modules/geo/*` | Visibility, Content, FAQ, Prompts, Competitors |
| `modules/analyzers/*` | Website + Martech (server-backed) |
| `modules/aio/index.js` | AIO container — pulls 6 pure-function analyzers from `shared/` |
| `modules/seo/index.js` | SEO container — pulls 6 pure-function analyzers from `shared/` |
| `modules/shared/*.js` | Pure analyzer functions, no DOM, no fetch — easy to test |
| `modules/history.js` | Unified history table |

### Why pure-function shared modules

Every AIO/SEO analyzer takes plain text/data in and returns a plain object. That means:

- **Vitest tests are trivial** — no DOM, no mocks, no I/O
- **The same module can be reused in a future browser-only build** (planned for GitHub Pages) without rewrites
- **No coupling between analysis logic and UI rendering** — the container modules in `aio/index.js` and `seo/index.js` own the rendering and are independently swappable

## Theme

Both themes are CSS variables on `:root` and `[data-theme="light"]`. Tailwind v4's `@theme` directive aliases them to utility classes (`bg-bg`, `text-fg`, etc.). The theme switcher just flips `<html data-theme>`.

## Data model

10 SQLite tables, all keyed by `profile_id` (NULL = global):

```
api_keys        ← Fernet-encrypted, never returned to the client
settings        ← KV (active_profile_id, etc.)
profiles        ← Brand/website/industry/key_ids
prompts         ← Per-profile + 8 default seeds
competitors     ← Per-profile
visibility_runs / visibility_results
content_generations
faq_generations
website_analyses
martech_scans
```

Indexes are on `(profile_id, created_at DESC)` for every history table — list views are bound by these.

## Concurrency

- `query_llm` is awaitable; `visibility/run` uses `asyncio.gather` to fan-out across N keys
- `httpx.AsyncClient` is shared across the app and closed in the FastAPI lifespan handler
- SQLite uses WAL mode so reads don't block writes; one connection per request, closed in a `try/finally`

## Testing

- `backend/tests/conftest.py` builds a throw-away SQLite + Fernet key per session
- `respx` mocks outbound LLM HTTP calls so the visibility route can be tested end-to-end
- Frontend tests are pure-function, run via `vitest run`

## Things deliberately left out (for now)

- Multi-user auth (single-user is the v1 brief)
- A separate API gateway / reverse proxy
- Background workers / Celery / Redis
- Server-sent events / websockets — every endpoint is request-response
