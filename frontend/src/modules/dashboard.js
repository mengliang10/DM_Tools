import { api } from "../utils/api.js";
import { escapeHtml, relativeTime } from "../utils/format.js";

const KIND_META = {
  visibility: { icon: "👁",  label: "Visibility" },
  content:    { icon: "✍️", label: "Content"    },
  faq:        { icon: "❓", label: "FAQ"        },
  website:    { icon: "🌐", label: "Website"    },
  martech:    { icon: "📡", label: "Martech"    },
};

export async function mount(view) {
  view.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6" id="metrics"></div>
    <div class="card">
      <h2 class="font-semibold mb-3">Recent activity</h2>
      <div id="recent" class="text-sm">Loading…</div>
    </div>
  `;
  const [keys, profiles, history] = await Promise.all([
    api.get("/api/keys").catch(() => []),
    api.get("/api/profiles").catch(() => []),
    api.get("/api/history?limit=20").catch(() => []),
  ]);

  const counts = history.reduce((acc, h) => {
    acc[h.kind] = (acc[h.kind] || 0) + 1;
    return acc;
  }, {});
  const total = history.length;

  view.querySelector("#metrics").innerHTML = `
    ${metricCard("API keys", keys.length, "configured providers")}
    ${metricCard("Profiles", profiles.length, "saved brand profiles")}
    ${metricCard("Recent runs", total, "last 20 events")}
    ${metricCard("Modules used", Object.keys(counts).length, "different tools")}
  `;

  const recent = view.querySelector("#recent");
  if (history.length === 0) {
    recent.innerHTML = `<div class="text-muted">No activity yet. Pick a tool from the sidebar to begin.</div>`;
  } else {
    recent.innerHTML = `
      <ul class="divide-y divide-border">
        ${history
          .slice(0, 15)
          .map(
            (h) => `
          <li class="py-2 flex items-center gap-3">
            <span class="text-lg">${KIND_META[h.kind]?.icon || "•"}</span>
            <div class="min-w-0 flex-1">
              <div class="font-medium truncate">${escapeHtml(h.subject || "—")}</div>
              <div class="text-xs text-muted truncate">${escapeHtml(KIND_META[h.kind]?.label || h.kind)} · ${escapeHtml(h.detail || "")}</div>
            </div>
            <span class="text-xs text-muted whitespace-nowrap">${relativeTime(h.ts)}</span>
          </li>`
          )
          .join("")}
      </ul>
    `;
  }
}

function metricCard(label, value, sub) {
  return `
    <div class="card">
      <div class="text-xs text-muted uppercase tracking-wide">${label}</div>
      <div class="text-3xl font-bold mt-1">${value}</div>
      <div class="text-xs text-muted mt-1">${sub}</div>
    </div>`;
}
