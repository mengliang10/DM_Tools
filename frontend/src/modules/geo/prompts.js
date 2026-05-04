import { api } from "../../utils/api.js";
import { toast, toastError } from "../../components/toast.js";
import { escapeHtml } from "../../utils/format.js";

export async function mount(view) {
  await render(view);
}

async function render(view) {
  const [prompts, keys, activeProfile] = await Promise.all([
    api.get("/api/prompts"),
    api.get("/api/keys"),
    api.get("/api/profiles/active/current"),
  ]);
  const profile = activeProfile?.profile;

  view.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="md:col-span-1 space-y-4">
        <form id="add" class="card space-y-3">
          <h3 class="font-semibold">Add prompt</h3>
          <textarea name="text" class="textarea" rows="3" required placeholder="Use [brand] / [topic] placeholders…"></textarea>
          <input name="description" class="input" placeholder="Description (optional)" />
          <select name="funnel_stage" class="select">
            <option value="top_of_funnel">Top of funnel</option>
            <option value="middle_of_funnel">Middle of funnel</option>
            <option value="bottom_of_funnel">Bottom of funnel</option>
          </select>
          <button class="btn btn-primary w-full">Save prompt</button>
        </form>

        ${keys.length > 0 ? `
          <div class="card">
            <h3 class="font-semibold mb-2">✨ Autofill prompts</h3>
            <p class="text-xs text-muted mb-2">
              ${profile ? `Will use the active profile: <strong>${escapeHtml(profile.name)}</strong>` : "No active profile — will use generic context."}
            </p>
            <form id="auto-form" class="space-y-2">
              <select class="select" name="key_id" required>
                ${keys.map(k => `<option value="${k.id}">${escapeHtml(k.provider)} · ${escapeHtml(k.model)}</option>`).join("")}
              </select>
              <div class="grid grid-cols-3 gap-1">
                <label class="text-xs"><span class="text-muted">Top</span><input class="input" type="number" name="count_top" value="3" min="1" max="10" /></label>
                <label class="text-xs"><span class="text-muted">Mid</span><input class="input" type="number" name="count_mid" value="3" min="1" max="10" /></label>
                <label class="text-xs"><span class="text-muted">Bot</span><input class="input" type="number" name="count_bot" value="3" min="1" max="10" /></label>
              </div>
              <button class="btn btn-outline w-full">Generate suggestions</button>
            </form>
            <div id="auto-out" class="mt-3 text-sm hidden"></div>
          </div>` : ""}
      </div>

      <div class="md:col-span-2 card">
        <h3 class="font-semibold mb-3">Saved prompts (${prompts.length})</h3>
        <ul class="divide-y divide-border text-sm">
          ${prompts.length === 0 ? `<li class="text-muted py-2">None.</li>` :
            prompts.map(p => `
              <li class="py-3 flex items-start gap-3">
                <div class="flex-1 min-w-0">
                  <div>${escapeHtml(p.text)}</div>
                  <div class="text-xs text-muted">${escapeHtml(p.description || "")} · <span class="badge">${escapeHtml(p.funnel_stage)}</span></div>
                </div>
                <button class="btn btn-danger" data-del="${p.id}">Delete</button>
              </li>`).join("")}
        </ul>
      </div>
    </div>
  `;

  view.querySelector("#add").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await api.post("/api/prompts", Object.fromEntries(fd));
      toast("Prompt added", "success");
      render(view);
    } catch (err) { toastError(err); }
  });

  view.querySelector("#auto-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const btn = e.currentTarget.querySelector("button");
    btn.disabled = true; btn.textContent = "Generating…";
    const out = view.querySelector("#auto-out");
    out.classList.remove("hidden");
    out.innerHTML = `<div class="text-muted">Calling LLM…</div>`;
    try {
      const data = await api.post("/api/autofill", {
        module: "prompt",
        key_id: Number(fd.get("key_id")),
        brand:    profile?.brand    || "",
        industry: profile?.industry || "",
        website:  profile?.website  || "",
        count_top: Number(fd.get("count_top")),
        count_mid: Number(fd.get("count_mid")),
        count_bot: Number(fd.get("count_bot")),
      });
      renderAutofill(view, out, data);
    } catch (err) {
      toastError(err);
      out.innerHTML = `<div class="text-bad text-sm">Generation failed.</div>`;
    } finally {
      btn.disabled = false; btn.textContent = "Generate suggestions";
    }
  });

  view.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", async () => {
    if (!confirm("Delete this prompt?")) return;
    try {
      await api.del(`/api/prompts/${b.getAttribute("data-del")}`);
      render(view);
    } catch (e) { toastError(e); }
  }));
}

function renderAutofill(view, out, data) {
  const sectionRow = (stage, list) => list?.length ? `
    <div class="mt-3">
      <div class="text-xs font-semibold uppercase text-muted">${stage}</div>
      <ul class="space-y-1 mt-1">
        ${list.map((p, i) => `
          <li class="flex items-start gap-2 text-sm">
            <input type="checkbox" data-auto-idx="${stage}-${i}" data-auto-stage="${stage}" data-auto-text="${escapeHtml(p.text)}" data-auto-desc="${escapeHtml(p.description || "")}" checked />
            <div class="flex-1">
              <div>${escapeHtml(p.text)}</div>
              <div class="text-xs text-muted">${escapeHtml(p.description || "")}</div>
            </div>
          </li>`).join("")}
      </ul>
    </div>` : "";

  out.innerHTML = `
    ${sectionRow("Top of funnel",    data.top)}
    ${sectionRow("Middle of funnel", data.mid)}
    ${sectionRow("Bottom of funnel", data.bot)}
    <button class="btn btn-primary w-full mt-3" id="save-selected">Save selected</button>
  `;
  out.querySelector("#save-selected").addEventListener("click", async () => {
    const stageMap = {
      "Top of funnel":    "top_of_funnel",
      "Middle of funnel": "middle_of_funnel",
      "Bottom of funnel": "bottom_of_funnel",
    };
    const checked = out.querySelectorAll("[data-auto-idx]:checked");
    if (checked.length === 0) return toast("Pick at least one", "error");
    let saved = 0;
    for (const cb of checked) {
      try {
        await api.post("/api/prompts", {
          text: cb.getAttribute("data-auto-text"),
          description: cb.getAttribute("data-auto-desc"),
          funnel_stage: stageMap[cb.getAttribute("data-auto-stage")] || "top_of_funnel",
        });
        saved++;
      } catch { /* skip individual failures */ }
    }
    toast(`Saved ${saved} prompt(s)`, "success");
    render(view);
  });
}
