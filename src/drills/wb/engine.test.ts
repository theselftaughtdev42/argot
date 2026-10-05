import { describe, expect, it } from "vitest";
import {
  HITS_TO_WIN,
  MAX_SPAWN_PRESSES,
  MIN_SPAWN_PRESSES,
  applyMotion,
  createRun,
  move,
  spawnTarget,
  wordStarts,
  type Motion,
  type Passage,
  type Position,
  type Random,
  type RunState,
} from "./engine";

/** A random source that returns `values` in turn, cycling. */
function sequence(...values: number[]): Random {
  let i = 0;
  return () => values[i++ % values.length]!;
}

// Each spawn draws twice: the direction (< 0.5 is forward) then the distance.
const FORWARD = 0;
const BACK = 0.5;
/** The distance draw that picks `presses` presses. */
function presses(n: number): number {
  return (n - MIN_SPAWN_PRESSES) / (MAX_SPAWN_PRESSES - MIN_SPAWN_PRESSES + 1);
}

function at(line: number, col: number): Position {
  return { line, col };
}

/** The words `w` lands on, pressed from the first word to the end of the passage. */
function wordsByW(passage: Passage): string[] {
  let cursor = wordStarts(passage)[0]!;
  const landed = [cursor];
  for (;;) {
    const next = applyMotion(passage, cursor, "w");
    if (next.line === cursor.line && next.col === cursor.col) break;
    landed.push((cursor = next));
  }
  return landed.map(({ line, col }) => passage[line]!.slice(col).match(/^(\w+|[^\w\s]+)/)![0]);
}

function pressAll(passage: Passage, from: Position, motions: string): Position {
  return [...motions].reduce((cursor, motion) => applyMotion(passage, cursor, motion as Motion), from);
}

describe("word motions", () => {
  it("w stops at the start of each run of letters, digits and _", () => {
    expect(wordsByW(["foo bar_2 baz9"])).toEqual(["foo", "bar_2", "baz9"]);
  });

  it("treats a run of punctuation as its own word", () => {
    expect(wordsByW(["one, two... three-four"])).toEqual(["one", ",", "two", "...", "three", "-", "four"]);
  });

  it("splits a contraction into three words", () => {
    expect(wordsByW(["don't stop"])).toEqual(["don", "'", "t", "stop"]);
  });

  it("skips multiple spaces and leading spaces", () => {
    const passage = ["  alpha    beta", "    gamma"];
    expect(wordsByW(passage)).toEqual(["alpha", "beta", "gamma"]);
    expect(wordStarts(passage)).toEqual([at(0, 2), at(0, 11), at(1, 4)]);
  });

  it("w wraps from a line's last word to the next line's first", () => {
    const passage = ["one two.", "  three"];
    expect(applyMotion(passage, at(0, 7), "w")).toEqual(at(1, 2));
  });

  it("b wraps from a line's first word back to the previous line's last", () => {
    const passage = ["one two.", "  three"];
    expect(applyMotion(passage, at(1, 2), "b")).toEqual(at(0, 7));
    expect(pressAll(passage, at(1, 2), "bbb")).toEqual(at(0, 0));
  });

  it("b goes to the previous word's start from a word start", () => {
    expect(applyMotion(["foo bar"], at(0, 4), "b")).toEqual(at(0, 0));
  });

  it("b from mid-word goes to the current word's start", () => {
    expect(applyMotion(["foo bar"], at(0, 6), "b")).toEqual(at(0, 4));
  });

  it("w from mid-word goes to the next word's start", () => {
    expect(applyMotion(["foo bar"], at(0, 1), "w")).toEqual(at(0, 4));
  });

  it("doesn't move past either end of the passage", () => {
    const passage = ["first word", "last word."];
    expect(applyMotion(passage, at(0, 0), "b")).toEqual(at(0, 0));
    expect(applyMotion(passage, at(1, 9), "w")).toEqual(at(1, 9));
  });
});

// Thirty words over three lines, starts 0 to 29 in order.
const THIRTY = [0, 1, 2].map((line) => Array.from({ length: 10 }, (_, i) => `w${line * 10 + i}`).join(" "));
const starts = wordStarts(THIRTY);

