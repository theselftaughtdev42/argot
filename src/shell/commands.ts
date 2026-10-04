import { drills } from "../drills/registry";

/** What a home command can do to the shell. */
export interface Shell {
  /** Shows `items` side by side under the prompt, like `ls`, replacing the last output. */
  list(items: string[]): void;
  /** Shows `text` as an error under the prompt, replacing the last output. */
  error(text: string): void;
  /** Leaves home for the drill called `name`, which must be in the registry. */
  launchDrill(name: string): void;
}

export interface Command {
  /** How to call it, for help text, e.g. `vim <drill>`. */
  usage: string;
  /** One line on what it does, for help text. */
  description: string;
  /** Runs with the words typed after the command's name. */
  run(args: string[], shell: Shell): void;
}

/** Every command the home prompt understands, keyed by the name typed to run it. */
export const commands = new Map<string, Command>([
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
]);
