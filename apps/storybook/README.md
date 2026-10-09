# @coreai-ds/storybook

Storybook playground that previews [`@coreai-ds/react-components`](../../packages/react-components) against the canonical Fluent UI v9 stories.

## Quickstart

From the repo root:

```bash
npm install               # bootstrap all workspaces (one root install)
npm run storybook         # http://localhost:6006
```

Or from this workspace directly:

```bash
npm -w apps/storybook run dev
```

Toolbar dropdowns toggle theme (CoreAI / Web / Teams / Teams v2.1) and Light / Dark mode.

## Scripts

| Script                   | What it does                                                                                |
| ------------------------ | ------------------------------------------------------------------------------------------- |
| `npm run dev`            | Prepare content, then start the Storybook dev server on port `6006`.                        |
| `npm run build`          | Prepare content, then build the static Storybook site to `storybook-static/`.               |
| `npm run type-check`     | `tsc --noEmit` over the app sources.                                                        |
| `npm run verify:build`   | Assert that a static build contains Fluent stories and generated documentation.             |
| `npm run stories:init`   | (Re)provision `fluent-stories/` from scratch at the pinned upstream commit.                 |
| `npm run stories:update` | Re-sync `fluent-stories/` to the pinned commit (same as `stories:init`).                    |
| `npm run stories:ensure` | Provision `fluent-stories/` only if it is missing. Runs automatically before `dev`/`build`. |

The dev/build scripts are exposed at the repo root as `npm run storybook` and `npm run build:storybook`. The `stories:*` scripts are local to this workspace — run them from `apps/storybook/` (or via `npm -w apps/storybook run stories:init`).

You normally never need to run these by hand: `dev` and `build` explicitly invoke `storybook:prepare`, which runs `stories:ensure` and generates the template and Agent Skill documentation. Preparation is part of the requested scripts rather than an npm `pre*` lifecycle hook, so it still runs when the repository uses `ignore-scripts=true` to suppress dependency lifecycle scripts.

## `fluent-stories/` — sparse-checkout sibling repo

