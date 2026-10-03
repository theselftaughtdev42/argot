import { GRID_SIZE, WIN_TOUCHES, type GameState } from "./engine";
import { formatTime } from "./timer";

function renderBestTime(bestTimeMs: number | null): string {
  return bestTimeMs !== null
    ? `<p class="best-time">Best time: <strong>${formatTime(bestTimeMs)}</strong></p>`
    : "";
}

export function renderLanding(root: HTMLElement, bestTimeMs: number | null): void {
  root.innerHTML = `
    <section class="screen screen-landing">
      <h1>HJKL Drill</h1>
      <p class="instructions">
        In vim, you move the cursor with <kbd>h</kbd> <kbd>j</kbd> <kbd>k</kbd> <kbd>l</kbd>
        instead of the arrow keys.
      </p>
      <ul class="key-legend">
        <li><kbd>h</kbd> left</li>
        <li><kbd>j</kbd> down</li>
        <li><kbd>k</kbd> up</li>
        <li><kbd>l</kbd> right</li>
      </ul>
      <p class="goal">Hit ${WIN_TOUCHES} targets as fast as you can. Arrow keys do nothing here &mdash; only hjkl moves the cursor.</p>
      ${renderBestTime(bestTimeMs)}
      <p class="hint">press Enter to start</p>
    </section>
  `;
}

export function renderDrill(root: HTMLElement, state: GameState, elapsedMs: number): void {
  const cells: string[] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const isCursor = state.cursor.x === x && state.cursor.y === y;
      const isTarget = state.target.x === x && state.target.y === y;
      const glyph = isCursor ? "@" : isTarget ? "X" : "";
      const className = ["cell", isCursor && "cell-cursor", isTarget && "cell-target"]
        .filter(Boolean)
        .join(" ");
      cells.push(`<div class="${className}">${glyph}</div>`);
    }
  }

  root.innerHTML = `
    <section class="screen screen-drill">
      <div class="hud">
        <span class="timer">${formatTime(elapsedMs)}</span>
        <span class="progress">${state.touches}/${WIN_TOUCHES}</span>
      </div>
      <div class="grid" style="--grid-size: ${GRID_SIZE}">${cells.join("")}</div>
    </section>
  `;
}

export function renderResults(
  root: HTMLElement,
  finalTimeMs: number,
  isNewBest: boolean,
  bestTimeMs: number | null,
): void {
  root.innerHTML = `
    <section class="screen screen-results">
      <h1>Done!</h1>
      <p class="final-time">${formatTime(finalTimeMs)}</p>
      ${isNewBest ? '<p class="new-best">New best time!</p>' : ""}
      ${renderBestTime(bestTimeMs)}
    </section>
  `;
}
