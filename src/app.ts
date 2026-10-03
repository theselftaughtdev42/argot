import { games } from "./games/registry";
import { renderHome, type ShellOutput } from "./shell/renderer";

export function mountApp(root: HTMLElement): void {
  let input = "";
  let output: ShellOutput | null = null;
  let inGame = false;

  function runCommand(command: string): void {
    const [name, arg] = command.split(/\s+/);
    if (!name) {
      output = null;
    } else if (name === "ls") {
      output = { kind: "output", text: [...games.keys()].join("  ") };
    } else if (name === "vim" && !arg) {
      output = { kind: "error", text: "vim: missing game name" };
    } else if (name === "vim" && games.has(arg)) {
      inGame = true;
      games.get(arg)!(root);
    } else if (name === "vim") {
      output = { kind: "error", text: `vim: no such game: ${arg}` };
    } else {
      output = { kind: "error", text: `${name}: command not found` };
    }
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (inGame) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === "Enter") {
      runCommand(input.trim());
      input = "";
      if (inGame) return;
    } else if (event.key === "Backspace") {
      input = input.slice(0, -1);
    } else if (event.key.length === 1) {
      input += event.key;
    } else {
      return;
    }
    renderHome(root, input, output);
  }

  window.addEventListener("keydown", handleKeydown);
  renderHome(root, input, output);
}
