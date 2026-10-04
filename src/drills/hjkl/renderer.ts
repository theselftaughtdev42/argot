import { BOARD_SIZE, HITS_TO_WIN, type RunState } from "./engine";
import { formatTime } from "./timer";
import type { Instructions } from "../registry";

function renderBestTime(bestTimeMs: number | null): string {
  return bestTimeMs !== null
    ? `<p class="best-time ag-muted">Best time: <strong class="ag-highlight">${formatTime(bestTimeMs)}</strong></p>`
    : "";
}

export const instructions: Instructions = {
  name: "hjkl",
  summary: "move the cursor without the arrow keys",
  description:
    "In vim, you move the cursor with `h`, `j`, `k` and `l` instead of the arrow keys, so your fingers never leave the home row.",
  keys: [
    { keys: "h", action: "left" },
    { keys: "j", action: "down" },
    { keys: "k", action: "up" },
    { keys: "l", action: "right" },
  ],
  goal: `Hit ${HITS_TO_WIN} targets as fast as you can.`,
};

/** The board as rows of dots; every cell is its own element so its position stays queryable. */
function renderBoard(state: RunState): string {
  const rows: string[] = [];
  for (let y = 0; y < BOARD_SIZE; y++) {
    const cells: string[] = [];
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (state.cursor.x === x && state.cursor.y === y) {
        cells.push(`<span class="board-cell ag-board__cursor ag-cursor"></span>`);
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
 * Draws the whole play screen. Called on each move rather than each frame, so the
 * cursor isn't recreated (restarting its blink) while the clock runs;
 * the clock itself updates through renderElapsed.
 */
export function renderPlay(root: HTMLElement, state: RunState, elapsedMs: number): void {
  root.innerHTML = `
    <section class="screen screen-play ag-play">
      <div class="ag-muted">reach the <span class="ag-board__target">✕</span> using <span class="ag-key">h j k l</span></div>
      ${renderBoard(state)}
      <div class="ag-play__info ag-muted">
        <span class="timer">${formatTime(elapsedMs)}</span>
        <span class="progress">${state.hits}/${HITS_TO_WIN}</span>
      </div>
    </section>
  `;
}

/** Updates the play screen's clock in place. */
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
      <p class="final-time ag-hero">${formatTime(finalTimeMs)}</p>
      ${isNewBest ? '<p class="new-best ag-highlight">New best time!</p>' : ""}
      ${renderBestTime(bestTimeMs)}
    </section>
  `;
}
