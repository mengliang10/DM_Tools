import { api } from "../../utils/api.js";
import { toast } from "../../components/toast.js";
import { escapeHtml, renderMarkdown, relativeTime } from "../../utils/format.js";

export async function mount(view) {
  const [keys, prompts, runs] = await Promise.all([
    api.get("/api/keys").catch(() => []),
    api.get("/api/prompts").catch(() => []),
    api.get("/api/visibility/runs").catch(() => []),
  ]);

  if (keys.length === 0) {
    view.innerHTML = `
      <div class="card">
        <h2 class="font-semibold mb-2">No API keys configured</h2>
        <p class="text-muted text-sm">Add at least one LLM API key from <strong>Settings</strong> (sidebar) to run a visibility check.</p>
      </div>`;
    return;
  }

  view.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <form id="vis-form" class="card lg:col-span-1 space-y-3">
        <div>
          <label class="text-xs font-semibold uppercase text-muted">Brand</label>
          <input class="input" name="brand" required placeholder="e.g. Acme Co" />
        </div>
        <div>
          <label class="text-xs font-semibold uppercase text-muted">Prompt</label>
          <textarea class="textarea" name="prompt_text" rows="4" required placeholder="What are the best CRM tools for SMBs?"></textarea>
          ${prompts.length ? `
            <select id="prompt-pick" class="select mt-2">
              <option value="">— or pick a saved prompt —</option>
              ${prompts.map(p => `<option value="${escapeHtml(p.text)}">${escapeHtml((p.description||"").slice(0,40)) || escapeHtml(p.text.slice(0,60))}</option>`).join("")}
            </select>` : ""}
        </div>
        <div>
          <label class="text-xs font-semibold uppercase text-muted">LLMs to query</label>
          <div class="space-y-1 mt-1 max-h-40 overflow-y-auto">
            ${keys.map(k => `
              <label class="flex items-center gap-2 text-sm">
                <input type="checkbox" name="provider_ids" value="${k.id}" checked />
                <span class="font-medium">${escapeHtml(k.provider)}</span>
                <span class="text-muted text-xs">${escapeHtml(k.model || "")} ${k.label ? `· ${escapeHtml(k.label)}` : ""}</span>
              </label>
            `).join("")}
          </div>
        </div>
        <div>
          <label class="text-xs font-semibold uppercase text-muted">Language</label>
          <select class="select" name="language">
            <option value="en">English</option><option value="ja">Japanese</option>
            <option value="zh-CN">Simplified Chinese</option><option value="zh-TW">Traditional Chinese</option>
            <option value="ko">Korean</option><option value="de">German</option>
            <option value="fr">French</option><option value="es">Spanish</option>
            <option value="pt">Portuguese</option><option value="id">Indonesian</option>
          </select>
        </div>
        <button type="submit" class="btn btn-primary w-full">Run visibility check</button>
      </form>

      <div class="lg:col-span-2 space-y-4">
        <div id="results" class="space-y-3"></div>
        <div class="card">
          <h3 class="font-semibold mb-2">Recent runs</h3>
          <ul id="run-list" class="text-sm divide-y divide-border">
            ${runs.length === 0 ? `<li class="text-muted py-2">No runs yet.</li>` :
              runs.slice(0, 10).map(r => `
                <li class="py-2 flex items-center justify-between">
                  <button class="text-left flex-1 truncate hover:underline" data-run-id="${r.id}">
                    <span class="font-medium">${escapeHtml(r.brand)}</span>
                    <span class="text-muted">— ${escapeHtml(r.prompt_text.slice(0, 60))}</span>
                  </button>
                  <span class="text-xs text-muted">${relativeTime(r.run_at)}</span>
                </li>
              `).join("")}
          </ul>
        </div>
      </div>
    </div>
  `;

  const form = view.querySelector("#vis-form");
  view.querySelector("#prompt-pick")?.addEventListener("change", (e) => {
    if (e.target.value) form.prompt_text.value = e.target.value;
  });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const provider_ids = fd.getAll("provider_ids").map(Number);
    if (provider_ids.length === 0) return toast("Pick at least one LLM", "error");
    const payload = {
      brand: fd.get("brand"),
      prompt_text: fd.get("prompt_text"),
      provider_ids,
      language: fd.get("language") || "en",
    };
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true; btn.textContent = "Querying…";
    view.querySelector("#results").innerHTML = `<div class="card text-muted text-sm">Querying ${provider_ids.length} model(s) in parallel…</div>`;
    try {
      const out = await api.post("/api/visibility/run", payload);
      renderResults(view.querySelector("#results"), out);
      toast("Run complete", "success");
    } catch (err) {
      toast(err.message, "error");
    } finally {
      btn.disabled = false; btn.textContent = "Run visibility check";
    }
  });

  view.querySelectorAll("[data-run-id]").forEach((b) => {
    b.addEventListener("click", async () => {
      const id = b.getAttribute("data-run-id");
      try {
        const out = await api.get(`/api/visibility/runs/${id}`);
        renderResults(view.querySelector("#results"),
          { run_id: out.run.id, prompt: out.run.prompt_text, brand: out.run.brand, results: out.results });
      } catch (err) { toast(err.message, "error"); }
    });
  });
}

function renderResults(target, run) {
  const totalMentions = run.results.filter(r => r.brand_mentioned).length;
  const sov = run.results.reduce((s, r) => s + (r.sov_score || 0), 0) / (run.results.length || 1);
  target.innerHTML = `
    <div class="card">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="font-semibold">Run #${run.run_id} · ${escapeHtml(run.brand)}</h3>
          <p class="text-xs text-muted truncate">${escapeHtml(run.prompt)}</p>
        </div>
        <div class="text-right">
          <div class="text-xs text-muted">Mentions</div>
          <div class="text-xl font-bold">${totalMentions} / ${run.results.length}</div>
          <div class="text-xs text-muted">SoV ${(sov * 100).toFixed(0)}%</div>
        </div>
      </div>
    </div>
    ${run.results.map(r => `
      <div class="card">
        <div class="flex items-center justify-between mb-2">
          <div>
            <span class="font-semibold">${escapeHtml(r.label || r.provider)}</span>
            <span class="text-xs text-muted">${escapeHtml(r.model)}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="badge ${r.brand_mentioned ? "badge-good" : ""}">${r.brand_mentioned ? "Mentioned" : "Not mentioned"}</span>
            <span class="badge ${r.citation_detected ? "badge-good" : ""}">${r.citation_detected ? "Cited" : "No cite"}</span>
            <span class="badge badge-${r.sentiment_label === "positive" ? "good" : r.sentiment_label === "negative" ? "bad" : ""}">${r.sentiment_label}</span>
          </div>
        </div>
        ${r.error ? `<div class="text-bad text-sm">${escapeHtml(r.error)}</div>` :
        `<div class="prose-dm text-sm">${highlightBrand(renderMarkdown(r.response), run.brand)}</div>
         ${r.competitors_found?.length ? `<div class="mt-2 text-xs text-muted">Other brands: ${r.competitors_found.map(c => `<span class="badge">${escapeHtml(c)}</span>`).join(" ")}</div>` : ""}`}
      </div>
    `).join("")}
  `;
}

function highlightBrand(html, brand) {
  if (!brand) return html;
  const re = new RegExp(`(${brand.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")})`, "gi");
  return html.replace(re, '<mark style="background:color-mix(in oklab, var(--accent) 30%, transparent); color:inherit; padding:0 2px; border-radius:3px">$1</mark>');
}
