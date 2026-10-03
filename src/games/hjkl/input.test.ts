import { describe, expect, it, vi } from "vitest";
import { createInputHandler } from "./input";

function keydown(key: string, init: Partial<KeyboardEvent> = {}): Event {
  return Object.assign(new Event("keydown"), { key, repeat: false, ...init });
}

function setup() {
  const target = new EventTarget();
  const onMove = vi.fn();
  const remove = createInputHandler(onMove, target);
  return { target, onMove, remove };
}

describe("createInputHandler", () => {
  it("maps h/j/k/l to their directions", () => {
    const { target, onMove } = setup();
    for (const key of ["h", "j", "k", "l"]) target.dispatchEvent(keydown(key));
    expect(onMove.mock.calls).toEqual([["h"], ["j"], ["k"], ["l"]]);
  });

  it("ignores auto-repeat keydowns from a held key", () => {
    const { target, onMove } = setup();
    target.dispatchEvent(keydown("l"));
    target.dispatchEvent(keydown("l", { repeat: true }));
    target.dispatchEvent(keydown("l", { repeat: true }));
    expect(onMove).toHaveBeenCalledTimes(1);
  });

  it("ignores arrow keys", () => {
    const { target, onMove } = setup();
    for (const key of ["ArrowLeft", "ArrowDown", "ArrowUp", "ArrowRight"]) {
      target.dispatchEvent(keydown(key));
    }
    expect(onMove).not.toHaveBeenCalled();
  });

  it("ignores hjkl pressed with a modifier, leaving browser shortcuts alone", () => {
    const { target, onMove } = setup();
    target.dispatchEvent(keydown("l", { ctrlKey: true }));
    target.dispatchEvent(keydown("l", { metaKey: true }));
    target.dispatchEvent(keydown("h", { altKey: true }));
    expect(onMove).not.toHaveBeenCalled();
  });

  it("stops reporting moves once removed", () => {
    const { target, onMove, remove } = setup();
    remove();
    target.dispatchEvent(keydown("h"));
    expect(onMove).not.toHaveBeenCalled();
  });
});
