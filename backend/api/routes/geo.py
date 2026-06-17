"""GEO routes: visibility check, content generation, FAQ generation."""
from __future__ import annotations

import asyncio
import json

from fastapi import APIRouter, HTTPException

from ...database import get_db, row_to_dict, rows_to_list
from ...services.security import decrypt
from ..helpers import (
    analyze_sentiment,
    brand_mentioned,
    citation_detected,
    competitors_in_text,
    fetch_competitor_names,
    fetch_profile_website,
    get_active_profile_id,
    get_key_row,
    lang_suffix,
)
from ..llm_clients import LLMAPIError, query_llm
from ..schemas import ContentGenIn, FaqGenIn, VisibilityRunIn

router = APIRouter()


# ---------------------------------------------------------------------------
# Visibility — query N LLMs in parallel and score brand presence
# ---------------------------------------------------------------------------


@router.post("/visibility/run")
async def run_visibility(body: VisibilityRunIn) -> dict:
    if not body.provider_ids:
        raise HTTPException(400, "Pick at least one API key (provider).")

    pid = get_active_profile_id()

    conn = get_db()
    try:
        placeholders = ",".join("?" * len(body.provider_ids))
        key_rows = conn.execute(
            f"SELECT * FROM api_keys WHERE id IN ({placeholders})",
            body.provider_ids,
        ).fetchall()
        if not key_rows:
            raise HTTPException(404, "None of the requested API keys exist.")

        cur = conn.execute(
            "INSERT INTO visibility_runs "
            "(profile_id, prompt_text, brand, language, funnel_stage) "
            "VALUES (?, ?, ?, ?, ?)",
            (pid, body.prompt_text, body.brand, body.language, body.funnel_stage),
        )
        run_id = cur.lastrowid
        conn.commit()
    finally:
        conn.close()

    competitors = body.competitors or fetch_competitor_names(pid)
    profile_website = fetch_profile_website(pid)

    decrypted = []
    for r in key_rows:
        d = dict(r)
        d["api_key"] = decrypt(d["api_key"])
        decrypted.append(d)

    full_prompt = body.prompt_text + lang_suffix(body.language)

    async def _query(key_row: dict) -> dict:
        provider = key_row["provider"]
        model = key_row["model"]
        try:
            response = await query_llm(provider, key_row["api_key"], model, full_prompt)
            mentioned = brand_mentioned(response, body.brand)
            cited = citation_detected(response, profile_website)
            sentiment = analyze_sentiment(response, body.brand)
            comps = competitors_in_text(response, competitors)
            sov = (1.0 / (1 + len(comps))) if mentioned else 0.0
            error = None
        except LLMAPIError as e:
            response = ""
            mentioned = cited = False
            sentiment = "neutral"
            comps = []
            sov = 0.0
            error = str(e)

        c = get_db()
        try:
            c.execute(
                """INSERT INTO visibility_results
                   (run_id, provider, model, response, brand_mentioned,
                    citation_detected, sentiment_label, sov_score,
                    competitors_json, error)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    run_id, provider, model, response,
                    int(mentioned), int(cited), sentiment, sov,
                    json.dumps(comps), error,
                ),
            )
            c.commit()
        finally:
            c.close()

        return {
            "provider": provider,
            "model": model,
            "label": key_row.get("label") or provider,
            "response": response,
            "brand_mentioned": mentioned,
            "citation_detected": cited,
            "sentiment_label": sentiment,
            "sov_score": sov,
            "competitors_found": comps,
            "error": error,
        }

    results = await asyncio.gather(*[_query(r) for r in decrypted])
    return {
        "run_id": run_id,
        "prompt": body.prompt_text,
        "brand": body.brand,
        "results": results,
    }


@router.get("/visibility/runs")
async def list_visibility_runs() -> list[dict]:
    pid = get_active_profile_id()
    conn = get_db()
    try:
        if pid:
            rows = conn.execute(
                "SELECT id, prompt_text, brand, run_at FROM visibility_runs "
                "WHERE profile_id=? ORDER BY id DESC LIMIT 100",
                (pid,),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT id, prompt_text, brand, run_at FROM visibility_runs "
                "WHERE profile_id IS NULL ORDER BY id DESC LIMIT 100"
            ).fetchall()
    finally:
        conn.close()
    return rows_to_list(rows)


@router.get("/visibility/runs/{run_id}")
async def get_visibility_run(run_id: int) -> dict:
    conn = get_db()
    try:
        run = conn.execute(
            "SELECT * FROM visibility_runs WHERE id=?", (run_id,)
        ).fetchone()
        results = conn.execute(
            "SELECT * FROM visibility_results WHERE run_id=?", (run_id,)
        ).fetchall()
    finally:
        conn.close()
    if not run:
        raise HTTPException(404, "Run not found")
    out = rows_to_list(results)
    for r in out:
        r["competitors_json"] = json.loads(r.get("competitors_json") or "[]")
    return {"run": row_to_dict(run), "results": out}


# ---------------------------------------------------------------------------
# Content generation
# ---------------------------------------------------------------------------

CONTENT_TYPES = {
    "blog":       "a high-authority blog post (~800-1200 words)",
    "social":     "social media copy suitable for LinkedIn / X (Twitter)",
    "whitepaper": "a section of an institutional whitepaper",
    "email":      "a professional B2B email campaign",
    "product":    "a product page (hero + benefits + FAQ block)",
}


@router.post("/content/generate")
async def generate_content(body: ContentGenIn) -> dict:
    pid = get_active_profile_id()
    key = get_key_row(body.key_id)

    flavour = CONTENT_TYPES.get(body.content_type, "marketing content")
    prompt = f"""You are a Generative Engine Optimization (GEO) content strategist.
Task: write {flavour} about "{body.topic}" for the brand "{body.brand or '(unspecified)'}".

Audience : {body.audience}
Tone     : {body.tone}
Language : {body.language.upper()}

Requirements:
1. Mention the brand name naturally where it adds context.
2. Use clear semantic headings (H2/H3) and short paragraphs.
3. Include at least one structured list or table to improve LLM citability.
4. High factual density — concrete numbers, named entities, dates.
5. Output Markdown only, no preamble.{lang_suffix(body.language)}"""

    try:
        content = await query_llm(key["provider"], key["api_key"], key["model"], prompt)
    except LLMAPIError as e:
        raise HTTPException(502, str(e)) from e

    conn = get_db()
    try:
        cur = conn.execute(
            "INSERT INTO content_generations "
            "(profile_id, topic, brand, content_type, tone, audience, "
            " provider, model, content, language) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                pid, body.topic, body.brand, body.content_type, body.tone,
                body.audience, key["provider"], key["model"], content, body.language,
            ),
        )
        conn.commit()
        gen_id = cur.lastrowid
    finally:
        conn.close()

    return {"id": gen_id, "content": content}


@router.get("/content/history")
async def content_history() -> list[dict]:
    pid = get_active_profile_id()
    conn = get_db()
    try:
        if pid:
            rows = conn.execute(
                "SELECT id, topic, brand, content_type, provider, model, created_at "
                "FROM content_generations WHERE profile_id=? "
                "ORDER BY id DESC LIMIT 50",
                (pid,),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT id, topic, brand, content_type, provider, model, created_at "
                "FROM content_generations WHERE profile_id IS NULL "
                "ORDER BY id DESC LIMIT 50"
            ).fetchall()
    finally:
        conn.close()
    return rows_to_list(rows)


@router.get("/content/{gen_id}")
async def get_content(gen_id: int) -> dict:
    conn = get_db()
    try:
        row = conn.execute(
            "SELECT * FROM content_generations WHERE id=?", (gen_id,)
        ).fetchone()
    finally:
        conn.close()
    if not row:
        raise HTTPException(404, "Not found")
    return row_to_dict(row)


# ---------------------------------------------------------------------------
# FAQ generation
# ---------------------------------------------------------------------------


@router.post("/faq/generate")
async def generate_faq(body: FaqGenIn) -> dict:
    pid = get_active_profile_id()
    key = get_key_row(body.key_id)

    prompt = f"""You are a senior GEO / AEO consultant.
Task: generate {body.num_faqs} FAQ entries for the topic "{body.topic}" for
the brand "{body.brand or '(unspecified)'}".

Output Language: {body.language.upper()}

Requirements:
1. Each Q must be one a real user would ask an AI assistant.
2. Each A must be concise, factual, and follow the inverted-pyramid style.
3. Mention the brand naturally where the answer benefits.
4. Use Markdown: question as `### Q:` and answer as plain text below.
5. After the Markdown FAQ list, append a fenced ```json block containing a
   valid JSON-LD `FAQPage` schema with all questions / answers.{lang_suffix(body.language)}"""

    try:
        content = await query_llm(key["provider"], key["api_key"], key["model"], prompt)
    except LLMAPIError as e:
        raise HTTPException(502, str(e)) from e

    conn = get_db()
    try:
        cur = conn.execute(
            "INSERT INTO faq_generations "
            "(profile_id, topic, brand, provider, model, content, language) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (pid, body.topic, body.brand, key["provider"], key["model"], content, body.language),
        )
        conn.commit()
        gen_id = cur.lastrowid
    finally:
        conn.close()

    return {"id": gen_id, "content": content}


@router.get("/faq/history")
async def faq_history() -> list[dict]:
    pid = get_active_profile_id()
    conn = get_db()
    try:
        if pid:
            rows = conn.execute(
                "SELECT id, topic, brand, provider, model, created_at "
                "FROM faq_generations WHERE profile_id=? "
                "ORDER BY id DESC LIMIT 50",
                (pid,),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT id, topic, brand, provider, model, created_at "
                "FROM faq_generations WHERE profile_id IS NULL "
                "ORDER BY id DESC LIMIT 50"
            ).fetchall()
    finally:
        conn.close()
    return rows_to_list(rows)


@router.get("/faq/{gen_id}")
async def get_faq(gen_id: int) -> dict:
    conn = get_db()
    try:
        row = conn.execute(
            "SELECT * FROM faq_generations WHERE id=?", (gen_id,)
        ).fetchone()
    finally:
        conn.close()
    if not row:
        raise HTTPException(404, "Not found")
    return row_to_dict(row)
