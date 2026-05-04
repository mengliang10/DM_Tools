"""LLM prompt templates: persona system + autofill templates.

These were the differentiated IP of the original GEO repo. PERSONA_PROMPTS
drives the Strategic Analysis tab (CEO / CMO / CTO / SEO Expert lenses) for
both single-LLM analysis and the multi-LLM debate orchestrator. AUTOFILL_PROMPTS
drives the one-click "✨ Autofill" button on every form.

All templates use named placeholders ({brand}, {industry}, {website}) so they
can be filled with `.format(**context)` from the route handlers.
"""
from __future__ import annotations

# ---------------------------------------------------------------------------
# Persona lenses for /api/analysis/generate and /api/analysis/debate
# ---------------------------------------------------------------------------

PERSONA_PROMPTS: dict[str, dict[str, str]] = {
    "ceo": {
        "title": "Executive Summary & High-Level Strategy (CEO Persona)",
        "focus": (
            "Focus on bottom-line impact, market positioning, and long-term "
            "valuation. Use professional, concise, and strategic language. "
            "Highlight the 'Why' over the 'How'."
        ),
        "sections": (
            "## 1. BOTTOM LINE SUMMARY\n"
            "## 2. MARKET POSITIONING & DISRUPTION\n"
            "## 3. STRATEGIC INVESTMENT RECOMMENDATIONS\n"
            "## 4. RISK MITIGATION\n"
            "## 5. EXECUTIVE DASHBOARD"
        ),
    },
    "cmo": {
        "title": "Marketing & UX Strategic Roadmap (CMO & UX Researcher Persona)",
        "focus": (
            "Focus on brand sentiment, user journey optimization for AI "
            "discovery, citability, and UX. Use terms related to brand "
            "authority, conversion optimization, and user intent."
        ),
        "sections": (
            "## 1. BRAND SENTIMENT ANALYSIS\n"
            "## 2. AI-DRIVEN USER JOURNEY MAPPING\n"
            "## 3. CONTENT CITABILITY AUDIT\n"
            "## 4. UX ENHANCEMENTS FOR LLM READABILITY\n"
            "## 5. CREATIVE & CONTENT ROADMAP"
        ),
    },
    "cto": {
        "title": "Technical GEO Infrastructure & Implementation (CTO Persona)",
        "focus": (
            "Focus on technical architecture, coding recommendations, "
            "Schema.org, RAG-readability, and performance. Use highly "
            "technical terms, provide actual code snippets, and focus on "
            "implementation details."
        ),
        "sections": (
            "## 1. TECHNICAL INFRASTRUCTURE AUDIT\n"
            "## 2. SCHEMA & KNOWLEDGE GRAPH ARCHITECTURE\n"
            "## 3. RAG PIPELINE OPTIMIZATION\n"
            "## 4. CODE-LEVEL RECOMMENDATIONS (with snippets)\n"
            "## 5. PERFORMANCE & ACCESSIBILITY BENCHMARKS"
        ),
    },
    "expert": {
        "title": "Advanced GEO/SEO/AIO Technical Masterplan (Mega Expert Persona)",
        "focus": (
            "Use super academic and technical terms. Cover GEO, SEO, and AIO "
            "comprehensively. Provide straight-to-the-point, high-density "
            "recommendations. Include advanced coding strategies and "
            "multi-layered optimization tactics."
        ),
        "sections": (
            "## 1. MULTI-MODAL VISIBILITY ANALYSIS\n"
            "## 2. LINGUISTIC & SEMANTIC VECTOR OPTIMIZATION\n"
            "## 3. ENTITY AUTHORITY & KNOWLEDGE GRAPH INJECTION\n"
            "## 4. ADVANCED RAG & LLM-CITABILITY FRAMEWORKS\n"
            "## 5. COMPREHENSIVE GEO/SEO/UX CHECKLIST"
        ),
    },
}


# ---------------------------------------------------------------------------
# Autofill — one-click form completion templates
# All return strict JSON; route handlers strip ``` fences then json.loads().
# ---------------------------------------------------------------------------

AUTOFILL_PROMPTS: dict[str, str] = {
    "visibility": (
        "You are a GEO (Generative Engine Optimization) strategist.\n"
        "Given this brand context, suggest 3 visibility check prompts that would "
        "reveal whether AI systems mention this brand.\n"
        "Return ONLY valid JSON (no markdown, no explanation):\n"
        '{{"prompts": ["prompt 1", "prompt 2", "prompt 3"]}}\n\n'
        "Brand: {brand}\nIndustry: {industry}\nWebsite: {website}"
    ),
    "content": (
        "You are a GEO content strategist.\n"
        "Given this brand, suggest the best content to create that would get cited "
        "by AI systems.\n"
        "Return ONLY valid JSON (no markdown, no explanation):\n"
        '{{"topic": "suggested topic", "content_type": "blog|social|whitepaper|email|product", '
        '"tone": "professional|conversational|authoritative|friendly|technical|educational", '
        '"audience": "target audience description"}}\n\n'
        "Brand: {brand}\nIndustry: {industry}\nWebsite: {website}"
    ),
    "faq": (
        "You are a GEO/AEO strategist.\n"
        "Given this brand, suggest the best FAQ topic that would get cited by AI "
        "systems in relevant queries.\n"
        "Return ONLY valid JSON (no markdown, no explanation):\n"
        '{{"topic": "suggested faq topic", "num_faqs": 6}}\n\n'
        "Brand: {brand}\nIndustry: {industry}\nWebsite: {website}"
    ),
    "website": (
        "You are a GEO analyst.\n"
        "Given this brand's website, suggest the single most important page URL "
        "to analyze for GEO readiness (homepage, a key blog post, or a product page). "
        "If no website is provided, return an example.\n"
        "Return ONLY valid JSON (no markdown, no explanation):\n"
        '{{"url": "https://example.com/page-to-analyze", "reason": "why this page"}}\n\n'
        "Brand: {brand}\nWebsite: {website}"
    ),
    "prompt": (
        "You are a GEO strategist.\n"
        "Generate high-value prompts for tracking AI visibility for this specific brand.\n"
        "DO NOT use wildcards like [brand], [topic], or [industry]. Use the actual "
        "brand name and context provided.\n"
        "Generate the following number of prompts:\n"
        "- Top of Funnel: {count_top} prompts\n"
        "- Middle of Funnel: {count_mid} prompts\n"
        "- Bottom of Funnel: {count_bot} prompts\n\n"
        "Return ONLY valid JSON (no markdown, no explanation):\n"
        "{{\n"
        '  "top": [{{"text": "prompt text", "description": "why this prompt matters"}}],\n'
        '  "mid": [{{"text": "prompt text", "description": "why this prompt matters"}}],\n'
        '  "bot": [{{"text": "prompt text", "description": "why this prompt matters"}}]\n'
        "}}\n\n"
        "Brand: {brand}\nIndustry: {industry}\nWebsite: {website}"
    ),
    "competitor": (
        "You are a market analyst.\n"
        "Given this brand and industry, list 5 likely direct competitors (real or "
        "plausible company names).\n"
        "Return ONLY valid JSON (no markdown, no explanation):\n"
        '{{"competitors": [{{"brand_name": "name", "domain": "domain.com"}}]}}\n\n'
        "Brand: {brand}\nIndustry: {industry}\nWebsite: {website}"
    ),
}
