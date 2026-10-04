// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { renderHelp } from "./renderer";

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
