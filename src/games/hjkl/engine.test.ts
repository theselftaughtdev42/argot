import { describe, expect, it } from "vitest";
import {
  GRID_SIZE,
  MIN_SPAWN_DISTANCE,
  WIN_TOUCHES,
  createGame,
  move,
  spawnTarget,
  type GameState,
} from "./engine";

const MAX_INDEX = GRID_SIZE - 1;

function stateWith(overrides: Partial<GameState>): GameState {
  return {
    cursor: { x: 0, y: 0 },
    target: { x: GRID_SIZE - 1, y: GRID_SIZE - 1 },
    touches: 0,
    status: "idle",
    ...overrides,
  };
}

describe("createGame", () => {
  it("starts the cursor at the grid center with no touches", () => {
    const state = createGame();
    const center = Math.floor(GRID_SIZE / 2);
    expect(state.cursor).toEqual({ x: center, y: center });
    expect(state.touches).toBe(0);
    expect(state.status).toBe("idle");
  });

  it("never spawns the target on the cursor's cell", () => {
    for (let i = 0; i < 200; i++) {
      const state = createGame();
      expect(state.target).not.toEqual(state.cursor);
    }
  });
});

describe("spawnTarget", () => {
  it("always spawns at least MIN_SPAWN_DISTANCE away and never on the cursor", () => {
    const cursor = { x: 5, y: 5 };
    for (let i = 0; i < 500; i++) {
      const target = spawnTarget(cursor);
      expect(target).not.toEqual(cursor);
      const distance = Math.abs(target.x - cursor.x) + Math.abs(target.y - cursor.y);
      expect(distance).toBeGreaterThanOrEqual(MIN_SPAWN_DISTANCE);
      expect(target.x).toBeGreaterThanOrEqual(0);
      expect(target.x).toBeLessThanOrEqual(MAX_INDEX);
      expect(target.y).toBeGreaterThanOrEqual(0);
      expect(target.y).toBeLessThanOrEqual(MAX_INDEX);
    }
  });
});

describe("move: boundary clamping", () => {
  it("is a no-op moving left off the top-left corner", () => {
    const state = stateWith({ cursor: { x: 0, y: 0 } });
    const next = move(state, "h");
    expect(next.cursor).toEqual({ x: 0, y: 0 });
  });

  it("is a no-op moving up off the top edge", () => {
    const state = stateWith({ cursor: { x: 0, y: 0 } });
    const next = move(state, "k");
    expect(next.cursor).toEqual({ x: 0, y: 0 });
  });

  it("is a no-op moving right off the bottom-right corner", () => {
    const state = stateWith({ cursor: { x: MAX_INDEX, y: MAX_INDEX } });
    const next = move(state, "l");
    expect(next.cursor).toEqual({ x: MAX_INDEX, y: MAX_INDEX });
  });

  it("is a no-op moving down off the bottom edge", () => {
    const state = stateWith({ cursor: { x: MAX_INDEX, y: MAX_INDEX } });
    const next = move(state, "j");
    expect(next.cursor).toEqual({ x: MAX_INDEX, y: MAX_INDEX });
  });

  it("does not count a boundary no-op as a touch, even when the target is one cell further off-board", () => {
    const state = stateWith({ cursor: { x: 0, y: 0 }, target: { x: 0, y: 1 }, touches: 3 });
    const next = move(state, "h");
    expect(next.cursor).toEqual({ x: 0, y: 0 });
    expect(next.touches).toBe(3);
  });
});

describe("move: touch counting and target respawn", () => {
  it("increments touches and spawns a new target when the cursor hits the target", () => {
    const state = stateWith({
      cursor: { x: 4, y: 5 },
      target: { x: 5, y: 5 },
      touches: 0,
      status: "idle",
    });
    const next = move(state, "l");
    expect(next.cursor).toEqual({ x: 5, y: 5 });
    expect(next.touches).toBe(1);
    expect(next.status).toBe("playing");
    expect(next.target).not.toEqual(next.cursor);
  });

  it("leaves touches and target unchanged when the move does not reach the target", () => {
    const state = stateWith({
      cursor: { x: 4, y: 5 },
      target: { x: 9, y: 9 },
      touches: 2,
    });
    const next = move(state, "l");
    expect(next.touches).toBe(2);
    expect(next.target).toEqual({ x: 9, y: 9 });
  });
});

describe("move: win detection", () => {
  it("flips to complete exactly on the 20th touch", () => {
    const state = stateWith({
      cursor: { x: 4, y: 5 },
      target: { x: 5, y: 5 },
      touches: WIN_TOUCHES - 1,
      status: "playing",
    });
    const next = move(state, "l");
    expect(next.touches).toBe(WIN_TOUCHES);
    expect(next.status).toBe("complete");
  });

  it("keeps the final target cell in place once complete, rather than respawning", () => {
    const state = stateWith({
      cursor: { x: 4, y: 5 },
      target: { x: 5, y: 5 },
      touches: WIN_TOUCHES - 1,
      status: "playing",
    });
    const next = move(state, "l");
    expect(next.target).toEqual({ x: 5, y: 5 });
  });

  it("ignores further moves once the game is complete", () => {
    const completed = stateWith({
      cursor: { x: 5, y: 5 },
      target: { x: 5, y: 5 },
      touches: WIN_TOUCHES,
      status: "complete",
    });
    const next = move(completed, "l");
    expect(next).toEqual(completed);
  });
});
