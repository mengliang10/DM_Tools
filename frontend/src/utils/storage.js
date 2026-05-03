// Tiny localStorage helpers — preferences only, never API keys.
export const prefs = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(`dm.${key}`);
      return raw === null ? fallback : JSON.parse(raw);
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(`dm.${key}`, JSON.stringify(value)); } catch {}
  },
  remove(key) {
    try { localStorage.removeItem(`dm.${key}`); } catch {}
  },
};
