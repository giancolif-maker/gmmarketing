import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Adversarial simulation (synthetic data, no network). Run with: npm run sim
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["sim/**/*.sim.ts"],
    environment: "node",
    testTimeout: 180_000,
    fileParallelism: false,
  },
});
