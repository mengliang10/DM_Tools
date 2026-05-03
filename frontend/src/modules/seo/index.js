// Traditional on-page SEO toolkit — six client-side analyzers in tabs.
import { escapeHtml } from "../../utils/format.js";
import { prefs } from "../../utils/storage.js";
import { analyzeOnPage }                          from "../shared/onpage.js";
import { generateSerpPreview }                    from "../shared/serp-preview.js";
import { analyzeKeywords, analyzeKeywordPlacement } from "../shared/keyword.js";
import { scoreContentQuality }                    from "../shared/content-quality.js";
import { checkTechnical }                         from "../shared/technical.js";
import { validateSchema }                         from "../shared/schema-validator.js";

const TABS = [
  { id: "onpage",    label: "On-Page SEO" },
  { id: "serp",      label: "SERP Preview" },
  { id: "keyword",   label: "Keywords"    },
  { id: "quality",   label: "Content Quality" },
  { id: "technical", label: "Technical"   },
  { id: "schema",    label: "Schema Validator" },
];

export function mount(view) {
  const tab = prefs.get("seo.tab", "onpage");
  view.innerHTML = `
    <div class="tabs mb-4">
      ${TABS.map(t => `<button data-tab="${t.id}" class="${t.id === tab ? "active" : ""}">${t.label}</button>`).join("")}
    </div>
    <div id="seo-panel"></div>
  `;
  let active = tab;
  view.querySelectorAll("[data-tab]").forEach(b => b.addEventListener("click", () => {
    active = b.getAttribute("data-tab");
    view.querySelectorAll("[data-tab]").forEach(x => x.classList.toggle("active", x === b));
    prefs.set("seo.tab", active);
    render();
  }));
  render();

  function render() {
    const panel = view.querySelector("#seo-panel");
    if (active === "onpage")    return renderOnPage(panel);
    if (active === "serp")      return renderSerp(panel);
    if (active === "keyword")   return renderKeyword(panel);
    if (active === "quality")   return renderQuality(panel);
    if (active === "technical") return renderTechnical(panel);
    if (active === "schema")    return renderSchema(panel);
  }
}

// --- On-Page ---
function renderOnPage(panel) {
  panel.innerHTML = `
    <form id="f" class="card grid grid-cols-1 md:grid-cols-2 gap-3">
      <input class="input md:col-span-2" name="title" placeholder="<title> tag content" />
      <input class="input md:col-span-2" name="metaDesc" placeholder="<meta name=&quot;description&quot;> content" />
      <input class="input md:col-span-2" name="url" placeholder="https://example.com/page" />
      <input class="input md:col-span-2" name="h1" placeholder="H1 heading text" />
      <input class="input md:col-span-2" name="keyword" placeholder="Primary keyword" />
      <textarea class="textarea md:col-span-2" name="content" rows="6" placeholder="Page body text…"></textarea>
      <button class="btn btn-primary md:col-span-2">Analyze</button>
    </form>
    <div id="out" class="card mt-4 text-muted text-sm">Submit the form to see results.</div>
  `;
  panel.querySelector("#f").addEventListener("submit", (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    const r = analyzeOnPage(data);
    panel.querySelector("#out").innerHTML = `
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold">On-page score</h3>
        <div class="text-right">
          <div class="text-3xl font-bold">${r.score}</div>
          <div class="text-xs">Grade <span class="badge badge-${r.score>=70?"good":r.score>=55?"warn":"bad"}">${r.grade}</span></div>
        </div>
      </div>
      <ul class="space-y-1 text-sm">
        ${r.checks.map(c => `<li class="flex items-start gap-2">
          <span class="dot dot-${c.status?"good":"bad"} mt-1.5"></span>
          <div class="flex-1"><div class="${c.status?"":"text-muted"}">${escapeHtml(c.label)} <span class="text-xs text-muted">${escapeHtml(c.value || "")}</span></div>${!c.status?`<div class="text-xs text-muted">${escapeHtml(c.tip)}</div>`:""}</div>
        </li>`).join("")}
      </ul>`;
  });
}

