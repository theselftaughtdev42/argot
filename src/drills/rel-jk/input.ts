import type { Key } from "./engine";

/** Keys that only change another key, which vim never sees on their own. */
const MODIFIERS: ReadonlySet<string> = new Set(["Shift", "CapsLock"]);

/**
 * The key a keydown means to the engine: a digit, `j`, `k`, or "other" for
 * anything else, which drops a pending count. Ignores key-repeat events
 * (holding a key down) and modifier keys pressed on their own.
 */
export function keyFor(event: Pick<KeyboardEvent, "key" | "repeat">): Key | null {
  if (event.repeat || MODIFIERS.has(event.key)) return null;
  if (/^[0-9jk]$/.test(event.key)) return event.key as Key;
  return "other";
}
