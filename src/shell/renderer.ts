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

const TAGLINE = "train your fingers to think in vim.";

/** How long home takes to glide between its full-size and compact layouts. */
const GLIDE_MS = 320;

/** Where the logo, the prompt and the tagline (when it showed) were before home was redrawn. */
type HomeLayout = { logo: DOMRect; prompt: DOMRect; tagline: DOMRect | null };

function measureHome(root: HTMLElement): HomeLayout | null {
  const logo = root.querySelector(".ag-logo");
  const prompt = root.querySelector(".home-prompt");
  const tagline = root.querySelector(".ag-tagline");
  return logo && prompt
    ? { logo: logo.getBoundingClientRect(), prompt: prompt.getBoundingClientRect(), tagline: tagline?.getBoundingClientRect() ?? null }
    : null;
}

/**
 * The tagline's fade-in played backwards: the compact home has no tagline, so
 * a copy stays where it was and fades out while the logo leaves, then goes.
 */
function fadeOutTagline(home: Element, from: DOMRect): void {
  const ghost = document.createElement("div");
  ghost.className = "home-tagline-ghost";
  ghost.setAttribute("aria-hidden", "true");
  ghost.textContent = TAGLINE;
  Object.assign(ghost.style, { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px` });
  home.append(ghost);
  ghost.animate([{ opacity: 1 }, { opacity: 0 }], { duration: GLIDE_MS / 2, fill: "forwards" }).finished.then(
    () => ghost.remove(),
    () => ghost.remove(),
  );
}

/** Plays an element back from where it was to where it is now, scaling with it when `scale` is set. */
function glide(element: Element, from: DOMRect, scale: boolean): void {
  const to = element.getBoundingClientRect();
  const ratio = scale && to.width ? from.width / to.width : 1;
  element.animate(
    [
      { transformOrigin: "top left", transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${ratio})` },
      { transformOrigin: "top left", transform: "none" },
    ],
    { duration: GLIDE_MS, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
  );
}

/**
 * Moves home between its full-size and compact layouts: the logo glides
 * between the middle and the top, scaling as it goes, and the prompt glides to
 * its new place, while whatever's new (the command's response, or the tagline)
 * fades in and the tagline, when it's leaving, fades out. Home is redrawn from scratch, so this plays the old positions back
 * with transforms rather than a CSS transition.
 */
function glideHome(root: HTMLElement, from: HomeLayout): void {
  const logo = root.querySelector(".ag-logo");
  const prompt = root.querySelector(".home-prompt");
  if (!logo || !prompt || typeof logo.animate !== "function") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  glide(logo, from.logo, true);
  glide(prompt, from.prompt, false);
  const home = root.querySelector(".ag-home");
  if (from.tagline && home && !root.querySelector(".ag-tagline")) fadeOutTagline(home, from.tagline);
  // What's new has nowhere to glide from; it waits for the logo to clear its space.
  for (const element of root.querySelectorAll(".home-response, .ag-tagline")) {
    element.animate([{ opacity: 0 }, { opacity: 1 }], { duration: GLIDE_MS / 2, delay: GLIDE_MS / 2, fill: "backwards" });
  }
}

export function renderHome(root: HTMLElement, { input, last, compact, picker }: HomeState): void {
  // Read before the redraw: a home switching between full size and compact glides into its new layout.
  const brandWas = root.querySelector(".ag-brand");
  const glideFrom = brandWas && brandWas.classList.contains("ag-brand--compact") !== compact ? measureHome(root) : null;
  const hint =
    last?.name === "ls"
      ? `type <span class="ag-key">vim</span> and a drill name`
      : last?.output.kind === "commands"
        ? `type a command and press <span class="ag-key">enter</span>`
        : `type <span class="ag-key">argot</span> and press <span class="ag-key">enter</span>`;
  const brand = `
    <header class="ag-brand${compact ? " ag-brand--compact" : ""}">
      <h1 class="ag-logo">argot</h1>
      ${compact ? "" : `<div class="ag-tagline">${TAGLINE}</div>`}
    </header>
  `;
  root.innerHTML = `
    <main class="ag-screen ag-home${compact ? " ag-home--compact" : ""}${picker ? " home-dimmed" : ""}">
      ${compact ? brand : ""}
      <div class="ag-stack${compact ? "" : " ag-stack--narrow"}">
        ${compact ? "" : brand}
        ${last ? `<div class="home-response">${renderOutput(last.output)}</div>` : ""}
        <div class="home-prompt">
          <div class="ag-line ag-prompt"><span class="prompt-input">${escapeHtml(input)}</span><span class="ag-cursor"></span></div>
          <div class="ag-hint home-hint">${hint}</div>
        </div>
      </div>
    </main>
    ${picker ? renderThemePicker(picker) : ""}
  `;
  if (glideFrom) glideHome(root, glideFrom);
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
