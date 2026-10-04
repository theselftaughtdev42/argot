import { describe, expect, it } from "vitest";
import { directionFor } from "./input";

function keydown(key: string, repeat = false) {
  return { key, repeat };
}

describe("directionFor", () => {
  it("maps h/j/k/l to their directions", () => {
    expect(["h", "j", "k", "l"].map((key) => directionFor(keydown(key)))).toEqual(["h", "j", "k", "l"]);
  });

  it("ignores auto-repeat keydowns from a held key", () => {
    expect(directionFor(keydown("l", true))).toBeNull();
  });

  it("ignores arrow keys", () => {
    for (const key of ["ArrowLeft", "ArrowDown", "ArrowUp", "ArrowRight"]) {
      expect(directionFor(keydown(key))).toBeNull();
    }
  });

  it("does not treat built-in object names as keys", () => {
    expect(directionFor(keydown("constructor"))).toBeNull();
  });
});
