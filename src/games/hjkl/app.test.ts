// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountHjklGame } from "./app";
import { GRID_SIZE, WIN_TOUCHES } from "./engine";

let listeners: [string, EventListenerOrEventListenerObject][];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance"] });
  localStorage.clear();
  document.body.innerHTML = "";
  // Track window listeners so a drill left running in one test can't react
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
  mountHjklGame(root);
  return root;
}

function screenOf(root: HTMLElement): string | undefined {
  return root.querySelector(".screen")?.classList[1];
}

function press(key: string): void {
  window.dispatchEvent(new KeyboardEvent("keydown", { key }));
  vi.advanceTimersToNextFrame();
}

function click(root: HTMLElement, selector: string): void {
  root.querySelector<HTMLButtonElement>(selector)!.click();
}

function cellIndex(root: HTMLElement, selector: string): number {
  return [...root.querySelectorAll(".cell")].findIndex((cell) => cell.matches(selector));
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

describe("landing screen", () => {
  it("explains h/j/k/l and offers a Start action", () => {
    const root = load();
    expect(screenOf(root)).toBe("screen-landing");
    const legend = root.querySelector(".key-legend")!.textContent!.replace(/\s+/g, " ").trim();
    expect(legend).toBe("h left j down k up l right");
    expect(root.querySelector(".start-button")?.textContent).toBe("Start");
  });

  it("shows no best time before the player has one", () => {
    const root = load();
    expect(root.querySelector(".best-time")).toBeNull();
  });

  it("shows the stored best time", () => {
    localStorage.setItem("hjkl:bestTimeMs", "14320");
    const root = load();
    expect(root.querySelector(".best-time")?.textContent).toBe("Best time: 14.32s");
  });

  it("ignores hjkl until Start is chosen", () => {
    const root = load();
    press("l");
    expect(screenOf(root)).toBe("screen-landing");
  });

  it("Start begins a fresh drill with the timer at zero", () => {
    const root = load();
    click(root, ".start-button");
    expect(screenOf(root)).toBe("screen-drill");
    expect(root.querySelector(".progress")?.textContent).toBe(`0/${WIN_TOUCHES}`);
    expect(root.querySelector(".timer")?.textContent).toBe("0.00s");
  });
});

describe("full flow", () => {
  it("runs Landing → Drill → Results → Try again → Drill, skipping Landing on retry", () => {
    const root = load();
    click(root, ".start-button");
    playToCompletion(root);
    expect(screenOf(root)).toBe("screen-results");
    expect(root.querySelector(".new-best")).not.toBeNull();

    click(root, ".retry-button");
    expect(screenOf(root)).toBe("screen-drill");
    expect(root.querySelector(".progress")?.textContent).toBe(`0/${WIN_TOUCHES}`);
    expect(root.querySelector(".timer")?.textContent).toBe("0.00s");

    playToCompletion(root);
    expect(screenOf(root)).toBe("screen-results");
  });

  it("shows the best time on the landing screen after a finished run", () => {
    const first = load();
    click(first, ".start-button");
    playToCompletion(first);
    const finalTime = first.querySelector(".final-time")?.textContent;

    const reloaded = load();
    expect(reloaded.querySelector(".best-time")?.textContent).toBe(`Best time: ${finalTime}`);
  });
});

describe("loading the site", () => {
  it("lands on the landing screen after reloading mid-drill", () => {
    const first = load();
    click(first, ".start-button");
    stepTowardTarget(first);
    expect(screenOf(first)).toBe("screen-drill");

    expect(screenOf(load())).toBe("screen-landing");
  });

  it("lands on the landing screen after reloading on results", () => {
    const first = load();
    click(first, ".start-button");
    playToCompletion(first);
    expect(screenOf(first)).toBe("screen-results");

    expect(screenOf(load())).toBe("screen-landing");
  });
});