// --- SERP Preview ---
function renderSerp(panel) {
  panel.innerHTML = `
    <form id="f" class="card grid grid-cols-1 md:grid-cols-2 gap-3">
      <input class="input md:col-span-2" name="title" placeholder="<title>" />
      <input class="input md:col-span-2" name="metaDesc" placeholder="<meta description>" />
      <input class="input md:col-span-2" name="url" placeholder="https://example.com/page" />
      <input class="input md:col-span-2" name="keyword" placeholder="Highlight keyword (optional)" />
      <button class="btn btn-primary md:col-span-2">Preview</button>
    </form>
    <div id="out" class="card mt-4 text-muted text-sm">Generate a preview to see how this would render in Google.</div>
  `;
  panel.querySelector("#f").addEventListener("submit", (e) => {
    e.preventDefault();
    const r = generateSerpPreview(Object.fromEntries(new FormData(e.currentTarget)));
    panel.querySelector("#out").innerHTML = `
      <div class="card mb-3" style="background:white; color:#202124">
        <div style="color:#202124; font-size:14px">${escapeHtml(r.breadcrumb)}</div>
        <div style="color:#1a0dab; font-size:20px; line-height:1.3">${r.highlightedTitle}</div>
        <div style="color:#4d5156; font-size:14px; line-height:1.4">${r.highlightedDesc}</div>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div><div class="text-xs text-muted">CTR potential</div><div class="text-2xl font-bold">${r.ctaScore}</div></div>
        <div><div class="text-xs text-muted">Title</div><div class="${r.isTitleOptimal?"text-good":"text-warn"}">${r.scores.titleLength.value} chars</div></div>
        <div><div class="text-xs text-muted">Meta desc</div><div class="${r.isDescOptimal?"text-good":"text-warn"}">${r.scores.descLength.value} chars</div></div>
        <div><div class="text-xs text-muted">URL</div><div>${r.scores.urlLength.value} chars</div></div>
      </div>`;
  });
}

// --- Keywords ---
function renderKeyword(panel) {
  panel.innerHTML = `
    <form id="f" class="card grid grid-cols-1 gap-3">
      <textarea class="textarea" name="text" rows="6" placeholder="Paste page content…"></textarea>
      <input class="input" name="keyword" placeholder="(optional) target keyword for placement check" />
      <button class="btn btn-primary">Analyze</button>
    </form>
    <div id="out" class="card mt-4 text-muted text-sm">Submit text to compute frequencies and density.</div>
  `;
  panel.querySelector("#f").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const text = fd.get("text") || "";
    const kw = fd.get("keyword") || "";
    const r = analyzeKeywords(text);
    const place = kw ? analyzeKeywordPlacement(text, kw) : null;
    panel.querySelector("#out").innerHTML = `
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-4">
        <div><div class="text-xs text-muted">Total words</div><div class="font-semibold">${r.totalWords}</div></div>
        <div><div class="text-xs text-muted">Unique stems</div><div class="font-semibold">${r.uniqueWords}</div></div>
        ${place ? `<div><div class="text-xs text-muted">"${escapeHtml(kw)}" density</div><div class="font-semibold">${place.density}%</div></div>
                   <div><div class="text-xs text-muted">Prominence</div><div class="font-semibold">${place.prominenceScore}</div></div>` : ""}
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div><h4 class="font-semibold mb-1">Top words</h4><ul class="text-sm space-y-1">${r.topSingle.slice(0,10).map(t=>`<li class="flex justify-between"><span>${escapeHtml(t.term)}</span><span class="text-muted">${t.count} · ${t.density}%</span></li>`).join("")}</ul></div>
        <div><h4 class="font-semibold mb-1">Top bigrams</h4><ul class="text-sm space-y-1">${r.topBigrams.map(t=>`<li class="flex justify-between"><span>${escapeHtml(t.term)}</span><span class="text-muted">${t.count}</span></li>`).join("") || `<li class="text-muted">none</li>`}</ul></div>
        <div><h4 class="font-semibold mb-1">Top trigrams</h4><ul class="text-sm space-y-1">${r.topTrigrams.map(t=>`<li class="flex justify-between"><span>${escapeHtml(t.term)}</span><span class="text-muted">${t.count}</span></li>`).join("") || `<li class="text-muted">none</li>`}</ul></div>
      </div>
      ${place ? `<div class="card mt-3">${escapeHtml(place.recommendation)} · in first 100: ${place.inFirst100?"yes":"no"} · in last 100: ${place.inLast100?"yes":"no"}</div>` : ""}`;
  });
}

// --- Content Quality ---
function renderQuality(panel) {
  panel.innerHTML = `
    <form id="f" class="card">
      <textarea class="textarea" name="text" rows="8" placeholder="Paste page content…"></textarea>
      <button class="btn btn-primary mt-2">Score</button>
    </form>
    <div id="out" class="card mt-4 text-muted text-sm">Score will appear here.</div>
  `;
  panel.querySelector("#f").addEventListener("submit", (e) => {
    e.preventDefault();
    const text = (new FormData(e.currentTarget)).get("text") || "";
    const r = scoreContentQuality(text);
    panel.querySelector("#out").innerHTML = `
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold">Content quality</h3>
        <div class="text-right">
          <div class="text-3xl font-bold">${r.score}</div>
          <div class="text-xs">Grade <span class="badge badge-${r.score>=70?"good":r.score>=55?"warn":"bad"}">${r.grade}</span></div>
        </div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        ${Object.entries(r.metrics).map(([k,m]) => `
          <div class="card">
            <div class="flex items-center justify-between"><h4 class="font-semibold">${k}</h4><span class="text-sm">${m.score}/${m.max}</span></div>
            <div class="progress my-2"><div style="width:${(m.score/m.max)*100}%"></div></div>
            <div class="text-xs text-muted">${escapeHtml(String(m.value))}</div>
          </div>`).join("")}
      </div>
      ${r.suggestions.length ? `<div class="mt-3"><h4 class="font-semibold mb-1">Suggestions</h4><ul class="list-disc pl-5 text-sm">${r.suggestions.map(s=>`<li>${escapeHtml(s)}</li>`).join("")}</ul></div>` : ""}`;
  });
}

