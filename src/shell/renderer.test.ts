// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHelp, renderHome, type HomeState } from "./renderer";

const help = {
  name: "word",
  summary: "jump a word at a time",
  description: "Moving by words is faster than moving by characters.",
  keys: [{ keys: "w", action: "next word" }],
  goal: "Land on 15 words as fast as you can.",
};

function headings(root: HTMLElement): string[] {
  return [...root.querySelectorAll(".ag-help__heading > :first-child")].map((heading) => heading.textContent!);
}

describe("renderHelp", () => {
  it("opens with the drill's tag and summary, then DESCRIPTION, KEYS and GOAL, in that order", () => {
    const root = document.createElement("div");
    renderHelp(root, help);
    expect(root.querySelector(".ag-help__title")!.textContent).toBe("*word.txt*jump a word at a time");
    expect(headings(root)).toEqual(["DESCRIPTION", "KEYS", "GOAL"]);
  });

  it("tags each section with the drill's name", () => {
    const root = document.createElement("div");
    renderHelp(root, help);
    const tags = [...root.querySelectorAll(".ag-help__heading .ag-help__tag")].map((tag) => tag.textContent);
    expect(tags).toEqual(["*word-description*", "*word-keys*", "*word-goal*"]);
  });

  it("shows a multi-key sequence as one key", () => {
    const root = document.createElement("div");
    renderHelp(root, { ...help, keys: [{ keys: "dd", action: "delete a line" }] });
    expect([...root.querySelectorAll(".ag-help__keys dt")].map((key) => key.textContent)).toEqual(["dd"]);
  });

  it("highlights keys wrapped in backticks, without the backticks", () => {
    const root = document.createElement("div");
    renderHelp(root, { ...help, description: "Press `w` to jump, `<b>` too." });
    expect([...root.querySelectorAll(".ag-help__body p .ag-key")].map((key) => key.textContent)).toEqual(["w", "<b>"]);
    expect(root.querySelector(".ag-help b")).toBeNull();
    expect(root.textContent).not.toContain("`");
  });

  it("shows the drill's text as plain text, not markup", () => {
    const root = document.createElement("div");
    renderHelp(root, { ...help, goal: "Type <b> literally." });
    expect(root.querySelector(".ag-help b")).toBeNull();
    expect(root.textContent).toContain("Type <b> literally.");
  });
});

describe("renderHome", () => {
  const fresh: HomeState = { input: "", last: null, compact: false, picker: null };
  const compact: HomeState = { input: "", last: { name: "ls", output: { kind: "list", items: ["drills"] } }, compact: true, picker: null };

  afterEach(() => vi.restoreAllMocks());

  /** The elements animated while home is drawn as `next`, after `before`. */
  function animatedOn(before: HomeState, next: HomeState): Element[] {
    const root = document.createElement("div");
    renderHome(root, before);
    const animate = vi.spyOn(Element.prototype, "animate");
    renderHome(root, next);
    return animate.mock.contexts as Element[];
  }

  it("glides the logo and the prompt to their new places, and fades in the response, when home goes compact", () => {
    const animated = animatedOn(fresh, compact);
    expect(animated.map((element) => element.className)).toEqual(["ag-logo", "home-prompt", "home-tagline-ghost", "home-response"]);
  });

  it("glides the logo and the prompt back, and fades in the tagline, when home goes full size again", () => {
    const animated = animatedOn(compact, fresh);
    expect(animated.map((element) => element.className)).toEqual(["ag-logo", "home-prompt", "ag-tagline"]);
  });

  it("fades out a copy of the tagline where it was when home goes compact", () => {
    const root = document.createElement("div");
    renderHome(root, fresh);
    renderHome(root, compact);
    expect(root.querySelector(".home-tagline-ghost")?.textContent).toBe("train your fingers to think in vim.");
  });

  it("leaves the logo still once it's compact", () => {
    expect(animatedOn(compact, { ...compact, input: "l" })).toEqual([]);
  });

  it("leaves the logo still while it's full size", () => {
    expect(animatedOn(fresh, { ...fresh, input: "l" })).toEqual([]);
  });

  it("cuts straight to the top for a visitor who prefers reduced motion", () => {
    vi.spyOn(window, "matchMedia").mockReturnValue({ matches: true } as MediaQueryList);
    expect(animatedOn(fresh, compact)).toEqual([]);
  });
});
