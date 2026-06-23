# DM_Tools

> **Unified digital-marketing dashboard.** One local web app that consolidates Generative Engine Optimization (GEO), Google AI Overview (AIO) optimisation, traditional on-page SEO, and martech-stack detection — persisted on your own machine.

---

## 1. Initial Setup (After Downloading)

Follow these steps to configure and initialize the application on your local machine.

### Prerequisites
* **Python**: Version `3.10` or higher.
* **Node.js**: Version `18` or higher.

### Step-by-Step Setup

1. **Backend setup**:
   ```bash
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```
   *(Windows users: Run `.venv\Scripts\activate` to activate the virtual environment).*

2. **Frontend setup**:
   ```bash
   npm install
   ```

3. **Encryption key configuration**:
   Generate a Fernet key to encrypt your local API keys:
   ```bash
   python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
   ```
   Create a `.env` file in the repository root and add the key:
   ```ini
   ENCRYPTION_KEY=your_generated_key_here
   ```

---

## 2. How to Operate & Run

### A. Development Mode (Two Terminals)
Run the backend and frontend separately to enable hot-reloading:

* **Terminal A (Backend)**:
  ```bash
  .venv/bin/uvicorn backend.main:app --reload --port 8000
  ```
* **Terminal B (Frontend)**:
  ```bash
  npm run dev
  ```
* **Access the site**: Open <http://localhost:5173> in your browser.

### B. Production Mode (Single Terminal)
Build the frontend static bundle once, then serve everything on a single port via FastAPI:
```bash
npm run build
.venv/bin/uvicorn backend.main:app --port 8000
```
* **Access the site**: Open <http://localhost:8000> in your browser.

### C. Docker Mode
Run the entire application in multi-stage Docker containers:
```bash
docker compose up --build
```
* **Access the site**: Open <http://localhost:8000> in your browser.

---

## 3. Architecture

DM_Tools is designed as a **monolithic FastAPI backend + static SPA frontend** running on a single machine.

```
Vite (5173) ──proxy /api──▶ FastAPI (8000) ──HTTPS──▶ LLM providers
                            │
                            └─▶ data/dm_tools.db (SQLite, WAL)
```

### File Layout

| Backend File | Responsibility |
|---|---|
| `backend/main.py` | FastAPI app entry point, route mounts, static serving |
| `backend/config.py` | Configuration settings (`pydantic-settings`) reading `.env` |
| `backend/database.py` | SQLite connection, WAL mode enabling, DB schema initialization |
| `backend/api/llm_clients.py` | Unified async LLM client for 15 providers with retries |
| `backend/api/routes/` | API routes for meta, keys, profiles, geo, analyzers, and history |
| `backend/services/` | Fernet key encryption, martech pattern recognition, Pagespeed wrapper |

| Frontend File | Responsibility |
|---|---|
| `frontend/src/main.js` | Hash router (`#dashboard`, `#visibility`, etc.) and UI lifecycle |
| `frontend/src/utils/` | API wrappers, theme config, local preferences, and markdown rendering |
| `frontend/src/modules/` | UI views for GEO (visibility, content, FAQ), SEO, and AIO analyzers |

---

## 4. Database Structure (Data Model)

Persisted data is stored locally in a single SQLite database file: `data/dm_tools.db`.

### SQLite Schema

The database consists of **10 tables**, all keyed by `profile_id` (where `NULL` represents global settings):

* **`api_keys`**: Stores encrypted API credentials for LLM providers (Fernet-encrypted).
* **`settings`**: Key-value metadata table for active configuration settings.
* **`profiles`**: High-level context for target brands (brand name, website, industry, language).
* **`prompts`**: Per-profile prompt template library (pre-seeded with default templates).
* **`competitors`**: Competitor brand listings mapped to specific profiles.
* **`visibility_runs` / `visibility_results`**: Cache and output logs of parallel LLM visibility runs.
* **`content_generations`**: Persisted markdown content output history.
* **`faq_generations`**: Structured human-readable Q&As and generated JSON-LD FAQ schema blocks.
* **`website_analyses`**: Cached 15-point GEO/SEO audits, martech detections, and Lighthouse statistics.
* **`martech_scans`**: Detailed standalone website script and vendor scans.

*Note: Database indexes are defined on `(profile_id, created_at DESC)` for all history tables to optimize rendering and pagination performance.*
