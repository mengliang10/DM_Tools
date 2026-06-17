import { api } from "../../utils/api.js";
import { toast, toastError } from "../../components/toast.js";
import { escapeHtml, gradeFromScore, pct, relativeTime } from "../../utils/format.js";

function statStrip(s) {
  if (!s) return "";
  const items = [
    ["Scheme",         s.scheme?.toUpperCase()],
    ["Words",          s.word_count],
    ["Images",         s.image_count],
    ["Alt-text ratio", s.image_alt_ratio != null ? `${Math.round(s.image_alt_ratio * 100)}%` : null],
    ["Load",           s.load_seconds != null ? `${s.load_seconds.toFixed(2)}s` : null],
    ["Internal links", s.internal_links],
    ["Schema types",   s.schema_types?.length ? s.schema_types.join(", ") : null],
  ].filter(([, v]) => v != null && v !== "");
  return items
    .map(([k, v]) => `<span class="mr-3"><span class="text-muted">${k}:</span> ${escapeHtml(String(v))}</span>`)
    .join("");
}

export async function mount(view) {
  const history = await api.get("/api/website/history").catch(() => []);
  view.innerHTML = `
    <form id="form" class="card flex flex-col md:flex-row gap-2 mb-6">
      <input class="input flex-1" name="url" placeholder="https://example.com" required />
      <input class="input md:w-60" name="brand" placeholder="Brand to look for (optional)" />
      <button class="btn btn-primary">Analyze</button>
    </form>
    <div id="result"></div>
    <div class="card mt-6">
      <h3 class="font-semibold mb-2">Recent analyses</h3>
      ${history.length === 0 ? `<div class="text-muted text-sm">No history.</div>` :
        `<ul class="divide-y divide-border text-sm">${history.slice(0, 10).map(h => `
          <li class="py-2 flex justify-between">
            <button class="text-left flex-1 truncate hover:underline" data-load="${h.id}">
              <span class="font-medium">${escapeHtml(h.url)}</span>
              <span class="text-muted">· ${h.score}/${h.max_score}</span>
            </button>
            <span class="text-xs text-muted">${relativeTime(h.created_at)}</span>
          </li>`).join("")}</ul>`}
    </div>
  `;

  view.querySelector("#form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const btn = e.currentTarget.querySelector("button");
    btn.disabled = true; btn.textContent = "Fetching…";
    view.querySelector("#result").innerHTML = `<div class="card text-muted text-sm">Crawling URL…</div>`;
    try {
      const r = await api.post("/api/website/analyze", { url: fd.get("url"), brand: fd.get("brand") });
      renderAnalysis(view.querySelector("#result"), r);
      toast("Analyzed", "success");
    } catch (err) { toastError(err); view.querySelector("#result").innerHTML = ""; }
    finally { btn.disabled = false; btn.textContent = "Analyze"; }
  });

  view.querySelectorAll("[data-load]").forEach((b) => b.addEventListener("click", async () => {
    try {
      const r = await api.get(`/api/website/${b.getAttribute("data-load")}`);
      renderAnalysis(view.querySelector("#result"), { url: r.url, ...r.findings });
    } catch (e) { toastError(e); }
  }));
}

