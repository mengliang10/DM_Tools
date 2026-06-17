"""Analyzer routes: website scoring (15 GEO checks) + martech scan."""
from __future__ import annotations

import json
import re

import httpx
from bs4 import BeautifulSoup
from fastapi import APIRouter, HTTPException

from ...database import get_db, row_to_dict, rows_to_list
from ...services import martech, pagespeed
from ...services.deep_scanner import run_deep_scan
from ..helpers import get_active_profile_id
from ..schemas import MartechScanIn, WebsiteAnalyzeIn

router = APIRouter()


# ---------------------------------------------------------------------------
# Helpers (synchronous; soup-only)
# ---------------------------------------------------------------------------

_BULLET_TAGS = ("ul", "ol")
_HEADER_TAGS = ("h1", "h2", "h3", "h4", "h5", "h6")
_STAT_RE = re.compile(r"\b\d{1,3}(?:[,.]\d{3})*(?:\.\d+)?\s*(?:%|percent|million|billion|users|companies|customers)\b", re.I)
_QUESTION_RE = re.compile(r"\b(what|why|how|when|where|who|which)\b[^.?!]*\?", re.I)


def _word_count(text: str) -> int:
    return len(re.findall(r"\b\w+\b", text))


def _ratio_imgs_with_alt(soup: BeautifulSoup) -> tuple[int, int]:
    imgs = soup.find_all("img")
    with_alt = sum(1 for i in imgs if i.get("alt"))
    return with_alt, len(imgs)


def _gather_jsonld(soup: BeautifulSoup) -> list[dict]:
    out: list[dict] = []
    for s in soup.find_all("script", type="application/ld+json"):
        if not s.string:
            continue
        try:
            parsed = json.loads(s.string)
        except json.JSONDecodeError:
            continue
        if isinstance(parsed, list):
            out.extend(p for p in parsed if isinstance(p, dict))
        elif isinstance(parsed, dict):
            out.append(parsed)
    return out


