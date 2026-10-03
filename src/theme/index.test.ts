// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyTheme, DEFAULT_THEME, initTheme, listThemes, THEMES } from ".";

function appliedTheme(): string | undefined {
  return document.documentElement.dataset.theme;
}

function throwingStorage(): Storage {
  const fail = () => {
    throw new DOMException("storage disabled", "SecurityError");
  };
  return {
    length: 0,
    clear: fail,
    getItem: fail,
    key: fail,
    removeItem: fail,
    setItem: fail,
  };
}

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("theme registry", () => {
  it("lists every registered theme, including the default", () => {
    expect(listThemes()).toEqual(Object.keys(THEMES));
    expect(listThemes()).toContain(DEFAULT_THEME);
  });

  it("applies the default theme when nothing is saved", () => {
    initTheme();
    expect(appliedTheme()).toBe("dusk");
  });

  it("restores a saved theme", () => {
    THEMES.night = { label: "Night" };
    try {
      localStorage.setItem("argot:theme", "night");
      initTheme();
      expect(appliedTheme()).toBe("night");
    } finally {
      delete THEMES.night;
    }
  });

  it("falls back to the default when the saved theme no longer exists", () => {
    localStorage.setItem("argot:theme", "solarized");
    initTheme();
    expect(appliedTheme()).toBe(DEFAULT_THEME);
    expect(localStorage.getItem("argot:theme")).toBe(DEFAULT_THEME);
  });

  it("doesn't treat inherited object keys as saved themes", () => {
    localStorage.setItem("argot:theme", "toString");
    initTheme();
    expect(appliedTheme()).toBe(DEFAULT_THEME);
  });

  it("refuses an unknown theme and changes nothing", () => {
    applyTheme("dusk");
    expect(applyTheme("solarized")).toBe(false);
    expect(appliedTheme()).toBe("dusk");
    expect(localStorage.getItem("argot:theme")).toBe("dusk");
  });

  it("saves the applied theme's name", () => {
    expect(applyTheme("dusk")).toBe(true);
    expect(localStorage.getItem("argot:theme")).toBe("dusk");
  });

  it("still applies themes when storage throws", () => {
    vi.stubGlobal("localStorage", throwingStorage());
    expect(() => initTheme()).not.toThrow();
    expect(appliedTheme()).toBe(DEFAULT_THEME);
    expect(applyTheme("dusk")).toBe(true);
    expect(appliedTheme()).toBe("dusk");
  });

  it("loads the theme's font when it's applied", () => {
    const loadFont = vi.spyOn(THEMES.dusk, "loadFont").mockResolvedValue(undefined);
    applyTheme("dusk");
    expect(loadFont).toHaveBeenCalledOnce();
  });

  it("still applies the theme when its font fails to load", () => {
    vi.spyOn(THEMES.dusk, "loadFont").mockRejectedValue(new Error("offline"));
    expect(applyTheme("dusk")).toBe(true);
    expect(appliedTheme()).toBe("dusk");
  });
});
