import { GRID_SIZE, WIN_TOUCHES, type GameState } from "./engine";
import { formatTime } from "./timer";

function renderBestTime(bestTimeMs: number | null): string {
  return bestTimeMs !== null
    ? `<p class="best-time ag-muted">Best time: <strong class="ag-highlight">${formatTime(bestTimeMs)}</strong></p>`
    : "";
}

export function renderLanding(root: HTMLElement, bestTimeMs: number | null): void {
  root.innerHTML = `
    <section class="screen screen-landing ag-stack">
      <h1 class="ag-title">HJKL Drill</h1>
      <p class="instructions">
        In vim, you move the cursor with <span class="ag-key">h</span> <span class="ag-key">j</span>
        <span class="ag-key">k</span> <span class="ag-key">l</span> instead of the arrow keys.
      </p>
      <ul class="key-legend ag-legend">
        <li><span class="ag-key">h</span> left</li>
        <li><span class="ag-key">j</span> down</li>
        <li><span class="ag-key">k</span> up</li>
        <li><span class="ag-key">l</span> right</li>
      </ul>
      <p class="goal ag-muted">Hit ${WIN_TOUCHES} targets as fast as you can. Arrow keys do nothing here &mdash; only hjkl moves the cursor.</p>
      ${renderBestTime(bestTimeMs)}
      <p class="hint ag-muted">press <span class="ag-key">Enter</span> to start</p>
    </section>
  `;
}

/** The board as rows of dots; every cell is its own element so its position stays queryable. */
function renderBoard(state: GameState): string {
  const rows: string[] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    const cells: string[] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      if (state.cursor.x === x && state.cursor.y === y) {
        cells.push(`<span class="board-cell ag-board__player ag-cursor"></span>`);
      } else if (state.target.x === x && state.target.y === y) {
        cells.push(`<span class="board-cell ag-board__target">✕</span>`);
      } else {
        cells.push(`<span class="board-cell">·</span>`);
      }
    }
    rows.push(cells.join("  "));
  }
  return `<pre class="ag-board">${rows.join("\n")}</pre>`;
}

/**
 * Draws the whole drill. Called on each move rather than each frame, so the
 * player cursor isn't recreated (restarting its blink) while the clock runs;
 * the clock itself updates through renderElapsed.
 */
export function renderDrill(root: HTMLElement, state: GameState, elapsedMs: number): void {
  root.innerHTML = `
    <section class="screen screen-drill ag-drill">
      <div class="ag-muted">reach the <span class="ag-board__target">✕</span> using <span class="ag-key">h j k l</span></div>
      ${renderBoard(state)}
      <div class="ag-drill__info ag-muted">
        <span class="timer">${formatTime(elapsedMs)}</span>
        <span class="progress">${state.touches}/${WIN_TOUCHES}</span>
      </div>
    </section>
  `;
}

/** Updates the drill's clock in place. */
export function renderElapsed(root: HTMLElement, elapsedMs: number): void {
  const timer = root.querySelector(".timer");
  if (timer) timer.textContent = formatTime(elapsedMs);
}

export function renderResults(
  root: HTMLElement,
  finalTimeMs: number,
  isNewBest: boolean,
  bestTimeMs: number | null,
): void {
  root.innerHTML = `
    <section class="screen screen-results ag-stack ag-stack--center">
      <h1 class="ag-title">Done!</h1>
      <p class="final-time ag-hero">${formatTime(finalTimeMs)}</p>
      ${isNewBest ? '<p class="new-best ag-highlight">New best time!</p>' : ""}
      ${renderBestTime(bestTimeMs)}
    </section>
  `;
}
