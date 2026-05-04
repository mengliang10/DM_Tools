"""Strategic Analysis routes — persona-driven single-LLM + multi-LLM debate.

This is the differentiated IP of GEO/DM_Tools that no commercial GEO tool ships:

    POST /api/analysis/generate     single LLM, persona-shaped output
    POST /api/analysis/debate       3-round multi-LLM consensus
    POST /api/autofill              one-click form completion (uses LLM)
    GET  /api/analysis/history      list of past analyses (this profile)
    GET  /api/analysis/{aid}        detail of one analysis
"""
from __future__ import annotations

import asyncio
import json
import re
from pathlib import Path

from fastapi import APIRouter, HTTPException

from ...config import settings
from ...database import get_db, row_to_dict, rows_to_list
from ..helpers import get_active_profile_id, get_key_row, lang_suffix
from ..llm_clients import LLMAPIError, query_llm
from ..prompt_templates import AUTOFILL_PROMPTS, PERSONA_PROMPTS
from ..schemas import AnalysisIn, AutofillIn, DebateIn

router = APIRouter()


# ---------------------------------------------------------------------------
# Helpers — context gathering + report cleanup
# ---------------------------------------------------------------------------


def _build_profile_context(pid: int | None, read_experience: bool) -> tuple[dict | None, str]:
    """Pull all profile-scoped data and return (profile_dict, context_string).

    Touches: profiles, visibility_runs, visibility_results, competitors,
    website_analyses, site_profiles. Optionally reads markdown files
    from `data/experience/` for the LLM to ingest as additional context.
    """
    profile: dict | None = None
    vis_results: list[dict] = []
    discovered_competitors: set[str] = set()
    competitors: list[dict] = []
    web_audits: list[dict] = []
    site_profiles: list[dict] = []

    conn = get_db()
    try:
        if pid:
            row = conn.execute(
                "SELECT * FROM profiles WHERE id=?", (pid,)
            ).fetchone()
            profile = row_to_dict(row)

            vis_runs = conn.execute(
                "SELECT * FROM visibility_runs WHERE profile_id=? "
                "ORDER BY id DESC LIMIT 5",
                (pid,),
            ).fetchall()
            for r in vis_runs:
                results = conn.execute(
                    "SELECT * FROM visibility_results WHERE run_id=?",
                    (r["id"],),
                ).fetchall()
                for item in results:
                    for c in json.loads(item["competitors_json"] or "[]"):
                        discovered_competitors.add(c)
                vis_results.append({"run": dict(r), "results": rows_to_list(results)})

            competitors = rows_to_list(
                conn.execute(
                    "SELECT * FROM competitors WHERE profile_id=?", (pid,)
                ).fetchall()
            )
            web_audits = rows_to_list(
                conn.execute(
                    "SELECT id, url, brand, score, max_score, created_at "
                    "FROM website_analyses WHERE profile_id=? "
                    "ORDER BY id DESC LIMIT 3",
                    (pid,),
                ).fetchall()
            )
            site_profiles = rows_to_list(
                conn.execute(
                    "SELECT sp.*, d.name AS domain_name FROM site_profiles sp "
                    "JOIN domains d ON d.id = sp.domain_id "
                    "WHERE sp.profile_id=? LIMIT 10",
                    (pid,),
                ).fetchall()
            )
    finally:
        conn.close()

    exp_context = ""
    if read_experience:
        exp_dir = settings.DATA_DIR / "experience"
        if exp_dir.exists():
            for md_file in sorted(exp_dir.glob("*.md")):
                try:
                    text = md_file.read_text()
                    text = re.sub(r"<!--.*?-->", "", text, flags=re.DOTALL)
                    exp_context += f"\n--- FROM {md_file.name} ---\n{text}\n"
                except Exception:
                    continue

    context_str = f"""
Brand: {profile['brand'] if profile else 'Unknown'}
Industry: {profile['industry'] if profile else 'Unknown'}
Website: {profile['website'] if profile else 'Unknown'}

Visibility Summary:
{json.dumps(vis_results, indent=2)[:1500]}

Verified Competitors:
{json.dumps(competitors, indent=2)}

Active Market Disruptors (Discovered by AI):
{sorted(discovered_competitors)}

Recent Technical Website Audits:
{json.dumps(web_audits, indent=2)}

Tracked Site Profiles:
{json.dumps(site_profiles, indent=2)}
{f'Proprietary Experience & Research Context: {exp_context[:3000]}' if exp_context else ''}
""".strip()

    return profile, context_str


