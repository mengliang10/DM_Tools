// Domains + Site-Profiles management. Each profile can own multiple domains;
// each domain holds individual page-level site_profiles.
import { api } from "../../utils/api.js";
import { toast, toastError } from "../../components/toast.js";
import { escapeHtml } from "../../utils/format.js";

export async function mount(view) {
  await render(view);
}

async function render(view) {
  const [domains, siteProfiles] = await Promise.all([
    api.get("/api/domains"),
    api.get("/api/site-profiles").catch(() => []),
  ]);

  view.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-1 space-y-4">
        <form id="dom-form" class="card space-y-2">
          <h3 class="font-semibold">+ Add domain</h3>
          <input class="input" name="name" placeholder="Display name (e.g. Main brand site)" required />
          <input class="input" name="domain" placeholder="example.com" required />
          <input class="input" name="industry" placeholder="Industry (optional)" />
          <input class="input" name="description" placeholder="Description (optional)" />
          <button class="btn btn-primary w-full">Add domain</button>
        </form>

        ${domains.length === 0 ? "" : `
          <form id="sp-form" class="card space-y-2">
            <h3 class="font-semibold">+ Add tracked page</h3>
            <select class="select" name="domain_id" required>
              ${domains.map(d => `<option value="${d.id}">${escapeHtml(d.name)} · ${escapeHtml(d.domain)}</option>`).join("")}
            </select>
            <input class="input" name="page_url" placeholder="https://example.com/path" required />
            <select class="select" name="page_type">
              <option>homepage</option><option>product</option><option>blog</option>
              <option>landing</option><option>category</option><option>other</option>
            </select>
            <input class="input" name="notes" placeholder="Notes (optional)" />
            <button class="btn btn-primary w-full">Add page</button>
          </form>
        `}
      </div>

      <div class="lg:col-span-2 space-y-4">
        <div class="card">
          <h3 class="font-semibold mb-2">Domains (${domains.length})</h3>
          ${domains.length === 0 ? `<div class="text-muted text-sm">No domains yet.</div>` : `
            <table class="table">
              <thead><tr><th>Name</th><th>Domain</th><th>Industry</th><th></th></tr></thead>
              <tbody>${domains.map(d => `
                <tr>
                  <td class="font-medium">${escapeHtml(d.name)}</td>
                  <td class="text-muted">${escapeHtml(d.domain)}</td>
                  <td>${escapeHtml(d.industry || "—")}</td>
                  <td class="text-right"><button class="btn btn-ghost text-bad" data-del-dom="${d.id}">✕</button></td>
                </tr>`).join("")}</tbody>
            </table>`}
        </div>

        <div class="card">
          <h3 class="font-semibold mb-2">Tracked pages (${siteProfiles.length})</h3>
          ${siteProfiles.length === 0 ? `<div class="text-muted text-sm">No pages tracked yet.</div>` : `
            <table class="table">
              <thead><tr><th>Page URL</th><th>Type</th><th>Domain</th><th></th></tr></thead>
              <tbody>${siteProfiles.map(s => `
                <tr>
                  <td class="font-medium truncate">${escapeHtml(s.page_url)}</td>
                  <td><span class="badge">${escapeHtml(s.page_type)}</span></td>
                  <td class="text-muted">${escapeHtml(s.domain_name || "—")}</td>
                  <td class="text-right"><button class="btn btn-ghost text-bad" data-del-sp="${s.id}">✕</button></td>
                </tr>`).join("")}</tbody>
            </table>`}
        </div>
      </div>
    </div>
  `;

  view.querySelector("#dom-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await api.post("/api/domains", Object.fromEntries(new FormData(e.currentTarget)));
      toast("Domain added", "success");
      render(view);
    } catch (err) { toastError(err); }
  });

  view.querySelector("#sp-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      domain_id: Number(fd.get("domain_id")),
      page_url: fd.get("page_url"),
      page_type: fd.get("page_type"),
      notes: fd.get("notes"),
    };
    try {
      await api.post("/api/site-profiles", payload);
      toast("Page tracked", "success");
      render(view);
    } catch (err) { toastError(err); }
  });

  view.querySelectorAll("[data-del-dom]").forEach(b => b.addEventListener("click", async () => {
    if (!confirm("Delete this domain? All tracked pages under it will also be removed.")) return;
    try {
      await api.del(`/api/domains/${b.getAttribute("data-del-dom")}`);
      render(view);
    } catch (e) { toastError(e); }
  }));
  view.querySelectorAll("[data-del-sp]").forEach(b => b.addEventListener("click", async () => {
    if (!confirm("Delete this tracked page?")) return;
    try {
      await api.del(`/api/site-profiles/${b.getAttribute("data-del-sp")}`);
      render(view);
    } catch (e) { toastError(e); }
  }));
}
