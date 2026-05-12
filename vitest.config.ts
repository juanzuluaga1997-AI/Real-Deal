import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    exclude: ["node_modules/**", ".next/**", ".verification/**"],
    globals: true,
    setupFiles: ["./tests/setup.ts"],
  },
});
