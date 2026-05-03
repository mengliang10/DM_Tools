# API Reference

All routes are mounted under `/api`. The OpenAPI/Swagger UI is available at `/docs` and the JSON schema at `/openapi.json` once the backend is running.

## Meta

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Liveness + reports `encryption_configured` and provider list |
| GET | `/api/providers` | `{ provider: [model_id, …] }` for all 15 providers |
| GET | `/api/settings` | KV map of all rows in the `settings` table |
| POST | `/api/settings` | Upsert one KV row — `{ key, value }` |

## API Keys

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/keys` | List keys (provider, label, model, created_at — never the key itself) |
| POST | `/api/keys` | Add a key — `{ provider, label, api_key, model }` |
| PUT | `/api/keys/{id}` | Update a key (the new `api_key` is re-encrypted) |
| DELETE | `/api/keys/{id}` | Delete |

## Profiles

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/profiles` | List |
| POST | `/api/profiles` | Create |
| GET | `/api/profiles/{id}` | Detail |
| PUT | `/api/profiles/{id}` | Update |
| DELETE | `/api/profiles/{id}` | Cascade-delete every owned row across all tables |
| POST | `/api/profiles/{id}/activate` | Set as the active profile (stored in `settings`) |
| POST | `/api/profiles/active/deactivate` | Clear active profile |
| GET | `/api/profiles/active/current` | `{ active_profile_id, profile }` |

## Prompts

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/prompts` | List for the active profile (or NULL/global) |
| POST | `/api/prompts` | Add — `{ text, description, funnel_stage }` |
| PUT | `/api/prompts/{id}` | Update |
| DELETE | `/api/prompts/{id}` | Delete |

## Competitors

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/competitors` | List |
| POST | `/api/competitors` | Add — `{ brand_name, domain, competitor_type }` |
| PUT | `/api/competitors/{id}` | Update |
| DELETE | `/api/competitors/{id}` | Delete |

## Visibility

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/visibility/run` | Run a prompt against multiple LLMs in parallel |
| GET | `/api/visibility/runs` | History (last 100) |
| GET | `/api/visibility/runs/{id}` | Run detail with all per-model rows |

`POST /api/visibility/run` body:
```json
{
  "prompt_text": "What are the best CRMs for SMB?",
  "brand": "Acme",
  "provider_ids": [1, 4, 7],
  "competitors": ["HubSpot", "Salesforce"],
  "language": "en",
  "funnel_stage": "top_of_funnel"
}
```

Returns:
```json
{
  "run_id": 42,
  "prompt": "...",
  "brand": "Acme",
  "results": [
    {
      "provider": "openai",
      "model": "gpt-4o-mini",
      "label": "openai",
      "response": "Acme is the leading CRM for…",
      "brand_mentioned": true,
      "citation_detected": false,
      "sentiment_label": "positive",
      "sov_score": 0.5,
      "competitors_found": ["HubSpot"],
      "error": null
    }
  ]
}
```

## Content generation

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/content/generate` | Long-form content from one model |
| GET | `/api/content/history` | Recent generations |
| GET | `/api/content/{id}` | Detail with full content |

## FAQ generation

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/faq/generate` | Q&A pairs + JSON-LD schema |
| GET | `/api/faq/history` | Recent |
| GET | `/api/faq/{id}` | Detail |

## Analysers

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/website/analyze` | Server-side fetch + 15-point scorecard + martech + Lighthouse |
| GET | `/api/website/history` | Recent |
| GET | `/api/website/{id}` | Detail |
| POST | `/api/martech/scan` | Server-side fetch + martech detection |
| GET | `/api/martech/history` | Recent |

## History

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/history?limit=200` | Unified UNION ALL across visibility / content / faq / website / martech |

## Errors

All errors come back as JSON:
```json
{ "detail": "API key 7 not found" }
```

| Status | Meaning |
|---|---|
| 400 | Validation failure |
| 404 | Row not found |
| 502 | Upstream LLM or URL fetch failed |
| 500 | Internal error |
