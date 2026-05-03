// Google AI Overview optimisation — five client-side analyzers in tabs.
import { escapeHtml, gradeFromScore, pct } from "../../utils/format.js";
import { prefs } from "../../utils/storage.js";
import { checkAIOEligibility }    from "../shared/aio-eligibility.js";
import { scoreEEAT }              from "../shared/eeat-scorer.js";
import { analyzeReadability }     from "../shared/readability.js";
import { rankPassages }           from "../shared/passage-ranker.js";
import { analyzeContentGaps }     from "../shared/content-gap.js";
import { analyzeSnippetReadiness, generateSnippetTemplate, SNIPPET_TYPES } from "../shared/snippet-optimizer.js";

const TABS = [
  { id: "eligibility", label: "AIO Eligibility" },
  { id: "eeat",        label: "E-E-A-T"        },
  { id: "readability", label: "Readability"    },
  { id: "passages",    label: "Passage Ranker" },
  { id: "gaps",        label: "Content Gaps"   },
  { id: "snippets",    label: "Snippets"       },
];

export function mount(view) {
  const initial = prefs.get("aio.tab", "eligibility");
  const initialText = prefs.get("aio.text", "");

  view.innerHTML = `
    <div class="card mb-4">
      <label class="text-xs font-semibold uppercase text-muted">Paste your content (Markdown or plain text)</label>
      <textarea id="aio-text" class="textarea mt-1" rows="8" placeholder="Paste an article, blog post, or page content here…">${escapeHtml(initialText)}</textarea>
      <div class="flex items-center justify-between mt-3 gap-3">
        <div class="tabs">
          ${TABS.map(t => `<button data-tab="${t.id}" class="${t.id === initial ? "active" : ""}">${t.label}</button>`).join("")}
        </div>
        <button id="run" class="btn btn-primary">Analyze</button>
      </div>
    </div>
    <div id="aio-result" class="card text-muted text-sm">Pick a tab and click Analyze.</div>
  `;

  let activeTab = initial;
  const ta = view.querySelector("#aio-text");
  const result = view.querySelector("#aio-result");

  view.querySelectorAll("[data-tab]").forEach(b => b.addEventListener("click", () => {
    activeTab = b.getAttribute("data-tab");
    view.querySelectorAll("[data-tab]").forEach(x => x.classList.toggle("active", x === b));
    prefs.set("aio.tab", activeTab);
    if (ta.value.trim()) run();
  }));

  view.querySelector("#run").addEventListener("click", run);
  ta.addEventListener("input", () => prefs.set("aio.text", ta.value));

  function run() {
    const text = ta.value.trim();
    if (!text) { result.innerHTML = `<span class="text-muted">Paste some content first.</span>`; return; }
    switch (activeTab) {
      case "eligibility": result.innerHTML = renderEligibility(checkAIOEligibility(text)); break;
      case "eeat":        result.innerHTML = renderEEAT(scoreEEAT(text)); break;
      case "readability": result.innerHTML = renderReadability(analyzeReadability(text)); break;
      case "passages":    result.innerHTML = renderPassages(rankPassages(text)); break;
      case "gaps":        result.innerHTML = renderGaps(analyzeContentGaps(text)); break;
      case "snippets":    renderSnippets(result, text); break;
    }
  }
}

// --- renderers ---

function renderEligibility(r) {
  return `
    <div class="flex items-center justify-between mb-4">
      <h3 class="font-semibold">AIO Eligibility</h3>
      <div class="text-right">
        <div class="text-3xl font-bold">${r.totalScore}/${r.maxScore}</div>
        <div class="text-xs text-muted">Eligibility · ${r.eligibilityLevel}</div>
      </div>
    </div>
    <div class="progress mb-4"><div style="width:${r.totalScore}%; background:var(--accent)"></div></div>
    <ul class="space-y-2">
      ${r.checks.map(c => `
        <li class="flex items-start gap-3">
          <span class="dot dot-${c.passed ? "good" : "bad"} mt-1.5"></span>
          <div class="flex-1">
            <div class="${c.passed ? "" : "text-muted"}">${escapeHtml(c.label)} <span class="text-xs text-muted">(${c.points}pt)</span></div>
            ${!c.passed ? `<div class="text-xs text-muted">${escapeHtml(c.tip)}</div>` : ""}
          </div>
        </li>`).join("")}
    </ul>`;
}

