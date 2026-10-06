import { describe, expect, it } from "vitest";
import { PASSAGES } from "./passages";

describe("passages", () => {
  it("each have a unique id", () => {
    const ids = PASSAGES.map((passage) => passage.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(PASSAGES)("$id has a title, 18 to 22 lines, none over 60 characters, and at least one not blank", (passage) => {
    expect(passage.title.trim()).not.toBe("");
    expect(passage.lines.length).toBeGreaterThanOrEqual(18);
    expect(passage.lines.length).toBeLessThanOrEqual(22);
    for (const line of passage.lines) expect(line.length).toBeLessThanOrEqual(60);
    expect(passage.lines.some((line) => line.trim() !== "")).toBe(true);
  });
});
