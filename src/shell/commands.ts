import { games } from "../games/registry";

/** What a home command can do to the shell. */
export interface Shell {
  /** Shows `items` side by side under the prompt, like `ls`, replacing the last output. */
  list(items: string[]): void;
  /** Shows `text` as an error under the prompt, replacing the last output. */
  error(text: string): void;
  /** Leaves home for the game called `name`, which must be in the registry. */
  launchGame(name: string): void;
}

export interface Command {
  /** How to call it, for help text, e.g. `vim <game>`. */
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
      description: "list games",
      run(_args, shell) {
        shell.list([...games.keys()]);
      },
    },
  ],
  [
    "vim",
    {
      usage: "vim <game>",
      description: "play a game",
      run([name], shell) {
        if (!name) shell.error("vim: missing game name");
        else if (games.has(name)) shell.launchGame(name);
        else shell.error(`vim: no such game: ${name}`);
      },
    },
  ],
]);
