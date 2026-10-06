import { describe, expect, it } from "vitest";
import {
  HITS_TO_WIN,
  MAX_SPAWN_DISTANCE,
  MIN_SPAWN_DISTANCE,
  createRun,
  press,
  spawnTarget,
  startLine,
  type Key,
  type Passage,
  type Random,
  type RunState,
} from "./engine";

/** A random source that returns `values` in turn, cycling. */
function sequence(...values: number[]): Random {
  let i = 0;
  return () => values[i++ % values.length]!;
}

// Each spawn draws twice: the direction (< 0.5 is down) then the distance.
const DOWN = 0;
const UP = 0.5;
/** The distance draw that picks `n` lines. */
function lines(n: number): number {
  return (n - MIN_SPAWN_DISTANCE) / (MAX_SPAWN_DISTANCE - MIN_SPAWN_DISTANCE + 1);
}

/** A passage of `n` lines, with every fourth one blank. */
function passageOf(n: number): Passage {
  return Array.from({ length: n }, (_, i) => (i % 4 === 3 ? "" : `line ${i}`));
}

const FORTY = passageOf(40);
const TWENTY = passageOf(20);

describe("spawnTarget", () => {
  it("spawns the drawn number of lines away, down or up", () => {
    for (let n = MIN_SPAWN_DISTANCE; n <= MAX_SPAWN_DISTANCE; n++) {
      expect(spawnTarget(FORTY, 20, sequence(DOWN, lines(n)))).toBe(20 + n);
      expect(spawnTarget(FORTY, 20, sequence(UP, lines(n)))).toBe(20 - n);
    }
  });

  it("draws 2 to 15 lines across the whole random range", () => {
    expect(spawnTarget(FORTY, 20, sequence(DOWN, 0))).toBe(20 + MIN_SPAWN_DISTANCE);
    expect(spawnTarget(FORTY, 20, sequence(DOWN, 0.9999))).toBe(20 + MAX_SPAWN_DISTANCE);
    expect(spawnTarget(FORTY, 20, sequence(UP, 0.9999))).toBe(20 - MAX_SPAWN_DISTANCE);
  });

  it("flips direction when the target would fall past the top or bottom", () => {
    expect(spawnTarget(TWENTY, 3, sequence(UP, lines(8)))).toBe(11);
    expect(spawnTarget(TWENTY, 16, sequence(DOWN, lines(8)))).toBe(8);
  });

  it("comes closer when neither direction has room", () => {
    // From line 10 of 20, 15 lines fits neither way: there's room for 9 down and 10 up.
    expect(spawnTarget(TWENTY, 10, sequence(DOWN, lines(15)))).toBe(0);
    // From the middle of 21 lines, either way has room for 10: keep the drawn direction.
    const odd = passageOf(21);
    expect(spawnTarget(odd, 10, sequence(DOWN, lines(15)))).toBe(20);
    expect(spawnTarget(odd, 10, sequence(UP, lines(15)))).toBe(0);
  });

  it("is always 2 to 15 lines away on a 20-line passage, never on the cursor's line", () => {
    const draws = [0, 0.2, 0.49, 0.5, 0.7, 0.9999];
    for (let cursor = 0; cursor < TWENTY.length; cursor++) {
      for (const direction of draws) {
        for (const distance of draws) {
          const target = spawnTarget(TWENTY, cursor, sequence(direction, distance));
          expect(target).toBeGreaterThanOrEqual(0);
          expect(target).toBeLessThan(TWENTY.length);
          expect(Math.abs(target - cursor)).toBeGreaterThanOrEqual(MIN_SPAWN_DISTANCE);
          expect(Math.abs(target - cursor)).toBeLessThanOrEqual(MAX_SPAWN_DISTANCE);
        }
      }
    }
  });

  it("can land on a blank line", () => {
    expect(TWENTY[spawnTarget(TWENTY, 5, sequence(DOWN, lines(2)))]).toBe("");
  });
});

describe("startLine", () => {
  it("is in the middle third of the passage", () => {
    expect(startLine(TWENTY, () => 0)).toBe(6);
    expect(startLine(TWENTY, () => 0.9999)).toBe(13);
    expect(startLine(passageOf(21), () => 0)).toBe(7);
    expect(startLine(passageOf(21), () => 0.9999)).toBe(13);
  });
});

