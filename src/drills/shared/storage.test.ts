import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let backing: Map<string, string>;

function memoryStorage(): Storage {
  return {
    get length() {
      return backing.size;
    },
    clear: () => backing.clear(),
    getItem: (key) => backing.get(key) ?? null,
    key: (index) => [...backing.keys()][index] ?? null,
    removeItem: (key) => void backing.delete(key),
    setItem: (key, value) => void backing.set(key, String(value)),
  };
}

// Fresh module instance over the same backing store, like a page reload.
async function loadStorage() {
  vi.resetModules();
  return import("./storage");
}

beforeEach(() => {
  backing = new Map();
  vi.stubGlobal("localStorage", memoryStorage());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("best-time storage", () => {
  it("reports no best time when nothing is stored", async () => {
    const { getBestTime } = await loadStorage();
    expect(getBestTime("hjkl")).toBeNull();
  });

  it("stores a first-ever run as the best and reports it as new", async () => {
    const { getBestTime, saveBestTimeIfBetter } = await loadStorage();
    expect(saveBestTimeIfBetter("hjkl", 14320)).toBe(true);
    expect(getBestTime("hjkl")).toBe(14320);
  });

  it("namespaces the key to the drill", async () => {
    const { saveBestTimeIfBetter } = await loadStorage();
    saveBestTimeIfBetter("hjkl", 14320);
    expect([...backing.keys()]).toEqual(["hjkl:bestTimeMs"]);
  });

  it("keeps each drill's best time separate", async () => {
    const { getBestTime, isNewBest, saveBestTimeIfBetter } = await loadStorage();
    saveBestTimeIfBetter("hjkl", 14320);
    expect(getBestTime("wb")).toBeNull();
    expect(isNewBest("wb", 20000)).toBe(true);

    expect(saveBestTimeIfBetter("wb", 20000)).toBe(true);
    expect(getBestTime("hjkl")).toBe(14320);
    expect(getBestTime("wb")).toBe(20000);
    expect(saveBestTimeIfBetter("hjkl", 15000)).toBe(false);
    expect([...backing.keys()].sort()).toEqual(["hjkl:bestTimeMs", "wb:bestTimeMs"]);
  });

  it("replaces the best and reports new when a run beats it", async () => {
    const { getBestTime, saveBestTimeIfBetter } = await loadStorage();
    saveBestTimeIfBetter("hjkl", 14320);
    expect(saveBestTimeIfBetter("hjkl", 12000)).toBe(true);
    expect(getBestTime("hjkl")).toBe(12000);
  });

  it("keeps the best and reports not new when a run is slower or ties", async () => {
    const { getBestTime, saveBestTimeIfBetter } = await loadStorage();
    saveBestTimeIfBetter("hjkl", 12000);
    expect(saveBestTimeIfBetter("hjkl", 15000)).toBe(false);
    expect(saveBestTimeIfBetter("hjkl", 12000)).toBe(false);
    expect(getBestTime("hjkl")).toBe(12000);
  });

  it("checks whether a run would be a new best without saving it", async () => {
    const { getBestTime, isNewBest, saveBestTimeIfBetter } = await loadStorage();
    expect(isNewBest("hjkl", 14320)).toBe(true);
    expect(getBestTime("hjkl")).toBeNull();
    expect(backing.size).toBe(0);

    saveBestTimeIfBetter("hjkl", 14320);
    expect(isNewBest("hjkl", 12000)).toBe(true);
    expect(isNewBest("hjkl", 14320)).toBe(false);
    expect(isNewBest("hjkl", 15000)).toBe(false);
    expect(getBestTime("hjkl")).toBe(14320);
  });

  it("survives a page reload", async () => {
    const before = await loadStorage();
    before.saveBestTimeIfBetter("hjkl", 14320);
    const after = await loadStorage();
    expect(after.getBestTime("hjkl")).toBe(14320);
  });

  it("treats a corrupt stored value as no best, so the next run becomes the best", async () => {
    backing.set("hjkl:bestTimeMs", "not a number");
    const { getBestTime, saveBestTimeIfBetter } = await loadStorage();
    expect(getBestTime("hjkl")).toBeNull();
    expect(saveBestTimeIfBetter("hjkl", 20000)).toBe(true);
    expect(getBestTime("hjkl")).toBe(20000);
  });

  it("degrades gracefully when localStorage is unavailable", async () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("SecurityError");
      },
    });
    const { getBestTime, saveBestTimeIfBetter } = await loadStorage();
    expect(getBestTime("hjkl")).toBeNull();
    expect(() => saveBestTimeIfBetter("hjkl", 14320)).not.toThrow();
  });
});
