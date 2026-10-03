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
    expect(getBestTime()).toBeNull();
  });

  it("stores a first-ever run as the best and reports it as new", async () => {
    const { getBestTime, saveBestTimeIfBetter } = await loadStorage();
    expect(saveBestTimeIfBetter(14320)).toBe(true);
    expect(getBestTime()).toBe(14320);
  });

  it("namespaces the key to this game", async () => {
    const { saveBestTimeIfBetter } = await loadStorage();
    saveBestTimeIfBetter(14320);
    expect([...backing.keys()]).toEqual(["hjkl:bestTimeMs"]);
  });

  it("replaces the best and reports new when a run beats it", async () => {
    const { getBestTime, saveBestTimeIfBetter } = await loadStorage();
    saveBestTimeIfBetter(14320);
    expect(saveBestTimeIfBetter(12000)).toBe(true);
    expect(getBestTime()).toBe(12000);
  });

  it("keeps the best and reports not new when a run is slower or ties", async () => {
    const { getBestTime, saveBestTimeIfBetter } = await loadStorage();
    saveBestTimeIfBetter(12000);
    expect(saveBestTimeIfBetter(15000)).toBe(false);
    expect(saveBestTimeIfBetter(12000)).toBe(false);
    expect(getBestTime()).toBe(12000);
  });

  it("survives a page reload", async () => {
    const before = await loadStorage();
    before.saveBestTimeIfBetter(14320);
    const after = await loadStorage();
    expect(after.getBestTime()).toBe(14320);
  });

  it("treats a corrupt stored value as no best, so the next run becomes the best", async () => {
    backing.set("hjkl:bestTimeMs", "not a number");
    const { getBestTime, saveBestTimeIfBetter } = await loadStorage();
    expect(getBestTime()).toBeNull();
    expect(saveBestTimeIfBetter(20000)).toBe(true);
    expect(getBestTime()).toBe(20000);
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
    expect(getBestTime()).toBeNull();
    expect(() => saveBestTimeIfBetter(14320)).not.toThrow();
  });
});