function renderAnalysis(target, r) {
  const grade = gradeFromScore(r.score, r.max_score);
  const lh = r.lighthouse;
  target.innerHTML = `
    <div class="card mb-4">
      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0">
          <h3 class="font-semibold truncate">${escapeHtml(r.url)}</h3>
          <p class="text-xs mt-1">${statStrip(r.stats)}</p>
        </div>
        <div class="text-center">
          <div class="text-4xl font-bold text-${grade.colour}">${grade.letter}</div>
          <div class="text-xs text-muted">${r.score}/${r.max_score} (${pct(r.score, r.max_score)})</div>
        </div>
      </div>
      <div class="progress mt-3"><div style="width:${pct(r.score, r.max_score)}; background:var(--${grade.colour})"></div></div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
      ${Object.entries(r.categories).map(([cat, c]) => `
        <div class="card">
          <h4 class="font-semibold mb-1">${cat}</h4>
          <div class="text-2xl font-bold">${c.score}/${c.max_score}</div>
          <ul class="text-sm mt-2 space-y-1">
            ${c.findings.map(f => `
              <li class="flex items-center gap-2">
                <span class="dot dot-${f.passed ? "good" : "bad"}"></span>
                <span class="${f.passed ? "" : "text-muted"}">${escapeHtml(f.label)}</span>
                <span class="ml-auto text-xs text-muted">${f.points}pt</span>
              </li>`).join("")}
          </ul>
        </div>`).join("")}
    </div>

    ${lh ? `
      <div class="card mb-4">
        <h4 class="font-semibold mb-2">Lighthouse (Google PageSpeed)</h4>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          ${["performance","accessibility","best_practices","seo"].map(k => `
            <div>
              <div class="text-xs text-muted uppercase">${k.replace("_"," ")}</div>
              <div class="text-2xl font-bold">${Math.round(lh[k])}</div>
            </div>`).join("")}
        </div>
        <div class="text-xs text-muted mt-3">FCP ${escapeHtml(lh.audits["first-contentful-paint"]||"—")} · LCP ${escapeHtml(lh.audits["largest-contentful-paint"]||"—")} · SI ${escapeHtml(lh.audits["speed-index"]||"—")} · TTI ${escapeHtml(lh.audits.interactive||"—")}</div>
      </div>` : ""}

    ${r.recommendations?.length ? `
      <div class="card mb-4">
        <h4 class="font-semibold mb-2">Recommendations</h4>
        <ul class="list-disc pl-5 text-sm space-y-1">
          ${r.recommendations.map(rec => `<li>${escapeHtml(rec)}</li>`).join("")}
        </ul>
      </div>` : ""}

    ${r.martech?.length ? `
      <div class="card mb-4">
        <h4 class="font-semibold mb-2">Martech detected (${r.martech.length})</h4>
        <div class="flex flex-wrap gap-1">
          ${r.martech.map(m => `<span class="badge" title="${escapeHtml(m.category)}">${escapeHtml(m.name)}</span>`).join("")}
        </div>
      </div>` : ""}

    ${r.deep_scan ? renderDeepScan(r.deep_scan) : ""}
  `;
}

