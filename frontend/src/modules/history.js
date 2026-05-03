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
  const items = await api.get("/api/history?limit=200").catch(() => []);
  view.innerHTML = `
    <div class="card">
      <h2 class="font-semibold mb-3">Unified history (${items.length})</h2>
      ${items.length === 0 ? `<div class="text-muted text-sm">Nothing yet — pick a tool from the sidebar.</div>` :
        `<table class="table">
          <thead><tr><th>Kind</th><th>Subject</th><th>Detail</th><th class="text-right">When</th></tr></thead>
          <tbody>
            ${items.map(h => `
              <tr>
                <td><span class="badge">${KIND_META[h.kind]?.icon || "•"} ${KIND_META[h.kind]?.label || h.kind}</span></td>
                <td class="font-medium truncate max-w-[300px]">${escapeHtml(h.subject || "—")}</td>
                <td class="text-muted truncate max-w-[300px]">${escapeHtml(h.detail || "")}</td>
                <td class="text-right text-xs text-muted">${relativeTime(h.ts)}</td>
              </tr>`).join("")}
          </tbody>
        </table>`}
    </div>
  `;
}