describe("spawnTarget", () => {
  it("spawns the drawn number of presses away, forward or back, across lines", () => {
    const cursor = starts[15]!;
    for (let n = MIN_SPAWN_PRESSES; n <= MAX_SPAWN_PRESSES; n++) {
      expect(spawnTarget(THIRTY, cursor, sequence(FORWARD, presses(n)))).toEqual(starts[15 + n]);
      expect(spawnTarget(THIRTY, cursor, sequence(BACK, presses(n)))).toEqual(starts[15 - n]);
    }
  });

  it("draws 5 to 12 presses across the whole random range", () => {
    const cursor = starts[15]!;
    expect(spawnTarget(THIRTY, cursor, sequence(FORWARD, 0))).toEqual(starts[15 + MIN_SPAWN_PRESSES]);
    expect(spawnTarget(THIRTY, cursor, sequence(FORWARD, 0.9999))).toEqual(starts[15 + MAX_SPAWN_PRESSES]);
    expect(spawnTarget(THIRTY, cursor, sequence(BACK, 0.9999))).toEqual(starts[15 - MAX_SPAWN_PRESSES]);
  });

  it("flips direction when the target would run past an end", () => {
    expect(spawnTarget(THIRTY, starts[3]!, sequence(BACK, presses(8)))).toEqual(starts[11]);
    expect(spawnTarget(THIRTY, starts[26]!, sequence(FORWARD, presses(8)))).toEqual(starts[18]);
  });

  it("comes closer when neither direction has room", () => {
    // Nine words: from the middle, 12 presses fits neither way, so at most 4.
    const nine = wordStarts(["a b c", "d e f", "g h i"]);
    expect(spawnTarget(["a b c", "d e f", "g h i"], nine[4]!, sequence(FORWARD, presses(12)))).toEqual(nine[8]);
    // From the second of nine, there's more room forward.
    expect(spawnTarget(["a b c", "d e f", "g h i"], nine[1]!, sequence(BACK, presses(12)))).toEqual(nine[8]);
    // From the middle of three words, either way has room for one press: keep the drawn direction.
    const three = wordStarts(["a b c"]);
    expect(spawnTarget(["a b c"], three[1]!, sequence(BACK, presses(5)))).toEqual(three[0]);
    expect(spawnTarget(["a b c"], three[1]!, sequence(FORWARD, presses(5)))).toEqual(three[2]);
  });

  it("is always a reachable word start, never under the cursor", () => {
    const passages = [THIRTY, ["a b c", "d e f", "g h i"], ["one two"], ["don't, stop."]];
    const draws = [0, 0.2, 0.49, 0.5, 0.7, 0.9999];
    for (const passage of passages) {
      const all = wordStarts(passage);
      for (const cursor of all) {
        for (const direction of draws) {
          for (const distance of draws) {
            const target = spawnTarget(passage, cursor, sequence(direction, distance));
            expect(all).toContainEqual(target);
            expect(target).not.toEqual(cursor);
          }
        }
      }
    }
  });
});

describe("createRun", () => {
  it("starts the cursor on the first word, with no hits", () => {
    const state = createRun(["  (hello) world, again and again"], sequence(FORWARD, presses(5)));
    expect(state.cursor).toEqual(at(0, 2));
    expect(state.target).toEqual(at(0, 17));
    expect(state.hits).toBe(0);
    expect(state.status).toBe("idle");
  });
});

function stateWith(overrides: Partial<RunState>): RunState {
  return { passage: THIRTY, cursor: starts[0]!, target: starts[20]!, hits: 0, status: "idle", ...overrides };
}

describe("move", () => {
  it("moves the cursor without a hit when it misses the target", () => {
    const next = move(stateWith({ hits: 2 }), "w");
    expect(next.cursor).toEqual(starts[1]);
    expect(next.hits).toBe(2);
    expect(next.target).toEqual(starts[20]);
    expect(next.status).toBe("playing");
  });

  it("counts a hit and spawns the next target from the cursor", () => {
    const state = stateWith({ cursor: starts[14]!, target: starts[15]! });
    const next = move(state, "w", sequence(BACK, presses(5)));
    expect(next.cursor).toEqual(starts[15]);
    expect(next.hits).toBe(1);
    expect(next.target).toEqual(starts[10]);
  });

  it("completes on the last hit, keeping the final target in place", () => {
    const state = stateWith({ cursor: starts[3]!, target: starts[4]!, hits: HITS_TO_WIN - 1, status: "playing" });
    const next = move(state, "w");
    expect(next.hits).toBe(HITS_TO_WIN);
    expect(next.status).toBe("complete");
    expect(next.target).toEqual(starts[4]);
  });

  it("ignores moves once the run is complete", () => {
    const done = stateWith({ cursor: starts[4]!, target: starts[4]!, hits: HITS_TO_WIN, status: "complete" });
    expect(move(done, "w")).toEqual(done);
    expect(move(done, "b")).toEqual(done);
  });
});
