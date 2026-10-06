import type { DrillScreen, Help } from "../drills/registry";
import type { Scheme } from "../theme";

/** What the drill frame can show in its stage: the drill's own screens, or the shell's help page. */
export type FrameScreen = DrillScreen | "help";

/** What a command shows after it runs: one line, like an error, or several, like `argot`'s list. */
export type CommandResponse =
  | { kind: "error"; text: string }
  | { kind: "commands"; items: { usage: string; description: string }[] };

export type ShellOutput = { kind: "list"; items: string[] } | CommandResponse;

/** The theme picker open over home: every theme, which one is showing, and which one is saved. */
export type ThemePicker = {
  /** Every theme, those of a scheme together, in the order the picker shows them. */
  themes: { name: string; label: string; scheme: Scheme }[];
  /** Index into `themes` of the theme being previewed. */
  selected: number;
  /** The theme that was saved when the picker opened, which Esc goes back to. */
  saved: string;
};

export type HomeState = {
  /** What's typed at the prompt. */
  input: string;
  /** The last submitted command's name and what it printed; null when there's nothing to show. */
  last: { name: string; output: ShellOutput } | null;
  /** Whether the logo has shrunk to the top of the page, leaving the tagline behind. */
  compact: boolean;
  /** The theme picker, while it's open over home. */
  picker: ThemePicker | null;
};

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const key = (text: string) => `<span class="ag-key">${text}</span>`;

/** `argot`'s list: each command's usage, highlighted, beside what it does. */
function renderCommandList(items: { usage: string; description: string }[]): string {
  const rows = items
    .map(({ usage, description }) => `<div><dt class="ag-key">${escapeHtml(usage)}</dt><dd>${escapeHtml(description)}</dd></div>`)
    .join("");
  return `<dl class="ag-commands">${rows}</dl>`;
}

