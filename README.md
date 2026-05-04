# DM_Tools

> **Unified digital-marketing dashboard.** One local web app that consolidates Generative Engine Optimization (GEO), Google AI Overview (AIO) optimisation, traditional on-page SEO, and martech-stack detection — powered by your own API keys, persisted on your own machine.

---

## ▶ Run it now (exact commands)

If you've already done the [first-time setup](#quickstart-5-minutes), every subsequent run is just these two terminals. Both run from the repo root (`cd /path/to/DM_Tools`).

### Recommended: shell-agnostic (works in fish, bash, zsh, PowerShell, cmd)

This bypasses shell activation entirely by calling the venv's binaries directly. **Use this if you're not sure which shell you're in.**

**Terminal A** — backend:

```
.venv/bin/uvicorn backend.main:app --reload --port 8000
```

> Windows: `.venv\Scripts\uvicorn.exe backend.main:app --reload --port 8000`

Wait for `Application startup complete.`

**Terminal B** — frontend:

```
npm run dev
```

Wait for `Local: http://localhost:5173/`.

**Open the browser**: <http://localhost:5173>

To stop: `Ctrl+C` in each terminal.

---

### Alternative: activate the venv first (so `python` / `pip` / `uvicorn` resolve to the venv)

Pick the line that matches your shell:

| Your shell | Activate command |
|---|---|
| **bash / zsh** (macOS, most Linux) | `source .venv/bin/activate` |
| **fish** | `source .venv/bin/activate.fish` |
| **Nushell** | `overlay use .venv/bin/activate.nu` |
| **PowerShell** (Windows) | `.venv\Scripts\Activate.ps1` |
| **cmd** (Windows) | `.venv\Scripts\activate.bat` |

Then in the activated shell:

```
uvicorn backend.main:app --reload --port 8000
```

> If `source .venv/bin/activate` errors with `case builtin not inside of switch block` or similar, **you're in fish** — use `source .venv/bin/activate.fish` instead. (You can confirm with `echo $SHELL` or `ps -p $$`.)

---

### Status dot

The dot in the top-right of the dashboard header tells you what's working:

