// Every theme's tokens load up front (they're only custom properties), then
// the components that read them.
import "./themes/dusk.css";
import "./argot.css";

/** A theme: a token file at `themes/<name>.css` plus an entry in `THEMES`. */
export interface ThemeDefinition {
  /** Human-readable name. */
  label: string;
  /** Loads the theme's font. Called each time the theme is applied, so it's lazy per theme. */
  loadFont?: () => Promise<unknown>;
}

export const THEMES: Record<string, ThemeDefinition> = {
  dusk: {
    label: "Dusk",
    loadFont: () =>
      Promise.all([
        import("@fontsource/jetbrains-mono/400.css"),
        import("@fontsource/jetbrains-mono/700.css"),
      ]),
  },
};

export const DEFAULT_THEME = "dusk";
const STORAGE_KEY = "argot:theme";

export function listThemes(): string[] {
  return Object.keys(THEMES);
}

function isTheme(name: string): boolean {
  return Object.hasOwn(THEMES, name);
}

/** Applies a theme by name and remembers it. Returns false, changing nothing, if there's no such theme. */
export function applyTheme(name: string): boolean {
  if (!isTheme(name)) return false;
  // A font that fails to load leaves the token's fallback stack in place.
  THEMES[name].loadFont?.().catch(() => {});
  document.documentElement.dataset.theme = name;
  try {
    localStorage.setItem(STORAGE_KEY, name);
  } catch {
    // Storage unavailable: the theme still applies for this visit.
  }
  return true;
}

/** Applies the saved theme, or the default if none is saved or it no longer exists. Call once on startup. */
export function initTheme(): void {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage unavailable: fall back to the default.
  }
  applyTheme(saved !== null && isTheme(saved) ? saved : DEFAULT_THEME);
}
