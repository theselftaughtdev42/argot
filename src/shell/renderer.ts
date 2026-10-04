import type { DrillScreen } from "../drills/registry";

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
      ? `type <span class="ag-key">vim</span> and a drill name`
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

/**
 * The shell's frame around a running drill, mounted once at launch: the stage
 * the drill owns, the statusline, and the command line. Returns the frame, the
 * stage and the command line for the shell to render into.
 */
export function renderDrillFrame(
  root: HTMLElement,
  name: string,
): { frame: HTMLElement; stage: HTMLElement; cmdline: HTMLElement } {
  // TMP marks the mode as a placeholder until argot has real modes; Esc doesn't change it.
  root.innerHTML = `
    <main class="ag-drill">
      <div class="ag-drill__stage"></div>
      <div class="ag-statusline">
        <div class="ag-statusline__left"><span class="ag-mode">TMP</span><span class="statusline-drill">${escapeHtml(name)}</span></div>
      </div>
      <div class="ag-cmdline"></div>
    </main>
  `;
  return {
    frame: root.querySelector<HTMLElement>(".ag-drill")!,
    stage: root.querySelector<HTMLElement>(".ag-drill__stage")!,
    cmdline: root.querySelector<HTMLElement>(".ag-cmdline")!,
  };
}

/**
 * The command line under a running drill: what's typed, with the cursor, while
 * it's open (`command` is null while closed), and the hint, or an error in its place.
 */
export function renderCommandLine(
  cmdline: HTMLElement,
  screen: DrillScreen,
  command: string | null,
  error: string | null,
): void {
  const hint =
    screen === "results"
      ? `<span class="ag-key">:wq</span> save &amp; quit · <span class="ag-key">:q!</span> quit without saving`
      : command !== null
        ? `type <span class="ag-key">:q!</span> to quit`
        : `<span class="ag-key">Esc</span> then <span class="ag-key">:q!</span> back to home without saving`;
  cmdline.innerHTML = `
    <span class="ag-line">${
      command !== null ? `<span class="cmdline-input">${escapeHtml(command)}</span><span class="ag-cursor"></span>` : ""
    }</span>
    ${error ? `<span class="ag-error">${escapeHtml(error)}</span>` : `<span class="ag-muted cmdline-hint">${hint}</span>`}
  `;
}
