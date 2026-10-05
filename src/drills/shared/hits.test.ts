import { afterEach, describe, expect, it, vi } from "vitest";
import { hitsToWin } from "./hits";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("hitsToWin", () => {
  it("uses the drill's default when no override is set", () => {
    vi.stubEnv("MODE", "development");
    expect(hitsToWin(15)).toBe(15);
  });

  it("uses VITE_DRILL_HITS in dev mode", () => {
    vi.stubEnv("MODE", "development");
    vi.stubEnv("VITE_DRILL_HITS", "3");
    expect(hitsToWin(15)).toBe(3);
  });

  it("ignores VITE_DRILL_HITS outside dev mode", () => {
    vi.stubEnv("VITE_DRILL_HITS", "3");
    vi.stubEnv("MODE", "test");
    expect(hitsToWin(15)).toBe(15);
    vi.stubEnv("MODE", "production");
    expect(hitsToWin(15)).toBe(15);
  });

  it("ignores VITE_DRILL_HITS unless it's a positive integer", () => {
    vi.stubEnv("MODE", "development");
    for (const value of ["0", "-2", "2.5", "lots", ""]) {
      vi.stubEnv("VITE_DRILL_HITS", value);
      expect(hitsToWin(15)).toBe(15);
    }
  });
});
