# Themes are token-only stylesheets keyed by `data-theme`

argot's look is split in two. The component stylesheet (`src/theme/argot.css`) owns layout and components and reads every colour and font from `--ag-*` custom properties. A theme is a stylesheet at `src/theme/themes/<name>.css` that defines those properties under `[data-theme="<name>"]` and nothing else, plus an entry in the typed registry (`src/theme/index.ts`) with a label and an optional lazy font loader. The active theme is the `data-theme` attribute on the document element.

The rules:

- **Components never hard-code colours or fonts.** Every colour and font in the component stylesheet is a `var(--ag-*)`. A component that needs a new kind of colour adds a new token, not a literal.
- **Every theme defines every `--ag-*` token** the component stylesheet references. A completeness test enforces this for every theme in the registry, and fails if a registered theme has no token file.
- **Theme files hold tokens only**: no selectors other than their `[data-theme]` scope, no layout.

We chose this so that adding a theme is one token file and one registry entry, with no component changes, and so restyling a component never has to touch every theme. All token files load eagerly because they're only custom properties; fonts are bundled with the app (no third-party requests, works offline) and loaded lazily when their theme is applied. The document ships with `data-theme="dusk"` so the first paint is themed before any script runs.

## Considered options

- **Per-theme component overrides** (themes free to restyle any selector): more expressive, but every component change would need checking against every theme, and an incomplete theme would fail silently.
- **Themes as JS objects written to inline styles at runtime**: no flash-free first paint without duplicating the default theme in HTML, and the values would be harder to check statically.
