# Feature checklist

| Module | Feature | Source repo | Status |
|---|---|---|---|
| Settings | API key CRUD (encrypted at rest) | geo | ✅ |
| Settings | Active profile picker | geo | ✅ |
| Settings | Theme switcher (dark/light) | new | ✅ |
| GEO · Visibility | Multi-LLM parallel query | geo | ✅ |
| GEO · Visibility | Brand mention detection | geo | ✅ |
| GEO · Visibility | Citation detection | geo | ✅ |
| GEO · Visibility | Sentiment scoring | geo | ✅ |
| GEO · Visibility | Competitor discovery | geo | ✅ |
| GEO · Visibility | Share-of-voice | geo | ✅ |
| GEO · Content | Blog / social / whitepaper / email / product page | geo | ✅ |
| GEO · Content | 14-language output | geo | ✅ |
| GEO · FAQ | Q&A + JSON-LD `FAQPage` schema | geo | ✅ |
| GEO · Prompts | Per-profile prompt library | geo | ✅ |
| GEO · Competitors | Tracked brand list | geo | ✅ |
| Analyse · Website | 15-point GEO/SEO scorecard | geo | ✅ |
| Analyse · Website | Martech detection inline | geo | ✅ |
| Analyse · Website | Lighthouse via PageSpeed Insights | geo | ✅ |
| Analyse · Martech | Standalone scan | martech-scanner | ✅ (server-side) |
| Analyse · AIO | AIO Eligibility (11 checks) | aio-tool | ✅ |
| Analyse · AIO | E-E-A-T Scorer (4 dimensions) | aio-tool | ✅ |
| Analyse · AIO | Flesch Reading Ease + grade level | aio-tool | ✅ |
| Analyse · AIO | Passage Ranker | aio-tool | ✅ |
| Analyse · AIO | Content Gap Analyser | aio-tool | ✅ |
| Analyse · AIO | Snippet Optimizer + templates | aio-tool | ✅ |
| Analyse · SEO | On-page Scorecard (weighted A–F) | seo-tool | ✅ |
| Analyse · SEO | SERP Preview + CTR estimate | seo-tool | ✅ |
| Analyse · SEO | Keyword density / bigrams / trigrams | seo-tool | ✅ |
| Analyse · SEO | Content Quality Scorer | seo-tool | ✅ |
| Analyse · SEO | Technical Audit | seo-tool | ✅ |
| Analyse · SEO | Schema.org Validator (13 types) | seo-tool | ✅ |
| Logs · History | Unified timeline across modules | new | ✅ |
| **Added in v0.2** | | | |
| GEO · Strategic Analysis | Persona-driven (CEO / CMO / CTO / SEO Expert) single-LLM report | geo | ✅ |
| GEO · Strategic Analysis | Multi-LLM 3-round debate orchestrator | geo | ✅ |
| GEO · Prompts | One-click ✨ Autofill — LLM-suggested prompts from active brand | geo | ✅ |
| GEO · Pro Tools | Citation-probability grader for any URL | geo | ✅ |
| GEO · Pro Tools | Advanced JSON-LD `Organization` schema generator | geo | ✅ |
| Analyse · Website | **Deep DOM & Security scan** (security headers, robots.txt with GPTBot check, link/script/image analysis, JSON-LD, ARIA, DOM stats, narrative insights) | geo | ✅ |
| Manage · Profiles | Full CRUD with linked API keys (was picker-only in v0.1) | geo | ✅ |
| Manage · Domains & Pages | Multi-domain + per-page tracking under each profile | geo | ✅ |
| Meta · Knowledge Base | 39 reference articles served at `/api/kb/{filename}` | geo | ✅ |
| Meta · Dashboard Stats | Server-side aggregator at `/api/dashboard/stats` | geo | ✅ |
| Visibility | Per-competitor coloured highlighting alongside brand | geo | ✅ |

## Deferred (planned)

| Module | Feature | Rationale |
|---|---|---|
| AEO · Bot Tracker | Passive AI-crawler analytics via JS snippet | Different paradigm — needs separate user-instrumentation flow |
| AEO · Content Submission | Content distribution to AI indexes | Tied to bot tracker |
| GEO · Raindrop Sync | Push competitors to Raindrop bookmarks | Out of scope per user instruction |
| Auth | JWT login | Single-user localhost is the v1 brief |
| Streamlit | Executive dashboard | Out of scope per user instruction |
| Static Pages build | GitHub Pages mode (analyzers only) | Roadmap item |
