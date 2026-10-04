import { drills } from "../drills/registry";
import type { FrameScreen } from "./renderer";

/** What every screen's commands can do: show an error, or list the screen's commands for `argot`. */
interface Responder {
  /** Shows `text` as an error, replacing the last command response. */
  error(text: string): void;
  /** Lists the current screen's commands, replacing the last command response. */
  listCommands(): void;
}

/** What a home command can do to the shell. */
export interface Shell extends Responder {
  /** Shows `items` side by side under the prompt, like `ls`, replacing the last output. */
  list(items: string[]): void;
  /** Leaves home for the drill called `name`, which must be in the registry. */
  launchDrill(name: string): void;
}

/** What a command-line command can do to the running drill. */
export interface DrillShell extends Responder {
  /** Whether the current run has started, which the first move does. */
  hasStarted(): boolean;
  /** Ends the run without saving and shows the drill's help page. */
  openHelp(): void;
  /** Starts a fresh run on the play screen. */
  startRun(): void;
  /** Saves the finished run shown on results, if it's a new best. */
  save(): void;
  /** Leaves the drill for home. */
  quit(): void;
}

export interface Command<S> {
  /** How to call it, for `argot`'s list, e.g. `vim <drill>`. */
  usage: string;
  /** One line on what it does on this screen, for `argot`'s list. */
  description: string;
  /** Runs with the words typed after the command's name. */
  run(args: string[], shell: S): void;
}

/** A screen's commands, keyed by the name typed to run them. */
export type CommandTable<S> = Map<string, Command<S>>;

/** Tacked onto errors, pointing at the command that lists what does work. */
export const ARGOT_TIP = "(type argot for commands)";

/** Lists the current screen's commands. Works on every screen, as `argot` or `:argot`. */
const argot: Command<Responder> = {
  usage: "argot",
  description: "list the commands you can use here",
  run(args, shell) {
    if (args.length > 0) shell.error(`argot: too many arguments ${ARGOT_TIP}`);
    else shell.listCommands();
  },
};

/** The command in `table` called `name`, taking `:argot` as `argot`. */
export function findCommand<S>(table: CommandTable<S>, name: string): Command<S> | undefined {
  return table.get(name === ":argot" ? "argot" : name);
}

/** Each command's usage and description, in the table's order, for `argot`'s list. */
export function listCommands<S>(table: CommandTable<S>): { usage: string; description: string }[] {
  return [...table.values()].map(({ usage, description }) => ({ usage, description }));
}

/** Every command the home prompt understands. */
export const homeCommands: CommandTable<Shell> = new Map<string, Command<Shell>>([
  [
    "ls",
    {
      usage: "ls",
      description: "list drills",
      run(_args, shell) {
        shell.list([...drills.keys()]);
      },
    },
  ],
  [
    "vim",
    {
      usage: "vim <drill>",
      description: "start a drill",
      run([name], shell) {
        if (!name) shell.error("vim: missing drill name");
        else if (drills.has(name)) shell.launchDrill(name);
        else shell.error(`vim: no such drill: ${name}`);
      },
    },
  ],
  ["argot", argot],
]);

/** A command-line command, which takes no arguments, so its usage is its name. */
function drillCommand(name: string, description: string, run: (shell: DrillShell) => void): [string, Command<DrillShell>] {
  return [name, { usage: name, description, run: (_args, shell) => run(shell) }];
}

const openHelp = drillCommand(":help", "open the drill's instructions, ending the run", (shell) => shell.openHelp());

/** The commands each drill screen's command line accepts. */
export const drillCommands: Record<FrameScreen, CommandTable<DrillShell>> = {
  play: new Map([
    openHelp,
    drillCommand(":q", "back to home, before the first move", (shell) => {
      // Once a run has started there's something to lose, so :q refuses like vim's E37.
      if (shell.hasStarted()) shell.error("E37: run in progress (add ! to abandon it: :q!)");
      else shell.quit();
    }),
    drillCommand(":q!", "back to home, abandoning the run", (shell) => shell.quit()),
    ["argot", argot],
  ]),
  help: new Map([
    drillCommand(":q", "back to the drill", (shell) => shell.startRun()),
    drillCommand(":q!", "back to home", (shell) => shell.quit()),
    ["argot", argot],
  ]),
  results: new Map([
    drillCommand(":wq", "save & quit", (shell) => {
      shell.save();
      shell.quit();
    }),
    drillCommand(":q!", "quit without saving", (shell) => shell.quit()),
    drillCommand(":q", "refuses: use :wq or :q!", (shell) =>
      shell.error("E37: No write since last change (use :wq to save or :q! to discard)"),
    ),
    openHelp,
    ["argot", argot],
  ]),
};

/** How errors name each drill screen. */
const SCREEN_NAMES: Record<FrameScreen, string> = {
  play: "the play screen",
  help: "the help page",
  results: "the results screen",
};

/**
 * Runs what's typed on the command line against `screen`'s commands. A command
 * that some other screen accepts isn't available here; anything else is unknown.
 */
export function runCommandLine(screen: FrameScreen, typed: string, shell: DrillShell): void {
  const command = findCommand(drillCommands[screen], typed);
  if (command) command.run([], shell);
  else if (Object.values(drillCommands).some((table) => findCommand(table, typed)))
    shell.error(`${typed} isn't available on ${SCREEN_NAMES[screen]} ${ARGOT_TIP}`);
  else shell.error(`E492: Not an editor command: ${typed} ${ARGOT_TIP}`);
}
