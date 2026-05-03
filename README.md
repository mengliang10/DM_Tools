# DM_Tools

> Unified digital-marketing dashboard. One local web app that consolidates Generative Engine Optimization (GEO), Google AI Overview (AIO) optimisation, traditional SEO, and martech-stack detection — all powered by your own API keys, all stored on your machine.

[![Python](https://img.shields.io/badge/python-3.11+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38B2AC?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## Why DM_Tools exists

Six separate tools were doing overlapping work:

| Original repo | What it did |
|---|---|
| `geo` | Server-backed GEO suite — multi-LLM visibility checks, content/FAQ generation, website analyser, martech detection |
| `geo-tool` | Client-side mini-version of above (8-point scorer, schema generator) |
| `aio-tool` | Google AI Overview optimisation — E-E-A-T, readability, passage ranker, snippets |
| `seo-tool` | Traditional on-page SEO — SERP preview, keywords, technical, schema validator |
| `SEO` | Separate AEO bot-tracking backend |
| `martech-scanner` | Standalone vendor-detection tool |

DM_Tools merges all the unique features into a single dashboard, deletes the duplicates, and gives you one place to do everything.

---

## What's inside

- **Dashboard** — at-a-glance metrics + recent activity timeline
- **GEO**
  - **Visibility Check** — query 15 LLM providers in parallel, see who mentions your brand, with sentiment + share-of-voice
  - **Content Generator** — long-form GEO-optimised content from any model
  - **FAQ Generator** — Q&A pairs with copy-pasteable JSON-LD `FAQPage` schema
  - **Prompts Library** — saved prompts per profile, funnel-stage tagged
  - **Competitors** — track brands; auto-flagged in every visibility run
- **Analyse**
  - **Website Analyzer** — server-side fetch + 15-point GEO/SEO scorecard (Traditional / Mixed / Pure GEO categories), Lighthouse PageSpeed integration, martech detection
  - **Martech Scanner** — server-side detection of 100+ marketing tags
  - **AIO Optimizer** — E-E-A-T scorer, AIO Eligibility (11 checks), Flesch readability, Passage Ranker, Content Gap Analyser, Snippet Optimizer + templates
  - **SEO Toolkit** — On-Page Scorecard, SERP Preview with CTR estimate, Keyword density / bigrams / trigrams, Technical Audit, Content Quality, Schema.org Validator (13 schema types)
- **Logs**
  - **History** — unified timeline across every module

---

## Quickstart

### Prerequisites
- Python 3.11+
- Node.js 20+

### 1 — Clone and install

```bash
git clone https://github.com/mengliang10/DM_Tools.git
cd DM_Tools

# Backend
python -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Frontend
npm install
```

### 2 — Generate an encryption key

API keys are stored Fernet-encrypted in your local SQLite DB. Generate the key once:

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Copy `.env.example` to `.env` and paste the value into `ENCRYPTION_KEY`.

```bash
cp .env.example .env
$EDITOR .env
```

### 3 — Run

Two-terminal workflow (recommended for development):

```bash
# Terminal A — FastAPI backend on :8000
uvicorn backend.main:app --reload --port 8000

# Terminal B — Vite dev server on :5173 (proxies /api → :8000)
npm run dev
```

Open <http://localhost:5173>.

**Single-port production-style run:**

```bash
npm run build              # builds to frontend/dist
uvicorn backend.main:app --port 8000
# Open http://localhost:8000
```

**Docker:**

```bash
docker compose up --build
# Open http://localhost:8000
```

### 4 — Add your first API key

Click **⚙️ Settings** in the sidebar (or press `⌘,` / `Ctrl+,`), pick a provider (OpenAI, Anthropic, Gemini, etc.), paste your key, choose a model, save. Keys are encrypted at rest before they touch the DB.

> The dot in the top-right header turns **green** when the API is reachable and `ENCRYPTION_KEY` is set. **Amber** = backend up but encryption not configured. **Red** = backend unreachable.

---

## Supported providers

Add an API key for any of these in **Settings**:

| Provider | Notes |
|---|---|
| OpenAI | GPT-4o, GPT-4o-mini, GPT-4-turbo, GPT-4, GPT-3.5-turbo |
| Anthropic | Claude Opus 4.7, Sonnet 4.6, Haiku 4.5, plus 3.5 Sonnet/Haiku |
| Google Gemini | Gemini 2.0 Flash, 1.5 Pro / Flash, 2.0 Flash Thinking |
| Mistral | Large / Medium / Small / Mixtral 8x22B |
| Groq | Llama 3.3 70B, Llama 3.1 8B, Mixtral, Gemma 2 |
| Perplexity | Sonar Small / Large / Huge (online) |
| Cohere | Command R+, Command R, Command Light |
| Together AI | Llama 3 70B/8B chat, Mixtral 8x7B |
| xAI | Grok-3, Grok-3 Mini, Grok-2 |
| DeepSeek | deepseek-chat, deepseek-reasoner |
| Qwen | qwen-turbo / plus / max / long |
| GLM (智谱) | glm-4, glm-4-flash, glm-3-turbo |
| MiniMax | abab6.5s / 6.5 / 5.5 |
| Kimi (Moonshot) | moonshot-v1-8k / 32k / 128k |
| Ollama | Local — paste base URL (e.g. `http://localhost:11434`) in the API-key field |

---

## Architecture

```
DM_Tools/
├── backend/                FastAPI app
│   ├── main.py             Mounts routers + serves built frontend
│   ├── config.py           Pydantic settings (.env)
│   ├── database.py         SQLite schema + WAL + helpers
│   ├── api/
│   │   ├── llm_clients.py  Unified async client for 15 providers
│   │   ├── helpers.py      Brand / sentiment / language helpers
│   │   ├── schemas.py      Pydantic request models
│   │   └── routes/         meta, keys, profiles, geo, analyzers, history
│   ├── services/
│   │   ├── security.py     Fernet encryption
│   │   ├── martech.py      100+ vendor detector (precompiled regex)
│   │   ├── martech_patterns.py
│   │   └── pagespeed.py    Optional Lighthouse via PageSpeed Insights
│   └── tests/              pytest suites
├── frontend/               Vite + Tailwind v4 + vanilla JS
│   ├── index.html
│   └── src/
│       ├── main.js         Hash-based router + theme + chrome
│       ├── style.css       Tailwind + CSS-var dark/light theme
│       ├── components/     toast, modal, settings
│       ├── utils/          api, theme, storage, format
│       └── modules/
│           ├── geo/        visibility, content, faq, prompts, competitors
│           ├── analyzers/  website, martech
│           ├── aio/        E-E-A-T, readability, eligibility, passages, gaps, snippets
│           ├── seo/        on-page, SERP, keywords, technical, quality, schema
│           └── shared/     12 pure-function analyzers (used by aio + seo + tests)
├── tests/                  vitest config + frontend tests
├── docs/                   ARCHITECTURE.md, API.md, FEATURES.md
├── docker-compose.yml
├── Dockerfile
├── pyproject.toml
├── package.json
└── requirements.txt
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the design rationale and [`docs/API.md`](docs/API.md) for the full route reference.

---

## Profiles

Profiles let you isolate brand contexts:

- A **profile** owns its own prompts, competitors, and history rows
- Switching profiles via Settings filters every list by `profile_id`
- The **active profile** is stored in the `settings` table — survives restarts
- With no active profile, you see/edit the global (NULL) defaults

---

## Security model

- API keys are written to disk **encrypted** (Fernet symmetric, AES-128 under the hood)
- The `ENCRYPTION_KEY` is read from `.env` at boot and held only in memory
- The plaintext key never leaves the server process — the frontend cannot read it back
- The backend listens on `127.0.0.1` by default — not exposed to your LAN
- No third party gets your data: every LLM call goes directly from your machine to the provider

> If you commit `.env` to git, all your API keys are toast. The `.gitignore` blocks it; **don't override it**.

---

## Testing

```bash
pytest                   # backend
npm test                 # frontend (vitest)
```

CI-style run:

```bash
pytest --cov=backend --cov-report=term-missing
npm test -- --run
```

---

## Roadmap

- [ ] Optional auth layer (single-user JWT) so you can host on the open internet
- [ ] AEO bot-tracking module (passive crawler analytics — port from old `SEO` repo)
- [ ] GitHub Pages static build (analyzers-only mode, no Python required)
- [ ] PostgreSQL adapter for multi-user deployments
- [ ] Streamlit executive-report companion
- [ ] Browser extension for one-click analysis of the current tab

---

## Migration from the old repos

If you were using any of the original tools, see [`docs/MIGRATION.md`](docs/MIGRATION.md) for how to transplant your existing data into DM_Tools' SQLite schema.

---

## License

MIT © Meng Liang Tan
