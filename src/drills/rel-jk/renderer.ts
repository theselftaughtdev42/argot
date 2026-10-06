import { HITS_TO_WIN, type RunState } from "./engine";
import { formatTime } from "../shared/timer";
import type { Help } from "../registry";

function renderBestTime(bestTimeMs: number | null): string {
  return bestTimeMs !== null
    ? `<p class="best-time ag-muted">Best time: <strong class="ag-highlight">${formatTime(bestTimeMs)}</strong></p>`
    : "";
}

export const help: Help = {
  name: "rel-jk",
  summary: "jump straight to a line using relative line numbers",
  description:
    "With `relativenumber` on, every line shows how far it is from the cursor, so you can read the number and jump straight there: `5j` goes down five lines and `3k` up three. That's much faster than holding `j` or `k` and counting. The cursor's own line shows `0`.",
  keys: [
    { keys: "<count>j", action: "down count lines" },
    { keys: "<count>k", action: "up count lines" },
  ],
  goal: `Hit ${HITS_TO_WIN} targets as fast as you can.`,
};

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * One line of the passage behind its gutter number, as vim draws it with
 * `relativenumber` on: how far the line is from the cursor, so 0 on the
 * cursor's own line.
 */
function renderLine(state: RunState, line: number): string {
  const text = state.passage[line]!;
  const isCursor = line === state.cursor;
  const isTarget = line === state.target;
  const number = Math.abs(line - state.cursor);
  const classes = ["ag-rel__line", isCursor && "ag-rel__line--cursor", isTarget && "ag-rel__line--target"]
    .filter(Boolean)
    .join(" ");
  // The cursor sits on the first character, alone on a blank line; a blank target keeps a space to underline.
  const body = isCursor
    ? `<span class="ag-passage__cursor">${escapeHtml(text[0] ?? " ")}</span>${escapeHtml(text.slice(1))}`
    : escapeHtml(text || (isTarget ? " " : ""));
  return `<div class="${classes}"><span class="ag-rel__number">${number}</span><span class="ag-rel__text">${body}</span></div>`;
}

function renderPassage(state: RunState): string {
  return `<div class="ag-rel">${state.passage.map((_, line) => renderLine(state, line)).join("")}</div>`;
}

/**
 * Draws the whole play screen. Called on each key the engine takes rather than
 * each frame, so the cursor isn't recreated (restarting its blink) while the
 * clock runs; the clock itself updates through renderElapsed.
 */
export function renderPlay(root: HTMLElement, state: RunState, elapsedMs: number): void {
  root.innerHTML = `
    <section class="screen screen-play ag-play ag-play--tight">
      <div class="ag-muted">reach the target using <span class="ag-key">&lt;count&gt;j &lt;count&gt;k</span></div>
      ${renderPassage(state)}
      <div class="ag-play__info ag-muted">
        <span class="timer">${formatTime(elapsedMs)}</span>
        <span class="progress">${state.hits}/${HITS_TO_WIN}</span>
        ${state.count !== null ? `<span class="count ag-highlight">${state.count}</span>` : ""}
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
