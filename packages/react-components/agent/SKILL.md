---
name: coreai-ds-react-components
description: 'How an AI agent should use the CoreAI Design System and consume @coreai-ds/react-components: MCP docs, imports, templates, design implementation, accessibility, and offline fallback. Use when building UI or translating designs with this package.'
---

# CoreAI Design System — Using `@coreai-ds/react-components` as an agent

This is the canonical, distributable agent-usage doc for `@coreai-ds/react-components`. It ships
inside the package (`node_modules/@coreai-ds/react-components/agent/SKILL.md`) and is mirrored to
the hosted Storybook so it's also reachable through the MCP tools — read either copy, they
can't drift apart.

## Import components from `@coreai-ds/react-components`, not `@fluentui/react-components`

**Never** import a component from `@fluentui/react-components` directly — the barrel re-exports
Fluent's full surface and shadows some components with CoreAI-themed wrappers (`Button`, `Card`,
`Input`, …); importing straight from `@fluentui/react-components` renders stock Fluent instead of
the CoreAI version. This does **not** apply to every `@fluentui/*` package — icons
(`@fluentui/react-icons`) and other packages the barrel doesn't wrap are fine to import directly.
See the package's
[README.md](https://github.com/microsoft/coreai-design-system/blob/main/packages/react-components/README.md)
(or `node_modules/@coreai-ds/react-components/README.md#eslint` once installed) for the enforced
eslint rule.

Import components, styling APIs, and tokens from the CoreAI package:

```tsx
import { Button, Card, Input, makeStyles, tokens } from '@coreai-ds/react-components';
```

Import icons directly from Fluent:

```tsx
import { AddRegular } from '@fluentui/react-icons';
```

## MCP servers

- **`coreai-ds-docs`** — required primary source. CoreAI-specific props, defaults, examples,
  templates.
- **`fluent-agent`** — required fallthrough for what `coreai-ds-docs` doesn't cover (icon/token
  search, general Fluent Q&A). Don't use its _component_ tools — they return raw
  `@fluentui/react-components` APIs that ignore CoreAI's wrappers/defaults.

