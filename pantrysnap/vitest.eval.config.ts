import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Real-model evaluation (costs money, needs LOVABLE_API_KEY). Run with: npm run eval
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { include: ["eval/**/*.eval.ts"], environment: "node", testTimeout: 300_000 },
});
