import { hitsToWin } from "../shared/hits";

export const HITS_TO_WIN = hitsToWin(15);
export const MIN_SPAWN_DISTANCE = 2;
export const MAX_SPAWN_DISTANCE = 15;

export type Digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
/** A key as the engine sees it: a digit, a line jump, or anything else. */
export type Key = Digit | "j" | "k" | "other";
export type RunStatus = "idle" | "playing" | "complete";

/** A random number in [0, 1), like Math.random. */
export type Random = () => number;

/** The lines of text a run is played on. Blank lines are allowed. */
export type Passage = readonly string[];

export interface RunState {
  passage: Passage;
  /** The cursor's line, from 0. */
  cursor: number;
  /** The target's line, from 0. */
  target: number;
  hits: number;
  status: RunStatus;
  /** The count typed so far, waiting for `j` or `k`, or null if there isn't one. */
  count: number | null;
}

/**
 * A line 2 to 15 lines from `cursor`, up or down at random. One that would
 * fall past an end flips direction, or comes closer if neither direction has
 * room, so it's always reachable and never on the cursor's line.
 * The passage must hold at least 2 lines.
 */
export function spawnTarget(passage: Passage, cursor: number, random: Random = Math.random): number {
  const room = { down: passage.length - 1 - cursor, up: cursor };
  const drawnDown = random() < 0.5;
  const distance =
    MIN_SPAWN_DISTANCE + Math.floor(random() * (MAX_SPAWN_DISTANCE - MIN_SPAWN_DISTANCE + 1));
  const fits = (down: boolean) => distance <= (down ? room.down : room.up);
  // Neither fits: come closer in whichever direction has more room, keeping the drawn one on a tie.
  const down = fits(drawnDown)
    ? drawnDown
    : fits(!drawnDown)
      ? !drawnDown
      : room.down === room.up
        ? drawnDown
        : room.down > room.up;
  const lines = Math.min(distance, down ? room.down : room.up);
  return cursor + (down ? lines : -lines);
}

/** A line in the middle third of the passage, so the first target can be up or down. */
export function startLine(passage: Passage, random: Random = Math.random): number {
  const first = Math.floor(passage.length / 3);
  const end = Math.ceil((passage.length * 2) / 3);
  return first + Math.floor(random() * (end - first));
}

/** A fresh run on `passage`, with the cursor somewhere in its middle third. */
export function createRun(passage: Passage, random: Random = Math.random): RunState {
  const cursor = startLine(passage, random);
  return {
    passage,
    cursor,
    target: spawnTarget(passage, cursor, random),
    hits: 0,
    status: "idle",
    count: null,
  };
}

/**
 * The run after `key`, as vim reads counts: a digit 1 to 9 starts a count and
 * any digit extends it, `j` or `k` jumps that many lines (stopping at the
 * first or last line) and does nothing without one, and any other key drops
 * it. The run starts on the first jump, and landing on the target is a hit.
 */
export function press(state: RunState, key: Key, random: Random = Math.random): RunState {
  if (state.status === "complete") return state;

  if (key === "j" || key === "k") {
    if (state.count === null) return state;
    const step = key === "j" ? state.count : -state.count;
    const cursor = Math.max(0, Math.min(state.passage.length - 1, state.cursor + step));
    const hit = cursor === state.target;
    const hits = hit ? state.hits + 1 : state.hits;
    const won = hit && hits >= HITS_TO_WIN;
    return {
      passage: state.passage,
      cursor,
      target: hit && !won ? spawnTarget(state.passage, cursor, random) : state.target,
      hits,
      status: won ? "complete" : "playing",
      count: null,
    };
  }

  if (key === "other") return state.count === null ? state : { ...state, count: null };

  // A 0 with no count pending is vim's "start of line", not a count.
  if (key === "0" && state.count === null) return state;
  return { ...state, count: (state.count ?? 0) * 10 + Number(key) };
}
