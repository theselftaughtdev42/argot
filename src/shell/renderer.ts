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