// Renders the deep-DOM-scan insights section: security headers, robots.txt,
// link/script/image analysis, JSON-LD schemas, ARIA, DOM statistics, plus
// the auto-generated narrative findings ("CRITICAL: noai detected", etc.).
function renderDeepScan(deep) {
  const insights = deep.insights || [];
  const raw = deep.raw || {};
  const sec = raw.security_and_bot_headers || {};
  const dom = raw.dom_statistics || {};
  const links = raw.links_analysis || {};
  const scripts = raw.scripts_analysis || {};
  const imgs = raw.images_analysis || {};
  const schemas = raw.extracted_schemas || [];
  const i18n = raw.i18n_internationalization || {};
  const robots = raw.robots_txt || "";

  const tone = (t) => t === "fail" ? "bad" : t === "warn" ? "warn" : "good";
  const schemaType = (s) => {
    const t = s["@type"];
    return Array.isArray(t) ? t.join(", ") : (t || "Unknown");
  };

  return `
    <div class="card mb-4">
      <h4 class="font-semibold mb-2">Deep DOM &amp; Security Scan</h4>
      ${insights.length === 0 ? `<div class="text-muted text-sm">No critical findings.</div>` :
        `<ul class="space-y-1 text-sm">
          ${insights.map(i => `
            <li class="flex items-start gap-2">
              <span class="dot dot-${tone(i.type)} mt-1.5"></span>
              <span><span class="badge mr-1">${escapeHtml(i.cat)}</span>${escapeHtml(i.msg)}</span>
            </li>`).join("")}
        </ul>`}
    </div>

    <details class="card mb-4">
      <summary class="cursor-pointer font-semibold">Raw scan data</summary>
      <div class="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <div>
          <div class="text-xs font-semibold uppercase text-muted mb-1">Security &amp; bot headers</div>
          <ul class="space-y-1">
            ${Object.entries(sec).map(([k, v]) => `
              <li class="flex justify-between gap-2">
                <span class="text-muted">${escapeHtml(k)}</span>
                <span class="${v ? '' : 'text-muted'}">${v ? escapeHtml(String(v).slice(0, 80)) : '—'}</span>
              </li>`).join("")}
          </ul>
        </div>
        <div>
          <div class="text-xs font-semibold uppercase text-muted mb-1">DOM statistics</div>
          <ul class="space-y-1">
            <li class="flex justify-between"><span class="text-muted">Total nodes</span><span>${dom.total_dom_nodes ?? "—"}</span></li>
            <li class="flex justify-between"><span class="text-muted">Text/HTML ratio</span><span>${dom.text_to_html_ratio != null ? Math.round(dom.text_to_html_ratio * 100) + '%' : '—'}</span></li>
            <li class="flex justify-between"><span class="text-muted">H1 / H2 / H3</span><span>${dom.headings_count?.h1 ?? 0} / ${dom.headings_count?.h2 ?? 0} / ${dom.headings_count?.h3 ?? 0}</span></li>
            <li class="flex justify-between"><span class="text-muted">html lang</span><span>${escapeHtml(i18n.html_lang || "—")}</span></li>
          </ul>
        </div>
        <div>
          <div class="text-xs font-semibold uppercase text-muted mb-1">Links</div>
          <ul class="space-y-1">
            <li class="flex justify-between"><span class="text-muted">Total</span><span>${links.total_links ?? 0}</span></li>
            <li class="flex justify-between"><span class="text-muted">External</span><span>${links.external_links_count ?? 0}</span></li>
            <li class="flex justify-between"><span class="text-muted">nofollow / ugc / sponsored</span><span>${links.nofollow_ugc_sponsored_count ?? 0}</span></li>
          </ul>
        </div>
        <div>
          <div class="text-xs font-semibold uppercase text-muted mb-1">Scripts &amp; images</div>
          <ul class="space-y-1">
            <li class="flex justify-between"><span class="text-muted">Total scripts</span><span>${scripts.total_scripts ?? 0}</span></li>
            <li class="flex justify-between"><span class="text-muted">Inline scripts</span><span>${scripts.inline_scripts_count ?? 0}</span></li>
            <li class="flex justify-between"><span class="text-muted">Images</span><span>${imgs.total_images ?? 0}</span></li>
            <li class="flex justify-between"><span class="text-muted">Missing alt</span><span>${imgs.images_missing_alt ?? 0}</span></li>
            <li class="flex justify-between"><span class="text-muted">Lazy-loaded</span><span>${imgs.images_lazy_loaded ?? 0}</span></li>
          </ul>
        </div>
        <div class="md:col-span-2">
          <div class="text-xs font-semibold uppercase text-muted mb-1">JSON-LD schemas (${schemas.length})</div>
          ${schemas.length === 0 ? `<div class="text-muted text-xs">None detected.</div>` :
            `<div class="flex flex-wrap gap-1">${schemas.map(s => `<span class="badge">${escapeHtml(schemaType(s))}</span>`).join("")}</div>`}
        </div>
        ${robots && robots !== "Failed to fetch or timeout" ? `
          <div class="md:col-span-2">
            <div class="text-xs font-semibold uppercase text-muted mb-1">robots.txt (first 500 chars)</div>
            <pre class="text-xs p-2 rounded-md overflow-x-auto" style="background:color-mix(in oklab, var(--fg) 8%, transparent)">${escapeHtml(robots.slice(0, 500))}</pre>
          </div>` : ""}
      </div>
    </details>
  `;
}
