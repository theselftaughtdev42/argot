import { drills, type DrillSession } from "./drills/registry";
import { commands, type Shell } from "./shell/commands";
import {
  renderCommandLine,
  renderDrillFrame,
  renderHelp,
  renderHome,
  renderStatusName,
  type FrameScreen,
  type HomeState,
  type ShellOutput,
} from "./shell/renderer";

type RunningDrill = {
  name: string;
  /** The drill's session, or null while help is open: opening help ends the run. */
  session: DrillSession | null;
  container: HTMLElement;
  statusName: HTMLElement;
  cmdline: HTMLElement;
  screen: FrameScreen;
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
    // Greying pulls attention from the stage to the command line; results has nothing to read past.
    drill.container.classList.toggle("drill-greyed", drill.command !== null && drill.screen !== "results");
    renderStatusName(drill.statusName, drill.name, drill.screen);
    renderCommandLine(drill.cmdline, drill.screen, drill.command, drill.error);
  }

  /** Mounts a fresh run of the drill into the stage, with the command line closed. */
  function startRun(running: RunningDrill): void {
    running.command = null;
    running.error = null;
    running.session = drills.get(running.name)!.mount(running.container, (screen) => {
      running.screen = screen;
      renderDrill();
    });
  }

  /** Ends the run without saving and shows the drill's help page in its place. */
  function openHelp(running: RunningDrill): void {
    running.session?.destroy();
    running.session = null;
    running.screen = "help";
    running.command = null;
    running.error = null;
    renderHelp(running.container, drills.get(running.name)!.help);
    renderDrill();
  }

  function launchDrill(name: string): void {
    const { stage, statusName, cmdline } = renderDrillFrame(root, name);
    const running: RunningDrill = {
      name,
      container: stage,
      statusName,
      cmdline,
      session: null,
      screen: "play",
      command: null,
      error: null,
    };
    drill = running;
    startRun(running);
  }

  function quitDrill(running: RunningDrill): void {
    running.session?.destroy();
    drill = null;
    renderHome(root, home);
  }

  /** What `:q` says when there's something to lose, like vim's E37, naming the commands to use instead. */
  function noWriteError(screen: FrameScreen): string {
    return screen === "results"
      ? "E37: No write since last change (use :wq to save or :q! to discard)"
      : "E37: run in progress (add ! to abandon it: :q!)";
  }

  /** The commands each screen supports, for the error an unsupported one shows. */
  function supportedCommands(screen: FrameScreen): string {
    if (screen === "results") return "use :wq, :q! or :help";
    if (screen === "help") return "use :q or :q!";
    return "use :help or :q!";
  }

  /** Runs what's typed on the command line, as Enter submits it. */
  function runDrillCommand(running: RunningDrill, command: string): void {
    if (command === ":q!") {
      quitDrill(running);
    } else if (command === ":help") {
      openHelp(running);
    } else if (command === ":q" && running.screen === "help") {
      startRun(running);
    } else if (command === ":q" && running.screen === "play" && !running.session?.hasStarted()) {
      // Nothing's happened yet, so there's nothing for :q to throw away.
      quitDrill(running);
    } else if (command === ":wq" && running.screen === "results") {
      running.session?.save();
      quitDrill(running);
    } else {
      running.error =
        command === ":q" ? noWriteError(running.screen) : `${command} isn't supported in argot (${supportedCommands(running.screen)})`;
      running.command = "";
      renderDrill();
    }
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
      if (event.key !== "Escape") {
        drill.session?.handleKey(event);
        return;
      }
      drill.command = "";
    } else if (event.key === "Escape") {
      drill.command = null;
      drill.error = null;
    } else if (event.key === "Enter") {
      if (drill.command !== "") runDrillCommand(drill, drill.command);
      return;
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
