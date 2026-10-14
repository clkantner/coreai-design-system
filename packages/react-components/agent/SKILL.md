---
name: coreai-ds-fluentui-react
description: 'MANDATORY for @coreai-ds/react-components work. Use the CoreAI documentation MCP to discover components, props, stories, templates, and implementation patterns. If the MCP is unavailable, stop and ask the user to enable or troubleshoot it with you.'
---

# CoreAI Design System - Using `@coreai-ds/react-components` as an agent

This guide is the entry point to CoreAI MCP documentation for repositories consuming
`@coreai-ds/react-components`. It keeps lookup and
implementation rules here; component APIs, defaults, states, and examples belong in the MCP.
The CoreAI documentation MCP is a hard prerequisite for CoreAI-dependent
implementation.

This guide targets the public, combined documentation catalog introduced by
[PR #17](https://github.com/microsoft/coreai-design-system/pull/17). Until that change is deployed
to the hosted service, use a connected CoreAI documentation server that exposes the updated
catalog. Discover the connected server's actual tool names and schemas before calling them.

## Skill boundary

This skill owns the authoritative workflow for the external `@coreai-ds/react-components` package:
CoreAI documentation lookup, included Fluent story lookup, and CoreAI import rules. It does
not decide whether the consuming repository already owns a product-specific adapter or composition.

Follow the consuming repository's component guidance to identify existing local adapters and
compositions, and inspect their source before using them. Local guidance owns repository-specific
import boundaries and behavior; this skill owns CoreAI API questions. Keep local component
catalogs and repository-specific exceptions in the repository's own guidance.

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

- **`coreai-ds-docs`** — primary source at `https://coreai-ds-storybook.azurewebsites.net/mcp`.
  The updated public catalog combines CoreAI
  documentation, extensions, templates, and selected Fluent component stories. CoreAI overrides
  take precedence for matching story IDs; other included Fluent variants remain available.
- **`fluent-agent`** — optional supplementary source at `https://chat.fluentui.dev/mcp/server/`
  for icon/token search or general Fluent guidance.
  CoreAI's combined catalog remains the source for component decisions.

Connect the public hosted endpoint using your client's HTTP MCP configuration. In VS Code,
the entry in `.vscode/mcp.json` is:

```json
{
  "servers": {
    "coreai-ds-docs": {
      "type": "http",
      "url": "https://coreai-ds-storybook.azurewebsites.net/mcp"
    }
  }
}
```

For other clients, use their equivalent HTTP server configuration. Ask for approval before
editing client configuration. The catalog covers selected upstream stories, not every Fluent
story or API; inspect the index instead of assuming complete coverage.

Connection config (`mcp.json`) and the full toolset list live in one place — see
[Docs/MCP Setup](https://coreai-ds-storybook.azurewebsites.net/?path=/docs/docs-mcp-setup--docs).

### Required MCP workflow

**STOP CONDITION:** Do not select, add, change, or review a CoreAI component, prop, template,
or implementation pattern until the selected CoreAI documentation server responds successfully. An entry in
`mcp.json`, package source, TypeScript definitions, prior knowledge, and stock Fluent docs do
not satisfy this requirement.

1. Discover the connected server's tool names and argument schemas. The tool names below refer
   to `docs-list` (catalog index), `docs-show` (documentation), and `docs-show-story` (story
   examples); use the connected server's equivalents if its names differ. Confirm the CoreAI
   documentation server is connected by successfully calling its catalog index tool.
2. Use that index to determine whether CoreAI documents the component, extension, or template.
   Do not infer from the component name whether it is modified or passed through unchanged.
3. When the catalog has an entry, call `docs-show` before using the component. Call
   `docs-show-story` when a specific state or pattern is needed. Record the
   documented differences, defaults, constraints, and extensions.
4. Use the component's story index to find included Fluent examples for additional states or
   inherited APIs. Retrieve the relevant stories from the same CoreAI documentation server.
5. When the index has no component entry or a response lacks the needed API detail, report the
   documentation gap and ask the user how to proceed. Absence does not prove an unchanged API.
6. If CoreAI and included Fluent guidance conflict, follow CoreAI. Do not use Fluent examples to
   erase or override a CoreAI difference.
7. Implement only documented props, combinations, and patterns. If the catalog does not document the
   needed behavior, report the gap and ask the user instead of inventing it.

## Component IDs have no predictable scheme

IDs are inconsistent — `components-button-button` (Storybook groups `Button` inside a `Button`
folder alongside `CopyButton`/`DropdownButton`/etc., doubling category+name), but
`components-avatar` (not doubled), `components-datetime-calendar` (category `datetime`, name
`calendar`). You cannot guess an id from a component name.

- Call `docs-list` first, every session, before assuming an id.
- Pass `withStoryIds: false` when you don't need story ids yet — it meaningfully cuts response
  size.

## Templates vs. components

- **Components** are real, importable components, ids like `components-button-button`,
  `components-avatar` — import from the barrel as usual.
- **Templates** (`templates-empty-state`, `templates-filterable-list`,
  `templates-shell-and-navigation`) are higher-level, copy-paste starting points, **not exported
  from the package** — there's no import path for them. Call `docs-show` with the
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

Prefer these over guessing from a prop table alone — confirm the entry in `docs-list`, then pass its id to `docs-show`:

- **What CoreAI changes vs. stock Fluent** → `docs-variations-from-fluent--docs`
- **Theming / token overrides** → `docs-theming--docs`
- **Overriding styles with plain CSS/CSS Modules** → `docs-styling-with-css-modules--docs`

## If the CoreAI MCP is unavailable

Do not continue CoreAI-dependent implementation with package source, TypeScript definitions,
README files, prior knowledge, or upstream component documentation as a substitute.
You cannot know a component's CoreAI defaults or extensions until you check its documentation.

1. Tell the user that the CoreAI MCP is required and that continuing without it risks using the
   wrong wrapper API, defaults, or template.
2. Ask the user to help enable it now. In VS Code, direct them to **MCP: List Servers**, then
   the selected CoreAI documentation server, and ask them to start or restart it.
3. Stay on the connection problem with the user. After they respond, retry
   documentation index tool; do not assume that configuration succeeded.
4. If the server is missing from the client configuration, show the HTTP entry above and ask
   for approval before adding it. Start the connection and retry the documentation call.
5. If the hosted endpoint fails or denies access, report the actual response and verify the
   public-host deployment status with the user. If the consuming repository has a local CoreAI
   documentation server, it can supply the updated catalog. Pause CoreAI-dependent work until
   documentation is available.
6. Only proceed without the MCP when the user explicitly instructs you to do so after you have
   explained the risk. State the limitation in the final result and do not present offline
   findings as verified CoreAI documentation.

## Translating a Storybook URL into an MCP call

A link a human pastes in, e.g.
`https://coreai-ds-storybook.azurewebsites.net/?path=/docs/components-button-button--docs` or
`.../?path=/story/components-button-button--subtle-content-alignment`:

- The segment before `--` (`components-button-button`) identifies the component entry for
  `docs-show`; confirm it in the catalog.
- For a story URL, use the full story ID to locate its exact entry in the component's story
  index or `docs-list` with story IDs. Pass the identifier or name required by the discovered
  `docs-show-story` schema rather than guessing an export name from kebab-case.
- The updated catalog includes selected canonical Fluent stories alongside local CoreAI
  examples, including upstream variants that are not overridden locally. Retrieve these through
  the same server. If a UI story is absent or its returned example is incomplete, report that
  specific gap instead of assuming re-exported stories are always unavailable.

## Completion checklist

- CoreAI MCP documentation checked for each component used.
- Relevant included Fluent stories checked through the CoreAI catalog when additional states or
  inherited APIs are needed.
- CoreAI differences applied and given precedence over upstream examples in conflicts.
- Imports come from `@coreai-ds/react-components`, except icons and packages the barrel does not wrap.
- No undocumented props or invented component APIs.
- Existing behavior and accessibility preserved.
- Semantic tokens used for visual styling.
- Light, dark, narrow, and wide layouts considered.
