// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountApp } from "./app";
import { GRID_SIZE, WIN_TOUCHES } from "./games/hjkl/engine";

let listeners: [string, EventListenerOrEventListenerObject][];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance"] });
  localStorage.clear();
  document.body.innerHTML = "";
  // Track window listeners so an app left running in one test can't react
  // to keypresses in the next.
  listeners = [];
  const add = window.addEventListener.bind(window);
  vi.spyOn(window, "addEventListener").mockImplementation((type, listener, options) => {
    if (listener) listeners.push([type, listener]);
    add(type, listener, options);
  });
});

afterEach(() => {
  for (const [type, listener] of listeners) window.removeEventListener(type, listener);
  vi.restoreAllMocks();
  vi.useRealTimers();
});

// A fresh mount is what loading or reloading the page does.
function load(): HTMLElement {
  const root = document.createElement("div");
  document.body.append(root);
  mountApp(root);
  return root;
}

function press(key: string, init: KeyboardEventInit = {}): void {
  window.dispatchEvent(new KeyboardEvent("keydown", { key, ...init }));
  vi.advanceTimersToNextFrame();
}

function type(text: string): void {
  for (const key of text) press(key);
}

/** Types a command and submits it with Enter. */
function run(command: string): void {
  type(command);
  press("Enter");
}

function screenOf(root: HTMLElement): string | undefined {
  return root.querySelector(".screen")?.classList[1];
}

function textOf(root: HTMLElement, selector: string): string | undefined {
  return root.querySelector(selector)?.textContent ?? undefined;
}

function click(root: HTMLElement, selector: string): void {
  root.querySelector<HTMLButtonElement>(selector)!.click();
}

function cellIndex(root: HTMLElement, selector: string): number {
  return [...root.querySelectorAll(".cell")].findIndex((cell) => cell.matches(selector));
}

/** Launches hjkl from home and starts the drill, as a player would. */
function startHjkl(): void {
  run("vim hjkl");
  press("Enter");
}

/** Steers the cursor one step toward the target, as a player would. */
function stepTowardTarget(root: HTMLElement): void {
  const cursor = cellIndex(root, ".cell-cursor");
  const target = cellIndex(root, ".cell-target");
  const dx = (target % GRID_SIZE) - (cursor % GRID_SIZE);
  const dy = Math.floor(target / GRID_SIZE) - Math.floor(cursor / GRID_SIZE);
  press(dx < 0 ? "h" : dx > 0 ? "l" : dy < 0 ? "k" : "j");
}

function playToCompletion(root: HTMLElement): void {
  while (screenOf(root) === "screen-drill") stepTowardTarget(root);
}

describe("home command line", () => {
  it("shows a hint telling the visitor to type ls", () => {
    const root = load();
    expect(textOf(root, ".hint")).toBe("type ls to list games");
  });

  it("echoes typed characters at the prompt, and Backspace deletes them", () => {
    const root = load();
    type("lss");
    expect(textOf(root, ".prompt-input")).toBe("lss");
    press("Backspace");
    expect(textOf(root, ".prompt-input")).toBe("ls");
  });

  it("leaves Ctrl/Cmd/Alt-modified keys to the browser", () => {
    const root = load();
    press("l", { ctrlKey: true });
    press("r", { metaKey: true });
    press("s", { altKey: true });
    expect(textOf(root, ".prompt-input")).toBe("");
  });

  it("ls lists the available games and clears the prompt", () => {
    const root = load();
    run("ls");
    expect(textOf(root, ".output")).toBe("hjkl");
    expect(textOf(root, ".prompt-input")).toBe("");
  });

  it("reports any other command as not found and stays on home", () => {
    const root = load();
    run("cd games");
    expect(textOf(root, ".error")).toBe("cd: command not found");
    expect(root.querySelector(".screen-home")).not.toBeNull();
  });

  it("does nothing on Enter at an empty prompt", () => {
    const root = load();
    press("Enter");
    expect(root.querySelector(".error")).toBeNull();
  });

  it("vim with no game name prints an error and stays on home", () => {
    const root = load();
    run("vim");
    expect(textOf(root, ".error")).toBe("vim: missing game name");
    expect(root.querySelector(".screen-home")).not.toBeNull();
  });

  it("vim with an unknown game prints an error and stays on home", () => {
    const root = load();
    run("vim tetris");
    expect(textOf(root, ".error")).toBe("vim: no such game: tetris");
    expect(root.querySelector(".screen-home")).not.toBeNull();
  });

  it("does not treat built-in object names as games", () => {
    const root = load();
    run("vim constructor");
    expect(textOf(root, ".error")).toBe("vim: no such game: constructor");
  });
});

