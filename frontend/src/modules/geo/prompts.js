import { api } from "../../utils/api.js";
import { toast } from "../../components/toast.js";
import { escapeHtml } from "../../utils/format.js";

export async function mount(view) {
  await render(view);
}

async function render(view) {
  const prompts = await api.get("/api/prompts");
  view.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <form id="add" class="card space-y-3 md:col-span-1">
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
    } catch (err) { toast(err.message, "error"); }
  });
  view.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", async () => {
    if (!confirm("Delete this prompt?")) return;
    try {
      await api.del(`/api/prompts/${b.getAttribute("data-del")}`);
      render(view);
    } catch (e) { toast(e.message, "error"); }
  }));
}
