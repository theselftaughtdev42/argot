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

function cellIndex(root: HTMLElement, selector: string): number {
  return [...root.querySelectorAll(".cell")].findIndex((cell) => cell.matches(selector));
}

/** Launches hjkl from home and starts the drill, as a player would. */
function startHjkl(): void {
  run("vim hjkl");
  press("Enter");
}

/** The hjkl key that would move the cursor one step toward the target. */
function keyTowardTarget(root: HTMLElement): string {
  const cursor = cellIndex(root, ".cell-cursor");
  const target = cellIndex(root, ".cell-target");
  const dx = (target % GRID_SIZE) - (cursor % GRID_SIZE);
  const dy = Math.floor(target / GRID_SIZE) - Math.floor(cursor / GRID_SIZE);
  return dx < 0 ? "h" : dx > 0 ? "l" : dy < 0 ? "k" : "j";
}

/** Steers the cursor one step toward the target, as a player would. */
function stepTowardTarget(root: HTMLElement): void {
  press(keyTowardTarget(root));
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

describe("command mode on the splash", () => {
  it("Esc greys the splash and opens the command line", () => {
    const root = load();
    run("vim hjkl");
    press("Escape");
    expect(root.querySelector(".game-greyed")).not.toBeNull();
    expect(textOf(root, ".command-line")).toBe("");
    expect(textOf(root, ".shell-bar .hint")).toBe("type :q! to quit");
  });

  it(":q! returns home", () => {
    const root = load();
    run("vim hjkl");
    press("Escape");
    run(":q!");
    expect(screenOf(root)).toBe("screen-home");
  });

  it("an unknown command shows an error and stays on the splash", () => {
    const root = load();
    run("vim hjkl");
    press("Escape");
    run(":wq");
    expect(textOf(root, ".error")).toBe(":wq isn't supported in argot (use :q! to quit)");
    expect(screenOf(root)).toBe("screen-landing");
  });

  it("Esc goes back to the splash, where Enter still starts the drill", () => {
    const root = load();
    run("vim hjkl");
    press("Escape");
    press("Escape");
    expect(root.querySelector(".game-greyed")).toBeNull();
    expect(root.querySelector(".command-line")).toBeNull();
    expect(screenOf(root)).toBe("screen-landing");

    press("Enter");
    expect(screenOf(root)).toBe("screen-drill");
  });
});

describe("hjkl drill", () => {
  it("shows a hint that Esc opens commands", () => {
    const root = load();
    startHjkl();
    expect(textOf(root, ".hint")).toBe("press Esc for commands");
  });
});

describe("command mode in the drill", () => {
  it("Esc greys the game and opens an empty command line with a hint to quit", () => {
    const root = load();
    startHjkl();
    press("Escape");
    expect(root.querySelector(".game-greyed")).not.toBeNull();
    expect(textOf(root, ".command-line")).toBe("");
    expect(textOf(root, ".hint")).toBe("type :q! to quit");
  });

  it("echoes typed characters on the command line, and Backspace deletes them", () => {
    const root = load();
    startHjkl();
    press("Escape");
    type(":qq");
    expect(textOf(root, ".command-line")).toBe(":qq");
    press("Backspace");
    expect(textOf(root, ".command-line")).toBe(":q");
  });

  it("hjkl type on the command line instead of moving the cursor", () => {
    const root = load();
    startHjkl();
    const start = cellIndex(root, ".cell-cursor");
    const key = keyTowardTarget(root);
    press("Escape");
    press(key);
    expect(cellIndex(root, ".cell-cursor")).toBe(start);
    expect(textOf(root, ".command-line")).toBe(key);
  });

  it("keeps the timer running while greyed", () => {
    const root = load();
    startHjkl();
    stepTowardTarget(root);
    press("Escape");
    vi.advanceTimersByTime(2000);
    expect(parseFloat(textOf(root, ".timer")!)).toBeGreaterThanOrEqual(2);
  });

  it("Esc closes the command line and resumes the drill where it was", () => {
    const root = load();
    startHjkl();
    stepTowardTarget(root);
    const cursor = cellIndex(root, ".cell-cursor");
    press("Escape");
    type(":q");
    press("Escape");
    expect(root.querySelector(".game-greyed")).toBeNull();
    expect(root.querySelector(".command-line")).toBeNull();
    expect(textOf(root, ".hint")).toBe("press Esc for commands");
    expect(cellIndex(root, ".cell-cursor")).toBe(cursor);

    stepTowardTarget(root);
    expect(cellIndex(root, ".cell-cursor")).not.toBe(cursor);
  });

  it(":q! abandons the run and returns home without touching the best time", () => {
    localStorage.setItem("hjkl:bestTimeMs", "14320");
    const root = load();
    startHjkl();
    stepTowardTarget(root);
    press("Escape");
    run(":q!");
    expect(screenOf(root)).toBe("screen-home");
    expect(localStorage.getItem("hjkl:bestTimeMs")).toBe("14320");

    type("ls");
    expect(textOf(root, ".prompt-input")).toBe("ls");
  });

  it.each([
    [":q", ":q isn't supported in argot (use :q! to quit)"],
    [":wq", ":wq isn't supported in argot (use :q! to quit)"],
    [":x", ":x isn't supported in argot (use :q! to quit)"],
    ["q!", "q! isn't supported in argot (use :q! to quit)"],
  ])("%s shows an error naming what is supported, in place of the hint, and stays greyed", (command, error) => {
    const root = load();
    startHjkl();
    press("Escape");
    run(command);
    expect(textOf(root, ".error")).toBe(error);
    expect(root.querySelector(".hint")).toBeNull();
    expect(root.querySelector(".game-greyed")).not.toBeNull();
    expect(textOf(root, ".command-line")).toBe("");
    expect(screenOf(root)).toBe("screen-drill");
  });

  it("never labels play or the command line as insert mode", () => {
    const root = load();
    run("vim hjkl");
    const screens = [root.textContent];
    press("Escape");
    screens.push(root.textContent);
    press("Escape");
    press("Enter");
    screens.push(root.textContent);
    press("Escape");
    screens.push(root.textContent);
    for (const text of screens) expect(text).not.toMatch(/insert/i);
  });

  it("does nothing on Enter at an empty command line", () => {
    const root = load();
    startHjkl();
    press("Escape");
    press("Enter");
    expect(root.querySelector(".error")).toBeNull();
    expect(textOf(root, ".hint")).toBe("type :q! to quit");
  });

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

describe("hjkl results", () => {
  it("shows the final time and new best with the command line already open, and no buttons", () => {
    const root = load();
    startHjkl();
    playToCompletion(root);
    expect(screenOf(root)).toBe("screen-results");
    expect(textOf(root, ".final-time")).toMatch(/^\d+\.\d\ds$/);
    expect(root.querySelector(".new-best")).not.toBeNull();
    expect(textOf(root, ".command-line")).toBe("");
    expect(root.querySelector(".game-greyed")).toBeNull();
    expect(root.querySelector("button")).toBeNull();

    type(":w");
    expect(textOf(root, ".command-line")).toBe(":w");
  });

  it(":wq on a time that isn't a new best leaves the stored best and returns home", () => {
    localStorage.setItem("hjkl:bestTimeMs", "1");
    const root = load();
    startHjkl();
    playToCompletion(root);
    expect(root.querySelector(".new-best")).toBeNull();

    run(":wq");
    expect(screenOf(root)).toBe("screen-home");
    expect(localStorage.getItem("hjkl:bestTimeMs")).toBe("1");
  });

  it(":q! returns home without saving, even on a new best", () => {
    const root = load();
    startHjkl();
    playToCompletion(root);
    expect(root.querySelector(".new-best")).not.toBeNull();

    run(":q!");
    expect(screenOf(root)).toBe("screen-home");
    expect(localStorage.getItem("hjkl:bestTimeMs")).toBeNull();
  });

  it("shows the stored best time alongside the run", () => {
    localStorage.setItem("hjkl:bestTimeMs", "14320");
    const root = load();
    startHjkl();
    playToCompletion(root);
    expect(textOf(root, ".best-time")).toBe("Best time: 14.32s");
  });

  it("shows no best time when the player has none yet", () => {
    const root = load();
    startHjkl();
    playToCompletion(root);
    expect(root.querySelector(".best-time")).toBeNull();
  });

  it("shows a hint explaining :wq and :q!", () => {
    const root = load();
    startHjkl();
    playToCompletion(root);
    expect(textOf(root, ".hint")).toBe(":wq save & quit · :q! quit without saving");
  });

  it.each([":q", ":w", ":x", "wq"])("%s shows an error naming :wq and :q!, and stays on results", (command) => {
    const root = load();
    startHjkl();
    playToCompletion(root);
    run(command);
    expect(textOf(root, ".error")).toBe(`${command} isn't supported in argot (use :wq or :q!)`);
    expect(textOf(root, ".command-line")).toBe("");
    expect(screenOf(root)).toBe("screen-results");
  });

  it("Esc discards what's typed but keeps the command line open, so the player can still leave", () => {
    const root = load();
    startHjkl();
    playToCompletion(root);
    type(":x");
    press("Escape");
    expect(textOf(root, ".command-line")).toBe("");

    run(":q!");
    expect(screenOf(root)).toBe("screen-home");
  });

  it("doesn't save the best time just by finishing", () => {
    const root = load();
    startHjkl();
    playToCompletion(root);
    expect(root.querySelector(".new-best")).not.toBeNull();

    const reloaded = load();
    run("vim hjkl");
    expect(reloaded.querySelector(".best-time")).toBeNull();
  });
});

describe("full flow", () => {
  it("runs Home → Splash → Drill → Results → Home → Splash → Drill", () => {
    const root = load();
    startHjkl();
    playToCompletion(root);
    expect(screenOf(root)).toBe("screen-results");

    run(":q!");
    expect(screenOf(root)).toBe("screen-home");

    startHjkl();
    expect(screenOf(root)).toBe("screen-drill");
    expect(textOf(root, ".progress")).toBe(`0/${WIN_TOUCHES}`);
    expect(textOf(root, ".timer")).toBe("0.00s");

    playToCompletion(root);
    expect(screenOf(root)).toBe("screen-results");
  });

  it(":wq on a new best saves it and returns home, and it survives a reload", () => {
    const first = load();
    startHjkl();
    playToCompletion(first);
    const finalTime = textOf(first, ".final-time");

    run(":wq");
    expect(screenOf(first)).toBe("screen-home");

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

describe("key routing", () => {
  it("keeps a single keydown listener, the shell's, through a whole game", () => {
    const root = load();
    const keydownListeners = () => listeners.filter(([type]) => type === "keydown").length;
    run("vim hjkl");
    press("Enter");
    playToCompletion(root);
    expect(keydownListeners()).toBe(1);
  });
});
