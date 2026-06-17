// Pure formatting helpers. No DOM, no fetch — easy to unit-test.
import { marked } from "marked";
import createDOMPurify from "dompurify";

marked.use({ gfm: true, breaks: true });

// DOMPurify needs a `window`. In Vite/browser it's there at import time;
// in happy-dom (vitest) it's available by the time `renderMarkdown` runs,
// so initialise lazily on first call.
let _purify = null;
function purify() {
  if (_purify) return _purify;
  if (typeof window !== "undefined" && window.document) {
    _purify = createDOMPurify(window);
  }
  return _purify;
}

// Last-resort sanitiser used when DOMPurify is unavailable (server-side
// rendering, test environments) — strips <script>/<style>/event handlers
// without trying to parse HTML.
function softSanitize(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, "")
    .replace(/\son\w+\s*=\s*"(?:[^"\\]|\\.)*"/gi, "")
    .replace(/\son\w+\s*=\s*'(?:[^'\\]|\\.)*'/gi, "")
    .replace(/javascript:/gi, "");
}

export function renderMarkdown(md) {
  if (!md) return "";
  const html = marked.parse(md);
  const p = purify();
  if (p) {
    const out = p.sanitize(html);
    // Some test runtimes return empty when DOM isn't fully wired up —
    // fall back to soft sanitiser so the function never silently drops
    // user content.
    if (out || !html) return out;
  }
  return softSanitize(html);
}

export function escapeHtml(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function pct(value, total) {
  if (!total) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

export function relativeTime(iso) {
  if (!iso) return "";
  const then = new Date(iso.endsWith("Z") ? iso : iso + "Z");
  const sec = Math.max(1, Math.round((Date.now() - then.getTime()) / 1000));
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.round(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.round(sec / 3600)}h ago`;
  return `${Math.round(sec / 86400)}d ago`;
}

export function gradeFromScore(score, max) {
  if (!max) return { letter: "—", colour: "muted" };
  const p = score / max;
  if (p >= 0.9) return { letter: "A", colour: "good" };
  if (p >= 0.75) return { letter: "B", colour: "good" };
  if (p >= 0.6) return { letter: "C", colour: "warn" };
  if (p >= 0.4) return { letter: "D", colour: "warn" };
  return { letter: "F", colour: "bad" };
}
