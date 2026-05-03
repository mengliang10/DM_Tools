// Settings modal: API key CRUD + active profile picker.
import { api } from "../utils/api.js";
import { openModal } from "./modal.js";
import { toast } from "./toast.js";
import { escapeHtml } from "../utils/format.js";

export async function openSettingsModal() {
  let providers = {};
  let keys = [];
  let profiles = [];
  let activeProfileId = null;

  try {
    [providers, keys, profiles, activeProfileId] = await Promise.all([
      api.get("/api/providers"),
      api.get("/api/keys"),
      api.get("/api/profiles"),
      api.get("/api/profiles/active/current").then((r) => r.active_profile_id),
    ]);
  } catch (e) {
    toast(`Could not load settings: ${e.message}`, "error");
    return;
  }

  const providerOptions = Object.keys(providers)
    .map((p) => `<option value="${p}">${p}</option>`)
    .join("");
  const modelDatalist = Object.entries(providers)
    .map(([p, models]) => models.map((m) => `<option value="${m}">${p}</option>`).join(""))
    .join("");

  const profileOptions = `
    <option value="">— No profile (global defaults) —</option>
    ${profiles
      .map(
        (p) =>
          `<option value="${p.id}" ${p.id === activeProfileId ? "selected" : ""}>${escapeHtml(
            p.name
          )}${p.brand ? ` (${escapeHtml(p.brand)})` : ""}</option>`
      )
      .join("")}
  `;

  const keysTableRows =
    keys.length === 0
      ? `<tr><td colspan="4" class="text-muted text-sm py-4 text-center">No API keys yet. Add one below.</td></tr>`
      : keys
          .map(
            (k) => `
        <tr>
          <td class="font-medium">${escapeHtml(k.provider)}</td>
          <td>${escapeHtml(k.label || "—")}</td>
          <td class="text-muted">${escapeHtml(k.model || "—")}</td>
          <td class="text-right">
            <button class="btn btn-danger" data-delete-key="${k.id}">Delete</button>
          </td>
        </tr>`
          )
          .join("");

  const body = `
    <div class="space-y-6">
      <!-- Active profile -->
      <div>
        <h3 class="text-sm font-semibold mb-2 text-muted uppercase tracking-wide">Active profile</h3>
        <div class="flex gap-2 items-end">
          <select id="profile-select" class="select flex-1">${profileOptions}</select>
          <button id="apply-profile" class="btn btn-primary">Apply</button>
          <button id="new-profile" class="btn btn-outline">New…</button>
        </div>
        <p class="text-xs text-muted mt-1">Profiles let you isolate prompts, competitors, and history per brand.</p>
      </div>

      <!-- API keys -->
      <div>
        <h3 class="text-sm font-semibold mb-2 text-muted uppercase tracking-wide">API keys</h3>
        <table class="table">
          <thead><tr><th>Provider</th><th>Label</th><th>Model</th><th></th></tr></thead>
          <tbody id="keys-tbody">${keysTableRows}</tbody>
        </table>
        <details class="mt-3">
          <summary class="cursor-pointer text-sm">+ Add a key</summary>
          <form id="add-key-form" class="grid grid-cols-2 gap-2 mt-3">
            <select name="provider" class="select" required>
              <option value="">Provider…</option>${providerOptions}
            </select>
            <input name="label" class="input" placeholder="Label (optional)" />
            <input name="api_key" type="password" class="input col-span-2" placeholder="API key (stored encrypted)" required autocomplete="new-password" />
            <input name="model" class="input col-span-2" placeholder="Model (or pick from list)" list="models-list" required />
            <datalist id="models-list">${modelDatalist}</datalist>
            <button type="submit" class="btn btn-primary col-span-2">Save key</button>
          </form>
        </details>
      </div>
    </div>
  `;

  const { close, overlay } = openModal({
    title: "Settings",
    body,
    footer: `<button class="btn btn-outline" data-modal-close>Close</button>`,
  });

  // ----- Wire up active profile actions -----
  overlay.querySelector("#apply-profile").addEventListener("click", async () => {
    const sel = overlay.querySelector("#profile-select");
    const id = sel.value;
    try {
      if (!id) {
        await api.post("/api/profiles/active/deactivate", {});
        toast("Active profile cleared", "success");
      } else {
        await api.post(`/api/profiles/${id}/activate`, {});
        toast("Active profile updated", "success");
      }
      window.dispatchEvent(new CustomEvent("dm:profile-changed"));
      close();
    } catch (e) {
      toast(e.message, "error");
    }
  });

  overlay.querySelector("#new-profile").addEventListener("click", async () => {
    const name = prompt("Profile name?");
    if (!name) return;
    const brand = prompt("Brand (optional)?") || "";
    const website = prompt("Website (optional)?") || "";
    try {
      const { id } = await api.post("/api/profiles", { name, brand, website });
      await api.post(`/api/profiles/${id}/activate`, {});
      toast(`Profile "${name}" created and activated`, "success");
      window.dispatchEvent(new CustomEvent("dm:profile-changed"));
      close();
    } catch (e) {
      toast(e.message, "error");
    }
  });

  // ----- Wire up key actions -----
  overlay.querySelectorAll("[data-delete-key]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-delete-key");
      if (!confirm("Delete this API key?")) return;
      try {
        await api.del(`/api/keys/${id}`);
        toast("Key deleted", "success");
        close();
        openSettingsModal();
      } catch (e) { toast(e.message, "error"); }
    });
  });

  overlay.querySelector("#add-key-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    const payload = {
      provider: f.provider.value,
      label: f.label.value,
      api_key: f.api_key.value,
      model: f.model.value,
    };
    try {
      await api.post("/api/keys", payload);
      toast("Key saved (encrypted)", "success");
      close();
      openSettingsModal();
    } catch (e) {
      toast(e.message, "error");
    }
  });
}
