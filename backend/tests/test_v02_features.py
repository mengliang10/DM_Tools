"""Coverage for the v0.2 additions: persona analysis, debate, autofill,
pro-tools, dashboard stats, KB serving, domains/site-profiles."""
from __future__ import annotations

import respx
from httpx import Response

from backend.api.prompt_templates import AUTOFILL_PROMPTS, PERSONA_PROMPTS

# ---------------------------------------------------------------------------
# Templates exist and are well-formed
# ---------------------------------------------------------------------------


def test_persona_prompts_has_four_lenses():
    assert set(PERSONA_PROMPTS.keys()) == {"ceo", "cmo", "cto", "expert"}
    for cfg in PERSONA_PROMPTS.values():
        assert {"title", "focus", "sections"} <= cfg.keys()
        assert "##" in cfg["sections"]  # Markdown headers


def test_autofill_prompts_include_all_known_modules():
    assert {"visibility", "content", "faq", "website", "prompt", "competitor"} <= set(
        AUTOFILL_PROMPTS.keys()
    )


# ---------------------------------------------------------------------------
# Strategic analysis (single-LLM, persona-driven)
# ---------------------------------------------------------------------------


@respx.mock
def test_persona_analysis_with_mocked_llm(client):
    respx.post("https://api.openai.com/v1/chat/completions").mock(
        return_value=Response(
            200,
            json={
                "choices": [{
                    "message": {"content": "<report>## 1. BOTTOM LINE SUMMARY\nAcme is well-positioned.</report>"}
                }]
            },
        )
    )
    r = client.post(
        "/api/keys",
        json={"provider": "openai", "label": "v02", "api_key": "sk", "model": "gpt-4o-mini"},
    )
    kid = r.json()["id"]

    r = client.post("/api/analysis/generate", json={
        "key_id": kid, "persona": "ceo", "language": "en", "market": "global",
    })
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["persona"] == "ceo"
    assert "BOTTOM LINE" in body["content"]
    # report tags should be stripped
    assert "<report>" not in body["content"]

    # Persisted in geo_analyses
    history = client.get("/api/analysis/history").json()
    assert any(h["id"] == body["id"] for h in history)
    assert history[0]["persona"] == "ceo"
    assert history[0]["is_debate"] == 0

    detail = client.get(f"/api/analysis/{body['id']}").json()
    assert detail["content"] == body["content"]

    client.delete(f"/api/keys/{kid}")


# ---------------------------------------------------------------------------
# Multi-LLM debate (3 rounds: independent → critique → synthesise)
# ---------------------------------------------------------------------------


@respx.mock
def test_debate_orchestration(client):
    # Mock both providers; respx will match on URL.
    respx.post("https://api.openai.com/v1/chat/completions").mock(
        return_value=Response(200, json={
            "choices": [{"message": {"content": "Round response from openai"}}]
        })
    )
    respx.post("https://api.anthropic.com/v1/messages").mock(
        return_value=Response(200, json={
            "content": [{"text": "<report>## CONSENSUS\nAgreement reached.</report>"}]
        })
    )

    k1 = client.post("/api/keys", json={
        "provider": "openai", "label": "a", "api_key": "sk-a", "model": "gpt-4o-mini",
    }).json()["id"]
    k2 = client.post("/api/keys", json={
        "provider": "anthropic", "label": "b", "api_key": "sk-b", "model": "claude-haiku-4-5-20251001",
    }).json()["id"]

    r = client.post("/api/analysis/debate", json={
        "key_ids": [k2, k1], "persona": "expert", "language": "en", "market": "global",
    })
    assert r.status_code == 200, r.text
    body = r.json()
    assert "CONSENSUS" in body["content"]
    assert body["debate_json"]["round_1"]
    assert body["debate_json"]["round_2"]
    assert len(body["debate_json"]["participants"]) == 2

    history = client.get("/api/analysis/history").json()
    matching = [h for h in history if h["id"] == body["id"]]
    assert matching and matching[0]["is_debate"] == 1

    client.delete(f"/api/keys/{k1}")
    client.delete(f"/api/keys/{k2}")


def test_debate_requires_two_keys(client):
    k = client.post("/api/keys", json={
        "provider": "openai", "label": "solo", "api_key": "sk", "model": "gpt-4o-mini",
    }).json()["id"]
    r = client.post("/api/analysis/debate", json={"key_ids": [k]})
    assert r.status_code == 400
    assert "2" in r.json()["detail"]
    client.delete(f"/api/keys/{k}")


# ---------------------------------------------------------------------------
# Autofill — JSON parsing + fence stripping
# ---------------------------------------------------------------------------


@respx.mock
def test_autofill_strips_markdown_fences(client):
    respx.post("https://api.openai.com/v1/chat/completions").mock(
        return_value=Response(200, json={
            "choices": [{"message": {"content": '```json\n{"prompts": ["a", "b", "c"]}\n```'}}]
        })
    )
    k = client.post("/api/keys", json={
        "provider": "openai", "label": "auto", "api_key": "sk", "model": "gpt-4o-mini",
    }).json()["id"]

    r = client.post("/api/autofill", json={
        "module": "visibility",
        "key_id": k,
        "brand": "Acme",
        "industry": "SaaS",
        "website": "https://acme.com",
    })
    assert r.status_code == 200, r.text
    assert r.json() == {"prompts": ["a", "b", "c"]}
    client.delete(f"/api/keys/{k}")