function renderEEAT(r) {
  const dim = (label, score, signals) => `
    <div class="card">
      <div class="flex items-baseline justify-between">
        <h4 class="font-semibold">${label}</h4>
        <span class="text-2xl font-bold">${score}/25</span>
      </div>
      <div class="progress my-2"><div style="width:${score * 4}%"></div></div>
      <div class="text-xs text-muted">${Object.entries(signals).map(([k,v])=>`${k}: ${v}`).join(" · ")}</div>
    </div>`;
  return `
    <div class="flex items-center justify-between mb-4">
      <h3 class="font-semibold">E-E-A-T scorecard</h3>
      <div class="text-right">
        <div class="text-3xl font-bold">${r.total}/100</div>
        <div class="text-xs">Grade <span class="badge badge-${r.aioEligible?"good":"warn"}">${r.grade}</span></div>
      </div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
      ${dim("Experience",        r.experience,        r.signals.experience)}
      ${dim("Expertise",         r.expertise,         r.signals.expertise)}
      ${dim("Authoritativeness", r.authoritativeness, r.signals.authoritativeness)}
      ${dim("Trustworthiness",   r.trustworthiness,   r.signals.trustworthiness)}
    </div>
    ${r.suggestions.length ? `<div><h4 class="font-semibold mb-2">Suggestions</h4><ul class="list-disc pl-5 text-sm space-y-1">${r.suggestions.map(s=>`<li>${escapeHtml(s)}</li>`).join("")}</ul></div>` : ""}`;
}

function renderReadability(r) {
  const stat = (l, v) => `<div><div class="text-xs text-muted">${l}</div><div class="font-semibold">${v}</div></div>`;
  return `
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
      ${stat("Flesch score", `${r.fleschScore} · ${r.readingLevel}`)}
      ${stat("Grade level", r.gradeLevel)}
      ${stat("Words / sentence", r.avgWordsPerSentence)}
      ${stat("AIO ideal?", r.aioIdeal ? "Yes" : "No")}
      ${stat("Total words", r.totalWords)}
      ${stat("Total sentences", r.totalSentences)}
      ${stat("Long sentences", r.longSentences)}
      ${stat("Passive voice hits", r.passiveVoice)}
    </div>
    ${r.suggestions.length ? `<div><h4 class="font-semibold mb-2">Suggestions</h4><ul class="list-disc pl-5 text-sm space-y-1">${r.suggestions.map(s=>`<li>${escapeHtml(s)}</li>`).join("")}</ul></div>` : "<div class='text-good text-sm'>Looks good — no major readability issues.</div>"}`;
}

function renderPassages(r) {
  return `
    <h3 class="font-semibold mb-2">Top passages by AIO score</h3>
    <p class="text-xs text-muted mb-3">Average score across ${r.totalSentences} sentences: ${r.avgScore}</p>
    <ol class="space-y-3">
      ${r.ranked.map((p, i) => `
        <li class="card">
          <div class="flex items-center justify-between mb-1">
            <span class="badge">#${i+1} · score ${p.score}</span>
            <div class="text-xs text-muted">${p.signals.map(s => `<span class="badge mr-1">${s}</span>`).join("")} ${p.wordCount}w</div>
          </div>
          <p class="text-sm">${escapeHtml(p.sentence)}</p>
        </li>`).join("")}
    </ol>`;
}

function renderGaps(r) {
  return `
    <div class="flex items-center justify-between mb-4">
      <h3 class="font-semibold">AIO content gap analysis</h3>
      <div class="text-right">
        <div class="text-3xl font-bold">${r.coveragePercent}%</div>
        <div class="text-xs text-muted">${r.coverage}/${r.maxCoverage} weighted coverage</div>
      </div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <h4 class="font-semibold text-good mb-2">Found (${r.found.length})</h4>
        <ul class="space-y-1 text-sm">${r.found.map(e => `<li>✓ ${escapeHtml(e.label)}</li>`).join("")}</ul>
      </div>
      <div>
        <h4 class="font-semibold text-bad mb-2">Missing (${r.missing.length}) — sorted by priority</h4>
        <ul class="space-y-2 text-sm">${r.priority.map(e => `<li><div>✗ ${escapeHtml(e.label)} <span class="text-xs text-muted">(${e.weight}pt)</span></div><div class="text-xs text-muted">${escapeHtml(e.tip)}</div></li>`).join("")}</ul>
      </div>
    </div>`;
}

function renderSnippets(target, text) {
  const r = analyzeSnippetReadiness(text);
  target.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
      ${Object.entries(r.results).map(([k, v]) => `
        <div class="card">
          <div class="flex items-center justify-between"><h4 class="font-semibold">${k}</h4><span class="badge">${v.found}</span></div>
          <div class="progress my-2"><div style="width:${v.score}%"></div></div>
          <div class="text-xs text-muted">${escapeHtml(v.tip)}</div>
        </div>`).join("")}
    </div>
    <div class="card">
      <h4 class="font-semibold mb-2">Generate a snippet template</h4>
      <div class="flex gap-2 items-end mb-2">
        <select id="snip-type" class="select">${SNIPPET_TYPES.map(t => `<option>${t}</option>`).join("")}</select>
        <input id="snip-topic" class="input flex-1" placeholder="Topic, e.g. local SEO" />
        <button id="snip-make" class="btn btn-primary">Generate</button>
      </div>
      <pre id="snip-out" class="prose-dm text-sm"></pre>
    </div>
  `;
  target.querySelector("#snip-make").addEventListener("click", () => {
    const t = target.querySelector("#snip-type").value;
    const topic = target.querySelector("#snip-topic").value || "your topic";
    target.querySelector("#snip-out").textContent = generateSnippetTemplate(t, topic);
  });
}
