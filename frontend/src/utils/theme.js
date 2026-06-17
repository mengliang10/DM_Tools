// Persist theme choice in localStorage; respect prefers-color-scheme on first load.
const KEY = "dm.theme";

export function currentTheme() {
  return document.documentElement.getAttribute("data-theme") || "dark";
}

export function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(KEY, theme);
  updateButton(theme);
}

export function toggleTheme() {
  setTheme(currentTheme() === "dark" ? "light" : "dark");
}

export function initTheme() {
  const stored = localStorage.getItem(KEY);
  if (stored === "light" || stored === "dark") {
    setTheme(stored);
    return;
  }
  const prefersLight = window.matchMedia?.("(prefers-color-scheme: light)")?.matches ?? false;
  setTheme(prefersLight ? "light" : "dark");
}

function updateButton(theme) {
  document.querySelectorAll(".theme-icon").forEach((el) => {
    el.textContent = theme === "dark" ? "🌙" : "☀️";
  });
  document.querySelectorAll(".theme-label").forEach((el) => {
    el.textContent = theme;
  });
}
