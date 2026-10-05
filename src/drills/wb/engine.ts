import { hitsToWin } from "../shared/hits";

export const HITS_TO_WIN = hitsToWin(15);
export const MIN_SPAWN_PRESSES = 5;
export const MAX_SPAWN_PRESSES = 12;

export type Motion = "w" | "b";
export type RunStatus = "idle" | "playing" | "complete";

/** A random number in [0, 1), like Math.random. */
export type Random = () => number;

/** The lines of text a run is played on. */
export type Passage = readonly string[];

export interface Position {
  line: number;
  col: number;
}

export interface RunState {
  passage: Passage;
  cursor: Position;
  target: Position;
  hits: number;
  status: RunStatus;
}

type CharClass = "blank" | "keyword" | "other";

/**
 * Vim's character classes for word motions: blanks, keyword characters
 * (letters, digits and `_`, as the default 'iskeyword') and everything else.
 */
function classOf(char: string): CharClass {
  if (char === " " || char === "\t") return "blank";
  return /[\p{L}\p{N}_]/u.test(char) ? "keyword" : "other";
}

/** Whether a word starts at `col`: a non-blank whose class differs from the character before it. */
function isWordStart(line: string, col: number): boolean {
  const cls = classOf(line[col]!);
  return cls !== "blank" && (col === 0 || classOf(line[col - 1]!) !== cls);
}

/** Every word start in the passage, in reading order. */
export function wordStarts(passage: Passage): Position[] {
  const starts: Position[] = [];
  passage.forEach((text, line) => {
    for (let col = 0; col < text.length; col++) {
      if (isWordStart(text, col)) starts.push({ line, col });
    }
  });
  return starts;
}

/** The end (exclusive) of the word starting at `start`. */
export function wordEnd(passage: Passage, start: Position): number {
  const text = passage[start.line]!;
  const cls = classOf(text[start.col]!);
  let col = start.col + 1;
  while (col < text.length && classOf(text[col]!) === cls) col++;
  return col;
}

function compare(a: Position, b: Position): number {
  return a.line - b.line || a.col - b.col;
}

function positionsEqual(a: Position, b: Position): boolean {
  return compare(a, b) === 0;
}

/**
 * Where `motion` takes the cursor, as in vim: `w` to the next word start, `b`
 * to the current word's start if mid-word, otherwise the previous word's.
 * Both cross lines, and neither moves past the passage's ends.
 */
export function applyMotion(passage: Passage, cursor: Position, motion: Motion): Position {
  const starts = wordStarts(passage);
  const next =
    motion === "w"
      ? starts.find((start) => compare(start, cursor) > 0)
      : starts.findLast((start) => compare(start, cursor) < 0);
  return next ?? cursor;
}

/**
 * A word start 5 to 12 `w`/`b` presses from `cursor`, in a random direction.
 * One that would run past an end flips direction, or comes closer if neither
 * direction has room, so it's always reachable and never on the cursor.
 * `cursor` must be on a word start, and the passage must hold at least 2 words.
 */
export function spawnTarget(passage: Passage, cursor: Position, random: Random = Math.random): Position {
  const starts = wordStarts(passage);
  const index = starts.findIndex((start) => positionsEqual(start, cursor));
  const room = { forward: starts.length - 1 - index, back: index };
  const drawnForward = random() < 0.5;
  const presses = MIN_SPAWN_PRESSES + Math.floor(random() * (MAX_SPAWN_PRESSES - MIN_SPAWN_PRESSES + 1));
  const fits = (forward: boolean) => presses <= (forward ? room.forward : room.back);
  // Neither fits: come closer in whichever direction has more room, keeping the drawn one on a tie.
  const forward = fits(drawnForward)
    ? drawnForward
    : fits(!drawnForward)
      ? !drawnForward
      : room.forward === room.back
        ? drawnForward
        : room.forward > room.back;
  const distance = Math.min(presses, forward ? room.forward : room.back);
  return starts[index + (forward ? distance : -distance)]!;
}

/** A fresh run on `passage`, with the cursor on its first word, as when vim opens a file. */
export function createRun(passage: Passage, random: Random = Math.random): RunState {
  const cursor = wordStarts(passage)[0]!;
  return {
    passage,
    cursor,
    target: spawnTarget(passage, cursor, random),
    hits: 0,
    status: "idle",
  };
}

export function move(state: RunState, motion: Motion, random: Random = Math.random): RunState {
  if (state.status === "complete") return state;

  const cursor = applyMotion(state.passage, state.cursor, motion);
  const hit = positionsEqual(cursor, state.target);
  const hits = hit ? state.hits + 1 : state.hits;
  const won = hit && hits >= HITS_TO_WIN;

  return {
    passage: state.passage,
    cursor,
    target: hit && !won ? spawnTarget(state.passage, cursor, random) : state.target,
    hits,
    status: won ? "complete" : "playing",
  };
}