def test_autofill_unknown_module_returns_400(client):
    k = client.post("/api/keys", json={
        "provider": "openai", "label": "x", "api_key": "sk", "model": "gpt-4o-mini",
    }).json()["id"]
    r = client.post("/api/autofill", json={
        "module": "not-a-real-module", "key_id": k, "brand": "x",
    })
    assert r.status_code == 400
    client.delete(f"/api/keys/{k}")


@respx.mock
def test_autofill_rejects_invalid_json(client):
    respx.post("https://api.openai.com/v1/chat/completions").mock(
        return_value=Response(200, json={
            "choices": [{"message": {"content": "this is not json at all"}}]
        })
    )
    k = client.post("/api/keys", json={
        "provider": "openai", "label": "y", "api_key": "sk", "model": "gpt-4o-mini",
    }).json()["id"]
    r = client.post("/api/autofill", json={
        "module": "visibility", "key_id": k, "brand": "x",
    })
    assert r.status_code == 502
    assert "JSON" in r.json()["detail"]
    client.delete(f"/api/keys/{k}")


# ---------------------------------------------------------------------------
# Pro Tools — citation grading + advanced schema generation
# ---------------------------------------------------------------------------


@respx.mock
def test_cite_grade_scores_and_returns_findings(client):
    sample_html = (
        "<html><body>"
        "<h1>Acme is the leading widget maker</h1>"
        "<p>Acme produces 2,500,000 widgets per year. We ship 1,000+ daily.</p>"
        "<table>...</table><table>...</table>"
        "<ul><li>1</li><li>2</li><li>3</li><li>4</li><li>5</li><li>6</li></ul>"
        '<script type="application/ld+json">{"@type":"Article"}</script>'
        "</body></html>"
    )
    respx.get("https://example.test/article").mock(
        return_value=Response(200, text=sample_html)
    )
    r = client.post("/api/pro/cite-grade", json={"url": "https://example.test/article"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert 0 <= body["score"] <= 100
    assert isinstance(body["findings"], list)
    assert len(body["findings"]) > 0


def test_generate_schema_requires_active_profile(client):
    # No active profile by default in test session
    client.post("/api/profiles/active/deactivate", json={})
    r = client.post("/api/pro/generate-schema", json={})
    assert r.status_code == 400
    assert "profile" in r.json()["detail"].lower()


def test_generate_schema_with_active_profile(client):
    pid = client.post("/api/profiles", json={
        "name": "Schema Test", "brand": "Acme", "website": "https://acme.com",
        "industry": "SaaS", "notes": "test brand",
    }).json()["id"]
    client.post(f"/api/profiles/{pid}/activate", json={})

    r = client.post("/api/pro/generate-schema", json={})
    assert r.status_code == 200
    schema_str = r.json()["schema"]
    assert "@context" in schema_str
    assert "Acme" in schema_str
    assert "Organization" in schema_str

    client.post("/api/profiles/active/deactivate", json={})
    client.delete(f"/api/profiles/{pid}")


# ---------------------------------------------------------------------------
# Dashboard stats
# ---------------------------------------------------------------------------


def test_dashboard_stats_returns_correct_shape(client):
    r = client.get("/api/dashboard/stats")
    assert r.status_code == 200
    body = r.json()
    # Shape — not specific values (other tests may have inserted runs).
    for key in ("visibility_index", "citation_rate", "audit_readiness",
                "global_competitors_count", "global_competitors_list", "funnel"):
        assert key in body, f"missing {key} in dashboard stats response"
    assert isinstance(body["visibility_index"], int)
    assert 0 <= body["visibility_index"] <= 100
    assert 0 <= body["citation_rate"] <= 100
    for stage in ("top_of_funnel", "middle_of_funnel", "bottom_of_funnel"):
        assert stage in body["funnel"]
        assert "mentions" in body["funnel"][stage]
        assert "total" in body["funnel"][stage]
        assert "competitors" in body["funnel"][stage]


# ---------------------------------------------------------------------------
# Knowledge base
# ---------------------------------------------------------------------------


def test_kb_list_returns_files(client):
    r = client.get("/api/kb")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_kb_serve_path_traversal_blocked(client):
    r = client.get("/api/kb/../etc/passwd")
    # FastAPI will normalise the path and return 404; either way, never 200
    assert r.status_code in (400, 404)


def test_kb_serve_non_md_extension_blocked(client):
    r = client.get("/api/kb/foo.txt")
    assert r.status_code == 400


# ---------------------------------------------------------------------------
# Domains + site-profiles
# ---------------------------------------------------------------------------


def test_domains_crud(client):
    r = client.post("/api/domains", json={
        "name": "Main site", "domain": "main.test", "industry": "SaaS",
    })
    assert r.status_code == 201
    did = r.json()["id"]

    listing = client.get("/api/domains").json()
    assert any(d["id"] == did for d in listing)

    r = client.put(f"/api/domains/{did}", json={
        "name": "Renamed", "domain": "main.test", "industry": "SaaS",
    })
    assert r.status_code == 200

    # Add a site-profile under it
    r = client.post("/api/site-profiles", json={
        "domain_id": did, "page_url": "https://main.test/x", "page_type": "blog",
    })
    assert r.status_code == 201
    spid = r.json()["id"]

    sps = client.get("/api/site-profiles").json()
    assert any(s["id"] == spid for s in sps)

    # Cleanup — domain delete should cascade
    client.delete(f"/api/domains/{did}")
    sps_after = client.get("/api/site-profiles").json()
    assert not any(s["id"] == spid for s in sps_after)