`apps/storybook/fluent-stories/` is a separately-provisioned, sparse, shallow checkout of [`microsoft/fluentui`](https://github.com/microsoft/fluentui) that contains only the canonical story sources. It is gitignored from this repo, and the Storybook app's webpack config rewrites Fluent imports inside those stories to route through the CoreAI barrel — so the canonical Fluent stories render with CoreAI defaults applied, without us editing any of Fluent's code.

It is provisioned by [`scripts/setup-fluent-stories.mjs`](scripts/setup-fluent-stories.mjs), a small cross-platform script driven by a `{ repo, ref, sparsePaths }` config. The upstream `ref` is **pinned to a fixed commit** (the single source of truth for the version), so builds are reproducible and upstream churn can't silently break the playground. To bump it, edit `ref` in that script and run `npm run stories:update`.

Setup is automatic because `dev` and `build` run `storybook:prepare` before Storybook starts. GitHub Actions also verifies the built story index before deployment. To force a fresh local re-provision, run `npm run stories:init`.

### Replacing a canonical story with a CoreAI fork

Most canonical stories already render with CoreAI defaults via the import rewrite, so you rarely need to fork. When you _do_ want to override a specific story's content (e.g. to add CoreAI-specific copy), add a fork under `src/stories/` that reuses the canonical story's `title` + export name. The canonical re-export would otherwise collide with the fork on story id ("Duplicate stories with id").

For the UI index, [`.storybook/main.ts`](.storybook/main.ts) derives the set of story ids owned by `src/` forks and an `experimental_indexers` hook drops colliding canonical entries during indexing. This does not establish ownership in the MCP manifest: the current Accordion manifest points to the upstream file even though the UI index points to the local override. Verify both outputs when evaluating story ingestion changes.

## Figma integrations

Component stories link to their CoreAI Figma frames through `@storybook/addon-designs`.
The meta spreads `figmaDesign("<name>")` from
[`src/utils/figma.ts`](src/utils/figma.ts) into `parameters`, adding a **Design**
tab with the corresponding frame. Add new mappings to the `figmaNodes` registry
and apply the helper to the component's story meta.

The introduction also links to the Figma library through
[`shared/site-links.ts`](../../shared/site-links.ts). Links and embeds retain the
design file's existing permissions; users may need to sign in or request access.

## MCP for AI agents

This design system ships a **Model Context Protocol (MCP)** server so AI agents read accurate,
CoreAI-specific component knowledge (props, example stories, templates) instead of guessing prop
names or pulling raw upstream Fluent APIs. This section documents how the MCP **content** is
authored. For how the hosted server is **deployed and authenticated**, see
[docs/CI-CD-SETUP.md](../../docs/CI-CD-SETUP.md#app--mcp-hosting-azure-app-service--entra). For
**connection setup** (`mcp.json`, server URLs), see [Docs/MCP Setup](src/stories/docs/MCPSetup.mdx).
For the **behavioral rules** an agent should follow (which server to prefer, component-ID quirks,
offline fallback), see the distributable
[`agent/SKILL.md`](../../packages/react-components/agent/SKILL.md), mirrored to the hosted
Storybook as [Docs/Agent Skill](src/stories/docs/AgentSkill.mdx) (generated — see
[Agent Skill mirror](#agent-skill-mirror) below).

### Servers

Declared in [`.vscode/mcp.json`](../../.vscode/mcp.json); MCP-aware clients pick them up
automatically.

| Server                     | URL                                                 | Use                                                                                                                                   |
| -------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `coreai-ds-docs`           | `https://coreai-ds-storybook.azurewebsites.net/mcp` | **Default.** Hosted, always on (deploy/auth in the [CI/CD doc](../../docs/CI-CD-SETUP.md#app--mcp-hosting-azure-app-service--entra)). |
| `coreai-ds-docs-localhost` | `http://localhost:6006/mcp`                         | The local dev server — for authoring/previewing story changes before deploy. Only works while Storybook is running.                   |

Both Storybook servers expose the same content and toolset. The hosted one is powered by the
standalone [`@storybook/mcp`](https://www.npmjs.com/package/@storybook/mcp) library reading the
built `manifests/`; the local one by [`@storybook/addon-mcp`](https://www.npmjs.com/package/@storybook/addon-mcp)
(**dev-server-only**), registered in [`.storybook/main.ts`](.storybook/main.ts). Edit stories
against the local server; the hosted one picks up changes on the next deploy.

The Storybook runtime, local addon, and standalone host are pinned to the same `10.6.1` release so
both MCP surfaces use Storybook's shared docs toolset and manifest schema.

**Toolsets:**

- `docs-list` — enumerate every component and standalone docs entry, optionally with story IDs.
- `docs-show` — full docs for one component: prop types, initial examples, and its story index.
- `docs-show-story` — complete docs for a single named story variant.

### How accurate props are produced (React Component Meta)

Prop APIs come from Storybook's **React Component Meta (RCM)**, enabled in
[`.storybook/main.ts`](.storybook/main.ts) (`features.componentsManifest` plus
`features.experimentalDocgenServer`, with `typescript.reactDocgen: false`). RCM resolves component
types through TypeScript. Current vendored Fluent entries report component-resolution errors;
that observation does not establish which ingestion or TypeScript configuration change is needed.

### How the manifest works

The manifest is a machine-readable index, not a rendered page. Storybook reads CSF story files,
component types, and MDX docs. The public MCP tools use that data:

- `docs-list` reads the index. With `withStoryIds: true`, it also loads story snapshots.
- `docs-show` loads a component's prop API and initial examples.
- `docs-show-story` loads the selected story's static snippet.

With `experimentalDocgenServer`, the built `manifests/components.json` contains `$ref` links
instead of embedding every API and snippet. Those links point to JSON snapshots under
`services/core/docgen/` and `services/core/story-docs/`. Deploy the **whole** Storybook build,
not just the manifest index files. The existing hosted `manifestProvider` reads these snapshots
from the same build directory.

In development, the MCP tools read the running docgen service. The raw
`/manifests/components.json` and `/manifests/docs.json` routes return 404 in this mode.
Use [`/manifests/components.html`](http://localhost:6006/manifests/components.html) to inspect
the data and extraction problems. In a production build, the JSON files are available on disk.

The component-only validation found the same coverage before and after enabling the server:
16 locally owned component entries with 52 snippets, and 60 vendored Fluent component entries
with 608 stories but no extracted snippets. The UI index contains 142 local component stories;
90 are absent from locally owned manifest entries. These counts describe the current setup,
not a general restriction on supported story shapes. Template-specific validation is deferred.

Upstream references: [Manifests](https://storybook.js.org/docs/ai/manifests),
[docgen server configuration](https://storybook.js.org/docs/api/main-config/main-config-features#experimentaldocgenserver),
and [MCP docs tools](https://storybook.js.org/docs/ai/mcp/overview#docs).

### Validating story extraction

Use the current docs tools to check extraction rather than imposing authoring restrictions from
older MCP versions. CounterBadge currently returns its configured `count={5}` and CoreAI import.
The current Fluent re-export entries return missing-snippet messages, and local overrides can
lose manifest ownership even when they render correctly.

Before choosing an ingestion strategy, test imported render functions, imported example
components, re-exports, module-level data/helpers/styles, and description/code-source parameters
with unique component and story IDs. Then test collisions separately. Compare the expected
source stories with both the UI index and MCP output, not only entries already in the manifest.

#### Experiment 1: direct imported render

[`ImportedAccordionRender.stories.tsx`](src/stories/experiments/ImportedAccordionRender.stories.tsx)
imports Fluent's Accordion Default and assigns it directly to `render` under a unique title.
With Storybook 10.6.1 and `experimentalDocgenServer`, both the live MCP and built-manifest MCP
return the experiment through `docs-list`, and `docs-show` returns the Accordion prop API.
However, `docs-show-story` returns only:

```tsx
import { Accordion } from '@coreai-ds/react-components';

const Default = () => <Accordion />;
```

The upstream implementation contains three Accordion items with headers and panels; none are
included in this snippet. Direct imported render assignment is therefore not sufficient for
publishing that example through the current docs tools. This result does not establish the
behavior of an imported component wrapper, re-export, or other ingestion method.

#### Experiment 2: imported example component wrapper

[`ImportedAccordionWrapper.stories.tsx`](src/stories/experiments/ImportedAccordionWrapper.stories.tsx)
uses the same upstream example with `render: () => <FluentDefault />`, under another unique
title. Both the live MCP and built-manifest MCP discover the story and return the Accordion
prop API, but the story snippet is:

```tsx
import { Accordion, Default as FluentDefault } from '@coreai-ds/react-components';

const Default = () => <FluentDefault />;
```

The example implementation is not included. The import also incorrectly attributes the upstream
story's `Default` export to the CoreAI component package rather than its actual story file.
This wrapper therefore does not provide a usable standalone example in the tested setup.

#### Experiment 3: re-export from a local CSF file

[`ReExportedAccordion.stories.tsx`](src/stories/experiments/ReExportedAccordion.stories.tsx)
provides local CoreAI component metadata under a unique title and directly re-exports Fluent's
Default. Both the live MCP and built-manifest MCP list the story and return the Accordion
prop API, but `docs-show-story` reports that no snippet was extracted.

The story snapshot records a `SyntaxError`: `Expected story to be a function or variable
declaration`, pointing at the re-export declaration. Local metadata resolves component props,
but this tested re-export shape still fails snippet extraction without any ID collision.

#### Experiment 4: inline control

[`InlineAccordionControl.stories.tsx`](src/stories/experiments/InlineAccordionControl.stories.tsx)
places the upstream Default's three-item JSX directly in a local `render` function under a
unique title, with imports from the CoreAI barrel. Both the live MCP and built-manifest MCP
list the story, return Accordion props, and include all three items, headers, and panels in
the example, with imports for all four Accordion components.

This confirms that the simple example extracts successfully in the inline control. It does
not establish how module-level dependencies, more complex stories, or ID collisions behave.

#### Remaining experiments and provider pilot

The additional experiments use unique titles and are tested against both live HTTP MCP and
the standalone handler reading built snapshots:

| Experiment                                    | Observed result in Storybook 10.6.1                                                                        |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Module-level data                             | Snippet references `items` but omits its declaration and values.                                           |
| Module-level helper component                 | Snippet references `ExampleItem` but omits its implementation.                                             |
| Module-level Griffel styles and bundled icon  | Snippet omits `useStyles` and the bundled icon declaration. The direct icon import is retained.            |
| Literal and raw `parameters.docs.source.code` | MCP uses the synthesized empty Accordion, not the supplied full source, including after browser rendering. |
| `parameters.docs.description`                 | Tested parameter markers are absent; JSDoc markers are present.                                            |
| Two local CSF files with one title            | UI indexes both stories; MCP lists only the winning file's story.                                          |
| One CSF owner with both stories               | Both examples remain available through MCP.                                                                |

Storybook exposes an experimental `experimental_storyDocsProvider` preset. A middleware can
delegate to the built-in provider or return its own payload, including a full self-contained
snippet without the payload-level `import` field. This feeds both live `core/story-docs` and
the built snapshots; no hosted MCP change is required.

The bounded [provider pilot](.storybook/ingestion-experiment-provider.ts) applies only to
`Experiments/MCP/Provider ...` titles. Its small local CSF files re-export the selected stories.
Accordion now combines the actual local CoreAI Default with Fluent's Controlled story in one
component document. The provider labels each story's source. For the local Default, a scoped
TypeScript AST extraction keeps the example and its imports while excluding Storybook metadata
and its Figma helper; this is not a general local-story dependency extractor.

Upstream stories return complete source with component imports changed to the CoreAI barrel.
Accordion Default/Controlled, Button Appearance, and DataGrid Default return complete examples,
including module-level styles, icons, data, types, and column definitions where used.
All four returned examples type-check. Chromium checks confirmed the original upstream pilot's
rendered examples and Accordion interactions. Other component entries still use the built-in
provider. This proves a manual mixed-source pilot, not the full automated merge pipeline.

Preset changes require a clean dev-server restart for this validation; an existing service
instance initially returned cached built-in results. Do not treat hot reload as proof that a
new provider is active.

References: [provider types](https://github.com/storybookjs/storybook/blob/v10.6.1/code/core/src/shared/open-service/services/story-docs/types.ts)
and [story-docs service](https://github.com/storybookjs/storybook/blob/v10.6.1/code/core/src/shared/open-service/services/story-docs/README.md).

Run the focused experiments against built output:

```bash
node --test apps/storybook/scripts/ingestion-mcp.test.mjs
```

Or against a running server in PowerShell:

```powershell
$env:MCP_EXPERIMENT_URL = 'http://localhost:6006/mcp'
node --test apps\storybook\scripts\ingestion-mcp.test.mjs
```

### Proposed Fluent ingestion plan

The shared story inventory is implemented in [`scripts/story-inventory.mjs`](scripts/story-inventory.mjs).
Run `npm --workspace apps/storybook run stories:inventory` to write
`.storybook/.cache/story-inventory.json` (gitignored). The module also exports
`createStoryInventory()` for the future generated indexes and provider to share.

The inventory reads the included Fluent CSF indexes and local component CSF files, using
Storybook's parser for canonical story IDs and export filtering. It records component metadata
expressions and their source files, story export names, direct implementation paths, imports,
local declarations/JSDoc, and assignment-style annotations such as args and parameters.
Metadata is recorded per source, not merged or evaluated in this step. Dependency imports
are recorded, not bundled or checked for snippet completeness.

Local definitions win matching story IDs; the replaced upstream definition is retained in
`overridden`. Conflicting same-origin story IDs, component ID/title collisions, missing source
modules, and missing explicit titles fail with errors. The current inventory selects 76
components and 686 stories: 142 local, 544 Fluent, and 69 overridden upstream stories.
Templates and experiment fixtures are excluded.

The existing package exclusion list is shared with Storybook through
[`scripts/fluent-story-scope.mjs`](scripts/fluent-story-scope.mjs).
This step does not change story ownership in the UI or MCP, generate CSF indexes, or
replace the provider pilot's manual map. Run the focused tests with
`npm --workspace apps/storybook run test:inventory`; they also run in `verify:build`.

The tested direction is **generated CSF indexes plus a source-backed story-docs provider**,
not moving upstream code into render functions or hand-authoring manifests.

1. Resolve and pin the Fluent commit matching the exact installed component package version.
   Record both versions and fail on a mismatch rather than selecting a nearby release.
2. Inventory expected component titles and story IDs from upstream and local sources before
   generation. Preserve existing exclusions until their scope is explicitly reviewed; the
   current included catalog is not the whole upstream Storybook.
3. Generate one gitignored CSF index per component title inside the app's TypeScript project.
   Re-export upstream variants and local overrides from their original files. Index the
   generated owners instead of also indexing their input files. Local definitions win matching
   story IDs; local-only variants remain. Diagnose conflicting local definitions.
4. Supply explicit CoreAI `component` and `subcomponents` metadata in those indexes. Preserve
   local metadata, args, decorators, design links, and story behavior. Test metadata precedence
   in the pilot rather than assuming object spreads preserve all intended settings.
5. Generalize the provider to use the same ownership map. Publish full example source with its
   dependencies and correct CoreAI/icon imports, without restructuring module-level Griffel
   hooks or example data. Use an AST to select code and rewrite imports, not regex source merging.
   Keep Storybook-only configuration out of consumer examples and carry descriptions separately.
6. Handle relative dependencies explicitly. Of the 608 current upstream leaf files, 388 have
   module-level declarations and 18 import relative files: 17 import Markdown and one imports
   Tree helper modules. Extract Markdown into descriptions; include or package the helper source.
   Preserve non-barrel package imports and identify required consumer dependencies. Unsupported
   sources must produce actionable errors, not partial examples presented as complete.
7. Expand the working Accordion/Button/DataGrid provider pilot into a generated ownership pilot.
   Verify local override precedence, additional variants, metadata, rendered behavior, and
   identical live/built docs-tool content before generating the full catalog.
8. Gate completion on the expected source inventory: every intended story ID is discoverable,
   its snippet is present and usable, component APIs resolve, and source-only relative imports
   do not leak into examples. Test upstream version updates and removals. Remove experiment
   entries after the production pipeline is validated. Templates remain out of scope.

If original upstream stories replaced by local overrides must also be published, give those
originals a separate namespace; they cannot share the local story's ID. This policy remains
an implementation decision, not something the pilot has resolved.

> `forkOwnedStoryIds` is computed once at config load, so **adding or renaming a story export
> requires a dev-server restart** for the dedup to pick it up.

### Agent Skill mirror

[`packages/react-components/agent/SKILL.md`](../../packages/react-components/agent/SKILL.md)
is the single authored source for agent-behavioral guidance (MCP workflow, component-ID
quirks, template-vs-component, offline fallback) — it ships inside the npm package for consumers
outside this monorepo. [`scripts/generate-skill-doc.mjs`](scripts/generate-skill-doc.mjs) mirrors
it, byte-for-byte, into a generated `src/stories/docs/AgentSkill.mdx` (gitignored — same pattern
as the [template docs](#creating-a-template)) so it's also addressable through the MCP tools.
Never hand-edit `AgentSkill.mdx`; edit `agent/SKILL.md` and it regenerates on the next
`predev`/`prebuild`/save (`npm run docs:skill` to force it).

### Shared Component Guidance

Design and content guidance is authored in
[`apps/docsite/content/components`](../docsite/content/components) and published
only on the docsite, not as separate Storybook or MCP entries. See the
[docsite authoring contract](../docsite/README.md#updating-component-guidance).
Component props, examples, template docs, and the Agent Skill remain in Storybook/MCP.

Separate guidance entries previously cluttered MCP discovery. Revisit how
guidance is grouped with component docs before adding MCP publication.

### Curating descriptions & summaries (JSDoc → tool output)

Existing stories use JSDoc descriptions and `@summary`, and standalone MDX pages use a
`summary` on their `<Meta>` tag. Verify the resulting text through `docs-list`, `docs-show`,
and `docs-show-story`. The precedence and support for `parameters.docs.description` and
code-source parameters must be revalidated against the current docgen server.

### Component story layout

Story files under `src/stories/` are grouped into three folders:

- `components/` — local CoreAI component stories and overrides, including development variants.
- `templates/` — copy-paste template patterns (EmptyState, FilterableList, ShellAndNavigation).
  See [Creating a template](#creating-a-template) below for the full convention.
- `docs/` — standalone MDX docs (Introduction, Theming, Variations from Fluent, Styling with CSS
  Modules, MCP Setup).

### MCP curation

Storybook supports `manifest` and `!manifest` tags to control manifest inclusion.
A `Dev` filename or export suffix does not itself hide a story from MCP. Check the manifest
debugger and docs tools when changing inclusion or grouping stories under the same title.

### Creating a template

Templates live under `src/stories/templates/` and are **copy-paste starting points**, not
importable components. Every template ships as exactly **two** hand-authored files, plus one
build artifact:

| File                 | Authored by   | Purpose                                                                                                                                           |
| -------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `{Name}.tsx`         | you           | **Single source of truth** — the actual component + styles users copy-paste. No Storybook imports.                                                |
| `{Name}.stories.tsx` | you           | Storybook meta + story objects + JSDoc docs for MCP. Minimal — usually just a `Default` story.                                                    |
| `{Name}.mdx`         | **generated** | A "Source Code" docs page showing the full, real file content of `{Name}.tsx` verbatim. Gitignored. **Never hand-author or hand-edit this file.** |

> **Never create a separate `{Name}.knowledge.md`, `{Name}.template.tsx`,
> `{Name}Variants.stories.tsx`, or `{Name}.templateSource.ts`.** Those patterns previously
> duplicated a template's code and docs across up to 5 files. Variants live as additional story
> exports in `{Name}.stories.tsx` (keep them minimal); the full source is surfaced exclusively
> through the generated `.mdx` Source Code entry, never re-embedded via a `?raw` import or a
> `parameters.docs.source.code` string.

#### `{Name}.tsx`

Self-contained — a consumer should be able to drop it into a project with only
`@coreai-ds/react-components` and `@fluentui/react-icons` installed. **No Storybook imports** (no
`Meta`, `StoryObj`, or `@storybook/*` references). Use only `tokens.*` values in `makeStyles` —
no hardcoded colours/sizes/spacing (exception: a `minHeight` with no matching token, commented
as to why). Declare all styles in a single `useStyles` call at the top of the file.

#### `{Name}.stories.tsx`

Keep it minimal: a `meta` (title `Templates/{Name}`, `layout: "fullscreen"`) plus a `Default`
`StoryObj` (never a raw function-component export — see CSF3 rule below). Add extra story
exports only for genuinely distinct, useful variants (see `EmptyState.stories.tsx` for an
example with 4) — don't add one just to show off a prop, since the full source is one click
away in the Source Code docs entry. All Fluent/CoreAI imports come from `@coreai-ds/react-components`
(never `@fluentui/react-components`); icons from `@fluentui/react-icons`; never import
`JSXElement` from `@fluentui/react-components` (use `React.JSX.Element` or inference). A
full-page/edge-to-edge template opts out of the padded canvas via `parameters.fullBleed: true`
on the story (see `.storybook/preview.tsx`'s decorator).

**CSF3 story format** — every story export must be a `StoryObj` object:

```ts
// ✅ Correct
export const Default: StoryObj = { name: "My Template", render: () => <MyTemplate /> };
// ❌ Wrong — raw function export
export const WithSidebar = () => <MyTemplateWithSidebar />;
```

**Export names** must never shadow JS globals — use `ErrorState` not `Error`, `MapView` not
`Map`, `SetView` not `Set`.

The sidebar `title` is set once, in `{Name}.stories.tsx`'s `meta.title` — the generated `.mdx`
reads it back from there (`titleFor()` in the generator script), so it can never drift.

**Docs — JSDoc only**, following the same convention as `src/stories/components/*.stories.tsx`
(see [Curating descriptions & summaries](#curating-descriptions--summaries-jsdoc--tool-output)
above). Templates do not use `tags: ["autodocs"]` or `parameters.docs.description` — there's no
separate human-facing Docs UI page beyond the generated Source Code entry.

| JSDoc part                              | Where it appears                                        |
| --------------------------------------- | ------------------------------------------------------- |
| body text above `export default meta`   | `docs-show` description                                 |
| `@summary` above `export default meta`  | `docs-list` line                                        |
| body text above `export const <Story>`  | that story's block inside `docs-show`                   |
| `@summary` above `export const <Story>` | "Other Stories" compact list (stories past the first 3) |

The meta JSDoc body **must lead with** a copy-paste warning and a pointer to the Source Code
docs entry (that ordering matters — it's the first thing an agent or human sees), then the real
description, then `@summary`:

```ts
/**
 * Copy-paste template — not an importable component. Copy the full source from
 * the `templates-{kebab-name}--source-code` docs entry.
 *
 * <then the actual description of what the template is/does>
 *
 * @summary <one line, mention variant count if > 1 story>
 */
```

#### `{Name}.mdx` — generated Source Code docs page (do not hand-author)

[`scripts/generate-template-docs.mjs`](scripts/generate-template-docs.mjs) generates one `.mdx`
per `{Name}.tsx`. It's gitignored and regenerated: once via `predev`/`prebuild`; live, on every
save to a file under `src/stories/templates/`, by a Vite dev-server watcher (`.storybook/main.ts`);
or on demand via `npm --workspace apps/storybook run docs:templates`. The generated page is
intentionally bare — just a `<Meta name="Source Code" summary="...">` tag and a fenced code
block of the real `{Name}.tsx` file content.

Why a separate generated docs page instead of embedding the source in `{Name}.stories.tsx` (via
`?raw` + `parameters.docs.source.code`, the old convention)? MCP's `docs-show` returns
**standalone MDX docs pages as raw file text**, but reconstructs a story's `render()` into
synthesized "usage code" rather than the literal file — so an MDX page is the only way to give
an agent the _exact_, complete, copy-pasteable file contents instead of a fabricated
approximation. `<Meta name="Source Code">` renames the Docs tab and its id suffix (e.g.
`templates-empty-state--source-code` instead of `--docs`); `<Meta summary="...">` gives
`docs-list` a clean one-liner instead of a truncated raw-MDX dump.

**Never hand-edit a `.mdx` file under `templates/`** — any edits are silently overwritten on the
next regeneration. If the content is wrong, fix `{Name}.tsx` or the generator script.

#### Quality checklist

- [ ] `npm --workspace apps/storybook run type-check` and `run build` both pass
- [ ] All story exports are `StoryObj` objects; no export name shadows a JS global
- [ ] All component imports come from `@coreai-ds/react-components`
- [ ] `{Name}.tsx` has no Storybook imports
- [ ] `{Name}.stories.tsx` has no `?raw` import, no `parameters.docs.source.code`, no
      `tags: ["autodocs"]`, no `parameters.docs.description`
- [ ] Meta JSDoc leads with the copy-paste warning + `--source-code` pointer, then the real
      description, then `@summary`
- [ ] Every story export has JSDoc (with `@summary` if likely to appear past the first 3)
- [ ] No `{Name}.knowledge.md` / `.template.tsx` / `Variants.stories.tsx` / `.templateSource.ts`
      file exists for this template, and you haven't hand-edited the generated `{Name}.mdx`

## Deployment

This app deploys to Azure App Service (Storybook + the hosted MCP at `/mcp`), publishing to
https://coreai-ds-storybook.azurewebsites.net. The pipeline, hosting, and MCP authentication are
documented in
[docs/CI-CD-SETUP.md](../../docs/CI-CD-SETUP.md#app--mcp-hosting-azure-app-service--entra).