// --- Technical ---
function renderTechnical(panel) {
  panel.innerHTML = `
    <form id="f" class="card grid grid-cols-1 gap-3">
      <input class="input" name="url"      placeholder="https://example.com/page (optional)" />
      <input class="input" name="title"    placeholder="<title> tag (optional)" />
      <input class="input" name="metaDesc" placeholder="<meta description> (optional)" />
      <textarea class="textarea" name="html" rows="8" placeholder="Paste page HTML source…"></textarea>
      <button class="btn btn-primary">Audit</button>
    </form>
    <div id="out" class="card mt-4 text-muted text-sm">Submit HTML to run technical checks.</div>
  `;
  panel.querySelector("#f").addEventListener("submit", (e) => {
    e.preventDefault();
    const r = checkTechnical(Object.fromEntries(new FormData(e.currentTarget)));
    const grouped = r.checks.reduce((acc, c) => {
      (acc[c.category] ??= []).push(c); return acc;
    }, {});
    panel.querySelector("#out").innerHTML = `
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold">Technical audit</h3>
        <div class="text-right text-sm">
          <span class="badge badge-good">${r.passed} passed</span>
          <span class="badge badge-bad">${r.critical} critical</span>
          <span class="badge badge-warn">${r.warnings} warnings</span>
        </div>
      </div>
      ${Object.entries(grouped).map(([cat, checks]) => `
        <div class="card mb-3">
          <h4 class="font-semibold mb-2">${escapeHtml(cat)}</h4>
          <ul class="text-sm space-y-1">
            ${checks.map(c => `<li class="flex items-start gap-2">
              <span class="dot dot-${c.passed?"good":(c.severity==="critical"?"bad":"warn")} mt-1.5"></span>
              <div class="flex-1"><div class="${c.passed?"":"text-muted"}">${escapeHtml(c.label)}</div>${!c.passed?`<div class="text-xs text-muted">${escapeHtml(c.tip)}</div>`:""}</div>
            </li>`).join("")}
          </ul>
        </div>`).join("")}`;
  });
}

// --- Schema Validator ---
function renderSchema(panel) {
  panel.innerHTML = `
    <form id="f" class="card">
      <label class="text-xs font-semibold uppercase text-muted">Paste a JSON-LD block</label>
      <textarea class="textarea mt-1" name="json" rows="10" placeholder='{"@context":"https://schema.org","@type":"Article","headline":"…"}'></textarea>
      <button class="btn btn-primary mt-2">Validate</button>
    </form>
    <div id="out" class="card mt-4 text-muted text-sm">Paste JSON-LD to validate against Schema.org.</div>
  `;
  panel.querySelector("#f").addEventListener("submit", (e) => {
    e.preventDefault();
    const json = (new FormData(e.currentTarget)).get("json") || "";
    const r = validateSchema(json);
    panel.querySelector("#out").innerHTML = `
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold">Validation</h3>
        <div class="text-right">
          <div class="text-3xl font-bold">${r.score ?? 0}/100</div>
          <div class="text-xs">${r.valid ? "<span class='badge badge-good'>Valid</span>" : "<span class='badge badge-bad'>Invalid</span>"}</div>
        </div>
      </div>
      ${r.types?.length ? `<div class="text-xs text-muted mb-3">Types: ${r.types.map(t=>`<span class="badge">${escapeHtml(t)}</span>`).join(" ")}</div>` : ""}
      ${r.errors.length   ? `<div class="card mb-2"><h4 class="font-semibold text-bad mb-1">Errors</h4><ul class="text-sm list-disc pl-5">${r.errors.map(s=>`<li>${escapeHtml(s)}</li>`).join("")}</ul></div>` : ""}
      ${r.warnings.length ? `<div class="card mb-2"><h4 class="font-semibold text-warn mb-1">Warnings</h4><ul class="text-sm list-disc pl-5">${r.warnings.map(s=>`<li>${escapeHtml(s)}</li>`).join("")}</ul></div>` : ""}
      ${r.info.length     ? `<div class="card"><h4 class="font-semibold text-muted mb-1">Info</h4><ul class="text-sm list-disc pl-5">${r.info.map(s=>`<li>${escapeHtml(s)}</li>`).join("")}</ul></div>` : ""}`;
  });
}
