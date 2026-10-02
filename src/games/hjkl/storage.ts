// Namespaced so future drill games can persist their own best times
// under the same localStorage without colliding with this one.
const BEST_TIME_KEY = "hjkl:bestTimeMs";

export function getBestTime(): number | null {
  try {
    const raw = localStorage.getItem(BEST_TIME_KEY);
    if (raw === null) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function setBestTime(ms: number): void {
  try {
    localStorage.setItem(BEST_TIME_KEY, String(ms));
  } catch {
    // localStorage unavailable (private mode, disabled storage, ...); best
    // time just won't persist this session.
  }
}

/** Persists `ms` as the new best if there's no best yet or it beats it. Returns whether it did. */
export function saveBestTimeIfBetter(ms: number): boolean {
  const current = getBestTime();
  if (current === null || ms < current) {
    setBestTime(ms);
    return true;
  }
  return false;
}
