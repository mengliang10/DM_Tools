"""GEO heuristic scoring + advanced schema generation.

Pure functions — no I/O, no DB, no async. Used by the Pro Tools tab:
    /api/pro/cite-grade  → calculate_citation_probability(content, brand)
    /api/pro/generate-schema → generate_advanced_schema(profile_dict)
"""
from __future__ import annotations

import json
import re


def calculate_citation_probability(
    content_text: str, brand_name: str
) -> tuple[int, list[str]]:
    """Score 0–100 reflecting how likely an LLM is to cite this content.

    Heuristics:
      • +25 brand mentioned in first 200 chars (entity salience)
      • +20 contains tables (structural density signal)
      • +15 contains 5+ list items (RAG-friendly chunking)
      • +20 contains 10+ numeric tokens (factual density)
      • +20 contains JSON-LD or schema.org (knowledge-graph injection)
    """
    score = 0
    findings: list[str] = []

    if brand_name and brand_name.lower() in content_text[:200].lower():
        score += 25
        findings.append("High Entity Salience: Brand mentioned early.")
    else:
        findings.append("Low Entity Salience: Brand not mentioned in intro.")

    tables = content_text.count("<table") + content_text.count("|---|")
    lists = (
        content_text.count("<ul")
        + content_text.count("<ol")
        + content_text.count("\n- ")
    )
    if tables > 0:
        score += 20
        findings.append(f"Structural Density: {tables} table(s) found (High).")
    if lists > 5:
        score += 15
        findings.append(f"List Density: {lists} items found (Good for RAG).")

    numbers = len(re.findall(r"\d+", content_text))
    if numbers > 10:
        score += 20
        findings.append("Factual Density: High use of quantitative data.")

    if "ld+json" in content_text or "schema.org" in content_text:
        score += 20
        findings.append("Schema Metadata: Structured data detected.")

    return min(score, 100), findings


def generate_advanced_schema(brand_data: dict) -> str:
    """Build a JSON-LD `Organization` block from a profile dict."""
    brand = brand_data.get("brand", "Unknown Brand")
    url = brand_data.get("website", "") or ""
    industry = brand_data.get("industry", "Business")
    notes = brand_data.get("notes", "") or ""

    slug_dash = brand.lower().replace(" ", "-") if brand else "brand"
    slug_no = brand.lower().replace(" ", "") if brand else "brand"

    schema = {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": brand,
        "url": url,
        "logo": f"{url}/logo.png" if url else "",
        "description": notes,
        "knowsAbout": [industry, "Generative Engine Optimization"],
        "sameAs": [
            f"https://linkedin.com/company/{slug_dash}",
            f"https://twitter.com/{slug_no}",
            f"https://github.com/{slug_no}",
        ],
    }
    return json.dumps(schema, indent=2)
