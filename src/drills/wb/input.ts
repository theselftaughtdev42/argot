import type { Motion } from "./engine";

const MOTIONS: ReadonlySet<string> = new Set<Motion>(["w", "b"]);

/**
 * The motion a keydown asks for, if any. Ignores key-repeat events (holding a
 * key down) and every key that isn't w/b, including digits, so counts like
 * `3w` move one word at a time.
 */
export function motionFor(event: Pick<KeyboardEvent, "key" | "repeat">): Motion | null {
  if (event.repeat) return null;
  return MOTIONS.has(event.key) ? (event.key as Motion) : null;
}