def _score(soup: BeautifulSoup, html: str, brand: str, load_seconds: float, url: str = "") -> dict:
    """15-point GEO scorecard with category buckets."""
    text = soup.get_text(separator=" ", strip=True)
    words = _word_count(text)
    title_tag = soup.title.string.strip() if soup.title and soup.title.string else ""
    meta_desc = soup.find("meta", attrs={"name": "description"})
    desc = meta_desc.get("content", "").strip() if meta_desc else ""
    h1s = soup.find_all("h1")
    h2s = soup.find_all("h2")
    lists = [el for tag in _BULLET_TAGS for el in soup.find_all(tag)]
    jsonld = _gather_jsonld(soup)
    schema_types = {
        (s.get("@type") if isinstance(s.get("@type"), str) else "")
        for s in jsonld
    }
    has_faq_schema = any(t.lower() == "faqpage" for t in schema_types if t)
    has_author = bool(
        soup.find(attrs={"rel": "author"})
        or soup.find("meta", attrs={"name": "author"})
        or any("author" in (s.get("@type", "") or "").lower() for s in jsonld)
    )
    has_pubdate = bool(
        soup.find("time")
        or soup.find("meta", attrs={"property": "article:published_time"})
        or soup.find("meta", attrs={"name": "pubdate"})
    )
    imgs_alt, imgs_total = _ratio_imgs_with_alt(soup)
    alt_ratio = (imgs_alt / imgs_total) if imgs_total else 1.0
    internal_links = sum(
        1 for a in soup.find_all("a", href=True)
        if a["href"].startswith("/") or a["href"].startswith("#")
    )

    cats = {
        "Traditional SEO":  {"score": 0, "max_score": 0, "findings": []},
        "Mixed SEO/GEO":    {"score": 0, "max_score": 0, "findings": []},
        "Pure GEO & AEO":   {"score": 0, "max_score": 0, "findings": []},
    }
    recommendations: list[str] = []

    def add(cat: str, key: str, label: str, passed: bool, points: int, rec: str | None = None) -> None:
        cats[cat]["max_score"] += points
        if passed:
            cats[cat]["score"] += points
        elif rec:
            recommendations.append(rec)
        cats[cat]["findings"].append(
            {"key": key, "label": label, "passed": bool(passed), "points": points}
        )

    # Traditional SEO
    add("Traditional SEO", "title", "Title tag present", bool(title_tag), 2)
    add("Traditional SEO", "title_len", "Title length 30–65 chars",
        30 <= len(title_tag) <= 65, 2,
        "Adjust title tag length to between 30 and 65 characters.")
    add("Traditional SEO", "meta_desc", "Meta description present", bool(desc), 2)
    add("Traditional SEO", "meta_desc_len", "Meta description 70–155 chars",
        70 <= len(desc) <= 155, 2,
        "Tune meta description to 70–155 chars for better SERP CTR.")
    add("Traditional SEO", "h1", "Exactly one H1", len(h1s) == 1, 2,
        "Use exactly one H1 to define the page's primary topic.")
    add("Traditional SEO", "h2", "At least one H2", len(h2s) >= 1, 1)
    add("Traditional SEO", "img_alt", "≥80% of images have alt text",
        alt_ratio >= 0.8, 2, "Add alt text to images for AI/A11y understanding.")
    add("Traditional SEO", "internal_links", "Internal links present",
        internal_links >= 3, 1, "Add internal links so AI can crawl related pages.")

    # Mixed SEO/GEO
    scheme = url.split("://")[0] if "://" in url else "unknown"
    https_active = url.startswith("https")
    add("Mixed SEO/GEO", "https", f"HTTPS {'active' if https_active else f'missing — {scheme}'}",
        https_active, 1, "Serve the page over HTTPS to avoid penalties.")
    add("Mixed SEO/GEO", "load_speed", "Page loaded under 3s",
        load_seconds < 3.0, 2,
        f"Server responded in {load_seconds:.1f}s — improve TTFB / caching.")
    add("Mixed SEO/GEO", "word_count", "≥800 words of body text",
        words >= 800, 2,
        "Aim for 800+ words of substantive content for AI citability.")
    add("Mixed SEO/GEO", "lists", "Bullet/numbered lists present",
        len(lists) >= 1, 1, "Add lists — AI engines parse them as direct answers.")
    add("Mixed SEO/GEO", "jsonld", "JSON-LD schema present",
        len(jsonld) >= 1, 2,
        "Add JSON-LD schema (Article, FAQ, HowTo, etc.) to feed knowledge graphs.")

    # Pure GEO/AEO
    add("Pure GEO & AEO", "stats", "Statistics / numbers present",
        bool(_STAT_RE.search(text)), 2,
        "Add concrete statistics or named figures — AI loves citable numbers.")
    add("Pure GEO & AEO", "questions", "Question-style headings or content",
        bool(_QUESTION_RE.search(text)), 1)
    add("Pure GEO & AEO", "faq_schema", "FAQPage JSON-LD",
        has_faq_schema, 2,
        "Add a FAQPage JSON-LD block — major lift for answer-engine snippets.")
    add("Pure GEO & AEO", "author", "Byline / author marker",
        has_author, 1, "Surface a clear author byline for E-E-A-T.")
    add("Pure GEO & AEO", "pub_date", "Published / updated date",
        has_pubdate, 1, "Surface a publication date — freshness signal.")
    add("Pure GEO & AEO", "brand_mention", "Brand mentioned on page",
        bool(brand) and (brand.lower() in text.lower()), 2,
        "Mention the brand name in body content to anchor entity recognition.")

    total = sum(c["score"] for c in cats.values())
    max_total = sum(c["max_score"] for c in cats.values())
    return {
        "score": total,
        "max_score": max_total,
        "categories": cats,
        "recommendations": recommendations,
        "stats": {
            "word_count": words,
            "image_count": imgs_total,
            "image_alt_ratio": round(alt_ratio, 2),
            "load_seconds": round(load_seconds, 3),
            "schema_types": sorted(t for t in schema_types if t),
            "internal_links": internal_links,
            "scheme": url.split("://")[0] if "://" in url else "unknown",
        },
    }


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.post("/website/analyze")
async def analyze_website(body: WebsiteAnalyzeIn) -> dict:
    pid = get_active_profile_id()
    url = str(body.url)
    if not url.startswith("http"):
        url = "https://" + url

    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            resp = await client.get(url, headers={"User-Agent": "DM_Tools/0.2"})
            html = resp.text
            load_time = resp.elapsed.total_seconds()
            # Deep DOM + security-headers + robots.txt + JSON-LD scan.
            # Generates raw structured data plus narrative insights
            # (e.g. "CRITICAL: X-Robots-Tag:noai detected").
            deep_scan = await run_deep_scan(url, html, dict(resp.headers), client)
    except Exception as e:
        raise HTTPException(502, f"Failed to fetch URL: {e}") from e

    soup = BeautifulSoup(html, "html.parser")
    findings = _score(soup, html, body.brand, load_time, url)
    findings["martech"] = martech.detect(html)
    findings["lighthouse"] = await pagespeed.fetch_lighthouse(url)
    findings["deep_scan"] = deep_scan  # {"raw": {...}, "insights": [...]}


    conn = get_db()
    try:
        cur = conn.execute(
            "INSERT INTO website_analyses "
            "(profile_id, url, brand, score, max_score, findings_json) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (pid, url, body.brand, findings["score"], findings["max_score"],
             json.dumps(findings)),
        )
        conn.commit()
        analysis_id = cur.lastrowid
    finally:
        conn.close()

    return {"id": analysis_id, "url": url, **findings}


