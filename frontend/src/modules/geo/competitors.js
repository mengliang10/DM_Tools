import { api } from "../../utils/api.js";
import { toast } from "../../components/toast.js";
import { escapeHtml } from "../../utils/format.js";

export async function mount(view) {
  await render(view);
}

async function render(view) {
  const list = await api.get("/api/competitors");
  view.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <form id="add" class="card space-y-3 md:col-span-1">
        <h3 class="font-semibold">Add competitor</h3>
        <input class="input" name="brand_name" placeholder="Brand name" required />
        <input class="input" name="domain" placeholder="example.com (optional)" />
        <select class="select" name="competitor_type">
          <option value="direct">Direct</option>
          <option value="indirect">Indirect</option>
          <option value="aspirational">Aspirational</option>
        </select>
        <button class="btn btn-primary w-full">Add</button>
      </form>
      <div class="md:col-span-2 card">
        <h3 class="font-semibold mb-3">Tracked (${list.length})</h3>
        <table class="table">
          <thead><tr><th>Brand</th><th>Domain</th><th>Type</th><th></th></tr></thead>
          <tbody>
            ${list.length === 0 ? `<tr><td colspan="4" class="text-muted py-4 text-center">None tracked.</td></tr>` :
              list.map(c => `
                <tr>
                  <td class="font-medium">${escapeHtml(c.brand_name)}</td>
                  <td class="text-muted">${escapeHtml(c.domain || "—")}</td>
                  <td><span class="badge">${escapeHtml(c.competitor_type)}</span></td>
                  <td class="text-right"><button class="btn btn-danger" data-del="${c.id}">Delete</button></td>
                </tr>`).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
  view.querySelector("#add").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await api.post("/api/competitors", Object.fromEntries(new FormData(e.currentTarget)));
      toast("Competitor added", "success");
      render(view);
    } catch (err) { toast(err.message, "error"); }
  });
  view.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", async () => {
    if (!confirm("Delete?")) return;
    await api.del(`/api/competitors/${b.getAttribute("data-del")}`);
    render(view);
  }));
}
