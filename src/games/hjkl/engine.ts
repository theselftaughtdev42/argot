export const GRID_SIZE = 10;
export const WIN_TOUCHES = 20;
export const MIN_SPAWN_DISTANCE = 5;

export type Direction = "h" | "j" | "k" | "l";
export type GameStatus = "idle" | "playing" | "complete";

export interface Position {
  x: number;
  y: number;
}

export interface GameState {
  cursor: Position;
  target: Position;
  touches: number;
  status: GameStatus;
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
    x: Math.floor(Math.random() * GRID_SIZE),
    y: Math.floor(Math.random() * GRID_SIZE),
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

export function createGame(): GameState {
  const center = Math.floor(GRID_SIZE / 2);
  const cursor: Position = { x: center, y: center };
  return {
    cursor,
    target: spawnTarget(cursor),
    touches: 0,
    status: "idle",
  };
}

export function move(state: GameState, direction: Direction): GameState {
  if (state.status === "complete") {
    return state;
  }

  const delta = DELTAS[direction];
  const nextCursor: Position = {
    x: clamp(state.cursor.x + delta.x, 0, GRID_SIZE - 1),
    y: clamp(state.cursor.y + delta.y, 0, GRID_SIZE - 1),
  };

  const hit = positionsEqual(nextCursor, state.target);
  const touches = hit ? state.touches + 1 : state.touches;
  const won = hit && touches >= WIN_TOUCHES;

  return {
    cursor: nextCursor,
    target: hit && !won ? spawnTarget(nextCursor) : state.target,
    touches,
    status: won ? "complete" : "playing",
  };
}
