import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Process CSS so `?raw` imports carry the file's text, for the theme completeness test.
    css: true,
  },
});
