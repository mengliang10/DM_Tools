import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";

// Vite serves the SPA on :5173 and proxies /api/* to the FastAPI
// backend on :8000 in dev. In production the backend serves the
// pre-built /dist folder directly.
export default defineConfig({
  root: resolve(__dirname, "frontend"),
  publicDir: resolve(__dirname, "frontend/public"),
  plugins: [tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: resolve(__dirname, "frontend/dist"),
    emptyOutDir: true,
    sourcemap: true,
  },
  test: {
    environment: "happy-dom",
    include: ["tests/**/*.test.js"],
    globals: true,
  },
});