def _strip_report_wrapper(content: str) -> str:
    """Pull the analysis body out of <report>…</report> wrappers, robust to
    truncated tokens and reasoning-model <think> blocks."""
    content = re.sub(r"<think>.*?</think>", "", content, flags=re.DOTALL).strip()
    m = re.search(r"<report>(.*?)</report>", content, re.DOTALL | re.IGNORECASE)
    if m:
        return m.group(1).strip()
    # Truncated closing tag — take everything after <report>
    idx = content.lower().find("<report>")
    if idx != -1:
        return content[idx + len("<report>"):].strip()
    # Fallback: snap to first markdown heading
    h = re.search(r"^#{1,3}\s+", content, re.MULTILINE)
    if h:
        return content[h.start():].strip()
    return content.strip()


# ---------------------------------------------------------------------------
# Single-LLM persona analysis
# ---------------------------------------------------------------------------


@router.post("/analysis/generate")
async def generate_analysis(body: AnalysisIn) -> dict:
    pid = get_active_profile_id()
    key = get_key_row(body.key_id)
    profile, context_str = _build_profile_context(pid, body.read_experience)
    p_config = PERSONA_PROMPTS.get(body.persona, PERSONA_PROMPTS["expert"])

    prompt = f"""You are a Senior GEO (Generative Engine Optimization) Consultant and {p_config['title']}.
Your task is to provide a deep-dive, institutional-grade analysis and strategic roadmap for the brand.

OUTPUT LANGUAGE: {body.language.upper()}
TARGET MARKET CONTEXT: {body.market.upper()}

DATA CONTEXT:
{context_str}

STRICT INSTRUCTIONS:
- {p_config['focus']}
- Analyze the data specifically through the lens of the {body.market.upper()} market.
- Consider local competitor dynamics, regional AI search behaviours (Baidu / Naver / GPT regional variations), and cultural nuances in {body.market.upper()}.
- DO NOT echo the input data back.
- DO NOT include any introductory or meta-commentary (no "Here is your analysis...").
- START IMMEDIATELY with the tag <report>.
- Format every table as GitHub-Flavored Markdown.
- RESPOND ENTIRELY IN {body.language.upper()}.
- WRAP YOUR ENTIRE ANALYSIS IN <report> and </report> tags.

REQUIRED ANALYSIS SECTIONS (USE THESE AS ## HEADERS):
{p_config['sections']}

Tone: Professional, data-driven, and authoritative.
Format: Markdown — clear ## headers per required section, tables where relevant, bold highlights, fenced code blocks with language identifiers.{lang_suffix(body.language)}

Output the full analysis report inside the tags. NOTHING ELSE."""

    try:
        raw = await query_llm(key["provider"], key["api_key"], key["model"], prompt)
    except LLMAPIError as e:
        raise HTTPException(502, str(e)) from e

    content = _strip_report_wrapper(raw)

    conn = get_db()
    try:
        cur = conn.execute(
            "INSERT INTO geo_analyses "
            "(profile_id, brand, industry, persona, market, provider, model, content, is_debate) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)",
            (
                pid,
                profile["brand"] if profile else "",
                profile["industry"] if profile else "",
                body.persona, body.market,
                key["provider"], key["model"], content,
            ),
        )
        conn.commit()
        analysis_id = cur.lastrowid
    finally:
        conn.close()
    return {"id": analysis_id, "content": content, "persona": body.persona}


