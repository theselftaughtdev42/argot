import { drills, type DrillSession } from "./drills/registry";
import {
  ARGOT_TIP,
  drillCommands,
  findCommand,
  homeCommands,
  listCommands,
  runCommandLine,
  type DrillShell,
  type Shell,
} from "./shell/commands";
import {
  renderCommandLine,
  renderDrillFrame,
  renderHelp,
  renderHome,
  renderStatusName,
  type CommandResponse,
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
  /** What the last command showed, until Esc or the next command. */
  response: CommandResponse | null;
};

export function mountApp(root: HTMLElement): void {
  const home: HomeState = { input: "", last: null, compact: false };
  let drill: RunningDrill | null = null;
  /** Commands run at the prompt this visit, oldest first, for ArrowUp and ArrowDown to step through. */
  const history: string[] = [];
  /** Where ArrowUp and ArrowDown have got to in history; history.length is the line being typed. */
  let historyIndex = 0;
  /** What was being typed before stepping into history, for ArrowDown to come back to. */
  let draft = "";

  function renderDrill(): void {
    if (!drill) return;
    // Greying pulls attention from the stage to the command line.
    drill.container.classList.toggle("drill-greyed", drill.command !== null);
    renderStatusName(drill.statusName, drill.name, drill.screen);
    renderCommandLine(drill.cmdline, drill.screen, drill.command, drill.response);
  }

  /** Mounts a fresh run of the drill into the stage, with the command line closed. */
  function startRun(running: RunningDrill): void {
    running.session?.destroy();
    running.command = null;
    running.response = null;
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
    running.response = null;
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
      response: null,
    };
    drill = running;
    startRun(running);
  }

  function quitDrill(running: RunningDrill): void {
    running.session?.destroy();
    drill = null;
    renderHome(root, home);
  }

  /** Runs what's typed on the command line, as Enter submits it. */
  function runDrillCommand(running: RunningDrill, command: string): void {
    const respond = (response: CommandResponse) => {
      running.response = response;
      running.command = "";
      renderDrill();
    };
    const shell: DrillShell = {
      error: (text) => respond({ kind: "error", text }),
      listCommands: () => respond({ kind: "commands", items: listCommands(drillCommands[running.screen]) }),
      hasStarted: () => running.session?.hasStarted() ?? false,
      openHelp: () => openHelp(running),
      startRun: () => startRun(running),
      save: () => running.session?.save(),
      quit: () => quitDrill(running),
    };
    runCommandLine(running.screen, command, shell);
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
      listCommands: () => show({ kind: "commands", items: listCommands(homeCommands) }),
      launchDrill,
    };
    // Cleared first so a drill launch leaves a clean home to come back to.
    home.last = null;
    const command = findCommand(homeCommands, name);
    if (command) command.run(args, shell);
    else shell.error(`${name}: command not found ${ARGOT_TIP}`);
    if (drill) return;
    // Once the visitor has run a command, its output matters more than the logo.
    home.compact = true;
  }

  function handleDrillKeydown(drill: RunningDrill, event: KeyboardEvent): void {
    if (drill.command === null) {
      // The drill sees the Esc that opens the command line too, so it can drop a half-typed count.
      drill.session?.handleKey(event);
      if (event.key !== "Escape") return;
      drill.command = "";
    } else if (event.key === "Escape") {
      drill.command = null;
      drill.response = null;
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
      const line = home.input.trim();
      // Like a shell's ignoredups: an empty line or a repeat of the last command isn't worth recalling.
      if (line && line !== history.at(-1)) history.push(line);
      historyIndex = history.length;
      home.input = "";
      runCommand(line);
      if (drill) return;
    } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      // Arrows would otherwise scroll the page.
      event.preventDefault();
      const next = historyIndex + (event.key === "ArrowUp" ? -1 : 1);
      if (next < 0 || next > history.length) return;
      if (historyIndex === history.length) draft = home.input;
      historyIndex = next;
      home.input = next === history.length ? draft : history[next]!;
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
