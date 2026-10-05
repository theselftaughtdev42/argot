import { describe, expect, it } from "vitest";
import { motionFor } from "./input";

function keydown(key: string, repeat = false) {
  return { key, repeat };
}

describe("motionFor", () => {
  it("maps w and b to their motions", () => {
    expect(["w", "b"].map((key) => motionFor(keydown(key)))).toEqual(["w", "b"]);
  });

  it("ignores auto-repeat keydowns from a held key", () => {
    expect(motionFor(keydown("w", true))).toBeNull();
    expect(motionFor(keydown("b", true))).toBeNull();
  });

  it("ignores every other motion, including hjkl, arrows, W/B and e", () => {
    for (const key of ["h", "j", "k", "l", "ArrowLeft", "ArrowRight", "W", "B", "e"]) {
      expect(motionFor(keydown(key))).toBeNull();
    }
  });

  it("ignores digits, so counts like 3w don't apply", () => {
    for (const key of "0123456789") expect(motionFor(keydown(key))).toBeNull();
  });

  it("does not treat built-in object names as keys", () => {
    expect(motionFor(keydown("constructor"))).toBeNull();
  });
});
