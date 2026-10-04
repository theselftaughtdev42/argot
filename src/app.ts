import { drills, type DrillScreen, type DrillSession } from "./drills/registry";
import { commands, type Shell } from "./shell/commands";
import { renderCommandLine, renderDrillFrame, renderHome, type HomeState, type ShellOutput } from "./shell/renderer";

type RunningDrill = {
  session: DrillSession | null;
  frame: HTMLElement;
  container: HTMLElement;
  cmdline: HTMLElement;
  screen: DrillScreen;
  /** What's typed on the command line, or null while it's closed. */
  command: string | null;
  /** The last command's error, shown in place of the hint. */
  error: string | null;
};

export function mountApp(root: HTMLElement): void {
  const home: HomeState = { input: "", last: null, compact: false };
  let drill: RunningDrill | null = null;

  function renderDrill(): void {
    if (!drill) return;
    // Instructions stand alone until the player reaches for the command line.
    drill.frame.classList.toggle("ag-drill--bare", drill.command === null && drill.screen === "instructions");
    // Greying pulls attention from play to the command line; results has no play to dim.
    drill.container.classList.toggle("drill-greyed", drill.command !== null && drill.screen !== "results");
    renderCommandLine(drill.cmdline, drill.screen, drill.command, drill.error);
  }

  function launchDrill(name: string): void {
    const { frame, stage, cmdline } = renderDrillFrame(root, name);
    const running: RunningDrill = {
      frame,
      container: stage,
      cmdline,
      session: null,
      screen: "instructions",
      command: null,
      error: null,
    };
    drill = running;
    running.session = drills.get(name)!(running.container, (screen) => {
      running.screen = screen;
      // Results has nothing to play, so it opens straight onto the command line.
      if (screen === "results") running.command = "";
      renderDrill();
    });
  }

  function quitDrill(running: RunningDrill): void {
    running.session?.destroy();
    drill = null;
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
      launchDrill,
    };
    // Cleared first so a drill launch leaves a clean home to come back to.
    home.last = null;
    const command = commands.get(name);
    if (command) command.run(args, shell);
    else shell.error(`${name}: command not found`);
    if (drill) return;
    // Once the visitor has run a command, its output matters more than the logo.
    home.compact = true;
  }

  function handleDrillKeydown(drill: RunningDrill, event: KeyboardEvent): void {
    if (drill.command === null) {
      // Like man, q leaves the instructions screen without the command line.
      if (event.key === "q" && drill.screen === "instructions") {
        quitDrill(drill);
        return;
      }
      if (event.key !== "Escape") {
        drill.session?.handleKey(event);
        return;
      }
      if (drill.screen === "results") return;
      drill.command = "";
    } else if (event.key === "Escape" && drill.screen === "results") {
      // Results has no drill to go back to, so Esc only clears the line.
      drill.command = "";
      drill.error = null;
    } else if (event.key === "Escape") {
      drill.command = null;
      drill.error = null;
    } else if (event.key === "Enter") {
      if (drill.command === "") return;
      if (drill.command === ":q!") {
        quitDrill(drill);
        return;
      }
      if (drill.command === ":wq" && drill.screen === "results") {
        drill.session?.save();
        quitDrill(drill);
        return;
      }
      const supported = drill.screen === "results" ? "use :wq or :q!" : "use :q! to quit";
      drill.error = `${drill.command} isn't supported in argot (${supported})`;
      drill.command = "";
    } else if (event.key === "Backspace") {
      drill.command = drill.command.slice(0, -1);
    } else if (event.key.length === 1) {
      drill.command += event.key;
    } else {
      return;
    }
    renderDrill();
  }

  function handleHomeKeydown(event: KeyboardEvent): void {
    if (event.key === "Enter") {
      runCommand(home.input.trim());
      home.input = "";
      if (drill) return;
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
    if (drill) handleDrillKeydown(drill, event);
    else handleHomeKeydown(event);
  }

  window.addEventListener("keydown", handleKeydown);
  renderHome(root, home);
}
