import { games, type GameScreen, type GameSession } from "./games/registry";
import { commands, type Shell } from "./shell/commands";
import { renderGameBar, renderHome, type HomeState, type ShellOutput } from "./shell/renderer";

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
  const home: HomeState = { input: "", last: null, compact: false };
  let game: RunningGame | null = null;

  function renderGame(): void {
    if (!game) return;
    // Greying pulls attention from play to the command line; results has no play to dim.
    game.container.classList.toggle("game-greyed", game.command !== null && game.screen !== "results");
    renderGameBar(game.bar, game.screen, game.command, game.error);
  }

  function launchGame(name: string): void {
    root.innerHTML = `<div class="game-frame"><div class="game"></div><div class="shell-bar"></div></div>`;
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
      // Results has nothing to play, so it opens straight onto the command line.
      if (screen === "results") running.command = "";
      renderGame();
    });
  }

  function quitGame(running: RunningGame): void {
    running.session?.destroy();
    game = null;
    renderHome(root, home);
  }

  function runCommand(line: string): void {
    const [name, ...args] = line.split(/\s+/);
    if (!name) {
      home.last = null;
      return;
    }
    const show = (output: ShellOutput) => (home.last = { name, output });
    const shell: Shell = {
      list: (items) => show({ kind: "list", items }),
      error: (text) => show({ kind: "error", text }),
      launchGame,
    };
    // Cleared first so a game launch leaves a clean home to come back to.
    home.last = null;
    const command = commands.get(name);
    if (command) command.run(args, shell);
    else shell.error(`${name}: command not found`);
    if (game) return;
    // Once the visitor has run a command, its output matters more than the logo.
    home.compact = true;
  }

  function handleGameKeydown(game: RunningGame, event: KeyboardEvent): void {
    if (game.command === null) {
      if (event.key !== "Escape") {
        game.session?.handleKey(event);
        return;
      }
      if (game.screen === "results") return;
      game.command = "";
    } else if (event.key === "Escape" && game.screen === "results") {
      // Results has no game to go back to, so Esc only clears the line.
      game.command = "";
      game.error = null;
    } else if (event.key === "Escape") {
      game.command = null;
      game.error = null;
    } else if (event.key === "Enter") {
      if (game.command === "") return;
      if (game.command === ":q!") {
        quitGame(game);
        return;
      }
      if (game.command === ":wq" && game.screen === "results") {
        game.session?.save();
        quitGame(game);
        return;
      }
      const supported = game.screen === "results" ? "use :wq or :q!" : "use :q! to quit";
      game.error = `${game.command} isn't supported in argot (${supported})`;
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
      runCommand(home.input.trim());
      home.input = "";
      if (game) return;
    } else if (event.key === "Backspace") {
      home.input = home.input.slice(0, -1);
    } else if (event.key.length === 1) {
      home.input += event.key;
    } else {
      return;
    }
    renderHome(root, home);
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (game) handleGameKeydown(game, event);
    else handleHomeKeydown(event);
  }

  window.addEventListener("keydown", handleKeydown);
  renderHome(root, home);
}
