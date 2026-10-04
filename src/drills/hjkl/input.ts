import type { Direction } from "./engine";

const DIRECTIONS: ReadonlySet<string> = new Set<Direction>(["h", "j", "k", "l"]);

/**
 * The move a keydown asks for, if any. Ignores key-repeat events (holding a
 * key down) and every key that isn't h/j/k/l, including the arrow keys.
 */
export function directionFor(event: Pick<KeyboardEvent, "key" | "repeat">): Direction | null {
  if (event.repeat) return null;
  return DIRECTIONS.has(event.key) ? (event.key as Direction) : null;
}
