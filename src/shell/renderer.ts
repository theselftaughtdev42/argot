import type { GameScreen } from "../games/registry";

export type ShellOutput = { kind: "output" | "error"; text: string };

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function renderHome(root: HTMLElement, input: string, output: ShellOutput | null): void {
  root.innerHTML = `
    <section class="screen screen-home">
      ${output ? `<pre class="${output.kind}">${escapeHtml(output.text)}</pre>` : ""}
      <p class="prompt"><span class="prompt-sign">$</span> <span class="prompt-input">${escapeHtml(input)}</span></p>
      <p class="hint">type ls to list games</p>
    </section>
  `;
}

const GAME_HINTS: Partial<Record<GameScreen, string>> = {
  play: "press Esc for commands",
};

/**
 * The shell's lines under a running game: the command line when it's open
 * (`command` is null while closed), then the hint, or an error in its place.
 */
export function renderGameBar(
  bar: HTMLElement,
  screen: GameScreen,
  command: string | null,
  error: string | null,
): void {
  const hint =
    screen === "results"
      ? ":wq save &amp; quit · :q! quit without saving"
      : command !== null
        ? "type :q! to quit"
        : GAME_HINTS[screen];
  bar.innerHTML = `
    ${command !== null ? `<p class="command-line">${escapeHtml(command)}</p>` : ""}
    ${
      error
        ? `<p class="error">${escapeHtml(error)}</p>`
        : hint
          ? `<p class="hint">${hint}</p>`
          : ""
    }
  `;
}
