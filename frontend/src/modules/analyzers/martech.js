import { api } from "../../utils/api.js";
import { toast, toastError } from "../../components/toast.js";
import { escapeHtml, relativeTime } from "../../utils/format.js";

export async function mount(view) {
  const history = await api.get("/api/martech/history").catch(() => []);
  view.innerHTML = `
    <form id="form" class="card flex flex-col md:flex-row gap-2 mb-6">
      <input class="input flex-1" name="url" placeholder="https://example.com" required />
      <button class="btn btn-primary">Scan</button>
    </form>
    <div id="result"></div>
    <div class="card mt-6">
      <h3 class="font-semibold mb-2">Recent scans</h3>
      ${history.length === 0 ? `<div class="text-muted text-sm">None.</div>` :
        `<ul class="divide-y divide-border text-sm">${history.slice(0,10).map(h=>`
          <li class="py-2 flex justify-between">
            <span class="truncate">${escapeHtml(h.url)}</span>
            <span class="text-xs text-muted">${relativeTime(h.created_at)}</span>
          </li>`).join("")}</ul>`}
    </div>
  `;
  view.querySelector("#form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const btn = e.currentTarget.querySelector("button");
    btn.disabled = true; btn.textContent = "Scanning…";
    view.querySelector("#result").innerHTML = `<div class="card text-muted text-sm">Fetching page…</div>`;
    try {
      const r = await api.post("/api/martech/scan", { url: fd.get("url") });
      renderResult(view.querySelector("#result"), r);
      toast(`Found ${r.total} vendor(s)`, "success");
    } catch (err) { toastError(err); view.querySelector("#result").innerHTML = ""; }
    finally { btn.disabled = false; btn.textContent = "Scan"; }
  });
}

function renderResult(target, r) {
  if (r.total === 0) {
    target.innerHTML = `<div class="card text-muted">No martech detected. Page may be JS-rendered (server-side fetch only sees raw HTML).</div>`;
    return;
  }
  target.innerHTML = `
    <div class="card mb-4">
      <div class="flex items-baseline justify-between">
        <h3 class="font-semibold truncate">${escapeHtml(r.url)}</h3>
        <span class="text-2xl font-bold">${r.total}</span>
      </div>
      <p class="text-xs text-muted">vendors detected across ${Object.keys(r.by_category).length} categories</p>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      ${Object.entries(r.by_category).map(([cat, names]) => `
        <div class="card">
          <h4 class="font-semibold">${escapeHtml(cat)} <span class="text-muted text-xs">(${names.length})</span></h4>
          <div class="flex flex-wrap gap-1 mt-2">
            ${names.map(n => `<span class="badge">${escapeHtml(n)}</span>`).join("")}
          </div>
        </div>`).join("")}
    </div>
  `;
}