function renderOutput(output: ShellOutput): string {
  if (output.kind === "error") return `<div class="ag-line ag-error">${escapeHtml(output.text)}</div>`;
  if (output.kind === "commands") return renderCommandList(output.items);
  return `<ul class="ag-ls">${output.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

/** The theme picker: a list per scheme over the dimmed home, the previewed theme marked, the selected one noted. */
function renderThemePicker({ themes, selected, saved }: ThemePicker): string {
  const option = ({ name, label }: ThemePicker["themes"][number], index: number) => `
    <li class="ag-picker__option${index === selected ? " ag-picker__option--selected" : ""}" data-theme-name="${escapeHtml(name)}">
      <span>${escapeHtml(label)}</span>${name === saved ? `<span class="ag-muted">selected</span>` : ""}
    </li>`;
  const schemes = [...new Set(themes.map(({ scheme }) => scheme))];
  const groups = schemes
    .map((scheme) => {
      const options = themes
        .map((theme, index) => (theme.scheme === scheme ? option(theme, index) : ""))
        .join("");
      return `
        <section class="ag-picker__group" data-scheme="${scheme}">
          <h2 class="ag-picker__heading ag-muted">${scheme}</h2>
          <ul class="ag-picker__list">${options}</ul>
        </section>`;
    })
    .join("");
  return `
    <div class="ag-picker theme-picker">
      ${groups}
      <div class="ag-hint ag-picker__hint">
        <span>${key("enter")} to save</span>
        <span>${key("esc")} to cancel</span>
      </div>
    </div>
  `;
}

export function renderHome(root: HTMLElement, { input, last, compact, picker }: HomeState): void {
  const hint =
    last?.name === "ls"
      ? `type <span class="ag-key">vim</span> and a drill name`
      : last?.output.kind === "commands"
        ? `type a command and press <span class="ag-key">enter</span>`
        : `type <span class="ag-key">argot</span> and press <span class="ag-key">enter</span>`;
  const brand = `
    <header class="ag-brand${compact ? " ag-brand--compact" : ""}">
      <h1 class="ag-logo">argot</h1>
      ${compact ? "" : `<div class="ag-tagline">train your fingers to think in vim.</div>`}
    </header>
  `;
  root.innerHTML = `
    <main class="ag-screen ag-home${compact ? " ag-home--compact" : ""}${picker ? " home-dimmed" : ""}">
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
    ${picker ? renderThemePicker(picker) : ""}
  `;
}

/**
 * The shell's frame around a running drill, mounted once at launch: the stage
 * the drill owns, the statusline, and the command line. Returns the frame's
 * parts for the shell to render into.
 */
export function renderDrillFrame(
  root: HTMLElement,
  name: string,
): { stage: HTMLElement; statusName: HTMLElement; cmdline: HTMLElement } {
  // TMP marks the mode as a placeholder until argot has real modes; Esc doesn't change it.
  root.innerHTML = `
    <main class="ag-drill">
      <div class="ag-drill__stage"></div>
      <div class="ag-drill__foot">
        <div class="ag-statusline">
          <div class="ag-statusline__left"><span class="ag-mode">TMP</span><span class="statusline-drill">${escapeHtml(name)}</span></div>
        </div>
        <div class="ag-cmdline"></div>
      </div>
    </main>
  `;
  return {
    stage: root.querySelector<HTMLElement>(".ag-drill__stage")!,
    statusName: root.querySelector<HTMLElement>(".statusline-drill")!,
    cmdline: root.querySelector<HTMLElement>(".ag-cmdline")!,
  };
}

/** The statusline's name slot: the drill's name, or its help file's while help is open, like vim's. */
export function renderStatusName(statusName: HTMLElement, name: string, screen: FrameScreen): void {
  statusName.textContent = screen === "help" ? `${name}.txt [Help][RO]` : name;
}

/**
 * The command line under a running drill: what's typed, with the cursor, while
 * it's open (`command` is null while closed), and the hint. The last command's
 * response takes the hint's place: an error on its line, or a list growing
 * upward over the bottom of the stage, like vim's multi-line messages.
 */
export function renderCommandLine(
  cmdline: HTMLElement,
  screen: FrameScreen,
  command: string | null,
  response: CommandResponse | null,
): void {
  // Each screen hints at its likeliest commands; argot lists the rest.
  const options = [
    ...(screen === "results"
      ? [`${key(":w")} save &amp; retry`, `${key(":wq")} save &amp; quit`]
      : screen === "help"
        ? [`${key(":q")} back to the drill`]
        : [`${key(":help")} for instructions`]),
    `${key(":argot")} for more`,
  ];
  // Each option is its own element, set well apart, so they read as separate choices.
  const hint = [
    ...(command === null ? [`<span class="cmdline-hint__lead">${key("Esc")} then</span>`] : []),
    ...options.map((option) => `<span class="cmdline-hint__option">${option}</span>`),
  ].join("");
  cmdline.innerHTML = `
    <span class="ag-line">${
      command !== null ? `<span class="cmdline-input">${escapeHtml(command)}</span><span class="ag-cursor"></span>` : ""
    }</span>
    ${
      response?.kind === "error"
        ? `<span class="ag-error">${escapeHtml(response.text)}</span>`
        : response?.kind === "commands"
          ? `<div class="cmdline-response">${renderCommandList(response.items)}</div>`
          : `<span class="ag-muted cmdline-hint">${hint}</span>`
    }
  `;
}

/** A help page's prose, escaped, with each `key` in backticks highlighted as a key. */
function renderHelpText(text: string): string {
  return escapeHtml(text).replace(/`([^`]+)`/g, key("$1"));
}

/** Wide enough to fill the stage at any width; the overflow is clipped. */
const RULE = "=".repeat(120);

function renderHelpSection(name: string, heading: string, body: string): string {
  const tag = `${name}-${heading.toLowerCase()}`;
  return `
    <section class="ag-help__section">
      <div class="ag-help__rule" aria-hidden="true">${RULE}</div>
      <h2 class="ag-help__heading"><span>${heading}</span><span class="ag-help__tag">*${escapeHtml(tag)}*</span></h2>
      <div class="ag-help__body">${body}</div>
    </section>
  `;
}

/** A drill's help page, laid out like a vim help file: its tag and summary, then DESCRIPTION, KEYS and GOAL. */
export function renderHelp(root: HTMLElement, { name, summary, description, keys, goal }: Help): void {
  const keyRows = keys
    .map(({ keys, action }) => `<div><dt class="ag-key">${escapeHtml(keys)}</dt><dd>${escapeHtml(action)}</dd></div>`)
    .join("");
  root.innerHTML = `
    <section class="screen screen-help ag-help">
      <p class="ag-help__title"><span class="ag-help__tag">*${escapeHtml(name)}.txt*</span><span>${renderHelpText(summary)}</span></p>
      ${renderHelpSection(name, "DESCRIPTION", `<p>${renderHelpText(description)}</p>`)}
      ${renderHelpSection(name, "KEYS", `<dl class="ag-help__keys">${keyRows}</dl>`)}
      ${renderHelpSection(name, "GOAL", `<p>${renderHelpText(goal)}</p>`)}
    </section>
  `;
}
