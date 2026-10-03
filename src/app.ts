import { games, type GameScreen, type GameSession } from "./games/registry";
import { renderGameBar, renderHome, type ShellOutput } from "./shell/renderer";

type RunningGame = {
  session: GameSession | null;
  container: HTMLElement;
  bar: HTMLElement;
  screen: GameScreen;
  /** What's typed on the command line, or null while it's closed. */
  command: string | null;
  /** The last command's error, shown in place of the hint. */
  error: string | null;
};

export function mountApp(root: HTMLElement): void {
  let input = "";
  let output: ShellOutput | null = null;
  let game: RunningGame | null = null;

  function renderGame(): void {
    if (!game) return;
    game.container.classList.toggle("game-greyed", game.command !== null);
    renderGameBar(game.bar, game.screen, game.command, game.error);
  }

  function launchGame(name: string): void {
    root.innerHTML = `<div class="game"></div><div class="shell-bar"></div>`;
    const running: RunningGame = {
      container: root.querySelector<HTMLElement>(".game")!,
      bar: root.querySelector<HTMLElement>(".shell-bar")!,
      session: null,
      screen: "splash",
      command: null,
      error: null,
    };
    game = running;
    running.session = games.get(name)!(running.container, (screen) => {
      running.screen = screen;
      renderGame();
    });
  }

  function quitGame(running: RunningGame): void {
    running.session?.destroy();
    game = null;
    renderHome(root, input, output);
  }

  function runCommand(command: string): void {
    const [name, arg] = command.split(/\s+/);
    if (!name) {
      output = null;
    } else if (name === "ls") {
      output = { kind: "output", text: [...games.keys()].join("  ") };
    } else if (name === "vim" && !arg) {
      output = { kind: "error", text: "vim: missing game name" };
    } else if (name === "vim" && games.has(arg)) {
      launchGame(arg);
    } else if (name === "vim") {
      output = { kind: "error", text: `vim: no such game: ${arg}` };
    } else {
      output = { kind: "error", text: `${name}: command not found` };
    }
  }

  function handleGameKeydown(game: RunningGame, event: KeyboardEvent): void {
    if (game.command === null) {
      if (event.key !== "Escape" || game.screen === "results") return;
      game.command = "";
      game.session?.setKeysEnabled(false);
    } else if (event.key === "Escape") {
      game.command = null;
      game.error = null;
      game.session?.setKeysEnabled(true);
    } else if (event.key === "Enter") {
      if (game.command === "") return;
      if (game.command === ":q!") {
        quitGame(game);
        return;
      }
      game.error = `${game.command} isn't supported in argot (use :q! to quit)`;
      game.command = "";
    } else if (event.key === "Backspace") {
      game.command = game.command.slice(0, -1);
    } else if (event.key.length === 1) {
      game.command += event.key;
    } else {
      return;
    }
    renderGame();
  }

  function handleHomeKeydown(event: KeyboardEvent): void {
    if (event.key === "Enter") {
      runCommand(input.trim());
      input = "";
      if (game) return;
    } else if (event.key === "Backspace") {
      input = input.slice(0, -1);
    } else if (event.key.length === 1) {
      input += event.key;
    } else {
      return;
    }
    renderHome(root, input, output);
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (game) handleGameKeydown(game, event);
    else handleHomeKeydown(event);
  }

  window.addEventListener("keydown", handleKeydown);
  renderHome(root, input, output);
}
