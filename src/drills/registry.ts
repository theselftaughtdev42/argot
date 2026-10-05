import { mountHjklDrill } from "./hjkl/app";
import { help as hjklHelp } from "./hjkl/renderer";
import { mountWbDrill } from "./wb/app";
import { help as wbHelp } from "./wb/renderer";

/** The screens of a drill the shell tells apart to pick hints and quit rules. */
export type DrillScreen = "play" | "results";

/**
 * What a drill's help page says. The shell lays every drill's out the same
 * way, like a vim help file with DESCRIPTION, KEYS and GOAL. In the summary,
 * description and goal, wrap a key in backticks (e.g. `h`) to highlight it
 * like the keys under KEYS.
 */
export interface Help {
  /** The drill's name, as typed after `vim`. */
  name: string;
  /** What the drill teaches, shown on the first line after the drill's tag. */
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
  /** Whether the current run has started, which the first move does. */
  hasStarted(): boolean;
  /** Saves the finished run shown on results, if it's a new best. Does nothing elsewhere. */
  save(): void;
  /** Stops the drill for good: no more keys, frames or saves. */
  destroy(): void;
}

/**
 * Mounts a drill into `root`, which the drill owns outright, starting on its
 * play screen. The drill calls `onScreenChange` whenever it moves to another
 * screen, including the first.
 */
export type MountDrill = (
  root: HTMLElement,
  onScreenChange: (screen: DrillScreen) => void,
) => DrillSession;

export interface Drill {
  mount: MountDrill;
  /** What the shell shows on the drill's help page. */
  help: Help;
}

/** Every drill the shell can list with `ls` and launch with `vim <name>`. */
export const drills = new Map<string, Drill>([
  ["hjkl", { mount: mountHjklDrill, help: hjklHelp }],
  ["wb", { mount: mountWbDrill, help: wbHelp }],
]);
