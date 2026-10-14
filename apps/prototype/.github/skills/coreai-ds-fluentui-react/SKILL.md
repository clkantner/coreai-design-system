---
name: coreai-ds-react-components
description: 'MANDATORY for @coreai-ds/react-components work. Requires the CoreAI documentation MCP before choosing components, props, templates, or implementation patterns. If the MCP is unavailable, stop and ask the user to enable, authenticate, or troubleshoot it with you.'
---

# CoreAI Design System - Using `@coreai-ds/react-components` as an agent

This guide is based on the agent-usage doc shipped with `@coreai-ds/react-components` at
`node_modules/@coreai-ds/react-components/agent/SKILL.md`. CoreaAI Sandbox additionally treats the
CoreAI documentation MCP as a hard prerequisite for CoreAI-dependent implementation.

## Skill boundary

This skill owns the authoritative workflow for the external `@coreai-ds/react-components` package:
CoreAI-first documentation lookup, inherited Fluent API lookup, and CoreAI import rules. It does
not decide whether CoreaAI Sandbox already owns a product-specific adapter or composition.

For CoreaAI Sandbox code, invoke `react-components` first to classify the repository boundary. That
skill delegates every CoreAI API question back here, while it owns inspection of app components
under `app/components/common/**`. Do not duplicate CoreaAI Sandbox's local component catalog in this
mirrored package skill.

## Import components from `@coreai-ds/react-components`, not `@fluentui/react-components`

**Never** import a component from `@fluentui/react-components` directly — the barrel re-exports
Fluent's full surface and shadows some components with CoreAI-themed wrappers (`Button`, `Card`,
`Input`, …); importing straight from `@fluentui/react-components` renders stock Fluent instead of
the CoreAI version. This does **not** apply to every `@fluentui/*` package — icons
(`@fluentui/react-icons`) and other packages the barrel doesn't wrap are fine to import directly.
See the package's
[README.md](https://github.com/coreai-microsoft/coreai-ds/blob/main/packages/coreai-fluentui-react/README.md#eslint)
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

- **`coreai-ds-docs`** — always consult first. It documents CoreAI's differences from Fluent,
  extensions, additional components, and larger component templates.
- **`fluent-agent`** — consult after CoreAI. Its component tools document unchanged passthrough
  components and inherited Fluent APIs; it also covers icons, tokens, and general Fluent guidance.

CoreAI intentionally does not duplicate the complete documentation for every unchanged Fluent
component it re-exports. The two servers form a layered documentation model: CoreAI documents the
delta, while Fluent documents the underlying component surface. CoreAI documentation takes
precedence whenever the two layers differ.

Connection config (`mcp.json`) and the full toolset list live in one place — see
[Docs/MCP Setup](https://coreai-ds-storybook.azurewebsites.net/?path=/docs/docs-mcp-setup--docs).

### Required MCP workflow

**STOP CONDITION:** Do not select, add, change, or review a CoreAI component, prop, template,
or implementation pattern until `coreai-ds-docs` responds successfully. An entry in
`mcp.json`, package source, TypeScript definitions, prior knowledge, and stock Fluent docs do
not satisfy this requirement.

1. Confirm the CoreAI documentation server is connected by successfully calling
   `list-all-documentation`.
2. Use that index to determine whether CoreAI documents the component, extension, or template.
   Do not infer from the component name whether it is modified or passed through unchanged.
3. When CoreAI has an entry, call `get-documentation` before using the component. Call
   `get-documentation-for-story` when a specific CoreAI state or pattern is needed. Record the
   documented differences, defaults, constraints, and extensions.
4. Then use the Fluent Agent's component tools for the underlying Fluent API and for details that
   CoreAI does not repeat. Apply the CoreAI delta on top of that Fluent documentation.
5. When the CoreAI index has no component entry, use the Fluent Agent's component tools to
   document the unchanged passthrough component, while still importing it from CoreAI.
6. If CoreAI and Fluent guidance conflict, follow CoreAI. Do not use Fluent documentation to
   erase or override a CoreAI difference.
7. Implement only documented props, combinations, and patterns. If neither source documents the
   needed behavior, report the gap and ask the user instead of inventing it.

## Component IDs have no predictable scheme

IDs are inconsistent — `components-button-button` (Storybook groups `Button` inside a `Button`
folder alongside `CopyButton`/`DropdownButton`/etc., doubling category+name), but
`components-avatar` (not doubled), `components-datetime-calendar` (category `datetime`, name
`calendar`). You cannot guess an id from a component name.

- Call `list-all-documentation` first, every session, before assuming an id.
- Pass `withStoryIds: false` when you don't need story ids yet — it meaningfully cuts response
  size.

## Templates vs. components

- **Components** are real, importable components, ids like `components-button-button`,
  `components-avatar` — import from the barrel as usual.
- **Templates** (`templates-empty-state`, `templates-filterable-list`,
  `templates-shell-and-navigation`) are higher-level, copy-paste starting points, **not exported
  from the package** — there's no import path for them. Call `get-documentation` with the
  template's id and copy its "Source Code" entry (story id `templates-empty-state--source-code`)
  verbatim into the consuming repo, then edit it freely to fit the app; it's meant to be
  modified as needed.
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

## If the CoreAI MCP is unavailable

Do not continue CoreAI-dependent implementation with package source, TypeScript definitions,
README files, prior knowledge, or `fluent-agent` component documentation as a substitute.
Fluent documentation may be correct for an unchanged passthrough component, but you cannot know
that a component is unchanged until you check the CoreAI documentation first.

1. Tell the user that the CoreAI MCP is required and that continuing without it risks using the
   wrong wrapper API, defaults, or template.
2. Ask the user to help enable it now. In VS Code, direct them to **MCP: List Servers**, then
   `coreai-ds-docs`, and ask them to start or restart the server and complete the Microsoft Entra
   sign-in prompt.
3. Stay on the connection problem with the user. After they respond, retry
   `list-all-documentation`; do not assume that configuration or authentication succeeded.
4. If the server is missing from the client configuration, add the documented entry yourself
   when editing that configuration is available, then ask the user to complete any interactive
   authentication and retry the call.
5. If access is denied after authentication, point the user to the feed/security-group request
   steps in the
   [root README](https://github.com/coreai-microsoft/coreai-ds/blob/main/README.md#consuming-the-package)
   and pause CoreAI-dependent work until access is available.
6. Only proceed without the MCP when the user explicitly instructs you to do so after you have
   explained the risk. State the limitation in the final result and do not present offline
   findings as verified CoreAI documentation.

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
  that is not present in an inline CoreAI story, use the Fluent Agent's component tools after
  recording any CoreAI differences for that component.

## Completion checklist

- CoreAI MCP documentation checked for each component used.
- Fluent Agent component documentation checked for unchanged passthrough components and inherited
  Fluent APIs that CoreAI intentionally does not repeat.
- CoreAI differences applied on top of Fluent documentation and given precedence in conflicts.
- Imports come from `@coreai-ds/react-components`, except icons and packages the barrel does not wrap.
- No undocumented props or invented component APIs.
- Existing behavior and accessibility preserved.
- Semantic tokens used for visual styling.
- Light, dark, narrow, and wide layouts considered.
