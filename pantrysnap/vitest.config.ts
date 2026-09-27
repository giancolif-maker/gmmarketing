import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Standalone config: the app's vite.config pulls in the full TanStack/Lovable plugin stack,
// which unit tests of pure modules don't need.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { include: ["src/**/*.test.ts", "eval/**/*.test.ts"], environment: "node" },
});
