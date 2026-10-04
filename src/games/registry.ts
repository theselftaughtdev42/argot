import { mountHjklGame } from "./hjkl/app";

/** The in-game screens the shell tells apart to pick hints and quit rules. */
export type GameScreen = "instructions" | "play" | "results";

/** The shell's handle on a running game. */
export interface GameSession {
  /**
   * A key meant for the game. The shell owns the only keydown listener and
   * forwards keys here, except Ctrl/Cmd/Alt combinations and keys typed on its
   * command line. Games must not listen on `window` themselves.
   */
  handleKey(event: KeyboardEvent): void;
  /** Saves the finished run shown on results, if it's a new best. Does nothing elsewhere. */
  save(): void;
  /** Stops the game for good: no more keys, frames or saves. */
  destroy(): void;
}

/**
 * Mounts a game into `root`, which the game owns outright. The game calls
 * `onScreenChange` whenever it moves to another screen.
 */
export type MountGame = (
  root: HTMLElement,
  onScreenChange: (screen: GameScreen) => void,
) => GameSession;

/** Every game the shell can list with `ls` and launch with `vim <name>`. */
export const games = new Map<string, MountGame>([["hjkl", mountHjklGame]]);
