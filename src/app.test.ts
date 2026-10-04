// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountApp } from "./app";
import { BOARD_SIZE, HITS_TO_WIN } from "./drills/hjkl/engine";

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

afterEach(async () => {
  for (const [type, listener] of listeners) window.removeEventListener(type, listener);
  vi.restoreAllMocks();
  vi.useRealTimers();
  // happy-dom caches query results behind WeakRefs, and V8 keeps every WeakRef
  // target alive until the event loop turns. Tests otherwise run back to back
  // on microtasks, so each test's discarded screens pile up until the worker
  // runs out of memory. Yielding a macrotask lets them be collected.
  await new Promise((resolve) => setTimeout(resolve, 0));
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

/** "home", or the class naming the drill screen showing. */
function screenOf(root: HTMLElement): string | undefined {
  if (root.querySelector(".ag-home")) return "home";
  return root.querySelector(".screen")?.classList[1];
}

function textOf(root: HTMLElement, selector: string): string | undefined {
  return root.querySelector(selector)?.textContent ?? undefined;
}

/** The command-line hint on the play screen while the line is closed. */
const PLAY_HINT = ["Esc then", ":help for instructions", ":q! back to home"];

/** The command-line hint on the results screen while the line is closed. */
const RESULTS_HINT = ["Esc then", ":wq save & quit", ":q! quit without saving"];

/** The command-line hint on the help page while the line is closed. */
const HELP_HINT = ["Esc then", ":q back to the drill", ":q! home"];

/** What :q says on play once the run has started. */
const PLAY_E37 = "E37: run in progress (add ! to abandon it: :q!)";

/** What :q says on results. */
const RESULTS_E37 = "E37: No write since last change (use :wq to save or :q! to discard)";

/** The command line's hint, split into its parts: "Esc then" while the line is closed, then each option. */
function hintParts(root: HTMLElement): string[] {
  return [...root.querySelectorAll(".cmdline-hint > span")].map((part) => part.textContent!);
}

/** The keys and commands highlighted in the command line's hint. */
function hintKeys(root: HTMLElement): string[] {
  return [...root.querySelectorAll(".cmdline-hint .ag-key")].map((key) => key.textContent!);
}

/** The section headings of the help page, in order. */
function helpHeadings(root: HTMLElement): string[] {
  return [...root.querySelectorAll(".ag-help__heading > :first-child")].map((heading) => heading.textContent!);
}

/** The body text of the help page section under `heading`. */
function helpSection(root: HTMLElement, heading: string): string | undefined {
  const section = [...root.querySelectorAll(".ag-help__section")].find(
    (section) => section.querySelector(".ag-help__heading > :first-child")?.textContent === heading,
  );
  return section?.querySelector(".ag-help__body")?.textContent?.replace(/\s+/g, " ").trim();
}

/** Opens the drill's help page from the command line, as a player would. */
function openHelp(): void {
  press("Escape");
  run(":help");
}

const CURSOR = ".ag-board__cursor";
const TARGET = ".ag-board__target";

function cellIndex(root: HTMLElement, selector: string): number {
  return [...root.querySelectorAll(".board-cell")].findIndex((cell) => cell.matches(selector));
}

/** The hjkl key that would move the cursor one step toward the target. */
function keyTowardTarget(root: HTMLElement): string {
  const cursor = cellIndex(root, CURSOR);
  const target = cellIndex(root, TARGET);
  const dx = (target % BOARD_SIZE) - (cursor % BOARD_SIZE);
  const dy = Math.floor(target / BOARD_SIZE) - Math.floor(cursor / BOARD_SIZE);
  return dx < 0 ? "h" : dx > 0 ? "l" : dy < 0 ? "k" : "j";
}

/** Steers the cursor one step toward the target, as a player would. */
function stepTowardTarget(root: HTMLElement): void {
  press(keyTowardTarget(root));
}

function playToCompletion(root: HTMLElement): void {
  while (screenOf(root) === "screen-play") stepTowardTarget(root);
}

describe("home command line", () => {
  const LS_HINT = "type ls and press enter";
  const VIM_HINT = "type vim and a drill name";

  function keysIn(root: HTMLElement, selector: string): string[] {
    return [...root.querySelectorAll(`${selector} .ag-key`)].map((key) => key.textContent!);
  }

  it("greets a fresh visit with the logo, tagline, a hint to type ls, and the prompt's cursor", () => {
    const root = load();
    expect(textOf(root, ".ag-logo")).toBe("argot");
    expect(textOf(root, ".ag-tagline")).toBe("learn to speak vim. no mouse, just keys.");
    expect(textOf(root, ".home-hint")).toBe(LS_HINT);
    expect(keysIn(root, ".home-hint")).toEqual(["ls", "enter"]);
    expect(root.querySelector(".prompt-input + .ag-cursor")).not.toBeNull();
    expect(root.querySelector(".ag-ls, .ag-error")).toBeNull();
  });

  it("puts the hint beneath the prompt", () => {
    const root = load();
    const prompt = root.querySelector(".prompt-input")!;
    const hint = root.querySelector(".home-hint")!;
    expect(prompt.compareDocumentPosition(hint) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
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

  it("ls lists the drills, hints at vim, and clears the prompt, without repeating the command", () => {
    const root = load();
    run("ls");
    expect(root.textContent).not.toMatch(/\bls\b/);
    expect([...root.querySelectorAll(".ag-ls li")].map((li) => li.textContent)).toEqual(["hjkl"]);
    expect(textOf(root, ".home-hint")).toBe(VIM_HINT);
    expect(keysIn(root, ".home-hint")).toEqual(["vim"]);
    expect(textOf(root, ".prompt-input")).toBe("");
  });

  it("reports any other command as not found, as an error, and stays on home", () => {
    const root = load();
    run("cd drills");
    expect(textOf(root, ".ag-error")).toBe("cd: command not found (type argot for commands)");
    expect(screenOf(root)).toBe("home");
  });

  it("an error after ls replaces the list and hints at ls again", () => {
    const root = load();
    run("ls");
    run("pwd");
    expect(root.querySelector(".ag-ls")).toBeNull();
    expect(textOf(root, ".ag-error")).toBe("pwd: command not found (type argot for commands)");
    expect(textOf(root, ".home-hint")).toBe(LS_HINT);
  });

  it("does nothing on Enter at an empty prompt", () => {
    const root = load();
    press("Enter");
    expect(root.querySelector(".ag-error")).toBeNull();
    expect(root.querySelector(".ag-error")).toBeNull();
    expect(textOf(root, ".home-hint")).toBe(LS_HINT);
  });

  it("Enter at an empty prompt clears the last output and hints at ls", () => {
    const root = load();
    run("ls");
    press("Enter");
    expect(root.querySelector(".ag-ls")).toBeNull();
    expect(textOf(root, ".home-hint")).toBe(LS_HINT);
  });

  it("vim with no drill name prints an error and stays on home", () => {
    const root = load();
    run("vim");
    expect(textOf(root, ".ag-error")).toBe("vim: missing drill name");
    expect(textOf(root, ".home-hint")).toBe(LS_HINT);
    expect(screenOf(root)).toBe("home");
  });

  it("vim with an unknown drill prints an error and stays on home", () => {
    const root = load();
    run("vim tetris");
    expect(textOf(root, ".ag-error")).toBe("vim: no such drill: tetris");
    expect(screenOf(root)).toBe("home");
  });

  it("does not treat built-in object names as drills", () => {
    const root = load();
    run("vim constructor");
    expect(textOf(root, ".ag-error")).toBe("vim: no such drill: constructor");
  });

  it("escapes what's typed rather than rendering it as markup", () => {
    const root = load();
    run("<b>hi</b>");
    expect(textOf(root, ".ag-error")).toBe("<b>hi</b>: command not found (type argot for commands)");
    expect(root.querySelector(".ag-error b")).toBeNull();
  });

  it("returning from a drill shows a clean home, with no output and a hint to type ls", () => {
    const root = load();
    run("ls");
    run("vim hjkl");
    press("Escape");
    run(":q!");
    expect(root.querySelector(".ag-ls, .ag-error")).toBeNull();
    expect(textOf(root, ".home-hint")).toBe(LS_HINT);
    expect(textOf(root, ".prompt-input")).toBe("");
  });
});

describe("home logo", () => {
  function isCompact(root: HTMLElement): boolean {
    return root.querySelector(".ag-brand--compact") !== null;
  }

  it("is full size on a fresh home", () => {
    expect(isCompact(load())).toBe(false);
  });

  it.each(["ls", "cd drills", "vim", "vim tetris"])("becomes compact, without the tagline, after %s", (command) => {
    const root = load();
    run(command);
    expect(isCompact(root)).toBe(true);
    expect(textOf(root, ".ag-logo")).toBe("argot");
    expect(root.querySelector(".ag-tagline")).toBeNull();
  });

  it("stays full size after an empty Enter", () => {
    const root = load();
    press("Enter");
    expect(isCompact(root)).toBe(false);
  });

  it("stays full size after launching and quitting a drill from a fresh home", () => {
    const root = load();
    run("vim hjkl");
    press("Escape");
    run(":q!");
    expect(screenOf(root)).toBe("home");
    expect(isCompact(root)).toBe(false);
  });

  it("stays compact for the visit, through empty Enters and a drill", () => {
    const root = load();
    run("ls");
    press("Enter");
    expect(isCompact(root)).toBe(true);

    run("vim hjkl");
    press("Escape");
    run(":q!");
    expect(isCompact(root)).toBe(true);
  });

  it("is full size again after a reload", () => {
    load();
    run("ls");
    expect(isCompact(load())).toBe(false);
  });
});

describe("launching a drill", () => {
  it("vim hjkl goes straight to the play screen, with the timer at zero", () => {
    const root = load();
    run("vim hjkl");
    expect(screenOf(root)).toBe("screen-play");
    expect(textOf(root, ".progress")).toBe(`0/${HITS_TO_WIN}`);
    expect(textOf(root, ".timer")).toBe("0.00s");
  });

  it("keeps the clock at zero until the first move", () => {
    const root = load();
    run("vim hjkl");
    vi.advanceTimersByTime(3000);
    press("Enter");
    expect(textOf(root, ".timer")).toBe("0.00s");

    stepTowardTarget(root);
    vi.advanceTimersByTime(1000);
    press("Enter");
    expect(parseFloat(textOf(root, ".timer")!)).toBeGreaterThanOrEqual(1);
  });
});

describe("help page", () => {
  it(":help opens the drill's help page, laid out like a vim help file", () => {
    const root = load();
    run("vim hjkl");
    openHelp();
    expect(screenOf(root)).toBe("screen-help");
    expect(helpHeadings(root)).toEqual(["DESCRIPTION", "KEYS", "GOAL"]);
    expect(root.querySelector("button")).toBeNull();
  });

  it("opens with the drill's tag and what it teaches", () => {
    const root = load();
    run("vim hjkl");
    openHelp();
    const title = [...root.querySelectorAll(".ag-help__title > span")].map((part) => part.textContent);
    expect(title).toEqual(["*hjkl.txt*", "move the cursor without the arrow keys"]);
  });

  it("starts each section with a === rule and a heading tagged on the right", () => {
    const root = load();
    run("vim hjkl");
    openHelp();
    const sections = [...root.querySelectorAll(".ag-help__section")];
    expect(sections.map((section) => section.querySelector(".ag-help__rule")!.textContent)).toEqual(
      sections.map(() => expect.stringMatching(/^=+$/)),
    );
    expect(sections.map((section) => section.querySelector(".ag-help__heading > :last-child")!.textContent)).toEqual([
      "*hjkl-description*",
      "*hjkl-keys*",
      "*hjkl-goal*",
    ]);
  });

  it("lists each key with what it does, the keys highlighted", () => {
    const root = load();
    run("vim hjkl");
    openHelp();
    const keys = [...root.querySelectorAll(".ag-help__keys > div")].map((row) => [
      row.querySelector("dt.ag-key")!.textContent,
      row.querySelector("dd")!.textContent,
    ]);
    expect(keys).toEqual([
      ["h", "left"],
      ["j", "down"],
      ["k", "up"],
      ["l", "right"],
    ]);
  });

  it("explains why vim moves with hjkl, highlighting the keys it names", () => {
    const root = load();
    run("vim hjkl");
    openHelp();
    expect(helpSection(root, "DESCRIPTION")).toBe(
      "In vim, you move the cursor with h, j, k and l instead of the arrow keys, so your fingers never leave the home row.",
    );
    const description = root.querySelectorAll(".ag-help__section")[0];
    expect([...description.querySelectorAll(".ag-help__body .ag-key")].map((key) => key.textContent)).toEqual([
      "h",
      "j",
      "k",
      "l",
    ]);
  });

  it("gives the goal", () => {
    const root = load();
    run("vim hjkl");
    openHelp();
    expect(helpSection(root, "GOAL")).toBe(`Hit ${HITS_TO_WIN} targets as fast as you can.`);
  });

  it("doesn't show the best time, even when the player has one", () => {
    localStorage.setItem("hjkl:bestTimeMs", "14320");
    const root = load();
    run("vim hjkl");
    openHelp();
    expect(root.querySelector(".best-time")).toBeNull();
    expect(root.textContent).not.toMatch(/best/i);
  });

  it("marks the statusline as a read-only help buffer, and puts the drill's name back when help closes", () => {
    const root = load();
    run("vim hjkl");
    openHelp();
    expect(textOf(root, ".ag-mode")).toBe("TMP");
    expect(textOf(root, ".statusline-drill")).toBe("hjkl.txt [Help][RO]");
    press("Escape");
    run(":q");
    expect(textOf(root, ".statusline-drill")).toBe("hjkl");
  });

  it("closes the command line and hints at Esc then :q back to the drill or :q! home", () => {
    const root = load();
    run("vim hjkl");
    openHelp();
    expect(root.querySelector(".cmdline-input")).toBeNull();
    expect(hintParts(root)).toEqual(HELP_HINT);
    expect(hintKeys(root)).toEqual(["Esc", ":q", ":q!"]);
  });

  it("with the command line open, greys the page and hints at :q and :q!", () => {
    const root = load();
    run("vim hjkl");
    openHelp();
    press("Escape");
    expect(root.querySelector(".drill-greyed .screen-help")).not.toBeNull();
    expect(hintParts(root)).toEqual([":q back to the drill", ":q! home"]);
    expect(hintKeys(root)).toEqual([":q", ":q!"]);
    press("Escape");
    expect(root.querySelector(".drill-greyed")).toBeNull();
  });

  it("ignores hjkl, Enter and a bare q", () => {
    const root = load();
    run("vim hjkl");
    openHelp();
    for (const key of ["h", "j", "k", "l", "Enter", "q"]) press(key);
    expect(screenOf(root)).toBe("screen-help");
    expect(root.querySelector(".cmdline-input")).toBeNull();
  });

  it(":q goes back to a fresh play screen with the timer at zero", () => {
    const root = load();
    run("vim hjkl");
    openHelp();
    press("Escape");
    run(":q");
    expect(screenOf(root)).toBe("screen-play");
    expect(textOf(root, ".progress")).toBe(`0/${HITS_TO_WIN}`);
    expect(textOf(root, ".timer")).toBe("0.00s");
    expect(root.querySelector(".cmdline-input")).toBeNull();
    expect(hintParts(root)).toEqual(PLAY_HINT);

    stepTowardTarget(root);
    vi.advanceTimersByTime(1000);
    press("Enter");
    expect(parseFloat(textOf(root, ".timer")!)).toBeGreaterThanOrEqual(1);
  });

  it(":q! goes home", () => {
    const root = load();
    run("vim hjkl");
    openHelp();
    press("Escape");
    run(":q!");
    expect(screenOf(root)).toBe("home");
  });

  it.each([":help", ":wq"])("%s isn't available on the help page, and stays on help", (command) => {
    const root = load();
    run("vim hjkl");
    openHelp();
    press("Escape");
    run(command);
    expect(textOf(root, ".ag-cmdline .ag-error")).toBe(
      `${command} isn't available on the help page (type argot for commands)`,
    );
    expect(screenOf(root)).toBe("screen-help");
    expect(textOf(root, ".cmdline-input")).toBe("");
  });

  it.each([":x", "q"])("%s is an unknown command, and stays on help", (command) => {
    const root = load();
    run("vim hjkl");
    openHelp();
    press("Escape");
    run(command);
    expect(textOf(root, ".ag-cmdline .ag-error")).toBe(`E492: Not an editor command: ${command} (type argot for commands)`);
    expect(screenOf(root)).toBe("screen-help");
  });
});

describe(":help from a drill", () => {
  it("before the first move opens help, and :q comes back to a fresh run", () => {
    const root = load();
    run("vim hjkl");
    openHelp();
    expect(screenOf(root)).toBe("screen-help");
    press("Escape");
    run(":q");
    expect(textOf(root, ".timer")).toBe("0.00s");
  });

  it("mid-run discards the run, so the clock can't be paused", () => {
    const root = load();
    run("vim hjkl");
    while (textOf(root, ".progress") === `0/${HITS_TO_WIN}`) stepTowardTarget(root);
    vi.advanceTimersByTime(2000);
    openHelp();
    expect(screenOf(root)).toBe("screen-help");
    vi.advanceTimersByTime(5000);

    press("Escape");
    run(":q");
    expect(screenOf(root)).toBe("screen-play");
    expect(textOf(root, ".progress")).toBe(`0/${HITS_TO_WIN}`);
    expect(textOf(root, ".timer")).toBe("0.00s");
  });

  it("on results discards the run without saving, even on a new best", () => {
    const root = load();
    run("vim hjkl");
    playToCompletion(root);
    expect(root.querySelector(".new-best")).not.toBeNull();
    openHelp();
    expect(screenOf(root)).toBe("screen-help");
    expect(localStorage.getItem("hjkl:bestTimeMs")).toBeNull();

    press("Escape");
    run(":q");
    expect(screenOf(root)).toBe("screen-play");
    expect(textOf(root, ".timer")).toBe("0.00s");
    expect(localStorage.getItem("hjkl:bestTimeMs")).toBeNull();
  });
});

describe("hjkl play screen", () => {
  it("asks the player to reach the ✕ using h j k l", () => {
    const root = load();
    run("vim hjkl");
    const instructions = root.querySelector(".ag-play > :first-child")!;
    expect(instructions.textContent).toBe("reach the ✕ using h j k l");
    expect(instructions.querySelector(".ag-key")!.textContent).toBe("h j k l");
  });

  it("draws the board as rows of dots, with one cursor and one ✕ target", () => {
    const root = load();
    run("vim hjkl");
    const board = root.querySelector(".ag-board")!;
    const rows = board.textContent!.split("\n");
    expect(rows).toHaveLength(BOARD_SIZE);
    expect(board.querySelectorAll(".board-cell")).toHaveLength(BOARD_SIZE * BOARD_SIZE);
    expect(board.querySelectorAll(`${CURSOR}.ag-cursor`)).toHaveLength(1);
    expect([...board.querySelectorAll(TARGET)].map((target) => target.textContent)).toEqual(["✕"]);
    const dots = [...board.querySelectorAll(".board-cell")].filter((cell) => cell.textContent === "·");
    expect(dots).toHaveLength(BOARD_SIZE * BOARD_SIZE - 2);
  });

  it("shows the timer and progress beneath the board", () => {
    const root = load();
    run("vim hjkl");
    const board = root.querySelector(".ag-board")!;
    for (const selector of [".timer", ".progress"]) {
      const info = root.querySelector(selector)!;
      expect(board.compareDocumentPosition(info) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(board.contains(info)).toBe(false);
    }
  });

  it("updates the timer and progress as the player moves", () => {
    const root = load();
    run("vim hjkl");
    stepTowardTarget(root);
    vi.advanceTimersByTime(1500);
    expect(parseFloat(textOf(root, ".timer")!)).toBeGreaterThanOrEqual(1.5);

    while (textOf(root, ".progress") === `0/${HITS_TO_WIN}`) stepTowardTarget(root);
    expect(textOf(root, ".progress")).toBe(`1/${HITS_TO_WIN}`);
  });

  it("keeps the cursor in the stage that greys while the command line is open", () => {
    const root = load();
    run("vim hjkl");
    const cursor = () => root.querySelector(`${CURSOR}.ag-cursor`)!;
    expect(cursor().closest(".drill-greyed")).toBeNull();
    press("Escape");
    expect(cursor().closest(".drill-greyed")).not.toBeNull();
    press("Escape");
    expect(cursor().closest(".drill-greyed")).toBeNull();
  });
});

describe("drill frame", () => {
  it("pins a statusline with the mode and the drill's name under the drill", () => {
    const root = load();
    run("vim hjkl");
    expect(textOf(root, ".ag-statusline .ag-mode")).toBe("TMP");
    expect(textOf(root, ".ag-statusline")).toContain("hjkl");
    const stage = root.querySelector(".screen")!;
    const statusline = root.querySelector(".ag-statusline")!;
    const cmdline = root.querySelector(".ag-cmdline")!;
    expect(stage.compareDocumentPosition(statusline) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(statusline.compareDocumentPosition(cmdline) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("keeps the mode at TMP through Esc, play, help and results", () => {
    const root = load();
    run("vim hjkl");
    press("Escape");
    expect(textOf(root, ".ag-mode")).toBe("TMP");
    run(":help");
    expect(textOf(root, ".ag-mode")).toBe("TMP");
    press("Escape");
    run(":q");
    playToCompletion(root);
    expect(textOf(root, ".ag-mode")).toBe("TMP");
  });

  it("on play with the command line closed, hints at Esc then :help for instructions or :q! home", () => {
    const root = load();
    run("vim hjkl");
    expect(hintParts(root)).toEqual(PLAY_HINT);
    expect(hintKeys(root)).toEqual(["Esc", ":help", ":q!"]);
    expect(root.querySelector(".ag-cmdline .ag-cursor")).toBeNull();
  });

  it("on play with the command line open, shows what's typed with a cursor and hints at :help and :q!", () => {
    const root = load();
    run("vim hjkl");
    press("Escape");
    type(":q");
    expect(textOf(root, ".cmdline-input")).toBe(":q");
    expect(root.querySelector(".cmdline-input + .ag-cursor")).not.toBeNull();
    expect(hintParts(root)).toEqual([":help for instructions", ":q! back to home"]);
    expect(hintKeys(root)).toEqual([":help", ":q!"]);
  });

  it("on results with the command line closed, hints at Esc then :wq or :q!", () => {
    const root = load();
    run("vim hjkl");
    playToCompletion(root);
    expect(hintParts(root)).toEqual(RESULTS_HINT);
    expect(hintKeys(root)).toEqual(["Esc", ":wq", ":q!"]);
    expect(root.querySelector(".ag-cmdline .ag-cursor")).toBeNull();
  });

  it("on results with the command line open, hints at :wq and :q!", () => {
    const root = load();
    run("vim hjkl");
    playToCompletion(root);
    press("Escape");
    expect(hintParts(root)).toEqual([":wq save & quit", ":q! quit without saving"]);
    expect(hintKeys(root)).toEqual([":wq", ":q!"]);
    expect(root.querySelector(".cmdline-input + .ag-cursor")).not.toBeNull();
  });

  it("shows an unknown command's error in place of the hint", () => {
    const root = load();
    run("vim hjkl");
    press("Escape");
    run(":x");
    expect(textOf(root, ".ag-cmdline .ag-error")).toBe("E492: Not an editor command: :x (type argot for commands)");
    expect(root.querySelector(".cmdline-hint")).toBeNull();
  });
});

describe(":q", () => {
  it("on play before the first move goes home, since there's nothing to lose", () => {
    const root = load();
    run("vim hjkl");
    press("Escape");
    run(":q");
    expect(screenOf(root)).toBe("home");
  });

  it("on play after the first move shows E37 in place of the hint, pointing at :q!", () => {
    const root = load();
    run("vim hjkl");
    stepTowardTarget(root);
    press("Escape");
    run(":q");
    expect(textOf(root, ".ag-cmdline .ag-error")).toBe(PLAY_E37);
    expect(root.querySelector(".cmdline-hint")).toBeNull();
    expect(textOf(root, ".cmdline-input")).toBe("");
    expect(screenOf(root)).toBe("screen-play");

    run(":q!");
    expect(screenOf(root)).toBe("home");
  });

  it("on results shows E37 in place of the hint, pointing at :wq and :q!", () => {
    const root = load();
    run("vim hjkl");
    playToCompletion(root);
    press("Escape");
    run(":q");
    expect(textOf(root, ".ag-cmdline .ag-error")).toBe(RESULTS_E37);
    expect(root.querySelector(".cmdline-hint")).toBeNull();
    expect(screenOf(root)).toBe("screen-results");
    expect(localStorage.getItem("hjkl:bestTimeMs")).toBeNull();
  });
});

describe("command mode on the play screen", () => {
  it("q doesn't quit once a run starts", () => {
    const root = load();
    run("vim hjkl");
    press("q");
    expect(screenOf(root)).toBe("screen-play");
  });

  it("Esc greys the drill and opens an empty command line with a hint to quit", () => {
    const root = load();
    run("vim hjkl");
    press("Escape");
    expect(root.querySelector(".drill-greyed")).not.toBeNull();
    expect(textOf(root, ".cmdline-input")).toBe("");
    expect(hintParts(root)).toEqual([":help for instructions", ":q! back to home"]);
  });

  it("echoes typed characters on the command line, and Backspace deletes them", () => {
    const root = load();
    run("vim hjkl");
    press("Escape");
    type(":qq");
    expect(textOf(root, ".cmdline-input")).toBe(":qq");
    press("Backspace");
    expect(textOf(root, ".cmdline-input")).toBe(":q");
  });

  it("hjkl type on the command line instead of moving the cursor", () => {
    const root = load();
    run("vim hjkl");
    const start = cellIndex(root, CURSOR);
    const key = keyTowardTarget(root);
    press("Escape");
    press(key);
    expect(cellIndex(root, CURSOR)).toBe(start);
    expect(textOf(root, ".cmdline-input")).toBe(key);
  });

  it("keeps the timer running while greyed", () => {
    const root = load();
    run("vim hjkl");
    stepTowardTarget(root);
    press("Escape");
    vi.advanceTimersByTime(2000);
    expect(parseFloat(textOf(root, ".timer")!)).toBeGreaterThanOrEqual(2);
  });

  it("Esc closes the command line and resumes the run where it was", () => {
    const root = load();
    run("vim hjkl");
    stepTowardTarget(root);
    const cursor = cellIndex(root, CURSOR);
    press("Escape");
    type(":q");
    press("Escape");
    expect(root.querySelector(".drill-greyed")).toBeNull();
    expect(root.querySelector(".cmdline-input")).toBeNull();
    expect(hintParts(root)).toEqual(PLAY_HINT);
    expect(cellIndex(root, CURSOR)).toBe(cursor);

    stepTowardTarget(root);
    expect(cellIndex(root, CURSOR)).not.toBe(cursor);
  });

  it(":q! abandons the run and returns home without touching the best time", () => {
    localStorage.setItem("hjkl:bestTimeMs", "14320");
    const root = load();
    run("vim hjkl");
    stepTowardTarget(root);
    press("Escape");
    run(":q!");
    expect(screenOf(root)).toBe("home");
    expect(localStorage.getItem("hjkl:bestTimeMs")).toBe("14320");

    type("ls");
    expect(textOf(root, ".prompt-input")).toBe("ls");
  });

  it.each([
    [":wq", ":wq isn't available on the play screen (type argot for commands)"],
    [":x", "E492: Not an editor command: :x (type argot for commands)"],
    [":w", "E492: Not an editor command: :w (type argot for commands)"],
    ["q!", "E492: Not an editor command: q! (type argot for commands)"],
  ])("%s shows an error, in place of the hint, and stays greyed", (command, error) => {
    const root = load();
    run("vim hjkl");
    press("Escape");
    run(command);
    expect(textOf(root, ".ag-cmdline .ag-error")).toBe(error);
    expect(root.querySelector(".cmdline-hint")).toBeNull();
    expect(root.querySelector(".drill-greyed")).not.toBeNull();
    expect(textOf(root, ".cmdline-input")).toBe("");
    expect(screenOf(root)).toBe("screen-play");
  });

  it("never labels play or the command line as insert mode", () => {
    const root = load();
    run("vim hjkl");
    const screens = [root.textContent];
    press("Escape");
    screens.push(root.textContent);
    run(":help");
    screens.push(root.textContent);
    press("Escape");
    screens.push(root.textContent);
    for (const text of screens) expect(text).not.toMatch(/insert/i);
  });

  it("does nothing on Enter at an empty command line", () => {
    const root = load();
    run("vim hjkl");
    press("Escape");
    press("Enter");
    expect(root.querySelector(".ag-cmdline .ag-error")).toBeNull();
    expect(hintParts(root)).toEqual([":help for instructions", ":q! back to home"]);
  });

  it("ignores held-down and Ctrl/Cmd/Alt-modified hjkl", () => {
    const root = load();
    run("vim hjkl");
    const start = cellIndex(root, CURSOR);
    for (const key of "hjkl") {
      for (const init of [{ repeat: true }, { ctrlKey: true }, { metaKey: true }, { altKey: true }]) {
        press(key, init);
        expect(cellIndex(root, CURSOR)).toBe(start);
      }
    }
  });
});

describe("hjkl results", () => {
  it("shows the final time and new best with the command line closed, and no buttons", () => {
    const root = load();
    run("vim hjkl");
    playToCompletion(root);
    expect(screenOf(root)).toBe("screen-results");
    expect(textOf(root, ".final-time")).toMatch(/^\d+\.\d\ds$/);
    expect(root.querySelector(".new-best")).not.toBeNull();
    expect(root.querySelector(".cmdline-input")).toBeNull();
    expect(root.querySelector("button")).toBeNull();
  });

  it("needs Esc before a command, like vim: typing first does nothing", () => {
    const root = load();
    run("vim hjkl");
    playToCompletion(root);
    run(":wq");
    expect(screenOf(root)).toBe("screen-results");
    expect(root.querySelector(".cmdline-input")).toBeNull();
    expect(localStorage.getItem("hjkl:bestTimeMs")).toBeNull();

    press("Escape");
    expect(textOf(root, ".cmdline-input")).toBe("");
    type(":w");
    expect(textOf(root, ".cmdline-input")).toBe(":w");
  });

  it("greys results while the command line is open", () => {
    const root = load();
    run("vim hjkl");
    playToCompletion(root);
    press("Escape");
    expect(root.querySelector(".drill-greyed .screen-results")).not.toBeNull();
    press("Escape");
    expect(root.querySelector(".drill-greyed")).toBeNull();
  });

  it(":wq on a time that isn't a new best leaves the stored best and returns home", () => {
    localStorage.setItem("hjkl:bestTimeMs", "1");
    const root = load();
    run("vim hjkl");
    playToCompletion(root);
    expect(root.querySelector(".new-best")).toBeNull();

    press("Escape");
    run(":wq");
    expect(screenOf(root)).toBe("home");
    expect(localStorage.getItem("hjkl:bestTimeMs")).toBe("1");
  });

  it(":q! returns home without saving, even on a new best", () => {
    const root = load();
    run("vim hjkl");
    playToCompletion(root);
    expect(root.querySelector(".new-best")).not.toBeNull();

    press("Escape");
    run(":q!");
    expect(screenOf(root)).toBe("home");
    expect(localStorage.getItem("hjkl:bestTimeMs")).toBeNull();
  });

  it("shows the stored best time alongside the run", () => {
    localStorage.setItem("hjkl:bestTimeMs", "14320");
    const root = load();
    run("vim hjkl");
    playToCompletion(root);
    expect(textOf(root, ".best-time")).toBe("Best time: 14.32s");
  });

  it("shows no best time when the player has none yet", () => {
    const root = load();
    run("vim hjkl");
    playToCompletion(root);
    expect(root.querySelector(".best-time")).toBeNull();
  });

  it.each([":w", ":x", "wq"])("%s is an unknown command, and stays on results", (command) => {
    const root = load();
    run("vim hjkl");
    playToCompletion(root);
    press("Escape");
    run(command);
    expect(textOf(root, ".ag-cmdline .ag-error")).toBe(`E492: Not an editor command: ${command} (type argot for commands)`);
    expect(textOf(root, ".cmdline-input")).toBe("");
    expect(screenOf(root)).toBe("screen-results");
  });

  it("Esc closes the command line, discarding what's typed, and Esc opens it again empty", () => {
    const root = load();
    run("vim hjkl");
    playToCompletion(root);
    press("Escape");
    type(":x");
    press("Escape");
    expect(root.querySelector(".cmdline-input")).toBeNull();
    expect(hintParts(root)).toEqual(RESULTS_HINT);
    expect(screenOf(root)).toBe("screen-results");

    press("Escape");
    expect(textOf(root, ".cmdline-input")).toBe("");
    run(":q!");
    expect(screenOf(root)).toBe("home");
  });

  it("doesn't save the best time just by finishing", () => {
    const root = load();
    run("vim hjkl");
    playToCompletion(root);
    expect(root.querySelector(".new-best")).not.toBeNull();

    const reloaded = load();
    run("vim hjkl");
    playToCompletion(reloaded);
    expect(reloaded.querySelector(".new-best")).not.toBeNull();
    expect(reloaded.querySelector(".best-time")).toBeNull();
  });
});

/** `argot`'s list, as each command's usage and description. */
function commandList(root: HTMLElement, selector: string): [string, string][] {
  return [...root.querySelectorAll(`${selector} .ag-commands > div`)].map((row) => [
    row.querySelector("dt.ag-key")!.textContent!,
    row.querySelector("dd")!.textContent!,
  ]);
}

const RESPONSE = ".cmdline-response";

describe("argot at home", () => {
  const HOME_COMMANDS = [
    ["ls", "list drills"],
    ["vim <drill>", "start a drill"],
    ["argot", "list the commands you can use here"],
  ];

  it.each(["argot", ":argot"])("%s lists ls, vim <drill> and argot, with what each does", (command) => {
    const root = load();
    run(command);
    expect(commandList(root, ".ag-home")).toEqual(HOME_COMMANDS);
    expect(root.querySelector(".ag-error")).toBeNull();
    expect(screenOf(root)).toBe("home");
  });

  it("never lists :argot", () => {
    const root = load();
    run("argot");
    expect(root.textContent).not.toContain(":argot");
  });

  it.each(["argot foo", ":argot foo"])("%s is an error, not a list", (command) => {
    const root = load();
    run(command);
    expect(textOf(root, ".ag-error")).toBe("argot: too many arguments (type argot for commands)");
    expect(root.querySelector(".ag-commands")).toBeNull();
  });

  it("the next command replaces the list", () => {
    const root = load();
    run("argot");
    run("ls");
    expect(root.querySelector(".ag-commands")).toBeNull();
    expect(root.querySelector(".ag-ls")).not.toBeNull();
  });
});

describe("argot on the command line", () => {
  it.each(["argot", ":argot"])("%s on play lists play's commands above the command line", (command) => {
    const root = load();
    run("vim hjkl");
    press("Escape");
    run(command);
    expect(commandList(root, RESPONSE)).toEqual([
      [":help", "open the drill's instructions, ending the run"],
      [":q", "back to home, before the first move"],
      [":q!", "back to home, abandoning the run"],
      ["argot", "list the commands you can use here"],
    ]);
    expect(root.querySelector(".cmdline-hint")).toBeNull();
    expect(root.querySelector(".ag-cmdline .ag-error")).toBeNull();
    expect(textOf(root, ".cmdline-input")).toBe("");
    expect(screenOf(root)).toBe("screen-play");
  });

  it("on help lists help's commands, where :q goes back to the drill", () => {
    const root = load();
    run("vim hjkl");
    openHelp();
    press("Escape");
    run("argot");
    expect(commandList(root, RESPONSE)).toEqual([
      [":q", "back to the drill"],
      [":q!", "back to home"],
      ["argot", "list the commands you can use here"],
    ]);
  });

  it("on results lists results' commands", () => {
    const root = load();
    run("vim hjkl");
    playToCompletion(root);
    press("Escape");
    run("argot");
    expect(commandList(root, RESPONSE).map(([usage]) => usage)).toEqual([":wq", ":q!", ":q", ":help", "argot"]);
  });

  it("never lists :argot", () => {
    const root = load();
    run("vim hjkl");
    press("Escape");
    run(":argot");
    expect(textOf(root, RESPONSE)).not.toContain(":argot");
  });

  it.each(["argot foo", ":argot foo"])("%s is an unknown command", (command) => {
    const root = load();
    run("vim hjkl");
    press("Escape");
    run(command);
    expect(textOf(root, ".ag-cmdline .ag-error")).toBe(`E492: Not an editor command: ${command} (type argot for commands)`);
    expect(root.querySelector(RESPONSE)).toBeNull();
  });

  it("sits in the drill frame's foot, over the stage, leaving the stage in place", () => {
    const root = load();
    run("vim hjkl");
    press("Escape");
    run("argot");
    const response = root.querySelector(RESPONSE)!;
    expect(response.closest(".ag-drill__foot")).not.toBeNull();
    expect(response.closest(".ag-drill__stage")).toBeNull();
    expect(root.querySelector(".ag-drill__stage .screen-play")).not.toBeNull();
  });

  it("stays up while the next command is typed, and the next command replaces it", () => {
    const root = load();
    run("vim hjkl");
    stepTowardTarget(root);
    press("Escape");
    run("argot");
    type(":q");
    expect(root.querySelector(RESPONSE)).not.toBeNull();
    expect(textOf(root, ".cmdline-input")).toBe(":q");

    press("Enter");
    expect(root.querySelector(RESPONSE)).toBeNull();
    expect(textOf(root, ".ag-cmdline .ag-error")).toBe(PLAY_E37);
  });

  it("an error is replaced by the list", () => {
    const root = load();
    run("vim hjkl");
    press("Escape");
    run(":x");
    run("argot");
    expect(root.querySelector(".ag-cmdline .ag-error")).toBeNull();
    expect(root.querySelector(RESPONSE)).not.toBeNull();
  });

  it("Esc closes the list and the command line, and hands keys back to the stage", () => {
    const root = load();
    run("vim hjkl");
    press("Escape");
    run("argot");
    press("Escape");
    expect(root.querySelector(RESPONSE)).toBeNull();
    expect(root.querySelector(".cmdline-input")).toBeNull();
    expect(root.querySelector(".drill-greyed")).toBeNull();
    expect(hintParts(root)).toEqual(PLAY_HINT);

    const cursor = cellIndex(root, CURSOR);
    stepTowardTarget(root);
    expect(cellIndex(root, CURSOR)).not.toBe(cursor);
  });

  it("a command that changes screen clears the list", () => {
    const root = load();
    run("vim hjkl");
    press("Escape");
    run("argot");
    run(":help");
    expect(screenOf(root)).toBe("screen-help");
    expect(root.querySelector(RESPONSE)).toBeNull();
  });
});

describe("full flow", () => {
  it("runs Home → Play → Help → Play → Results → Home → Play", () => {
    const root = load();
    run("vim hjkl");
    expect(screenOf(root)).toBe("screen-play");

    openHelp();
    expect(screenOf(root)).toBe("screen-help");

    press("Escape");
    run(":q");
    expect(screenOf(root)).toBe("screen-play");

    playToCompletion(root);
    expect(screenOf(root)).toBe("screen-results");

    press("Escape");
    run(":q!");
    expect(screenOf(root)).toBe("home");

    run("vim hjkl");
    expect(screenOf(root)).toBe("screen-play");
    expect(textOf(root, ".progress")).toBe(`0/${HITS_TO_WIN}`);
    expect(textOf(root, ".timer")).toBe("0.00s");
  });

  it(":wq on a new best saves it and returns home, and it survives a reload", () => {
    const first = load();
    run("vim hjkl");
    playToCompletion(first);
    const finalTime = textOf(first, ".final-time");

    press("Escape");
    run(":wq");
    expect(screenOf(first)).toBe("home");

    const reloaded = load();
    run("vim hjkl");
    playToCompletion(reloaded);
    expect(textOf(reloaded, ".best-time")).toBe(`Best time: ${finalTime}`);
  });
});

describe("loading the site", () => {
  it("lands on home after reloading on the help page", () => {
    load();
    run("vim hjkl");
    openHelp();
    expect(screenOf(load())).toBe("home");
  });

  it("lands on home after reloading mid-run", () => {
    const first = load();
    run("vim hjkl");
    stepTowardTarget(first);
    expect(screenOf(first)).toBe("screen-play");

    expect(screenOf(load())).toBe("home");
  });

  it("lands on home after reloading on results", () => {
    const first = load();
    run("vim hjkl");
    playToCompletion(first);
    expect(screenOf(first)).toBe("screen-results");

    expect(screenOf(load())).toBe("home");
  });
});

describe("key routing", () => {
  it("keeps a single keydown listener, the shell's, through a whole drill", () => {
    const root = load();
    const keydownListeners = () => listeners.filter(([type]) => type === "keydown").length;
    run("vim hjkl");
    openHelp();
    press("Escape");
    run(":q");
    playToCompletion(root);
    expect(keydownListeners()).toBe(1);
  });
});
