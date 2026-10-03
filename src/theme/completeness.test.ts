import { describe, expect, it } from "vitest";
import { THEMES } from ".";
import components from "./argot.css?raw";

const themeFiles = import.meta.glob<string>("./themes/*.css", {
  query: "?raw",
  import: "default",
  eager: true,
});

function tokensUsed(css: string): Set<string> {
  return new Set([...css.matchAll(/var\(\s*(--ag-[\w-]+)/g)].map((match) => match[1]));
}

function tokensDefined(css: string): Set<string> {
  return new Set([...css.matchAll(/(--ag-[\w-]+)\s*:/g)].map((match) => match[1]));
}

describe("theme completeness", () => {
  const used = tokensUsed(components);

  it("finds the tokens the components use", () => {
    expect(used.size).toBeGreaterThan(0);
  });

  describe.each(Object.keys(THEMES))("%s", (name) => {
    const css = themeFiles[`./themes/${name}.css`];

    it("has a token file scoped to its data-theme", () => {
      expect(css).toBeDefined();
      expect(css).toContain(`[data-theme="${name}"]`);
    });

    it("defines every token the components use", () => {
      const defined = tokensDefined(css ?? "");
      expect([...used].filter((token) => !defined.has(token))).toEqual([]);
    });
  });
});
