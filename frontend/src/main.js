// Entry point: tab routing + theme + chrome.
// Each module exports a `mount(view)` function that renders into the main panel.
import { api } from "./utils/api.js";
import { initTheme, toggleTheme } from "./utils/theme.js";
import { toast } from "./components/toast.js";
import { openSettingsModal } from "./components/settings.js";

import { mount as mountDashboard } from "./modules/dashboard.js";
import { mount as mountVisibility } from "./modules/geo/visibility.js";
import { mount as mountContent } from "./modules/geo/content.js";
import { mount as mountFaq } from "./modules/geo/faq.js";
import { mount as mountPrompts } from "./modules/geo/prompts.js";
import { mount as mountCompetitors } from "./modules/geo/competitors.js";
import { mount as mountWebsite } from "./modules/analyzers/website.js";
import { mount as mountMartech } from "./modules/analyzers/martech.js";
import { mount as mountAio } from "./modules/aio/index.js";
import { mount as mountSeo } from "./modules/seo/index.js";
import { mount as mountHistory } from "./modules/history.js";

// ---------------------------------------------------------------------------
// Route table
// ---------------------------------------------------------------------------

const ROUTES = [
  { id: "dashboard",   group: "Overview", icon: "📊", title: "Dashboard",        subtitle: "At-a-glance stats and recent activity.",            mount: mountDashboard },
  { id: "visibility",  group: "GEO",      icon: "👁",  title: "Visibility Check", subtitle: "Probe multiple LLMs to see who mentions your brand.", mount: mountVisibility },
  { id: "content",     group: "GEO",      icon: "✍️", title: "Content Generator", subtitle: "Long-form GEO-optimised content from any model.",     mount: mountContent },
  { id: "faq",         group: "GEO",      icon: "❓", title: "FAQ Generator",     subtitle: "Q&A pairs with FAQPage JSON-LD schema.",              mount: mountFaq },
  { id: "prompts",     group: "GEO",      icon: "💬", title: "Prompts Library",   subtitle: "Manage saved visibility prompts per profile.",        mount: mountPrompts },
  { id: "competitors", group: "GEO",      icon: "🏷",  title: "Competitors",      subtitle: "Track brands to detect in LLM responses.",            mount: mountCompetitors },
  { id: "website",     group: "Analyse",  icon: "🌐", title: "Website Analyzer", subtitle: "15-point GEO/SEO audit with Lighthouse + martech.",  mount: mountWebsite },
  { id: "martech",     group: "Analyse",  icon: "📡", title: "Martech Scanner",  subtitle: "Detect 100+ marketing tags on any public URL.",       mount: mountMartech },
  { id: "aio",         group: "Analyse",  icon: "🔍", title: "AIO Optimizer",    subtitle: "Google AI Overview readiness — E-E-A-T, readability.", mount: mountAio },
  { id: "seo",         group: "Analyse",  icon: "📈", title: "SEO Toolkit",      subtitle: "Traditional on-page SEO: SERP, keywords, schema.",    mount: mountSeo },
  { id: "history",     group: "Logs",     icon: "🕘", title: "History",          subtitle: "Unified timeline across every module.",               mount: mountHistory },
];

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

initTheme();
buildSidebar();
wireChrome();
window.addEventListener("hashchange", routeFromHash);
window.addEventListener("dm:profile-changed", () => {
  // Profile changed → list views (prompts, competitors, history, runs) need
  // re-fetching. Easiest correct thing: re-mount the active route.
  refreshActiveProfileLabel();
  routeFromHash();
});
routeFromHash();
checkApiHealth();
refreshActiveProfileLabel();

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

function buildSidebar() {
  const nav = document.getElementById("nav");
  const groups = ROUTES.reduce((acc, r) => {
    (acc[r.group] ??= []).push(r);
    return acc;
  }, {});
  nav.innerHTML = Object.entries(groups)
    .map(
      ([group, items]) => `
      <div class="px-2 pt-3 pb-1 text-[10px] uppercase tracking-wider text-muted font-semibold">${group}</div>
      ${items
        .map(
          (r) => `
        <a href="#${r.id}" class="nav-item" data-route="${r.id}">
          <span>${r.icon}</span>
          <span>${r.title}</span>
        </a>`
        )
        .join("")}
    `
    )
    .join("");
}

function wireChrome() {
  document.getElementById("theme-toggle")?.addEventListener("click", toggleTheme);
  document.getElementById("open-settings")?.addEventListener("click", openSettingsModal);
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === ",") {
      e.preventDefault();
      openSettingsModal();
    }
  });
}

// ---------------------------------------------------------------------------
// Routing
// ---------------------------------------------------------------------------

function routeFromHash() {
  const hash = location.hash.replace(/^#/, "") || "dashboard";
  const route = ROUTES.find((r) => r.id === hash) || ROUTES[0];

  document.querySelectorAll("[data-route]").forEach((el) => {
    el.classList.toggle("active", el.getAttribute("data-route") === route.id);
  });
  document.getElementById("page-title").textContent = route.title;
  document.getElementById("page-subtitle").textContent = route.subtitle;

  const view = document.getElementById("view");
  view.innerHTML = `<div class="text-muted text-sm">Loading ${route.title}…</div>`;
  Promise.resolve()
    .then(() => route.mount(view))
    .catch((err) => {
      console.error(err);
      view.innerHTML = `
        <div class="card border-bad">
          <div class="text-bad font-semibold">Module crashed</div>
          <pre class="text-xs mt-2 whitespace-pre-wrap">${(err && err.stack) || err}</pre>
        </div>`;
      toast(`Failed to render ${route.title}`, "error");
    });
}

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

async function checkApiHealth() {
  const dot = document.getElementById("api-status");
  try {
    const h = await api.get("/api/health");
    dot.classList.remove("dot-muted", "dot-bad", "dot-warn");
    dot.classList.add(h.encryption_configured ? "dot-good" : "dot-warn");
    dot.title = h.encryption_configured
      ? "API ok · encryption configured"
      : "API ok · ENCRYPTION_KEY not set in .env";
  } catch {
    dot.classList.remove("dot-muted", "dot-good", "dot-warn");
    dot.classList.add("dot-bad");
    dot.title = "API unreachable — is the backend running on :8000?";
  }
}

async function refreshActiveProfileLabel() {
  const span = document.getElementById("active-profile");
  try {
    const r = await api.get("/api/profiles/active/current");
    if (r.profile) {
      span.textContent = `Profile · ${r.profile.name}`;
      span.classList.add("badge");
    } else {
      span.textContent = "No active profile";
      span.classList.remove("badge");
    }
  } catch { /* ignore */ }
}
