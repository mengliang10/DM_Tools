// Tiny fetch wrapper. Rejects on non-2xx, returns parsed JSON otherwise.
// Errors are thrown as `ApiError` so callers can surface the optional `fix`
// hint (e.g. the EncryptionError handler suggests how to set ENCRYPTION_KEY).
const BASE = ""; // same-origin: Vite proxy in dev, FastAPI static mount in prod

export class ApiError extends Error {
  constructor(message, { status, fix } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fix = fix;
  }
}

async function request(method, path, body) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    // Network failure (backend down, DNS, CORS preflight, …)
    throw new ApiError(
      `Cannot reach the backend (${e.message}). Is uvicorn running on :8000?`,
      { status: 0 },
    );
  }
  const text = await res.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
  }
  if (!res.ok) {
    const rawDetail = data?.detail ?? data?.message ?? `HTTP ${res.status}`;
    const message = typeof rawDetail === "string" ? rawDetail : JSON.stringify(rawDetail);
    throw new ApiError(message, { status: res.status, fix: data?.fix });
  }
  return data;
}

export const api = {
  get:  (p)        => request("GET",    p),
  post: (p, body)  => request("POST",   p, body),
  put:  (p, body)  => request("PUT",    p, body),
  del:  (p)        => request("DELETE", p),
};
