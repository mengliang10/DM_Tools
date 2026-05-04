"""FastAPI entry point for DM_Tools.

Mounts six routers under /api and serves the built frontend at /.
Run locally with:
    uvicorn backend.main:app --reload --port 8000
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from fastapi import Request

from .api.llm_clients import aclose_http
from .api.routes import (
    analysis,
    analyzers,
    domains,
    geo,
    history,
    keys,
    meta,
    pro,
    profiles,
)
from .config import settings
from .database import init_db
from .services.security import EncryptionError

logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    yield
    await aclose_http()


app = FastAPI(
    title="DM_Tools",
    description="Unified GEO + AIO + SEO + Martech dashboard",
    version="0.1.0",
    lifespan=lifespan,
)

# Permissive CORS for local dev (Vite at :5173 → FastAPI at :8000).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Turn EncryptionError (raised when ENCRYPTION_KEY is missing/invalid) into
# a 400 with a clear message instead of an opaque 500.
@app.exception_handler(EncryptionError)
async def _encryption_error_handler(_request: Request, exc: EncryptionError):
    return JSONResponse(
        status_code=400,
        content={
            "detail": str(exc),
            "fix": (
                "Create a .env file in the project root with ENCRYPTION_KEY=<key>, "
                "then restart the backend. Generate a key with: "
                "python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
            ),
        },
    )

# ---- Routers ----
app.include_router(meta.router,      prefix="/api",                tags=["meta"])
app.include_router(keys.router,      prefix="/api/keys",           tags=["keys"])
app.include_router(profiles.router,  prefix="/api",                tags=["profiles"])
app.include_router(geo.router,       prefix="/api",                tags=["geo"])
app.include_router(analyzers.router, prefix="/api",                tags=["analyzers"])
app.include_router(analysis.router,  prefix="/api",                tags=["analysis"])
app.include_router(pro.router,       prefix="/api/pro",            tags=["pro"])
app.include_router(domains.router,   prefix="/api",                tags=["domains"])
app.include_router(history.router,   prefix="/api/history",        tags=["history"])


# ---- Static frontend (production build) ----
if settings.FRONTEND_DIST.exists():
    # Serve hashed assets at /assets/* directly.
    app.mount(
        "/assets",
        StaticFiles(directory=str(settings.FRONTEND_DIST / "assets")),
        name="assets",
    )

    @app.get("/", response_model=None, include_in_schema=False)
    async def index_root():
        return FileResponse(settings.FRONTEND_DIST / "index.html")

    @app.get("/{full_path:path}", response_model=None, include_in_schema=False)
    async def spa_fallback(full_path: str):
        """SPA: any non-API path returns index.html so the client router can take over."""
        if full_path.startswith("api/"):
            return JSONResponse({"detail": "Not Found"}, status_code=404)
        target = settings.FRONTEND_DIST / full_path
        if target.is_file():
            return FileResponse(target)
        return FileResponse(settings.FRONTEND_DIST / "index.html")
else:
    @app.get("/")
    async def dev_index() -> dict:
        return {
            "message": (
                "Frontend not built. Run `npm install && npm run dev` to start "
                "the Vite dev server on http://localhost:5173, or `npm run build` "
                "to produce the static bundle that this server will serve."
            ),
            "api_docs": "/docs",
        }
