// Profiles — full CRUD management. Restores the original geo repo's
// per-profile editor (brand / website / industry / language / notes / linked keys).
import { api } from "../../utils/api.js";
import { toast, toastError } from "../../components/toast.js";
import { escapeHtml, relativeTime } from "../../utils/format.js";

export async function mount(view) {
  await render(view, null);
}

async function render(view, editing) {
  const [profiles, keys, active] = await Promise.all([
    api.get("/api/profiles"),
    api.get("/api/keys"),
    api.get("/api/profiles/active/current"),
  ]);

  view.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-1 space-y-4">
        <div class="card">
          <h3 class="font-semibold mb-2">Profiles (${profiles.length})</h3>
          <ul class="divide-y divide-border text-sm" id="prof-list">
            ${profiles.length === 0 ? `<li class="text-muted py-2">No profiles yet.</li>` :
              profiles.map(p => `
                <li class="py-2 flex items-center justify-between gap-2">
                  <div class="min-w-0 flex-1">
                    <div class="font-medium truncate">${escapeHtml(p.name)}</div>
                    <div class="text-xs text-muted truncate">${escapeHtml(p.brand || "")} · ${escapeHtml(p.industry || "")}</div>
                  </div>
                  <div class="flex items-center gap-1 shrink-0">
                    ${active.active_profile_id === p.id ? `<span class="badge badge-good">active</span>` : ""}
                    <button class="btn btn-ghost px-2" data-edit="${p.id}" title="Edit">✎</button>
                    <button class="btn btn-ghost px-2" data-activate="${p.id}" title="Activate">▶</button>
                    <button class="btn btn-ghost px-2 text-bad" data-delete="${p.id}" title="Delete">✕</button>
                  </div>
                </li>`).join("")}
          </ul>
          <button class="btn btn-primary w-full mt-3" id="new-prof">+ New profile</button>
          ${active.active_profile_id ? `<button class="btn btn-outline w-full mt-2" id="deactivate">Clear active profile</button>` : ""}
        </div>
      </div>

      <div class="lg:col-span-2">
        <div id="editor" class="card">
          ${editing ? "" : `<div class="text-muted text-sm">Pick a profile on the left to edit, or click <strong>+ New profile</strong>.</div>`}
        </div>
      </div>
    </div>
  `;

  view.querySelector("#new-prof").addEventListener("click", () => {
    renderEditor(view, keys, null);
  });
  view.querySelector("#deactivate")?.addEventListener("click", async () => {
    try {
      await api.post("/api/profiles/active/deactivate", {});
      window.dispatchEvent(new CustomEvent("dm:profile-changed"));
      toast("Active profile cleared", "success");
    } catch (e) { toastError(e); }
  });
  view.querySelectorAll("[data-edit]").forEach(b => b.addEventListener("click", async () => {
    try {
      const p = await api.get(`/api/profiles/${b.getAttribute("data-edit")}`);
      renderEditor(view, keys, p);
    } catch (e) { toastError(e); }
  }));
  view.querySelectorAll("[data-activate]").forEach(b => b.addEventListener("click", async () => {
    try {
      await api.post(`/api/profiles/${b.getAttribute("data-activate")}/activate`, {});
      window.dispatchEvent(new CustomEvent("dm:profile-changed"));
      toast("Profile activated", "success");
    } catch (e) { toastError(e); }
  }));
  view.querySelectorAll("[data-delete]").forEach(b => b.addEventListener("click", async () => {
    if (!confirm("Delete this profile? All its prompts, competitors, history will be removed.")) return;
    try {
      await api.del(`/api/profiles/${b.getAttribute("data-delete")}`);
      window.dispatchEvent(new CustomEvent("dm:profile-changed"));
      toast("Profile deleted", "success");
    } catch (e) { toastError(e); }
  }));

  if (editing) renderEditor(view, keys, editing);
}

function renderEditor(view, keys, p) {
  const editor = view.querySelector("#editor");
  const isNew = !p;
  const title = isNew ? "New profile" : `Edit · ${escapeHtml(p.name)}`;
  const data = p || { name: "", brand: "", website: "", industry: "", language: "en", notes: "", key_ids: [] };

  editor.innerHTML = `
    <h3 class="font-semibold mb-3">${title}</h3>
    <form id="edit-form" class="space-y-3">
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="text-xs font-semibold uppercase text-muted">Profile name</label>
          <input class="input" name="name" required value="${escapeHtml(data.name || "")}" />
        </div>
        <div>
          <label class="text-xs font-semibold uppercase text-muted">Brand</label>
          <input class="input" name="brand" value="${escapeHtml(data.brand || "")}" />
        </div>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="text-xs font-semibold uppercase text-muted">Website</label>
          <input class="input" name="website" placeholder="https://example.com" value="${escapeHtml(data.website || "")}" />
        </div>
        <div>
          <label class="text-xs font-semibold uppercase text-muted">Industry</label>
          <input class="input" name="industry" value="${escapeHtml(data.industry || "")}" />
        </div>
      </div>
      <div>
        <label class="text-xs font-semibold uppercase text-muted">Default language</label>
        <select class="select" name="language">
          ${["en","ja","zh-CN","zh-TW","ko","de","fr","es","it","pt","ru","th","id","ms"].map(l =>
            `<option value="${l}" ${data.language===l?"selected":""}>${l}</option>`).join("")}
        </select>
      </div>
      <div>
        <label class="text-xs font-semibold uppercase text-muted">Notes</label>
        <textarea class="textarea" name="notes" rows="3" placeholder="Brand brief, positioning notes, etc.">${escapeHtml(data.notes || "")}</textarea>
      </div>
      <div>
        <label class="text-xs font-semibold uppercase text-muted">Linked API keys (used in visibility / debate)</label>
        <div class="space-y-1 mt-1 max-h-40 overflow-y-auto p-2 rounded-md border border-border">
          ${keys.length === 0 ? `<div class="text-muted text-xs">No keys configured. Add some in Settings.</div>` :
            keys.map(k => `
              <label class="flex items-center gap-2 text-sm">
                <input type="checkbox" name="key_ids" value="${k.id}" ${data.key_ids?.includes(k.id) ? "checked" : ""} />
                <span class="font-medium">${escapeHtml(k.provider)}</span>
                <span class="text-muted text-xs">${escapeHtml(k.model || "")}${k.label ? ` · ${escapeHtml(k.label)}` : ""}</span>
              </label>
            `).join("")}
        </div>
      </div>
      <div class="flex gap-2">
        <button type="submit" class="btn btn-primary flex-1">${isNew ? "Create profile" : "Save changes"}</button>
        ${!isNew ? `<button type="button" class="btn btn-outline" id="cancel-edit">Cancel</button>` : ""}
      </div>
    </form>
  `;

  editor.querySelector("#cancel-edit")?.addEventListener("click", () => render(view, null));

  editor.querySelector("#edit-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: fd.get("name"),
      brand: fd.get("brand"),
      website: fd.get("website"),
      industry: fd.get("industry"),
      language: fd.get("language"),
      notes: fd.get("notes"),
      key_ids: fd.getAll("key_ids").map(Number),
      custom_json: data.custom_json || {},
    };
    try {
      if (isNew) {
        await api.post("/api/profiles", payload);
        toast("Profile created", "success");
      } else {
        await api.put(`/api/profiles/${p.id}`, payload);
        toast("Profile updated", "success");
      }
      window.dispatchEvent(new CustomEvent("dm:profile-changed"));
      render(view, null);
    } catch (err) { toastError(err); }
  });
}