describe("hjkl splash", () => {
  it("vim hjkl opens the splash with the key legend and no buttons", () => {
    const root = load();
    run("vim hjkl");
    expect(screenOf(root)).toBe("screen-landing");
    const legend = textOf(root, ".key-legend")!.replace(/\s+/g, " ").trim();
    expect(legend).toBe("h left j down k up l right");
    expect(root.querySelector("button")).toBeNull();
  });

  it("shows no best time before the player has one", () => {
    const root = load();
    run("vim hjkl");
    expect(root.querySelector(".best-time")).toBeNull();
  });

  it("shows the stored best time", () => {
    localStorage.setItem("hjkl:bestTimeMs", "14320");
    const root = load();
    run("vim hjkl");
    expect(textOf(root, ".best-time")).toBe("Best time: 14.32s");
  });

  it("shows a hint that Enter starts the drill", () => {
    const root = load();
    run("vim hjkl");
    expect(textOf(root, ".hint")).toBe("press Enter to start");
  });

  it("ignores hjkl until Enter is pressed", () => {
    const root = load();
    run("vim hjkl");
    press("l");
    expect(screenOf(root)).toBe("screen-landing");
  });

  it("Enter begins a fresh drill with the timer at zero", () => {
    const root = load();
    run("vim hjkl");
    press("Enter");
    expect(screenOf(root)).toBe("screen-drill");
    expect(textOf(root, ".progress")).toBe(`0/${WIN_TOUCHES}`);
    expect(textOf(root, ".timer")).toBe("0.00s");
  });
});

describe("hjkl drill", () => {
  it("ignores held-down and Ctrl/Cmd/Alt-modified hjkl", () => {
    const root = load();
    startHjkl();
    const start = cellIndex(root, ".cell-cursor");
    for (const key of "hjkl") {
      for (const init of [{ repeat: true }, { ctrlKey: true }, { metaKey: true }, { altKey: true }]) {
        press(key, init);
        expect(cellIndex(root, ".cell-cursor")).toBe(start);
      }
    }
  });
});

describe("full flow", () => {
  it("runs Home → Splash → Drill → Results → Try again → Drill", () => {
    const root = load();
    startHjkl();
    playToCompletion(root);
    expect(screenOf(root)).toBe("screen-results");
    expect(root.querySelector(".new-best")).not.toBeNull();

    click(root, ".retry-button");
    expect(screenOf(root)).toBe("screen-drill");
    expect(textOf(root, ".progress")).toBe(`0/${WIN_TOUCHES}`);
    expect(textOf(root, ".timer")).toBe("0.00s");

    playToCompletion(root);
    expect(screenOf(root)).toBe("screen-results");
  });

  it("shows the best time on the splash after a finished run", () => {
    const first = load();
    startHjkl();
    playToCompletion(first);
    const finalTime = textOf(first, ".final-time");

    const reloaded = load();
    run("vim hjkl");
    expect(textOf(reloaded, ".best-time")).toBe(`Best time: ${finalTime}`);
  });
});

describe("loading the site", () => {
  it("lands on home after reloading on the splash", () => {
    load();
    run("vim hjkl");
    expect(screenOf(load())).toBe("screen-home");
  });

  it("lands on home after reloading mid-drill", () => {
    const first = load();
    startHjkl();
    stepTowardTarget(first);
    expect(screenOf(first)).toBe("screen-drill");

    expect(screenOf(load())).toBe("screen-home");
  });

  it("lands on home after reloading on results", () => {
    const first = load();
    startHjkl();
    playToCompletion(first);
    expect(screenOf(first)).toBe("screen-results");

    expect(screenOf(load())).toBe("screen-home");
  });
});