# ---------------------------------------------------------------------------
# Multi-LLM debate (3 rounds)
# ---------------------------------------------------------------------------


@router.post("/analysis/debate")
async def debate_analysis(body: DebateIn) -> dict:
    if len(body.key_ids) < 2:
        raise HTTPException(400, "At least 2 LLM API keys are required for a debate.")

    pid = get_active_profile_id()
    profile, context_str = _build_profile_context(pid, body.read_experience)
    p_config = PERSONA_PROMPTS.get(body.persona, PERSONA_PROMPTS["expert"])

    keys = [get_key_row(kid) for kid in body.key_ids]

    # ---------------- ROUND 1: independent audits ----------------
    async def round1(key: dict) -> dict:
        prompt = f"""You are an independent GEO Expert ({p_config['title']}).
Analyse the data and provide your initial strategic findings through the lens of your expertise.
{p_config['focus']}
Be critical and specific. Output in {body.language.upper()}.

DATA:
{context_str}

Format: Top 5 critical GEO gaps and 5 high-impact opportunities."""
        try:
            resp = await query_llm(key["provider"], key["api_key"], key["model"], prompt)
            return {"kid": key["id"], "model": key["model"], "content": resp}
        except LLMAPIError as e:
            return {"kid": key["id"], "model": key["model"], "content": f"Error: {e}", "error": True}

    round1_results = await asyncio.gather(*[round1(k) for k in keys])

    # ---------------- ROUND 2: critique each peer ----------------
    async def round2(key: dict, all_results: list[dict]) -> dict:
        peers = [r for r in all_results if r["kid"] != key["id"]]
        peers_text = "\n\n".join(f"EXPERT ({r['model']}):\n{r['content']}" for r in peers)
        prompt = f"""You are the GEO Expert ({key['model']}).
You just saw the analyses of your peers on the same data.

PEER ANALYSES:
{peers_text}

TASK:
1. Critique their findings through your specialised lens: {p_config['focus']}
2. Point out where they are wrong, too optimistic, or missed a technical detail you found.
3. Defend your strongest points.
4. Concede if they found something you missed.
Output in {body.language.upper()}."""
        try:
            resp = await query_llm(key["provider"], key["api_key"], key["model"], prompt)
            return {"kid": key["id"], "model": key["model"], "content": resp}
        except LLMAPIError as e:
            return {"kid": key["id"], "model": key["model"], "content": f"Error: {e}", "error": True}

    round2_results = await asyncio.gather(*[round2(k, round1_results) for k in keys])

    # ---------------- ROUND 3: lead synthesizes consensus ----------------
    lead = keys[0]
    transcript = "--- ROUND 1: INITIAL FINDINGS ---\n"
    for r in round1_results:
        transcript += f"[{r['model']}]: {r['content']}\n\n"
    transcript += "--- ROUND 2: DEBATE & CRITIQUE ---\n"
    for r in round2_results:
        transcript += f"[{r['model']}]: {r['content']}\n\n"

    final_prompt = f"""You are the {p_config['title']} (Lead Strategist).
Review the entire debate transcript between your expert team.

TRANSCRIPT:
{transcript}

TASK:
Synthesize the final consensus GEO Roadmap according to your persona's priorities.
- Resolve conflicts and reach a professional consensus.
- Highlight unanimous critical items.
- Provide the final, authoritative strategy for {profile['brand'] if profile else 'the brand'}.
- {p_config['focus']}
- Wrapped in <report> tags.
- Output language: {body.language.upper()}.

REQUIRED ANALYSIS SECTIONS (USE THESE AS ## HEADERS):
{p_config['sections']}

Format: Markdown with clear ## headers per required section, tables where appropriate, bold highlights. Use proper triple-backtick fences with language identifiers for code.{lang_suffix(body.language)}

DATA CONTEXT:
{context_str}"""

    try:
        raw = await query_llm(
            lead["provider"], lead["api_key"], lead["model"], final_prompt
        )
    except LLMAPIError as e:
        raise HTTPException(502, f"Consensus synthesis failed: {e}") from e

    content = _strip_report_wrapper(raw)

    debate_log = {
        "round_1": round1_results,
        "round_2": round2_results,
        "participants": [k["model"] for k in keys],
    }

    conn = get_db()
    try:
        cur = conn.execute(
            "INSERT INTO geo_analyses "
            "(profile_id, brand, industry, persona, market, provider, model, "
            " content, debate_json, is_debate) "
            "VALUES (?, ?, ?, ?, ?, 'multi-debate', ?, ?, ?, 1)",
            (
                pid,
                profile["brand"] if profile else "",
                profile["industry"] if profile else "",
                body.persona, body.market,
                f"{len(keys)} models",
                content,
                json.dumps(debate_log),
            ),
        )
        conn.commit()
        analysis_id = cur.lastrowid
    finally:
        conn.close()

    return {
        "id": analysis_id,
        "content": content,
        "persona": body.persona,
        "debate_json": debate_log,
    }


