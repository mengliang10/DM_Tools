import { api } from "../../utils/api.js";
import { toast, toastError } from "../../components/toast.js";
import { escapeHtml, renderMarkdown, relativeTime } from "../../utils/format.js";

export async function mount(view) {
  const [keys, history] = await Promise.all([
    api.get("/api/keys"),
    api.get("/api/content/history").catch(() => []),
  ]);
  if (keys.length === 0) {
    view.innerHTML = `<div class="card">Add an LLM API key in <strong>Settings</strong> first.</div>`;
    return;
  }
  view.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <form id="gen-form" class="card space-y-3 lg:col-span-1">
        <div>
          <label class="text-xs font-semibold uppercase text-muted">Topic</label>
          <input class="input" name="topic" required placeholder="e.g. Best practices for B2B email" />
        </div>
        <div>
          <label class="text-xs font-semibold uppercase text-muted">Brand</label>
          <input class="input" name="brand" placeholder="(optional)" />
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="text-xs font-semibold uppercase text-muted">Type</label>
            <select class="select" name="content_type">
              <option value="blog">Blog post</option>
              <option value="social">Social post</option>
              <option value="whitepaper">Whitepaper</option>
              <option value="email">Email</option>
              <option value="product">Product page</option>
            </select>
          </div>
          <div>
            <label class="text-xs font-semibold uppercase text-muted">Tone</label>
            <select class="select" name="tone">
              <option>professional</option><option>friendly</option><option>technical</option>
              <option>persuasive</option><option>academic</option>
            </select>
          </div>
        </div>
        <div>
          <label class="text-xs font-semibold uppercase text-muted">Audience</label>
          <input class="input" name="audience" value="general" />
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
        <button type="submit" class="btn btn-primary w-full">Generate</button>
      </form>

      <div class="lg:col-span-2 space-y-4">
        <div id="output" class="card text-muted text-sm">Output will appear here.</div>
        <div class="card">
          <h3 class="font-semibold mb-2">Recent generations</h3>
          ${history.length === 0 ? `<div class="text-muted text-sm">No history.</div>` :
            `<ul class="divide-y divide-border text-sm">${history.slice(0, 8).map(h => `
              <li class="py-2 flex justify-between gap-2">
                <button class="text-left flex-1 truncate hover:underline" data-load="${h.id}">
                  <span class="font-medium">${escapeHtml(h.topic)}</span>
                  <span class="text-muted">· ${escapeHtml(h.content_type || "")}</span>
                </button>
                <span class="text-xs text-muted">${relativeTime(h.created_at)}</span>
              </li>`).join("")}</ul>`}
        </div>
      </div>
    </div>
  `;

  const form = view.querySelector("#gen-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const payload = Object.fromEntries(fd);
    payload.key_id = Number(payload.key_id);
    const btn = form.querySelector("button");
    btn.disabled = true; btn.textContent = "Generating…";
    view.querySelector("#output").innerHTML = `<div class="text-muted text-sm">Calling LLM…</div>`;
    try {
      const out = await api.post("/api/content/generate", payload);
      renderOutput(view.querySelector("#output"), out.content);
      toast("Content generated", "success");
    } catch (err) { toastError(err); view.querySelector("#output").innerHTML = `<div class="text-muted text-sm">Generation failed.</div>`; }
    finally { btn.disabled = false; btn.textContent = "Generate"; }
  });

  view.querySelectorAll("[data-load]").forEach((b) => b.addEventListener("click", async () => {
    try {
      const r = await api.get(`/api/content/${b.getAttribute("data-load")}`);
      renderOutput(view.querySelector("#output"), r.content);
    } catch (e) { toastError(e); }
  }));
}

function renderOutput(el, md) {
  el.innerHTML = `
    <div class="flex items-center justify-between mb-3">
      <h3 class="font-semibold">Generated content</h3>
      <button class="btn btn-outline" id="copy">Copy Markdown</button>
    </div>
    <div class="prose-dm">${renderMarkdown(md)}</div>
  `;
  el.querySelector("#copy")?.addEventListener("click", () => {
    navigator.clipboard.writeText(md);
    toast("Copied", "success");
  });
}
