import { HITS_TO_WIN, wordEnd, type RunState } from "./engine";
import { formatTime } from "../shared/timer";
import type { Help } from "../registry";

function renderBestTime(bestTimeMs: number | null): string {
  return bestTimeMs !== null
    ? `<p class="best-time ag-muted">Best time: <strong class="ag-highlight">${formatTime(bestTimeMs)}</strong></p>`
    : "";
}

export const help: Help = {
  name: "wb",
  summary: "jump forward and back a word at a time",
  description:
    "`w` jumps to the start of the next word and `b` back to the start of the previous one, which is much faster than holding `l` or `h`. Punctuation counts as its own word, just like in vim.",
  keys: [
    { keys: "w", action: "next word start" },
    { keys: "b", action: "previous word start" },
  ],
  goal: `Hit ${HITS_TO_WIN} targets as fast as you can.`,
};

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * One line of the passage, with the cursor over its character and the
 * target's first character and the rest of its word marked. Runs of plain
 * characters stay as text, so the line's text is the passage's.
 */
function renderLine(state: RunState, line: number): string {
  const text = state.passage[line]!;
  const classFor = (col: number): string | null => {
    if (state.cursor.line === line && state.cursor.col === col) return "ag-passage__cursor";
    if (state.target.line !== line) return null;
    if (col === state.target.col) return "ag-passage__target";
    if (col > state.target.col && col < wordEnd(state.passage, state.target)) return "ag-passage__target-rest";
    return null;
  };
  let html = "";
  let col = 0;
  while (col < text.length) {
    const cls = classFor(col);
    let end = col + 1;
    while (end < text.length && classFor(end) === cls) end++;
    const chars = escapeHtml(text.slice(col, end));
    html += cls ? `<span class="${cls}">${chars}</span>` : chars;
    col = end;
  }
  return html;
}

function renderPassage(state: RunState): string {
  return `<pre class="ag-passage">${state.passage.map((_, line) => renderLine(state, line)).join("\n")}</pre>`;
}

/**
 * Draws the whole play screen. Called on each move rather than each frame, so the
 * cursor isn't recreated (restarting its blink) while the clock runs;
 * the clock itself updates through renderElapsed.
 */
export function renderPlay(root: HTMLElement, state: RunState, elapsedMs: number): void {
  root.innerHTML = `
    <section class="screen screen-play ag-play">
      <div class="ag-muted">reach the target using <span class="ag-key">w b</span></div>
      ${renderPassage(state)}
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