- 🟢 **green** — backend reachable, encryption key configured. You're good.
- 🟡 **amber** — backend reachable but `ENCRYPTION_KEY` is missing in `.env`. See [Step 4](#step-4--generate-the-encryption-key).
- 🔴 **red** — backend isn't running. Check Terminal A.

---

### Single-port "production-style" start (no Vite needed)

Once you've run `npm run build` at least once, FastAPI can serve the built SPA itself:

```
.venv/bin/uvicorn backend.main:app --port 8000
```

Then open **<http://localhost:8000>**. One terminal, no hot reload.

### Docker

```
docker compose up --build
```

Then open **<http://localhost:8000>**.

---

### Common error: `ModuleNotFoundError: No module named 'tenacity'` (or any other dep)

Almost always means **uvicorn is running from your system Python instead of the venv's Python**. Two ways this happens:

1. You ran `uvicorn backend.main:app …` without first activating the venv → uvicorn was found on `$PATH` from a system install.
2. You `source`d the bash-style activate script in fish (it silently failed) and then ran `uvicorn`.

**Fix**: use `.venv/bin/uvicorn …` directly, OR use the fish-compatible activate script (table above). Run `which uvicorn` to confirm — it should print a path inside `.venv/`.

---

[![Python](https://img.shields.io/badge/python-3.11+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38B2AC?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/tests-42%20passing-success)](#testing)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## Table of contents

- [Why DM_Tools exists](#why-dm_tools-exists)
- [Features at a glance](#features-at-a-glance)
- [Quickstart (5 minutes)](#quickstart-5-minutes)
  - [Prerequisites](#prerequisites)
  - [Step 1 — Clone](#step-1--clone)
  - [Step 2 — Backend setup](#step-2--backend-setup)
  - [Step 3 — Frontend setup](#step-3--frontend-setup)
  - [Step 4 — Generate the encryption key](#step-4--generate-the-encryption-key)
  - [Step 5 — Run](#step-5--run)
  - [Step 6 — First-run walkthrough](#step-6--first-run-walkthrough)
- [Three ways to run](#three-ways-to-run)
- [Supported LLM providers](#supported-llm-providers)
- [Daily usage](#daily-usage)
- [Architecture](#architecture)
- [Profiles](#profiles)
- [Security model](#security-model)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Deployment notes](#deployment-notes)
- [Roadmap](#roadmap)
- [Migration from old repos](#migration-from-old-repos)
- [Contributing](#contributing)
- [License](#license)

---

## Why DM_Tools exists

Six separate projects were doing overlapping work:

| Original repo | Purpose | Fate in DM_Tools |
|---|---|---|
| `geo` | Server-backed GEO suite — multi-LLM visibility, content, FAQ, website analyser | **Base** — refactored from 2 monolith files into 18 modular files |
| `geo-tool` | Lightweight client-side GEO scorer | **Discarded** — superseded by Website Analyzer |
| `aio-tool` | Google AI Overview optimisation | **Ported** — 6 unique modules now under "AIO Optimizer" tab |
| `seo-tool` | Traditional on-page SEO | **Ported** — 6 unique modules now under "SEO Toolkit" tab |
| `SEO` | Passive AI bot tracking backend | **Deferred** — different paradigm, planned for v2 |
| `martech-scanner` | Standalone vendor detection | **Merged** — server-side detection in Website Analyzer + Martech Scanner tab |

The result: one dashboard with no duplicate functionality, one SQLite DB, one place for keys, one settings panel.

---

## Features at a glance

| Tab | What it does |
|---|---|
| **Dashboard** | Live metrics + last-15 events timeline |
| **Visibility Check** | Probe up to 15 LLMs in parallel; per-model brand mention, citation, sentiment, share-of-voice, competitor discovery |
| **Content Generator** | Long-form GEO-optimised content (blog / social / whitepaper / email / product page) in 14 languages |
| **FAQ Generator** | Q&A pairs with copy-paste `FAQPage` JSON-LD schema |
| **Prompts Library** | Per-profile saved prompts, funnel-stage tagged |
| **Competitors** | Tracked brands; auto-flagged in every visibility run |
| **Website Analyzer** | Server-side fetch + 15-point scorecard (Traditional SEO / Mixed / Pure GEO) + Lighthouse + martech in one shot |
| **Martech Scanner** | Standalone scan; 100+ vendor signatures across 9 categories |
| **AIO Optimizer** | 6 client-side analysers — AIO Eligibility (11 checks), E-E-A-T scorer, Flesch readability, Passage Ranker, Content Gap, Snippet Optimizer + templates |
| **SEO Toolkit** | 6 client-side analysers — On-Page Scorecard (A–F), SERP Preview + CTR estimate, Keyword density / bigrams / trigrams, Content Quality, Technical Audit, Schema.org Validator (13 schema types) |
| **History** | Unified UNION ALL timeline across every module |

---

## Quickstart (5 minutes)

### Prerequisites

| Tool | Version | Why |
|---|---|---|
| **Python** | 3.11 or newer | FastAPI backend |
| **Node.js** | 20 or newer | Vite + Tailwind v4 build |
| **git** | any recent | clone |
| **gh** *(optional)* | for repo management | not needed to run locally |

Verify:

```bash
python --version    # 3.11+
node --version      # v20+
npm --version       # 10+
```

> **Windows users**: use Git Bash, WSL, or PowerShell. The `python -m venv` and `npm` commands work in all three; just adjust the `source .venv/bin/activate` line to `.venv\Scripts\activate`.

---

### Step 1 — Clone

```bash
git clone https://github.com/mengliang10/DM_Tools.git
cd DM_Tools
```

### Step 2 — Backend setup

Create an isolated Python environment so DM_Tools' dependencies don't pollute your system Python:

```
python -m venv .venv
```

Activate it — pick the line that matches your shell:

| Shell | Activate |
|---|---|
| **bash / zsh** | `source .venv/bin/activate` |
| **fish** | `source .venv/bin/activate.fish` |
| **Nushell** | `overlay use .venv/bin/activate.nu` |
| **PowerShell** | `.venv\Scripts\Activate.ps1` |
| **cmd (Windows)** | `.venv\Scripts\activate.bat` |

> **Heads-up for fish users**: running the bash-style `source .venv/bin/activate` will fail with `case builtin not inside of switch block` and **silently leave the venv inactive**. The next `uvicorn …` call then runs from your system Python and crashes with `ModuleNotFoundError`. Always use the `.fish` script in fish.

You should see `(.venv)` (or your shell's equivalent indicator) appear in your prompt. Then install dependencies:

```
pip install -r requirements.txt
```

This installs FastAPI, uvicorn, httpx, BeautifulSoup, Pydantic, cryptography, tenacity, plus pytest / respx / ruff for testing. Takes 30–60 seconds.

> Or skip activation and use the venv's pip directly: `.venv/bin/pip install -r requirements.txt` (works in any shell).

### Step 3 — Frontend setup

```bash
npm install
```

This pulls Vite 6, Tailwind v4, vitest, marked, and DOMPurify. Takes 10–20 seconds.

### Step 4 — Generate the encryption key

DM_Tools encrypts every API key with Fernet (AES-128) before writing it to disk. The key never leaves your `.env`. Generate one:

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

You'll get something like `Tn5e7-...44-byte-string=`. Copy it.

Now create your `.env`:

```bash
cp .env.example .env
```

Open `.env` in your editor and paste the key:

```ini
ENCRYPTION_KEY=Tn5e7-...your-generated-key=
```

> **Important**: if you ever lose this key, all the API keys in `data/dm_tools.db` become unreadable. Back it up to a password manager.

### Step 5 — Run

The fastest way to develop is to run backend + frontend in two terminals:

**Terminal A** — FastAPI backend on port 8000:

```bash
source .venv/bin/activate              # if not already active
uvicorn backend.main:app --reload --port 8000
```

You should see:

```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

**Terminal B** — Vite dev server on port 5173 (proxies `/api/*` to the backend):

```bash
npm run dev
```

You should see:

```
  VITE v6.x.x  ready in 200 ms

  ➜  Local:   http://localhost:5173/
```

Open <http://localhost:5173> in your browser.

> The `--reload` flag on uvicorn auto-restarts the backend when you save a Python file. Vite's HMR auto-refreshes the browser when you save a JS/CSS file. You should never need to manually restart either while developing.

### Step 6 — First-run walkthrough

1. **Check the status dot** in the top-right header.
   - 🟢 green = backend reachable + encryption configured ✅
   - 🟡 amber = backend reachable but `ENCRYPTION_KEY` is empty (revisit step 4)
   - 🔴 red = backend unreachable (Terminal A crashed?)

2. **Toggle the theme** — click the 🌙/☀️ button in the sidebar to switch dark/light. Choice persists in `localStorage`.

3. **Open Settings** (⚙️ in the sidebar, or `⌘,` / `Ctrl+,`).

4. **Add an API key**:
   - Expand "+ Add a key"
   - Provider: pick `openai` (or any other)
   - Label: e.g. "personal" (optional)
   - API key: paste your provider key
   - Model: pick from the autocomplete (e.g. `gpt-4o-mini`)
   - Click **Save key**
   - The key is encrypted before it touches the DB; the form clears.

5. **(Optional) Create a profile** in the Settings modal:
   - Click **New…**, name it (e.g. "Acme Co"), enter brand + website
   - The profile is auto-activated; the header shows "Profile · Acme Co"
   - All prompts/competitors/runs from now on are scoped to this profile.

6. **Try Visibility Check**:
   - Click **Visibility Check** in the sidebar
   - Brand: `Acme`, Prompt: `What are the best CRM tools for SMBs?`
   - Tick the checkbox next to your saved key
   - Click **Run visibility check**
   - You'll see the per-model response with brand mentions highlighted, sentiment, and SoV score.

You're now using DM_Tools. The remaining tabs work the same way — paste content into AIO/SEO tools, enter URLs into the Website Analyzer, etc.

---

## Three ways to run

### 1. Two-terminal dev mode (recommended for development)

```bash
uvicorn backend.main:app --reload --port 8000          # terminal A
npm run dev                                             # terminal B
```

Visit <http://localhost:5173>. Both processes hot-reload on save.

### 2. Single-port production-style

Build the frontend once, then let FastAPI serve it from the same port:

```bash
npm run build                                           # → frontend/dist/
uvicorn backend.main:app --port 8000
```

Visit <http://localhost:8000>. No Vite needed; everything served by FastAPI. Good for a "production-feeling" local install you want to leave running.

### 3. Docker

```bash
docker compose up --build
```

Visit <http://localhost:8000>. The Dockerfile is multi-stage: stage 1 builds the frontend with Node, stage 2 runs uvicorn with the built `dist/` baked in. The `data/` directory is mounted as a volume so the SQLite file persists across container restarts.

---

## Supported LLM providers

Add a key for any of these in **Settings**:

| Provider | Sample models | Where to get a key |
|---|---|---|
| **OpenAI** | gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-4, gpt-3.5-turbo | <https://platform.openai.com/api-keys> |
| **Anthropic** | Claude Opus 4.7, Sonnet 4.6, Haiku 4.5 | <https://console.anthropic.com/settings/keys> |
| **Google Gemini** | gemini-2.0-flash, gemini-1.5-pro/flash | <https://aistudio.google.com/app/apikey> |
| **Mistral** | large/medium/small, Mixtral 8x22B | <https://console.mistral.ai/api-keys> |
| **Groq** | llama-3.3-70b, mixtral-8x7b, gemma2-9b | <https://console.groq.com/keys> |
| **Perplexity** | sonar small/large/huge (online) | <https://www.perplexity.ai/settings/api> |
| **Cohere** | command-r-plus, command-r | <https://dashboard.cohere.com/api-keys> |
| **Together AI** | Llama 3 70B/8B, Mixtral 8x7B | <https://api.together.xyz/settings/api-keys> |
| **xAI** | grok-3, grok-3-mini, grok-2 | <https://console.x.ai> |
| **DeepSeek** | deepseek-chat, deepseek-reasoner | <https://platform.deepseek.com/api_keys> |
| **Qwen** (Alibaba) | qwen-turbo / plus / max | <https://dashscope.console.aliyun.com/> |
| **GLM** (智谱) | glm-4, glm-4-flash, glm-3-turbo | <https://open.bigmodel.cn/usercenter/apikeys> |
| **MiniMax** | abab6.5s, abab6.5, abab5.5 | <https://www.minimaxi.com/user-center/basic-information/interface-key> |
| **Kimi** (Moonshot) | moonshot-v1-8k / 32k / 128k | <https://platform.moonshot.cn/console/api-keys> |
| **Ollama** | llama3, mistral, phi3 (local) | No key — paste the base URL (`http://localhost:11434`) into the API key field |

You can mix and match — a single visibility run can fan out across all 15 in parallel.

---

## Daily usage

### Run a visibility check

1. Visibility Check tab → enter brand + prompt
2. Tick which keys to use (multi-select)
3. Pick a language; click Run
4. Results stream back; the page shows brand mention rate, SoV, per-model response with brand highlighted, sentiment label, competitor discoveries.
5. Past runs are listed in the right column — click any to re-render its detail.

### Generate content

1. Content Generator tab → topic, brand, type, tone, audience
2. Pick a model (key)
3. Click Generate; output renders as Markdown with a "Copy Markdown" button
4. Recent generations show in the right column.

### Generate an FAQ

1. FAQ Generator tab → topic, brand, number of FAQs
2. Pick a model; click Generate
3. Output includes both human-readable Q&A and a `json` fenced block with the JSON-LD schema
4. Two copy buttons: "Copy Markdown" and "Copy JSON-LD" — paste the latter into a `<script type="application/ld+json">` tag on your page.

### Analyse a website

1. Website Analyzer tab → enter URL + optional brand to look for
2. The backend fetches the page, runs the 15-point GEO/SEO scorecard, detects martech tags, and (if reachable) calls Google PageSpeed Insights for Lighthouse scores
3. Results show category-by-category scores, recommendations, and detected vendors as badges.

### AIO / SEO tools

Paste your content into the textarea at the top of either tab; pick the analyser you want from the tabs; click Analyze. Everything runs in your browser — no API call to the backend, no LLM cost.

---

## Architecture

```
DM_Tools/
├── backend/                FastAPI app
│   ├── main.py             Mounts routers + serves built frontend
│   ├── config.py           Pydantic settings (.env)
│   ├── database.py         SQLite schema + WAL mode + helpers
│   ├── api/
│   │   ├── llm_clients.py  Async client for 15 providers, retries, shared httpx pool
│   │   ├── helpers.py      Brand/sentiment/competitor heuristics, language suffix
│   │   ├── schemas.py      Pydantic request bodies
│   │   └── routes/
│   │       ├── meta.py        /api/health, /api/providers, /api/settings
│   │       ├── keys.py        /api/keys     (encrypted CRUD)
│   │       ├── profiles.py    /api/profiles, /api/prompts, /api/competitors
│   │       ├── geo.py         /api/visibility/*, /api/content/*, /api/faq/*
│   │       ├── analyzers.py   /api/website/*, /api/martech/*
│   │       └── history.py     /api/history
│   ├── services/
│   │   ├── security.py        Fernet encryption (cached, plaintext fallback)
│   │   ├── martech.py         100+ vendor detector (precompiled regex)
│   │   ├── martech_patterns.py 746-line vendor library
│   │   └── pagespeed.py       Optional Google PageSpeed wrapper
│   └── tests/                 21 pytest tests (helpers, security, martech, all routes)
├── frontend/               Vite + Tailwind v4 + vanilla JS
│   ├── index.html
│   └── src/
│       ├── main.js            Hash router + theme + chrome
│       ├── style.css          Tailwind + CSS-var dark/light theme
│       ├── components/        toast, modal, settings
│       ├── utils/             api, theme, storage, format (markdown render + sanitise)
│       └── modules/
│           ├── geo/           visibility, content, faq, prompts, competitors
│           ├── analyzers/     website, martech (server-backed)
│           ├── aio/           container that uses 6 shared/ analysers
│           ├── seo/           container that uses 6 shared/ analysers
│           └── shared/        12 pure-function analysers (no DOM, no I/O — testable)
├── tests/                  Vitest tests (21 tests across 3 files)
├── docs/                   ARCHITECTURE.md, API.md, FEATURES.md, MIGRATION.md
├── .github/workflows/ci.yml   pytest + vitest + build on push
├── docker-compose.yml
├── Dockerfile              multi-stage: Node build + Python runtime
├── pyproject.toml          ruff, pytest, coverage config
├── package.json
├── requirements.txt
├── .env.example
├── .gitignore
└── README.md
```

For deeper design rationale, see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). For the full route reference see [`docs/API.md`](docs/API.md).

---

## Profiles

Profiles let you isolate brand contexts inside one DM_Tools install:

- A profile owns its own **prompts**, **competitors**, **visibility runs**, **content / FAQ / website / martech history**
- Switching profiles via Settings filters every list by `profile_id`
- The active profile is stored in the `settings` table — survives restarts
- With **no active profile**, you see/edit the global (NULL) defaults — useful for one-off experiments

A typical workflow: one profile per client / brand you manage.

---

## Security model

- API keys are written to disk **encrypted** (Fernet symmetric encryption — AES-128-CBC with HMAC)
- The plaintext key is read into memory once at server startup (from `ENCRYPTION_KEY` in `.env`) and never persisted again
- The frontend cannot read API keys back; the `/api/keys` endpoint returns metadata only (provider, label, model, created_at)
- The backend listens on `127.0.0.1` by default — not exposed to your LAN unless you change `HOST` in `.env`
- No third party gets your data: every LLM call goes directly from your machine to the provider
- The `.gitignore` blocks `.env`, `data/*.db`, `node_modules/`, `.venv/`, `frontend/dist/` from ever being committed

> If you commit `.env`, every API key you've added is exposed in your git history. Don't override the gitignore.

---

## Testing

```bash
# Backend
pytest                                   # 21 tests
pytest --cov=backend --cov-report=term-missing   # with coverage
pytest -ra -k test_routes                # filter by name

# Frontend
npm test                                 # vitest watch mode
npm test -- --run                        # one-shot, CI-style
```

Both suites also run automatically in GitHub Actions on every push (see `.github/workflows/ci.yml`).

What's covered:

- **Backend**: encryption roundtrip, brand/sentiment/competitor helpers, martech pattern matching against fixture HTML, every router happy-path, mocked-LLM end-to-end visibility run via `respx`.
- **Frontend**: every shared analyser (AIO + SEO) with realistic input, format helpers (`escapeHtml`, `pct`, `gradeFromScore`, `renderMarkdown` sanitiser).

---

## Troubleshooting

### "Status dot is amber — encryption_configured: false"

Your `.env` doesn't have `ENCRYPTION_KEY` set, or the key is malformed. Re-do step 4 of the Quickstart and restart the backend.

### "Status dot is red"

The backend isn't reachable on `:8000`. Check Terminal A — uvicorn may have crashed. Common causes:
- Port 8000 is already in use → `uvicorn ... --port 8001` and update `vite.config.js` proxy target
- Python version too old → check `python --version`, must be 3.11+

### "ModuleNotFoundError: No module named 'backend'"

You're running `uvicorn` from the wrong directory. `cd` to the repo root first.

### "ModuleNotFoundError: No module named 'tenacity'" (or 'fastapi', 'httpx', anything from requirements.txt)

uvicorn is running from your **system** Python instead of the **venv's** Python — i.e. the venv was never activated, but `uvicorn` was still found on `$PATH` from a system-wide install.

This is **the most common cause of confusing crashes on first run**, especially for fish users (the bash-style `source .venv/bin/activate` fails silently in fish).

Confirm the diagnosis:

```bash
which uvicorn          # if it prints /usr/bin/uvicorn or /usr/local/bin/uvicorn → system, BAD
                       # if it prints /path/to/DM_Tools/.venv/bin/uvicorn → venv, GOOD
```

Two fixes — pick one:

```bash
# (A) Bypass shell activation entirely (works in any shell)
.venv/bin/uvicorn backend.main:app --reload --port 8000

# (B) Activate properly for your shell, then re-run
source .venv/bin/activate.fish     # fish
source .venv/bin/activate          # bash / zsh
.venv\Scripts\Activate.ps1         # PowerShell
uvicorn backend.main:app --reload --port 8000
```

### "npm: command not found"

Install Node.js 20+ from <https://nodejs.org/>.

### Vite says "EADDRINUSE: 5173"

Another process is on 5173. Kill it (`lsof -i :5173` then `kill <pid>`) or change `vite.config.js`'s `server.port`.

### "API key 7 not found" when running visibility

You deleted that key but the dropdown still references it. Refresh the Settings modal.

### Lighthouse always returns null

Google PageSpeed Insights is rate-limited without a key. Get a free key at <https://developers.google.com/speed/docs/insights/v5/get-started> and put it in `.env` as `PAGESPEED_API_KEY=...`.

### LLM calls timing out

Default timeout is 120 seconds. For slow models or unreliable networks, raise it in `.env`:

```ini
LLM_TIMEOUT=240.0
LLM_RETRY_ATTEMPTS=5
```

### "Failed to fetch URL: HTTPSConnectionPool…" in Website Analyzer

The target URL may block automated fetches (CDN bot protection). Try a different page on the same site, or set a custom User-Agent if you control the destination.

### Tests fail with "happy-dom" errors

`npm install` didn't pull happy-dom correctly. Delete `node_modules/` and `package-lock.json`, then `npm install` again.

---

## Deployment notes

DM_Tools is built for **localhost first**. To put it on the open internet you need to do additional work:

1. **Add auth** — there is currently no login. Anyone hitting your URL gets full access. Either put it behind a private VPN/Tailscale, or implement the planned JWT auth (see Roadmap).
2. **Set `HOST=0.0.0.0`** in `.env` if you want the backend reachable from outside `localhost`.
3. **Use a real WSGI/ASGI server** behind a reverse proxy (nginx, Caddy, Cloudflare Tunnel).
4. **Use a stronger encryption story** — Fernet with a key in `.env` is fine for one machine, less great when the file lives on a shared host.
5. **Persist `data/`** — the SQLite file holds everything. The Docker compose mounts it as a volume; do the same for any other deployment.

---

## Roadmap

- [ ] **Optional JWT auth** — single-user login so the dashboard can be hosted publicly
- [ ] **AEO bot tracking** — passive AI-crawler analytics via JS snippet (port from old `SEO` repo)
- [ ] **GitHub Pages mode** — static-only build that runs the AIO/SEO analysers without a Python backend
- [ ] **PostgreSQL adapter** — for multi-user deployments
- [ ] **Streamlit executive report** — companion app that renders trends/charts from the same DB
- [ ] **Browser extension** — one-click analysis of the current tab
- [ ] **Raindrop sync** — push competitors to Raindrop bookmarks (the integration code exists in the old `geo` repo)

---

## Migration from old repos

The original repos (`geo`, `geo-tool`, `aio-tool`, `seo-tool`, `SEO`, `martech-scanner`) have been superseded by DM_Tools and deleted. If you have a local copy of `geo/data/geo.db` and want to bring forward your prompts / competitors / profiles, see [`docs/MIGRATION.md`](docs/MIGRATION.md) for the SQL.

> The `aio-tool`, `seo-tool`, `geo-tool` repos stored everything in browser `localStorage` only — nothing on disk to migrate.

---

## Contributing

This is currently a single-author project (built for one user, on localhost). If you want to extend it:

1. Fork, create a feature branch
2. Follow the existing module conventions (small files, pure functions in `shared/`, container components for UI)
3. Add tests — backend in `backend/tests/`, frontend in `tests/`
4. Run both test suites locally; both should be green
5. Open a PR

The codebase is intentionally small and dependency-light. Please don't introduce React, Redux, ORM frameworks, or build tools beyond the ones already here without a strong rationale.

---

## License

MIT © Meng Liang Tan
