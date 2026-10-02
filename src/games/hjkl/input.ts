import type { Direction } from "./engine";

const KEY_TO_DIRECTION: Record<string, Direction> = {
  h: "h",
  j: "j",
  k: "k",
  l: "l",
};

/**
 * Listens for hjkl keydowns and reports accepted moves. Ignores key-repeat
 * events (holding a key down) and every key that isn't h/j/k/l, including
 * the arrow keys.
 */
export function createInputHandler(onMove: (direction: Direction) => void): () => void {
  function handleKeydown(event: KeyboardEvent): void {
    if (event.repeat) return;
    const direction = KEY_TO_DIRECTION[event.key];
    if (!direction) return;
    onMove(direction);
  }

  window.addEventListener("keydown", handleKeydown);
  return () => window.removeEventListener("keydown", handleKeydown);
}