# ---------------------------------------------------------------------------
# History + detail
# ---------------------------------------------------------------------------


@router.get("/analysis/history")
async def analysis_history() -> list[dict]:
    pid = get_active_profile_id()
    conn = get_db()
    try:
        if pid:
            rows = conn.execute(
                "SELECT id, brand, industry, persona, market, provider, model, "
                "       is_debate, created_at "
                "FROM geo_analyses WHERE profile_id=? "
                "ORDER BY id DESC LIMIT 100",
                (pid,),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT id, brand, industry, persona, market, provider, model, "
                "       is_debate, created_at "
                "FROM geo_analyses WHERE profile_id IS NULL "
                "ORDER BY id DESC LIMIT 100"
            ).fetchall()
    finally:
        conn.close()
    return rows_to_list(rows)


@router.get("/analysis/{aid}")
async def get_analysis(aid: int) -> dict:
    conn = get_db()
    try:
        row = conn.execute(
            "SELECT * FROM geo_analyses WHERE id=?", (aid,)
        ).fetchone()
    finally:
        conn.close()
    if not row:
        raise HTTPException(404, "Analysis not found")
    out = row_to_dict(row) or {}
    if out.get("debate_json"):
        try:
            out["debate_json"] = json.loads(out["debate_json"])
        except (json.JSONDecodeError, TypeError):
            out["debate_json"] = {}
    return out


# ---------------------------------------------------------------------------
# Autofill — one-click form completion
# ---------------------------------------------------------------------------


@router.post("/autofill")
async def autofill(body: AutofillIn) -> dict:
    template = AUTOFILL_PROMPTS.get(body.module)
    if not template:
        raise HTTPException(400, f"Unknown autofill module: {body.module!r}")

    key = get_key_row(body.key_id)
    fmt_args = {
        "brand": body.brand or "not specified",
        "industry": body.industry or "not specified",
        "website": body.website or "not specified",
    }
    if body.module == "prompt":
        fmt_args.update(
            count_top=body.count_top,
            count_mid=body.count_mid,
            count_bot=body.count_bot,
        )
    prompt = template.format(**fmt_args) + lang_suffix(body.language)

    try:
        raw = await query_llm(key["provider"], key["api_key"], key["model"], prompt)
    except LLMAPIError as e:
        raise HTTPException(502, str(e)) from e

    raw = raw.strip()
    if raw.startswith("```"):
        raw = "\n".join(raw.split("\n")[1:])
    if raw.endswith("```"):
        raw = "\n".join(raw.split("\n")[:-1])

    try:
        return json.loads(raw.strip())
    except json.JSONDecodeError as e:
        raise HTTPException(502, f"LLM returned invalid JSON: {e}. Raw: {raw[:300]}")
