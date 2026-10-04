export const BOARD_SIZE = 10;
export const HITS_TO_WIN = devHitsOverride() ?? 15;
export const MIN_SPAWN_DISTANCE = 5;

/**
 * Dev-only: set VITE_HJKL_HITS (e.g. in .env.local) to shorten runs while
 * running `pnpm dev`. Ignored in builds and tests.
 */
function devHitsOverride(): number | null {
  if (import.meta.env.MODE !== "development") return null;
  const hits = Number(import.meta.env.VITE_HJKL_HITS);
  return Number.isInteger(hits) && hits > 0 ? hits : null;
}

export type Direction = "h" | "j" | "k" | "l";
export type RunStatus = "idle" | "playing" | "complete";

export interface Position {
  x: number;
  y: number;
}

export interface RunState {
  cursor: Position;
  target: Position;
  hits: number;
  status: RunStatus;
}

const DELTAS: Record<Direction, Position> = {
  h: { x: -1, y: 0 },
  l: { x: 1, y: 0 },
  k: { x: 0, y: -1 },
  j: { x: 0, y: 1 },
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function positionsEqual(a: Position, b: Position): boolean {
  return a.x === b.x && a.y === b.y;
}

function manhattanDistance(a: Position, b: Position): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function randomCell(): Position {
  return {
    x: Math.floor(Math.random() * BOARD_SIZE),
    y: Math.floor(Math.random() * BOARD_SIZE),
  };
}

/** Picks a cell at least MIN_SPAWN_DISTANCE away from `cursor`, never on it. */
export function spawnTarget(cursor: Position): Position {
  let candidate = randomCell();
  while (
    positionsEqual(candidate, cursor) ||
    manhattanDistance(candidate, cursor) < MIN_SPAWN_DISTANCE
  ) {
    candidate = randomCell();
  }
  return candidate;
}

export function createRun(): RunState {
  const center = Math.floor(BOARD_SIZE / 2);
  const cursor: Position = { x: center, y: center };
  return {
    cursor,
    target: spawnTarget(cursor),
    hits: 0,
    status: "idle",
  };
}

export function move(state: RunState, direction: Direction): RunState {
  if (state.status === "complete") {
    return state;
  }

  const delta = DELTAS[direction];
  const nextCursor: Position = {
    x: clamp(state.cursor.x + delta.x, 0, BOARD_SIZE - 1),
    y: clamp(state.cursor.y + delta.y, 0, BOARD_SIZE - 1),
  };

  const hit = positionsEqual(nextCursor, state.target);
  const hits = hit ? state.hits + 1 : state.hits;
  const won = hit && hits >= HITS_TO_WIN;

  return {
    cursor: nextCursor,
    target: hit && !won ? spawnTarget(nextCursor) : state.target,
    hits,
    status: won ? "complete" : "playing",
  };
}
