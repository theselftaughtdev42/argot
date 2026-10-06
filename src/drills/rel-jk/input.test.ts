import { describe, expect, it } from "vitest";
import { keyFor } from "./input";

function keydown(key: string, repeat = false) {
  return { key, repeat };
}

describe("keyFor", () => {
  it("passes digits, j and k through", () => {
    expect([..."0123456789jk"].map((key) => keyFor(keydown(key)))).toEqual([..."0123456789jk"]);
  });

  it("ignores auto-repeat keydowns from a held key", () => {
    for (const key of ["5", "j", "k", "x"]) expect(keyFor(keydown(key, true))).toBeNull();
  });

  it("maps every other key, including h, l, arrows, J and Escape, to other", () => {
    for (const key of ["h", "l", "J", "K", "w", "ArrowDown", "ArrowUp", "Escape", "Enter", " "]) {
      expect(keyFor(keydown(key))).toBe("other");
    }
  });

  it("ignores Shift and CapsLock on their own", () => {
    expect(keyFor(keydown("Shift"))).toBeNull();
    expect(keyFor(keydown("CapsLock"))).toBeNull();
  });

  it("does not treat built-in object names as keys", () => {
    expect(keyFor(keydown("constructor"))).toBe("other");
  });
});