describe("createRun", () => {
  it("starts the cursor in the middle third, with a target, no hits and no count", () => {
    const state = createRun(TWENTY, sequence(0, DOWN, lines(5)));
    expect(state).toEqual({ passage: TWENTY, cursor: 6, target: 11, hits: 0, status: "idle", count: null });
  });
});

function stateWith(overrides: Partial<RunState>): RunState {
  return { passage: TWENTY, cursor: 10, target: 2, hits: 0, status: "idle", count: null, ...overrides };
}

function pressAll(state: RunState, keys: string, random?: Random): RunState {
  return [...keys].reduce((next, key) => press(next, key as Key, random), state);
}

describe("counts", () => {
  it("a digit 1 to 9 starts a count and further digits, 0 included, extend it", () => {
    expect(pressAll(stateWith({}), "1").count).toBe(1);
    expect(pressAll(stateWith({}), "9").count).toBe(9);
    expect(pressAll(stateWith({}), "12").count).toBe(12);
    expect(pressAll(stateWith({}), "10").count).toBe(10);
  });

  it("a 0 with no count pending does nothing", () => {
    const state = stateWith({});
    expect(press(state, "0")).toBe(state);
    expect(pressAll(state, "05").count).toBe(5);
  });

  it("<count>j moves down and <count>k moves up that many lines, clearing the count", () => {
    const down = pressAll(stateWith({}), "5j");
    expect(down.cursor).toBe(15);
    expect(down.count).toBeNull();
    const up = pressAll(stateWith({}), "3k");
    expect(up.cursor).toBe(7);
    expect(up.count).toBeNull();
  });

  it("multi-digit counts jump as far as they say", () => {
    expect(pressAll(stateWith({ cursor: 0, target: 19 }), "12j").cursor).toBe(12);
  });

  it("1j and 1k move one line", () => {
    expect(pressAll(stateWith({}), "1j").cursor).toBe(11);
    expect(pressAll(stateWith({}), "1k").cursor).toBe(9);
  });

  it("a bare j or k does nothing", () => {
    const state = stateWith({});
    expect(press(state, "j")).toBe(state);
    expect(press(state, "k")).toBe(state);
  });

  it("any other key drops a pending count", () => {
    const dropped = pressAll(stateWith({}), "5");
    expect(press(dropped, "other").count).toBeNull();
    expect(press(press(dropped, "other"), "j").cursor).toBe(10);
  });

  it("another key with no count pending changes nothing", () => {
    const state = stateWith({});
    expect(press(state, "other")).toBe(state);
  });

  it("stops on the first or last line when the count runs past it", () => {
    expect(pressAll(stateWith({ target: 5 }), "50k").cursor).toBe(0);
    expect(pressAll(stateWith({ target: 5 }), "50j").cursor).toBe(19);
  });
});

describe("press", () => {
  it("starts the run on the first jump, not the first digit", () => {
    const counted = pressAll(stateWith({}), "5");
    expect(counted.status).toBe("idle");
    expect(press(counted, "j").status).toBe("playing");
  });

  it("starts the run on a jump that hits an end without moving", () => {
    expect(pressAll(stateWith({ cursor: 0, target: 5 }), "3k").status).toBe("playing");
  });

  it("moves the cursor without a hit when it misses the target", () => {
    const next = pressAll(stateWith({ hits: 2 }), "5k");
    expect(next.cursor).toBe(5);
    expect(next.hits).toBe(2);
    expect(next.target).toBe(2);
  });

  it("counts a hit and spawns the next target from the cursor", () => {
    const next = pressAll(stateWith({}), "8k", sequence(DOWN, lines(4)));
    expect(next.cursor).toBe(2);
    expect(next.hits).toBe(1);
    expect(next.target).toBe(6);
  });

  it("counts a hit after a miss and a correction", () => {
    const missed = pressAll(stateWith({}), "7k");
    expect(missed.hits).toBe(0);
    expect(pressAll(missed, "1k").hits).toBe(1);
  });

  it("completes on the last hit, keeping the final target in place", () => {
    const next = pressAll(stateWith({ hits: HITS_TO_WIN - 1, status: "playing" }), "8k");
    expect(next.hits).toBe(HITS_TO_WIN);
    expect(next.status).toBe("complete");
    expect(next.target).toBe(2);
  });

  it("ignores keys once the run is complete", () => {
    const done = stateWith({ cursor: 2, target: 2, hits: HITS_TO_WIN, status: "complete" });
    for (const key of ["5", "j", "k", "other"] as Key[]) expect(press(done, key)).toBe(done);
  });
});
