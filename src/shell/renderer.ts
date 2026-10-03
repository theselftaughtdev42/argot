import type { GameScreen } from "../games/registry";

export type ShellOutput = { kind: "list"; items: string[] } | { kind: "error"; text: string };

export type HomeState = {
  /** What's typed at the prompt. */
  input: string;
  /** The last submitted command's name and what it printed; null when there's nothing to show. */
  last: { name: string; output: ShellOutput } | null;
  /** Whether the logo has shrunk to the top of the page, leaving the tagline behind. */
  compact: boolean;
};

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderOutput(output: ShellOutput): string {
  if (output.kind === "error") return `<div class="ag-line ag-error">${escapeHtml(output.text)}</div>`;
  return `<ul class="ag-ls">${output.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

export function renderHome(root: HTMLElement, { input, last, compact }: HomeState): void {
  const hint =
    last?.name === "ls"
      ? `type <span class="ag-key">vim</span> and a game name`
      : `type <span class="ag-key">ls</span> and press <span class="ag-key">enter</span>`;
  const brand = `
    <header class="ag-brand${compact ? " ag-brand--compact" : ""}">
      <h1 class="ag-logo">argot</h1>
      ${compact ? "" : `<div class="ag-tagline">learn to speak vim. no mouse, just keys.</div>`}
    </header>
  `;
  root.innerHTML = `
    <main class="ag-screen ag-home${compact ? " ag-home--compact" : ""}">
      ${compact ? brand : ""}
      <div class="ag-stack${compact ? "" : " ag-stack--narrow"}">
        ${compact ? "" : brand}
        ${last ? renderOutput(last.output) : ""}
        <div>
          <div class="ag-line ag-prompt"><span class="prompt-input">${escapeHtml(input)}</span><span class="ag-cursor"></span></div>
          <div class="ag-hint home-hint">${hint}</div>
        </div>
      </div>
    </main>
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
