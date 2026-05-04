/**
 * Tests the api.js error wrapper — proves it forwards the `fix` hint
 * (which the EncryptionError handler relies on) and never throws plain
 * Error instances. Catches the regression from the v0.1 audit.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { api, ApiError } from "../src/utils/api.js";

const realFetch = globalThis.fetch;

beforeEach(() => {
  globalThis.fetch = vi.fn();
});
afterEach(() => {
  globalThis.fetch = realFetch;
});

function mockResponse(body, { status = 200 } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
  };
}

describe("api wrapper", () => {
  it("returns parsed JSON on success", async () => {
    globalThis.fetch.mockResolvedValueOnce(mockResponse({ ok: true, n: 7 }));
    const out = await api.get("/api/x");
    expect(out).toEqual({ ok: true, n: 7 });
  });

  it("throws ApiError with the server detail on failure", async () => {
    globalThis.fetch.mockResolvedValueOnce(
      mockResponse({ detail: "Boom" }, { status: 500 })
    );
    await expect(api.get("/api/x")).rejects.toMatchObject({
      name: "ApiError",
      message: "Boom",
      status: 500,
    });
  });

  it("forwards the optional `fix` hint from server errors", async () => {
    globalThis.fetch.mockResolvedValueOnce(
      mockResponse(
        { detail: "ENCRYPTION_KEY missing.", fix: "Run X then Y." },
        { status: 400 }
      )
    );
    let caught = null;
    try { await api.post("/api/keys", { provider: "openai" }); }
    catch (e) { caught = e; }
    expect(caught).toBeInstanceOf(ApiError);
    expect(caught.status).toBe(400);
    expect(caught.message).toContain("ENCRYPTION_KEY");
    expect(caught.fix).toBe("Run X then Y.");
  });

  it("turns network failures into a clear ApiError (status 0)", async () => {
    globalThis.fetch.mockRejectedValueOnce(new TypeError("net down"));
    let caught = null;
    try { await api.get("/api/x"); }
    catch (e) { caught = e; }
    expect(caught).toBeInstanceOf(ApiError);
    expect(caught.status).toBe(0);
    expect(caught.message).toMatch(/Cannot reach the backend/);
  });

  it("falls back to HTTP <code> when the body has no detail/message", async () => {
    globalThis.fetch.mockResolvedValueOnce(mockResponse("", { status: 503 }));
    await expect(api.get("/api/x")).rejects.toMatchObject({
      message: "HTTP 503",
      status: 503,
    });
  });
});
