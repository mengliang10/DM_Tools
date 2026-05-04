export function toast(message, kind = "info", { duration = 3500, fix } = {}) {
  const root = document.getElementById("toasts");
  if (!root) return;
  const el = document.createElement("div");
  el.className = `toast toast-${kind}`;
  if (fix) {
    el.innerHTML = `
      <div class="font-semibold mb-1"></div>
      <div class="text-xs opacity-80"></div>
    `;
    el.querySelector(".font-semibold").textContent = message;
    el.querySelector(".opacity-80").textContent = fix;
    duration = Math.max(duration, 6500);
  } else {
    el.textContent = message;
  }
  root.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transition = "opacity 200ms";
    setTimeout(() => el.remove(), 250);
  }, duration);
}

/**
 * Convenience for catch-blocks: shows the error message + the
 * ApiError.fix hint when present.
 */
export function toastError(err) {
  toast(err.message, "error", { fix: err?.fix });
}
