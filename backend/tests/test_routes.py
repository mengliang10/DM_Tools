"""Happy-path integration tests for every router (no live LLM calls)."""
from __future__ import annotations

import respx
from httpx import Response


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    j = r.json()
    assert j["status"] == "ok"
    assert j["encryption_configured"] is True
    assert "openai" in j["providers"]


def test_providers(client):
    r = client.get("/api/providers")
    assert r.status_code == 200
    assert "anthropic" in r.json()


def test_keys_crud(client):
    body = {"provider": "openai", "label": "test", "api_key": "sk-test", "model": "gpt-4o-mini"}
    r = client.post("/api/keys", json=body)
    assert r.status_code == 201
    kid = r.json()["id"]

    r = client.get("/api/keys")
    assert any(k["id"] == kid for k in r.json())

    body["label"] = "renamed"
    r = client.put(f"/api/keys/{kid}", json=body)
    assert r.status_code == 200

    r = client.delete(f"/api/keys/{kid}")
    assert r.status_code == 200
    r = client.get("/api/keys")
    assert not any(k["id"] == kid for k in r.json())


def test_prompts_default_seeded(client):
    r = client.get("/api/prompts")
    assert r.status_code == 200
    assert len(r.json()) >= 5  # default seed has 8


def test_competitors_crud(client):
    r = client.post("/api/competitors", json={"brand_name": "Rival Inc", "domain": "rival.com"})
    assert r.status_code == 201
    cid = r.json()["id"]
    assert any(c["id"] == cid for c in client.get("/api/competitors").json())
    client.delete(f"/api/competitors/{cid}")


def test_profile_lifecycle(client):
    r = client.post("/api/profiles", json={"name": "Test profile", "brand": "Acme"})
    assert r.status_code == 201
    pid = r.json()["id"]
    r = client.post(f"/api/profiles/{pid}/activate")
    assert r.status_code == 200
    r = client.get("/api/profiles/active/current")
    assert r.json()["active_profile_id"] == pid
    client.post("/api/profiles/active/deactivate")
    client.delete(f"/api/profiles/{pid}")


def test_settings_kv(client):
    r = client.post("/api/settings", json={"key": "test_setting", "value": "v1"})
    assert r.status_code == 200
    assert client.get("/api/settings").json().get("test_setting") == "v1"


def test_history_endpoint(client):
    r = client.get("/api/history?limit=10")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


@respx.mock
def test_visibility_run_with_mocked_llm(client):
    respx.post("https://api.openai.com/v1/chat/completions").mock(
        return_value=Response(
            200,
            json={"choices": [{"message": {"content": "Acme is the leading CRM."}}]},
        )
    )
    # Add a key first
    r = client.post(
        "/api/keys",
        json={"provider": "openai", "label": "mocked", "api_key": "sk-mock", "model": "gpt-4o-mini"},
    )
    kid = r.json()["id"]

    r = client.post(
        "/api/visibility/run",
        json={
            "prompt_text": "What is the best CRM?",
            "brand": "Acme",
            "provider_ids": [kid],
            "competitors": ["HubSpot", "Salesforce"],
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert body["brand"] == "Acme"
    assert len(body["results"]) == 1
    res = body["results"][0]
    assert res["brand_mentioned"] is True
    assert res["sentiment_label"] == "positive"
    assert res["error"] is None

    # Run is persisted
    runs = client.get("/api/visibility/runs").json()
    assert any(r["id"] == body["run_id"] for r in runs)
    detail = client.get(f"/api/visibility/runs/{body['run_id']}").json()
    assert detail["run"]["brand"] == "Acme"

    client.delete(f"/api/keys/{kid}")
