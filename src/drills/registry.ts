import { mountHjklDrill } from "./hjkl/app";

/** The screens of a drill the shell tells apart to pick hints and quit rules. */
export type DrillScreen = "instructions" | "play" | "results";

/**
 * What a drill's instructions screen says. The shell lays every drill's out the
 * same way, as a man page with NAME, DESCRIPTION, KEYS and GOAL.
 */
export interface Instructions {
  /** The drill's name, as typed after `vim`. */
  name: string;
  /** What the drill teaches, shown after the name under NAME. */
  summary: string;
  /** Why the skill matters in vim, and anything about how this drill plays. */
  description: string;
  /** Each key or key sequence (e.g. `dd`) and what it does. */
  keys: { keys: string; action: string }[];
  /** What finishes a run. */
  goal: string;
}

/** The shell's handle on a running drill. */
export interface DrillSession {
  /**
   * A key meant for the drill. The shell owns the only keydown listener and
   * forwards keys here, except Ctrl/Cmd/Alt combinations and keys typed on its
   * command line. Drills must not listen on `window` themselves.
   */
  handleKey(event: KeyboardEvent): void;
  /** Saves the finished run shown on results, if it's a new best. Does nothing elsewhere. */
  save(): void;
  /** Stops the drill for good: no more keys, frames or saves. */
  destroy(): void;
}

/**
 * Mounts a drill into `root`, which the drill owns outright. The drill calls
 * `onScreenChange` whenever it moves to another screen.
 */
export type MountDrill = (
  root: HTMLElement,
  onScreenChange: (screen: DrillScreen) => void,
) => DrillSession;

/** Every drill the shell can list with `ls` and launch with `vim <name>`. */
export const drills = new Map<string, MountDrill>([["hjkl", mountHjklDrill]]);
