export function toast(message, kind = "info", { duration = 3500 } = {}) {
  const root = document.getElementById("toasts");
  if (!root) return;
  const el = document.createElement("div");
  el.className = `toast toast-${kind}`;
  el.textContent = message;
  root.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transition = "opacity 200ms";
    setTimeout(() => el.remove(), 250);
  }, duration);
}
