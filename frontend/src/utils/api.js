// Tiny fetch wrapper. Rejects on non-2xx, returns parsed JSON otherwise.
const BASE = ""; // same-origin: Vite proxy in dev, FastAPI static mount in prod

async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
  }
  if (!res.ok) {
    const detail = data?.detail || data?.message || `HTTP ${res.status}`;
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  return data;
}

export const api = {
  get:  (p)        => request("GET",    p),
  post: (p, body)  => request("POST",   p, body),
  put:  (p, body)  => request("PUT",    p, body),
  del:  (p)        => request("DELETE", p),
};
