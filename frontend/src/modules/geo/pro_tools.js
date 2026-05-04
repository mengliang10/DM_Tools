// Pro Tools — Citation grading + advanced JSON-LD schema generation.
import { api } from "../../utils/api.js";
import { toast, toastError } from "../../components/toast.js";
import { escapeHtml } from "../../utils/format.js";

export function mount(view) {
  view.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Citation grader -->
      <div class="card">
        <h3 class="font-semibold mb-2">Citation Probability Grader</h3>
        <p class="text-xs text-muted mb-3">Fetches a URL and scores how likely an LLM is to cite it (entity salience, structural density, factual density, schema presence).</p>
        <form id="cite-form" class="space-y-2">
          <input class="input" name="url" placeholder="https://example.com/post" required />
          <button class="btn btn-primary w-full">Grade</button>
        </form>
        <div id="cite-out" class="mt-3 text-sm text-muted">Submit a URL to see the score.</div>
      </div>

      <!-- Schema generator -->
      <div class="card">
        <h3 class="font-semibold mb-2">Advanced JSON-LD Schema Generator</h3>
        <p class="text-xs text-muted mb-3">Builds an <code>Organization</code> schema block from your <strong>active profile</strong>'s brand / website / industry / notes. Paste into a <code>&lt;script type="application/ld+json"&gt;</code> tag on your site.</p>
        <button id="gen-schema" class="btn btn-primary w-full">Generate from active profile</button>
        <div id="schema-out" class="mt-3 text-sm text-muted">Click <strong>Generate</strong> to produce a JSON-LD block.</div>
      </div>
    </div>
  `;

  view.querySelector("#cite-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const url = new FormData(e.currentTarget).get("url");
    const btn = e.currentTarget.querySelector("button");
    btn.disabled = true; btn.textContent = "Fetching…";
    try {
      const r = await api.post("/api/pro/cite-grade", { url });
      renderCite(view.querySelector("#cite-out"), r);
      toast(`Score: ${r.score}/100`, "success");
    } catch (err) { toastError(err); }
    finally { btn.disabled = false; btn.textContent = "Grade"; }
  });

  view.querySelector("#gen-schema").addEventListener("click", async (e) => {
    e.target.disabled = true; e.target.textContent = "Generating…";
    try {
      const r = await api.post("/api/pro/generate-schema", {});
      renderSchema(view.querySelector("#schema-out"), r.schema);
      toast("Schema ready", "success");
    } catch (err) { toastError(err); }
    finally { e.target.disabled = false; e.target.textContent = "Generate from active profile"; }
  });
}

function renderCite(target, r) {
  const colour = r.score >= 70 ? "good" : r.score >= 40 ? "warn" : "bad";
  target.innerHTML = `
    <div class="flex items-center justify-between mb-2">
      <span class="text-xs text-muted truncate">${escapeHtml(r.url)}</span>
      <span class="text-2xl font-bold text-${colour}">${r.score}/100</span>
    </div>
    <div class="progress mb-3"><div style="width:${r.score}%; background:var(--${colour})"></div></div>
    <ul class="text-xs space-y-1">
      ${r.findings.map(f => `<li>• ${escapeHtml(f)}</li>`).join("")}
    </ul>
  `;
}

function renderSchema(target, schema) {
  const wrapped = `<script type="application/ld+json">\n${schema}\n</script>`;
  target.innerHTML = `
    <div class="flex items-center justify-between mb-2">
      <span class="text-xs text-muted">Ready to paste into your &lt;head&gt;</span>
      <button class="btn btn-outline" id="copy-schema">Copy</button>
    </div>
    <pre class="text-xs overflow-x-auto p-3 rounded-md" style="background:color-mix(in oklab, var(--fg) 8%, transparent)"><code>${escapeHtml(wrapped)}</code></pre>
  `;
  target.querySelector("#copy-schema").addEventListener("click", () => {
    navigator.clipboard.writeText(wrapped);
    toast("Copied", "success");
  });
}
