import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    include: ["server/__tests__/**/*.test.ts"],
    setupFiles: ["server/__tests__/setup.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "frontend"),
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
  esbuild: {
    target: "esnext",
  },
});