@router.get("/website/history")
async def website_history() -> list[dict]:
    pid = get_active_profile_id()
    conn = get_db()
    try:
        if pid:
            rows = conn.execute(
                "SELECT id, url, brand, score, max_score, created_at "
                "FROM website_analyses WHERE profile_id=? "
                "ORDER BY id DESC LIMIT 100",
                (pid,),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT id, url, brand, score, max_score, created_at "
                "FROM website_analyses WHERE profile_id IS NULL "
                "ORDER BY id DESC LIMIT 100"
            ).fetchall()
    finally:
        conn.close()
    return rows_to_list(rows)


@router.get("/website/{analysis_id}")
async def get_website_analysis(analysis_id: int) -> dict:
    conn = get_db()
    try:
        row = conn.execute(
            "SELECT * FROM website_analyses WHERE id=?", (analysis_id,)
        ).fetchone()
    finally:
        conn.close()
    if not row:
        raise HTTPException(404, "Not found")
    out = row_to_dict(row) or {}
    out["findings"] = json.loads(out.pop("findings_json", "{}") or "{}")
    return out


@router.post("/martech/scan")
async def scan_martech(body: MartechScanIn) -> dict:
    pid = get_active_profile_id()
    url = str(body.url)
    if not url.startswith("http"):
        url = "https://" + url

    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            r = await client.get(url, headers={"User-Agent": "DM_Tools/0.1"})
            html = r.text
    except Exception as e:
        raise HTTPException(502, f"Failed to fetch URL: {e}") from e

    detected = martech.detect(html)
    by_category: dict[str, list[str]] = {}
    for d in detected:
        by_category.setdefault(d["category"], []).append(d["name"])

    conn = get_db()
    try:
        cur = conn.execute(
            "INSERT INTO martech_scans (profile_id, url, detected_json) "
            "VALUES (?, ?, ?)",
            (pid, url, json.dumps(detected)),
        )
        conn.commit()
        scan_id = cur.lastrowid
    finally:
        conn.close()

    return {
        "id": scan_id,
        "url": url,
        "detected": detected,
        "by_category": by_category,
        "total": len(detected),
    }


@router.get("/martech/history")
async def martech_history() -> list[dict]:
    pid = get_active_profile_id()
    conn = get_db()
    try:
        if pid:
            rows = conn.execute(
                "SELECT id, url, created_at FROM martech_scans WHERE profile_id=? "
                "ORDER BY id DESC LIMIT 100",
                (pid,),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT id, url, created_at FROM martech_scans WHERE profile_id IS NULL "
                "ORDER BY id DESC LIMIT 100"
            ).fetchall()
    finally:
        conn.close()
    return rows_to_list(rows)
