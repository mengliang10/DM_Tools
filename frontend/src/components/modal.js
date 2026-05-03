// Lightweight modal helper. Returns a `close` function.
export function openModal({ title, body, footer = "", onClose }) {
  const root = document.getElementById("modal-root");
  if (!root) return () => {};

  const overlay = document.createElement("div");
  overlay.className = "fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4";
  overlay.innerHTML = `
    <div class="card max-w-2xl w-full max-h-[85vh] overflow-y-auto" role="dialog" aria-modal="true">
      <div class="flex items-start justify-between mb-3">
        <h2 class="text-lg font-semibold">${title}</h2>
        <button class="btn btn-ghost px-2" data-modal-close aria-label="Close">✕</button>
      </div>
      <div data-modal-body>${body}</div>
      ${footer ? `<div class="mt-4 flex justify-end gap-2" data-modal-footer>${footer}</div>` : ""}
    </div>
  `;
  root.appendChild(overlay);

  const close = () => {
    overlay.remove();
    onClose?.();
  };
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  overlay.querySelectorAll("[data-modal-close]").forEach((b) => b.addEventListener("click", close));
  document.addEventListener("keydown", function esc(e) {
    if (e.key === "Escape") {
      document.removeEventListener("keydown", esc);
      close();
    }
  });
  return { close, overlay };
}
