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

/** The command-line hint on the instructions and play screens while the line is closed. */
const PLAY_HINT = "Esc then :q! back to home without saving";

/** The keys and commands highlighted in the command line's hint. */
function hintKeys(root: HTMLElement): string[] {
  return [...root.querySelectorAll(".cmdline-hint .ag-key")].map((key) => key.textContent!);
}

/** The headings of the man page on the instructions screen, in order. */
function manHeadings(root: HTMLElement): string[] {
  return [...root.querySelectorAll(".ag-man__heading")].map((heading) => heading.textContent!);
}

/** The body text of the man page section under `heading`. */
function manSection(root: HTMLElement, heading: string): string | undefined {
  const section = [...root.querySelectorAll(".ag-man__section")].find(
    (section) => section.querySelector(".ag-man__heading")?.textContent === heading,
  );
  return section?.querySelector(".ag-man__body")?.textContent?.replace(/\s+/g, " ").trim();
}

const CURSOR = ".ag-board__cursor";
const TARGET = ".ag-board__target";

function cellIndex(root: HTMLElement, selector: string): number {
  return [...root.querySelectorAll(".board-cell")].findIndex((cell) => cell.matches(selector));
}

/** Launches hjkl from home and starts a run, as a player would. */
function startHjkl(): void {
  run("vim hjkl");
  press("Enter");
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
    expect(textOf(root, ".ag-error")).toBe("cd: command not found");
    expect(screenOf(root)).toBe("home");
  });

  it("an error after ls replaces the list and hints at ls again", () => {
    const root = load();
    run("ls");
    run("pwd");
    expect(root.querySelector(".ag-ls")).toBeNull();
    expect(textOf(root, ".ag-error")).toBe("pwd: command not found");
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
    expect(textOf(root, ".ag-error")).toBe("<b>hi</b>: command not found");
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

describe("hjkl instructions screen", () => {
  it("vim hjkl opens the instructions screen as a man page, with no buttons", () => {
    const root = load();
    run("vim hjkl");
    expect(screenOf(root)).toBe("screen-instructions");
    expect(manHeadings(root)).toEqual(["NAME", "DESCRIPTION", "KEYS", "GOAL"]);
    const header = [...root.querySelectorAll(".ag-man__header > span")].map((part) => part.textContent);
    expect(header).toEqual(["HJKL(1)", "Argot Drills Instructions", "HJKL(1)"]);
    expect(root.querySelector("button")).toBeNull();
  });

  it("names the drill and says what it teaches", () => {
    const root = load();
    run("vim hjkl");
    expect(manSection(root, "NAME")).toBe("hjkl — move the cursor without the arrow keys");
  });

  it("lists each key with what it does, the keys highlighted", () => {
    const root = load();
    run("vim hjkl");
    const keys = [...root.querySelectorAll(".ag-man__keys > div")].map((row) => [
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

  it("explains why vim moves with hjkl, and that arrow keys do nothing here", () => {
    const root = load();
    run("vim hjkl");
    expect(manSection(root, "DESCRIPTION")).toBe(
      "In vim, you move the cursor with h, j, k and l instead of the arrow keys, so your fingers never leave the home row.",
    );
  });

  it("gives the goal", () => {
    const root = load();
    run("vim hjkl");
    expect(manSection(root, "GOAL")).toBe(`Hit ${HITS_TO_WIN} targets as fast as you can.`);
  });

  it("doesn't show the best time, even when the player has one", () => {
    localStorage.setItem("hjkl:bestTimeMs", "14320");
    const root = load();
    run("vim hjkl");
    expect(root.querySelector(".best-time")).toBeNull();
    expect(root.textContent).not.toMatch(/best/i);
  });

  it("shows a hint that Enter starts a run and q quits", () => {
    const root = load();
    run("vim hjkl");
    const options = [...root.querySelectorAll(".hint > span")];
    expect(options.map((option) => option.textContent)).toEqual(["press Enter to start", "press q to quit"]);
    expect(options.map((option) => option.querySelector(".ag-key")!.textContent)).toEqual(["Enter", "q"]);
  });

  it("q returns home, like quitting man", () => {
    const root = load();
    run("vim hjkl");
    press("q");
    expect(screenOf(root)).toBe("home");
  });

  it("q on the command line is typed, not quit", () => {
    const root = load();
    run("vim hjkl");
    press("Escape");
    press("q");
    expect(textOf(root, ".cmdline-input")).toBe("q");
    expect(screenOf(root)).toBe("screen-instructions");
  });

  it("sets the Enter hint apart below a rule", () => {
    const root = load();
    run("vim hjkl");
    expect(root.querySelector(".hint")!.previousElementSibling!.matches("hr.ag-man__rule")).toBe(true);
  });

  it("ignores hjkl until Enter is pressed", () => {
    const root = load();
    run("vim hjkl");
    press("l");
    expect(screenOf(root)).toBe("screen-instructions");
  });

  it("Enter begins a fresh run with the timer at zero", () => {
    const root = load();
    run("vim hjkl");
    press("Enter");
    expect(screenOf(root)).toBe("screen-play");
    expect(textOf(root, ".progress")).toBe(`0/${HITS_TO_WIN}`);
    expect(textOf(root, ".timer")).toBe("0.00s");
  });
});

describe("hjkl play screen", () => {
  it("asks the player to reach the ✕ using h j k l", () => {
    const root = load();
    startHjkl();
    const instructions = root.querySelector(".ag-play > :first-child")!;
    expect(instructions.textContent).toBe("reach the ✕ using h j k l");
    expect(instructions.querySelector(".ag-key")!.textContent).toBe("h j k l");
  });

  it("draws the board as rows of dots, with one cursor and one ✕ target", () => {
    const root = load();
    startHjkl();
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
    startHjkl();
    const board = root.querySelector(".ag-board")!;
    for (const selector of [".timer", ".progress"]) {
      const info = root.querySelector(selector)!;
      expect(board.compareDocumentPosition(info) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(board.contains(info)).toBe(false);
    }
  });

  it("updates the timer and progress as the player moves", () => {
    const root = load();
    startHjkl();
    stepTowardTarget(root);
    vi.advanceTimersByTime(1500);
    expect(parseFloat(textOf(root, ".timer")!)).toBeGreaterThanOrEqual(1.5);

    while (textOf(root, ".progress") === `0/${HITS_TO_WIN}`) stepTowardTarget(root);
    expect(textOf(root, ".progress")).toBe(`1/${HITS_TO_WIN}`);
  });

  it("keeps the cursor in the stage that greys while the command line is open", () => {
    const root = load();
    startHjkl();
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

  it("keeps the mode at TMP through Esc, play and results", () => {
    const root = load();
    run("vim hjkl");
    press("Escape");
    expect(textOf(root, ".ag-mode")).toBe("TMP");
    press("Escape");
    press("Enter");
    press("Escape");
    expect(textOf(root, ".ag-mode")).toBe("TMP");
    press("Escape");
    playToCompletion(root);
    expect(textOf(root, ".ag-mode")).toBe("TMP");
  });

  it("on play with the command line closed, hints at Esc then :q! to go home without saving", () => {
    const root = load();
    startHjkl();
    expect(textOf(root, ".cmdline-hint")).toBe(PLAY_HINT);
    expect(hintKeys(root)).toEqual(["Esc", ":q!"]);
    expect(root.querySelector(".ag-cmdline .ag-cursor")).toBeNull();
  });

  it.each([
    ["instructions", () => run("vim hjkl")],
    ["play", startHjkl],
  ])("on %s with the command line open, shows what's typed with a cursor and hints at :q!", (_screen, open) => {
    const root = load();
    open();
    press("Escape");
    type(":q");
    expect(textOf(root, ".cmdline-input")).toBe(":q");
    expect(root.querySelector(".cmdline-input + .ag-cursor")).not.toBeNull();
    expect(textOf(root, ".cmdline-hint")).toBe("type :q! to quit");
    expect(hintKeys(root)).toEqual([":q!"]);
  });

  it("on results, hints at :wq and :q!", () => {
    const root = load();
    startHjkl();
    playToCompletion(root);
    expect(textOf(root, ".cmdline-hint")).toBe(":wq save & quit · :q! quit without saving");
    expect(hintKeys(root)).toEqual([":wq", ":q!"]);
  });

  it("shows an unsupported command's error in place of the hint", () => {
    const root = load();
    run("vim hjkl");
    press("Escape");
    run(":x");
    expect(textOf(root, ".ag-cmdline .ag-error")).toBe(":x isn't supported in argot (use :q! to quit)");
    expect(root.querySelector(".cmdline-hint")).toBeNull();
  });
});

describe("command mode on the instructions screen", () => {
  it("shows only the instructions until Esc opens the command line", () => {
    const root = load();
    run("vim hjkl");
    expect(root.querySelector(".ag-drill--bare")).not.toBeNull();
    press("Escape");
    expect(root.querySelector(".ag-drill--bare")).toBeNull();
    press("Escape");
    expect(root.querySelector(".ag-drill--bare")).not.toBeNull();
  });

  it("shows the statusline and command line once a run starts", () => {
    const root = load();
    startHjkl();
    expect(root.querySelector(".ag-drill--bare")).toBeNull();
  });

  it("Esc greys the instructions screen and opens the command line", () => {
    const root = load();
    run("vim hjkl");
    press("Escape");
    expect(root.querySelector(".drill-greyed")).not.toBeNull();
    expect(textOf(root, ".cmdline-input")).toBe("");
    expect(textOf(root, ".cmdline-hint")).toBe("type :q! to quit");
  });

  it(":q! returns home", () => {
    const root = load();
    run("vim hjkl");
    press("Escape");
    run(":q!");
    expect(screenOf(root)).toBe("home");
  });

  it("an unknown command shows an error and stays on the instructions screen", () => {
    const root = load();
    run("vim hjkl");
    press("Escape");
    run(":wq");
    expect(textOf(root, ".ag-cmdline .ag-error")).toBe(":wq isn't supported in argot (use :q! to quit)");
    expect(screenOf(root)).toBe("screen-instructions");
  });

  it("Esc goes back to the instructions screen, where Enter still starts a run", () => {
    const root = load();
    run("vim hjkl");
    press("Escape");
    press("Escape");
    expect(root.querySelector(".drill-greyed")).toBeNull();
    expect(root.querySelector(".cmdline-input")).toBeNull();
    expect(screenOf(root)).toBe("screen-instructions");

    press("Enter");
    expect(screenOf(root)).toBe("screen-play");
  });
});

describe("command mode on the play screen", () => {
  it("q doesn't quit once a run starts", () => {
    const root = load();
    startHjkl();
    press("q");
    expect(screenOf(root)).toBe("screen-play");
  });

  it("Esc greys the drill and opens an empty command line with a hint to quit", () => {
    const root = load();
    startHjkl();
    press("Escape");
    expect(root.querySelector(".drill-greyed")).not.toBeNull();
    expect(textOf(root, ".cmdline-input")).toBe("");
    expect(textOf(root, ".cmdline-hint")).toBe("type :q! to quit");
  });

  it("echoes typed characters on the command line, and Backspace deletes them", () => {
    const root = load();
    startHjkl();
    press("Escape");
    type(":qq");
    expect(textOf(root, ".cmdline-input")).toBe(":qq");
    press("Backspace");
    expect(textOf(root, ".cmdline-input")).toBe(":q");
  });

  it("hjkl type on the command line instead of moving the cursor", () => {
    const root = load();
    startHjkl();
    const start = cellIndex(root, CURSOR);
    const key = keyTowardTarget(root);
    press("Escape");
    press(key);
    expect(cellIndex(root, CURSOR)).toBe(start);
    expect(textOf(root, ".cmdline-input")).toBe(key);
  });

  it("keeps the timer running while greyed", () => {
    const root = load();
    startHjkl();
    stepTowardTarget(root);
    press("Escape");
    vi.advanceTimersByTime(2000);
    expect(parseFloat(textOf(root, ".timer")!)).toBeGreaterThanOrEqual(2);
  });

  it("Esc closes the command line and resumes the run where it was", () => {
    const root = load();
    startHjkl();
    stepTowardTarget(root);
    const cursor = cellIndex(root, CURSOR);
    press("Escape");
    type(":q");
    press("Escape");
    expect(root.querySelector(".drill-greyed")).toBeNull();
    expect(root.querySelector(".cmdline-input")).toBeNull();
    expect(textOf(root, ".cmdline-hint")).toBe(PLAY_HINT);
    expect(cellIndex(root, CURSOR)).toBe(cursor);

    stepTowardTarget(root);
    expect(cellIndex(root, CURSOR)).not.toBe(cursor);
  });

  it(":q! abandons the run and returns home without touching the best time", () => {
    localStorage.setItem("hjkl:bestTimeMs", "14320");
    const root = load();
    startHjkl();
    stepTowardTarget(root);
    press("Escape");
    run(":q!");
    expect(screenOf(root)).toBe("home");
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
    expect(root.querySelector(".ag-cmdline .ag-error")).toBeNull();
    expect(textOf(root, ".cmdline-hint")).toBe("type :q! to quit");
  });

  it("ignores held-down and Ctrl/Cmd/Alt-modified hjkl", () => {
    const root = load();
    startHjkl();
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
  it("shows the final time and new best with the command line already open, and no buttons", () => {
    const root = load();
    startHjkl();
    playToCompletion(root);
    expect(screenOf(root)).toBe("screen-results");
    expect(textOf(root, ".final-time")).toMatch(/^\d+\.\d\ds$/);
    expect(root.querySelector(".new-best")).not.toBeNull();
    expect(textOf(root, ".cmdline-input")).toBe("");
    expect(root.querySelector(".drill-greyed")).toBeNull();
    expect(root.querySelector("button")).toBeNull();

    type(":w");
    expect(textOf(root, ".cmdline-input")).toBe(":w");
  });

  it(":wq on a time that isn't a new best leaves the stored best and returns home", () => {
    localStorage.setItem("hjkl:bestTimeMs", "1");
    const root = load();
    startHjkl();
    playToCompletion(root);
    expect(root.querySelector(".new-best")).toBeNull();

    run(":wq");
    expect(screenOf(root)).toBe("home");
    expect(localStorage.getItem("hjkl:bestTimeMs")).toBe("1");
  });

  it(":q! returns home without saving, even on a new best", () => {
    const root = load();
    startHjkl();
    playToCompletion(root);
    expect(root.querySelector(".new-best")).not.toBeNull();

    run(":q!");
    expect(screenOf(root)).toBe("home");
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
    expect(textOf(root, ".cmdline-hint")).toBe(":wq save & quit · :q! quit without saving");
  });

  it.each([":q", ":w", ":x", "wq"])("%s shows an error naming :wq and :q!, and stays on results", (command) => {
    const root = load();
    startHjkl();
    playToCompletion(root);
    run(command);
    expect(textOf(root, ".ag-cmdline .ag-error")).toBe(`${command} isn't supported in argot (use :wq or :q!)`);
    expect(textOf(root, ".cmdline-input")).toBe("");
    expect(screenOf(root)).toBe("screen-results");
  });

  it("Esc discards what's typed but keeps the command line open, so the player can still leave", () => {
    const root = load();
    startHjkl();
    playToCompletion(root);
    type(":x");
    press("Escape");
    expect(textOf(root, ".cmdline-input")).toBe("");

    run(":q!");
    expect(screenOf(root)).toBe("home");
  });

  it("doesn't save the best time just by finishing", () => {
    const root = load();
    startHjkl();
    playToCompletion(root);
    expect(root.querySelector(".new-best")).not.toBeNull();

    const reloaded = load();
    startHjkl();
    playToCompletion(reloaded);
    expect(reloaded.querySelector(".new-best")).not.toBeNull();
    expect(reloaded.querySelector(".best-time")).toBeNull();
  });
});

describe("full flow", () => {
  it("runs Home → Instructions → Play → Results → Home → Instructions → Play", () => {
    const root = load();
    startHjkl();
    playToCompletion(root);
    expect(screenOf(root)).toBe("screen-results");

    run(":q!");
    expect(screenOf(root)).toBe("home");

    startHjkl();
    expect(screenOf(root)).toBe("screen-play");
    expect(textOf(root, ".progress")).toBe(`0/${HITS_TO_WIN}`);
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
    expect(screenOf(first)).toBe("home");

    const reloaded = load();
    startHjkl();
    playToCompletion(reloaded);
    expect(textOf(reloaded, ".best-time")).toBe(`Best time: ${finalTime}`);
  });
});

describe("loading the site", () => {
  it("lands on home after reloading on the instructions screen", () => {
    load();
    run("vim hjkl");
    expect(screenOf(load())).toBe("home");
  });

  it("lands on home after reloading mid-run", () => {
    const first = load();
    startHjkl();
    stepTowardTarget(first);
    expect(screenOf(first)).toBe("screen-play");

    expect(screenOf(load())).toBe("home");
  });

  it("lands on home after reloading on results", () => {
    const first = load();
    startHjkl();
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
    press("Enter");
    playToCompletion(root);
    expect(keydownListeners()).toBe(1);
  });
});
