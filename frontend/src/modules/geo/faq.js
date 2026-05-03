import { api } from "../../utils/api.js";
import { toast } from "../../components/toast.js";
import { escapeHtml, renderMarkdown, relativeTime } from "../../utils/format.js";

export async function mount(view) {
  const [keys, history] = await Promise.all([
    api.get("/api/keys"),
    api.get("/api/faq/history").catch(() => []),
  ]);
  if (keys.length === 0) {
    view.innerHTML = `<div class="card">Add an LLM API key in <strong>Settings</strong> first.</div>`;
    return;
  }
  view.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <form id="faq-form" class="card space-y-3 lg:col-span-1">
        <div>
          <label class="text-xs font-semibold uppercase text-muted">Topic</label>
          <input class="input" name="topic" required placeholder="e.g. Onboarding for new users" />
        </div>
        <div>
          <label class="text-xs font-semibold uppercase text-muted">Brand</label>
          <input class="input" name="brand" placeholder="(optional)" />
        </div>
        <div>
          <label class="text-xs font-semibold uppercase text-muted">Number of FAQs</label>
          <input class="input" name="num_faqs" type="number" min="3" max="15" value="6" />
        </div>
        <div>
          <label class="text-xs font-semibold uppercase text-muted">Model (key)</label>
          <select class="select" name="key_id" required>
            ${keys.map(k => `<option value="${k.id}">${escapeHtml(k.provider)} · ${escapeHtml(k.model)} ${k.label ? `(${escapeHtml(k.label)})` : ""}</option>`).join("")}
          </select>
        </div>
        <div>
          <label class="text-xs font-semibold uppercase text-muted">Language</label>
          <select class="select" name="language">
            <option value="en">English</option><option value="ja">Japanese</option>
            <option value="zh-CN">Simplified Chinese</option><option value="ko">Korean</option>
            <option value="de">German</option><option value="fr">French</option>
            <option value="es">Spanish</option>
          </select>
        </div>
        <button type="submit" class="btn btn-primary w-full">Generate FAQ</button>
      </form>

      <div class="lg:col-span-2 space-y-4">
        <div id="output" class="card text-muted text-sm">Generated FAQ + JSON-LD schema appears here.</div>
        <div class="card">
          <h3 class="font-semibold mb-2">Recent</h3>
          ${history.length === 0 ? `<div class="text-muted text-sm">No history.</div>` :
            `<ul class="divide-y divide-border text-sm">${history.slice(0, 8).map(h => `
              <li class="py-2 flex justify-between gap-2">
                <button class="text-left flex-1 truncate hover:underline" data-load="${h.id}">
                  <span class="font-medium">${escapeHtml(h.topic)}</span>
                  <span class="text-muted">· ${escapeHtml(h.brand || "")}</span>
                </button>
                <span class="text-xs text-muted">${relativeTime(h.created_at)}</span>
              </li>`).join("")}</ul>`}
        </div>
      </div>
    </div>
  `;

  const form = view.querySelector("#faq-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const payload = Object.fromEntries(fd);
    payload.key_id = Number(payload.key_id);
    payload.num_faqs = Number(payload.num_faqs);
    const btn = form.querySelector("button");
    btn.disabled = true; btn.textContent = "Generating…";
    view.querySelector("#output").innerHTML = `<div class="text-muted text-sm">Calling LLM…</div>`;
    try {
      const out = await api.post("/api/faq/generate", payload);
      renderFaq(view.querySelector("#output"), out.content);
      toast("FAQ ready", "success");
    } catch (err) { toast(err.message, "error"); }
    finally { btn.disabled = false; btn.textContent = "Generate FAQ"; }
  });

  view.querySelectorAll("[data-load]").forEach((b) => b.addEventListener("click", async () => {
    try {
      const r = await api.get(`/api/faq/${b.getAttribute("data-load")}`);
      renderFaq(view.querySelector("#output"), r.content);
    } catch (e) { toast(e.message, "error"); }
  }));
}

function renderFaq(el, md) {
  const jsonld = (md.match(/```json([\s\S]*?)```/) || [])[1]?.trim();
  el.innerHTML = `
    <div class="flex items-center justify-between mb-3">
      <h3 class="font-semibold">Generated FAQ</h3>
      <div class="flex gap-2">
        <button class="btn btn-outline" id="copy-md">Copy Markdown</button>
        ${jsonld ? `<button class="btn btn-outline" id="copy-jsonld">Copy JSON-LD</button>` : ""}
      </div>
    </div>
    <div class="prose-dm">${renderMarkdown(md)}</div>
  `;
  el.querySelector("#copy-md")?.addEventListener("click", () => {
    navigator.clipboard.writeText(md); toast("Markdown copied", "success");
  });
  el.querySelector("#copy-jsonld")?.addEventListener("click", () => {
    navigator.clipboard.writeText(jsonld); toast("JSON-LD schema copied", "success");
  });
}
