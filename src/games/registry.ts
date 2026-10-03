import { mountHjklGame } from "./hjkl/app";

/** The in-game screens the shell tells apart to pick hints and quit rules. */
export type GameScreen = "splash" | "play" | "results";

/** The shell's handle on a running game. */
export interface GameSession {
  /** While disabled the game ignores every key, but its clock keeps running. */
  setKeysEnabled(enabled: boolean): void;
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
