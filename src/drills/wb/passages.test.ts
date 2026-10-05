import { describe, expect, it } from "vitest";
import { wordStarts } from "./engine";
import { PASSAGES } from "./passages";

describe("passages", () => {
  it("each have a unique id", () => {
    const ids = PASSAGES.map((passage) => passage.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(PASSAGES)("$id has a title, 4 to 6 lines, none empty or over 60 characters, and at least 2 words", (passage) => {
    expect(passage.title.trim()).not.toBe("");
    expect(passage.lines.length).toBeGreaterThanOrEqual(4);
    expect(passage.lines.length).toBeLessThanOrEqual(6);
    for (const line of passage.lines) {
      expect(line.trim()).not.toBe("");
      expect(line.length).toBeLessThanOrEqual(60);
    }
    expect(wordStarts(passage.lines).length).toBeGreaterThanOrEqual(2);
  });
});