Connection config (`mcp.json`) and the full toolset list live in one place — see
[Docs/MCP Setup](https://coreai-ds-storybook.azurewebsites.net/?path=/docs/docs-mcp-setup--docs).

### Required MCP workflow

1. Confirm the CoreAI documentation server is connected.
2. Call `list-all-documentation` before assuming a component ID.
3. Call `get-documentation` before using a component or prop.
4. Call `get-documentation-for-story` when a specific state or pattern is needed.
5. Implement only documented props, combinations, and patterns.
6. If a component or prop is missing, report the gap. Do not invent it.

**Never hallucinate a prop.** Even a common-sounding one (`shadow`, `variant`, `color`) — verify
it's real via `get-documentation` or an example story before using it. If it isn't documented or
shown in an example, ask the user instead of assuming.

### Report documentation and component gaps

When CoreAI documentation is missing, incorrect, or does not cover a needed component or prop:

1. Tell the user exactly what is missing and what fallback, if any, you used.
2. Ask whether they want you to file an issue in the
   [CoreAI GitHub issue tracker](https://github.com/microsoft/coreai-design-system/issues/new).
3. Only after the user confirms, use
   `gh issue create --repo microsoft/coreai-design-system` to file an issue that
   includes the component or documentation page, the expected behavior or
   information, the observed gap, and a minimal example when available. Source,
   pull requests, and issues share this GitHub repository.
4. If you cannot create the issue, give the user a ready-to-submit title and body instead.

## Component IDs have no predictable scheme

IDs are inconsistent — `components-button-button` (Storybook groups `Button` inside a `Button`
folder alongside `CopyButton`/`DropdownButton`/etc., doubling category+name), but
`components-avatar` (not doubled), `components-datetime-calendar` (category `datetime`, name
`calendar`). You cannot guess an id from a component name.

- Call `list-all-documentation` first, every session, before assuming an id.
- Pass `withStoryIds: false` when you don't need story ids yet — it meaningfully cuts response
  size.

## Templates vs. components

- **Components** are real, importable wrappers, ids like `components-button-button`,
  `components-avatar` — import from the barrel as usual.
- **Templates** (`templates-empty-state`, `templates-filterable-list`,
  `templates-shell-and-navigation`) are higher-level, copy-paste starting points, **not exported
  from the package** — there's no import path for them. Call `get-documentation` with the
  template's id and copy its "Source Code" entry (story id `templates-empty-state--source-code`)
  verbatim into the consuming repo, then edit it freely to fit the app; it's meant to be
  modified as needed, not imported and left as-is.
- Prefer an existing CoreAI component or template over recreating the same pattern with custom
  markup.

## Design implementation rules

- Preserve existing component structure, props, behavior, and accessibility when translating a
  design. Retheme before rewriting.
- Use CoreAI or Fluent semantic tokens instead of hardcoded colors, spacing, radii, typography,
  shadows, or motion values.
- Support both light and dark themes unless the product explicitly supports only one.
- Keep keyboard behavior, focus visibility, labels, names, roles, and contrast intact.
- Reuse documented component states instead of approximating them with custom CSS.
- Keep responsive behavior intentional. Check narrow and wide layouts.
- Use CoreAI typography primitives and presets for hierarchy.
- Use `CodeBlock` for source code and `Markdown` for Markdown content rather than maintaining
  custom renderers.
- Import exact product assets. Do not approximate supplied icons, SVGs, or illustrations.

## Higher-value docs for specific questions

Prefer these over guessing from a prop table alone — pass the id to `get-documentation`:

- **What CoreAI changes vs. stock Fluent** → `docs-variations-from-fluent--docs`
- **Theming / token overrides** → `docs-theming--docs`
- **Overriding styles with plain CSS/CSS Modules** → `docs-styling-with-css-modules--docs`

## If neither MCP server is reachable

Both require a one-time interactive Microsoft sign-in, which an agent can't complete unattended.
Once done, tokens renew silently, so this shouldn't recur mid-session. Don't silently fall back
and guess; push for the real thing first:

1. **Missing from the client's MCP config?** Tell the user both servers are required for proper
   usage, show them the destination path and configuration block, and ask for confirmation before
   adding it. See
   [Docs/MCP Setup](https://coreai-ds-storybook.azurewebsites.net/?path=/docs/docs-mcp-setup--docs)
   for the `mcp.json` block (VS Code: `.vscode/mcp.json`; Copilot CLI: `~/.copilot/mcp-config.json`).
   The same block is also in this package's own
   [README.md](https://github.com/microsoft/coreai-design-system/blob/main/packages/react-components/README.md),
   so it's available even with no network access to Storybook (e.g. read straight from
   `node_modules/@coreai-ds/react-components/README.md`).
2. **Configured but not signed in?** Ask the user to complete the sign-in now (trigger it, or tell
   them which client prompt to complete) before you proceed — this is the normal, expected first
   step, not an edge case to route around.
3. **Still unreachable after that** (e.g. the documentation service is unavailable)? Only now fall
   back: use this file plus the package's own README and CHANGELOG — both ship in the installed
   package (`node_modules/@coreai-ds/react-components/README.md` and `.../CHANGELOG.md`; on GitHub:
   [README](https://github.com/microsoft/coreai-design-system/blob/main/packages/react-components/README.md),
   [CHANGELOG](https://github.com/microsoft/coreai-design-system/blob/main/packages/react-components/CHANGELOG.md)) —
   as your source of truth for that session, and tell the user live docs weren't available so
   they know your answers may be less precise.
4. If the blocker is documentation-service access, ask the user to contact that
   service's owner. Documentation authentication is separate from npm consumption:
   the approved public npm package requires no Azure feed membership or token.
   Never ask for or configure private-feed credentials to install a public package.

## Fonts and package installation

Public npm distribution is prepared but requires maintainer approval before the
first release. Use the package README for current installation status. The package
contains compiled JavaScript/types, not source TS or licensed Aptos binaries.
`@coreai-ds/react-components/fonts/fonts.css` only registers fonts already installed on
the user's device. The proportional stack falls back to Inter and then system fonts;
applications may load Inter from Google Fonts. Ask the user to supply independently
licensed assets and CSS for Aptos. Only Microsoft-hosted projects may host Aptos;
non-Microsoft projects must use Inter instead. Do not download, bundle, host, or
redistribute Aptos on assumption.

## Translating a Storybook URL into an MCP call

A link a human pastes in, e.g.
`https://coreai-ds-storybook.azurewebsites.net/?path=/docs/components-button-button--docs` or
`.../?path=/story/components-button-button--subtle-content-alignment`:

- The segment before `--` (`components-button-button`) is the `id` for `get-documentation`.
- The segment after `--` (kebab-case) maps to a story export name for `get-documentation-for-story`
  (e.g. `subtle-content-alignment` → `SubtleContentAlignment`). If the guess doesn't hit, confirm
  the exact name via `list-all-documentation` with story ids.
- Not every story in the Storybook UI reaches the MCP — only inline-authored ones (`Default` plus
  any CoreAI-specific variants). A canonical Fluent story that's merely re-exported renders fine
  for humans but returns nothing from `get-documentation-for-story`. For stock Fluent behavior
  that isn't covered by an inline story, fall through to `fluent-agent`.

## Completion checklist

- CoreAI MCP documentation checked for each component used.
- Imports come from `@coreai-ds/react-components`, except icons and packages the barrel does not wrap.
- No undocumented props or invented component APIs.
- Existing behavior and accessibility preserved.
- Semantic tokens used for visual styling.
- Light, dark, narrow, and wide layouts considered.
