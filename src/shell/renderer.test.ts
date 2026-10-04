// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { renderInstructions } from "./renderer";

const instructions = {
  name: "word",
  summary: "jump a word at a time",
  description: "Moving by words is faster than moving by characters.",
  keys: [{ keys: "w", action: "next word" }],
  goal: "Land on 15 words as fast as you can.",
};

function headings(root: HTMLElement): string[] {
  return [...root.querySelectorAll(".ag-man__heading")].map((heading) => heading.textContent!);
}

describe("renderInstructions", () => {
  it("shows NAME, DESCRIPTION, KEYS and GOAL, in that order", () => {
    const root = document.createElement("div");
    renderInstructions(root, instructions);
    expect(headings(root)).toEqual(["NAME", "DESCRIPTION", "KEYS", "GOAL"]);
  });

  it("shows a multi-key sequence as one key", () => {
    const root = document.createElement("div");
    renderInstructions(root, { ...instructions, keys: [{ keys: "dd", action: "delete a line" }] });
    expect([...root.querySelectorAll(".ag-man__keys dt")].map((key) => key.textContent)).toEqual(["dd"]);
  });

  it("shows the drill's text as plain text, not markup", () => {
    const root = document.createElement("div");
    renderInstructions(root, { ...instructions, goal: "Type <b> literally." });
    expect(root.querySelector(".ag-man b")).toBeNull();
    expect(root.textContent).toContain("Type <b> literally.");
  });
});
