/**
 * How many hits a run of a drill takes: `defaultHits`, unless overridden.
 *
 * Dev-only: set VITE_DRILL_HITS (e.g. in .env.local) to a positive integer to
 * shorten runs of every drill while running `pnpm dev`. Ignored in builds and
 * tests.
 */
export function hitsToWin(defaultHits: number): number {
  if (import.meta.env.MODE !== "development") return defaultHits;
  const hits = Number(import.meta.env.VITE_DRILL_HITS);
  return Number.isInteger(hits) && hits > 0 ? hits : defaultHits;
}
