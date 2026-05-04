// Strategic Analysis — single-LLM persona-driven + multi-LLM debate
// Persona picker (CEO / CMO / CTO / SEO Expert), debate toggle, history list.
import { api } from "../../utils/api.js";
import { toast, toastError } from "../../components/toast.js";
import { escapeHtml, renderMarkdown, relativeTime } from "../../utils/format.js";

const PERSONAS = [
  { id: "ceo",    label: "CEO",        sub: "Bottom-line, market positioning, valuation" },
  { id: "cmo",    label: "CMO",        sub: "Brand sentiment, journey, citability" },
  { id: "cto",    label: "CTO",        sub: "Architecture, schema, RAG, performance" },
  { id: "expert", label: "SEO Expert", sub: "Multi-modal GEO/SEO/AIO masterplan" },
];

const MARKETS = ["global", "us", "uk", "eu", "apac", "japan", "korea", "china", "sea"];

export async function mount(view) {
  const [keys, history] = await Promise.all([
    api.get("/api/keys").catch(() => []),
    api.get("/api/analysis/history").catch(() => []),
  ]);

  if (keys.length === 0) {
    view.innerHTML = `<div class="card">Add an LLM API key in <strong>Settings</strong> first.</div>`;
    return;
  }

  view.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <form id="form" class="card lg:col-span-1 space-y-3">
        <div>
          <label class="text-xs font-semibold uppercase text-muted">Mode</label>
          <div class="tabs mt-1">
            <button type="button" data-mode="single" class="active">Single LLM</button>
            <button type="button" data-mode="debate">Multi-LLM Debate</button>
          </div>
          <p class="text-xs text-muted mt-1" id="mode-hint">One model produces a persona-shaped report.</p>
        </div>

        <div>
          <label class="text-xs font-semibold uppercase text-muted">Persona lens</label>
          <div class="grid grid-cols-2 gap-1 mt-1">
            ${PERSONAS.map((p, i) => `
              <label class="flex items-start gap-2 p-2 rounded-md border border-border hover:border-accent cursor-pointer">
                <input type="radio" name="persona" value="${p.id}" ${i === 3 ? "checked" : ""} class="mt-1" />
                <div>
                  <div class="font-medium text-sm">${p.label}</div>
                  <div class="text-xs text-muted">${escapeHtml(p.sub)}</div>
                </div>
              </label>
            `).join("")}
          </div>
        </div>

        <div id="single-key-block">
          <label class="text-xs font-semibold uppercase text-muted">Model (key)</label>
          <select class="select" name="key_id">
            ${keys.map(k => `<option value="${k.id}">${escapeHtml(k.provider)} · ${escapeHtml(k.model)}${k.label ? ` (${escapeHtml(k.label)})` : ""}</option>`).join("")}
          </select>
        </div>

        <div id="debate-keys-block" class="hidden">
          <label class="text-xs font-semibold uppercase text-muted">Debate participants (pick 2+)</label>
          <div class="space-y-1 mt-1 max-h-40 overflow-y-auto">
            ${keys.map(k => `
              <label class="flex items-center gap-2 text-sm">
                <input type="checkbox" name="debate_keys" value="${k.id}" />
                <span class="font-medium">${escapeHtml(k.provider)}</span>
                <span class="text-muted text-xs">${escapeHtml(k.model)}</span>
              </label>
            `).join("")}
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="text-xs font-semibold uppercase text-muted">Market</label>
            <select class="select" name="market">
              ${MARKETS.map(m => `<option value="${m}">${m.toUpperCase()}</option>`).join("")}
            </select>
          </div>
          <div>
            <label class="text-xs font-semibold uppercase text-muted">Language</label>
            <select class="select" name="language">
              <option value="en">English</option><option value="ja">Japanese</option>
              <option value="zh-CN">Simplified Chinese</option><option value="ko">Korean</option>
              <option value="de">German</option><option value="fr">French</option>
              <option value="es">Spanish</option>
            </select>
          </div>
        </div>

        <label class="flex items-center gap-2 text-sm">
          <input type="checkbox" name="read_experience" />
          <span>Inject experience notes from <code class="text-xs">data/experience/*.md</code></span>
        </label>

        <button type="submit" class="btn btn-primary w-full">Run analysis</button>
      </form>

      <div class="lg:col-span-2 space-y-4">
        <div id="output" class="card text-muted text-sm">
          Pick a persona and a model (or 2+ models for debate), then click <strong>Run analysis</strong>.
        </div>
        <div class="card">
          <h3 class="font-semibold mb-2">Recent analyses</h3>
          ${history.length === 0 ? `<div class="text-muted text-sm">No analyses yet.</div>` :
            `<ul class="divide-y divide-border text-sm">${history.slice(0, 12).map(h => `
              <li class="py-2 flex justify-between gap-2">
                <button class="text-left flex-1 truncate hover:underline" data-load="${h.id}">
                  <span class="font-medium">${escapeHtml(h.brand || "—")}</span>
                  <span class="badge ml-1">${escapeHtml(h.persona)}</span>
                  ${h.is_debate ? `<span class="badge badge-good ml-1">debate</span>` : ""}
                  <span class="text-muted">· ${escapeHtml(h.market)}</span>
                </button>
                <span class="text-xs text-muted">${relativeTime(h.created_at)}</span>
              </li>`).join("")}</ul>`}
        </div>
      </div>
    </div>
  `;

  let mode = "single";
  const modeHint = view.querySelector("#mode-hint");
  view.querySelectorAll("[data-mode]").forEach(b => b.addEventListener("click", () => {
    mode = b.getAttribute("data-mode");
    view.querySelectorAll("[data-mode]").forEach(x => x.classList.toggle("active", x === b));
    view.querySelector("#single-key-block").classList.toggle("hidden", mode === "debate");
    view.querySelector("#debate-keys-block").classList.toggle("hidden", mode !== "debate");
    modeHint.textContent = mode === "debate"
      ? "2+ models independently audit, critique each other, then synthesise consensus."
      : "One model produces a persona-shaped report.";
  }));

  const form = view.querySelector("#form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const payload = {
      persona: fd.get("persona") || "expert",
      market: fd.get("market") || "global",
      language: fd.get("language") || "en",
      read_experience: fd.get("read_experience") === "on",
    };
    let endpoint;
    if (mode === "debate") {
      const ids = fd.getAll("debate_keys").map(Number);
      if (ids.length < 2) return toast("Pick at least 2 LLMs for debate", "error");
      payload.key_ids = ids;
      endpoint = "/api/analysis/debate";
    } else {
      payload.key_id = Number(fd.get("key_id"));
      endpoint = "/api/analysis/generate";
    }

    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true; btn.textContent = mode === "debate" ? "Debating…" : "Analysing…";
    view.querySelector("#output").innerHTML = `<div class="text-muted text-sm">${mode === "debate" ? "3-round debate in progress — this can take 60–120s…" : "Calling LLM…"}</div>`;

    try {
      const out = await api.post(endpoint, payload);
      renderResult(view.querySelector("#output"), out, mode === "debate");
      toast(mode === "debate" ? "Debate consensus ready" : "Analysis ready", "success");
    } catch (err) {
      toastError(err);
      view.querySelector("#output").innerHTML = `<div class="text-muted text-sm">Analysis failed.</div>`;
    } finally {
      btn.disabled = false; btn.textContent = "Run analysis";
    }
  });

  view.querySelectorAll("[data-load]").forEach((b) => b.addEventListener("click", async () => {
    try {
      const r = await api.get(`/api/analysis/${b.getAttribute("data-load")}`);
      renderResult(view.querySelector("#output"), r, !!r.is_debate);
    } catch (e) { toastError(e); }
  }));
}

function renderResult(target, r, isDebate) {
  const debate = r.debate_json && typeof r.debate_json === "object" ? r.debate_json : null;
  target.innerHTML = `
    <div class="flex items-center justify-between mb-3">
      <h3 class="font-semibold">
        ${isDebate ? "Debate consensus" : "Persona analysis"}
        ${r.persona ? `<span class="badge ml-2">${escapeHtml(r.persona)}</span>` : ""}
      </h3>
      <button class="btn btn-outline" id="copy-md">Copy Markdown</button>
    </div>
    <div class="prose-dm">${renderMarkdown(r.content)}</div>
    ${debate ? renderDebateLog(debate) : ""}
  `;
  target.querySelector("#copy-md")?.addEventListener("click", () => {
    navigator.clipboard.writeText(r.content);
    toast("Copied", "success");
  });
}

function renderDebateLog(debate) {
  const round = (label, items) => `
    <details class="card mt-3">
      <summary class="cursor-pointer font-semibold">${label} (${items.length} models)</summary>
      <div class="mt-3 space-y-3">
        ${items.map(it => `
          <div>
            <div class="text-xs font-semibold text-muted uppercase">${escapeHtml(it.model)}</div>
            <div class="prose-dm text-sm mt-1">${renderMarkdown(it.content || "")}</div>
          </div>
        `).join("")}
      </div>
    </details>`;
  return `
    <h4 class="font-semibold mt-4">Debate transcript</h4>
    <p class="text-xs text-muted">Participants: ${(debate.participants || []).map(p => `<span class="badge">${escapeHtml(p)}</span>`).join(" ")}</p>
    ${round("Round 1 — Independent audits", debate.round_1 || [])}
    ${round("Round 2 — Peer critique", debate.round_2 || [])}
  `;
}
