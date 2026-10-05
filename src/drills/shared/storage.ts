// Namespaced by drill (`<drill>:bestTimeMs`) so every drill can persist its
// own best time under the same localStorage without colliding.
function bestTimeKey(drill: string): string {
  return `${drill}:bestTimeMs`;
}

export function getBestTime(drill: string): number | null {
  try {
    const raw = localStorage.getItem(bestTimeKey(drill));
    if (raw === null) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function setBestTime(drill: string, ms: number): void {
  try {
    localStorage.setItem(bestTimeKey(drill), String(ms));
  } catch {
    // localStorage unavailable (private mode, disabled storage, ...); best
    // time just won't persist this session.
  }
}

/** Whether `ms` would become `drill`'s new best: there's no best yet or it beats it. Saves nothing. */
export function isNewBest(drill: string, ms: number): boolean {
  const current = getBestTime(drill);
  return current === null || ms < current;
}

/** Persists `ms` as `drill`'s new best if there's no best yet or it beats it. Returns whether it did. */
export function saveBestTimeIfBetter(drill: string, ms: number): boolean {
  if (isNewBest(drill, ms)) {
    setBestTime(drill, ms);
    return true;
  }
  return false;
}
