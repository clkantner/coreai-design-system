# @coreai/storybook

Storybook playground that previews [`@coreai/fluentui-react`](../../packages/coreai-fluentui-react) against the canonical Fluent UI v9 stories.

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

This is resolved automatically: [`.storybook/main.ts`](.storybook/main.ts) derives the set of story ids owned by `src/` forks (from each fork's meta `title` + named exports) and an `experimental_indexers` hook drops any colliding canonical entry from `fluent-stories/` during indexing. The fork becomes the single owner of that id with **no list to maintain and no edits to the vendored sources** — just add the fork file.

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
[`agent/SKILL.md`](../../packages/coreai-fluentui-react/agent/SKILL.md), mirrored to the hosted
Storybook as [Docs/Agent Skill](src/stories/docs/AgentSkill.mdx) (generated — see
[Agent Skill mirror](#agent-skill-mirror) below).

### Servers

Declared in [`.vscode/mcp.json`](../../.vscode/mcp.json); MCP-aware clients pick them up
automatically.

| Server                     | URL                                                 | Use                                                                                                                                                                                                                |
| -------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `coreai-ds-docs`           | `https://coreai-ds-storybook.azurewebsites.net/mcp` | **Default.** Hosted, always on (deploy/auth in the [CI/CD doc](../../docs/CI-CD-SETUP.md#app--mcp-hosting-azure-app-service--entra)).                                                                              |
| `coreai-ds-docs-localhost` | `http://localhost:6006/mcp`                         | The local dev server — for authoring/previewing story changes before deploy. Only works while Storybook is running.                                                                                                |
| `fluent-agent`             | `https://chat.fluentui.dev/mcp/server/`             | Upstream Fluent fallback (Microsoft Entra OAuth): `ask_fluent_agent`, icon + token lookup/validation. Don't use its component tools — they return raw `@fluentui/react-components` imports that ignore our barrel. |

Both Storybook servers expose the same content and toolset. The hosted one is powered by the
standalone [`@storybook/mcp`](https://www.npmjs.com/package/@storybook/mcp) library reading the
built `manifests/`; the local one by [`@storybook/addon-mcp`](https://www.npmjs.com/package/@storybook/addon-mcp)
(**dev-server-only**), registered in [`.storybook/main.ts`](.storybook/main.ts). Edit stories
against the local server; the hosted one picks up changes on the next deploy.

**Toolsets:**

- `list-all-documentation` — enumerate every component / docs entry (optionally with story IDs).
- `get-documentation` — full docs for one component: prop types + the first few example stories.
- `get-documentation-for-story` — docs for a single named story variant.
- `get-storybook-story-instructions` — repo conventions for authoring stories.
- `preview-stories` — live preview URLs for given stories.

### How accurate props are produced (React Component Meta)

Prop APIs come from Storybook's **React Component Meta (RCM)**, enabled in
[`.storybook/main.ts`](.storybook/main.ts) (`features.experimentalReactComponentMeta`,
`typescript.reactDocgen: false`). RCM resolves a component's real prop types from the TypeScript
program of the story file — which only works when the story resolves through a **working**
tsconfig. That's why our component stories live under `src/stories/` and import from the
`@coreai/fluentui-react` barrel (the vendored `fluent-stories/` sources sit next to broken
upstream tsconfigs, so RCM can't resolve them — hence the fork pattern above).

### How stories reach the agent-facing manifest

The MCP manifest only surfaces stories authored **inline** in a `src/` file with a real code
snippet — a canonical Fluent story that is merely _re-exported_ renders for humans but is not
snippettable for agents. So each component story authors an inline `Default` (and any
CoreAI-specific variants) directly. The id-collision between a fork and its canonical re-export
is handled by the dedup indexer described in
[Replacing a canonical story with a CoreAI fork](#replacing-a-canonical-story-with-a-coreai-fork)
above.

Every MCP-facing code example must also be **wholly contained in the story's `render` function**.
The MCP synthesizes its usage snippet from `render`; it does not include module-level example
helpers, constants, hooks, or styles that the render references. A story can look correct in the
Storybook canvas while producing an incomplete snippet that an agent cannot use. Put all code
needed to understand and reproduce the example inside `render`, apart from imported public APIs.

```tsx
// Correct: the MCP snippet contains the complete example.
export const WithActions: StoryObj = {
  render: () => {
    const actions = ['Reply', 'Share'];

    return (
      <Card>
        <CardFooter>
          {actions.map((action) => (
            <Button key={action}>{action}</Button>
          ))}
        </CardFooter>
      </Card>
    );
  },
};

// Wrong: the MCP snippet references code that will not be included.
const ExampleWithActions = () => (
  <Card>
    <CardFooter>...</CardFooter>
  </Card>
);
export const WithActions: StoryObj = { render: () => <ExampleWithActions /> };
```

This self-contained-render rule applies to each public component and template story exposed to
the MCP. Dev-only stories may use module-level helpers because they are not agent-facing. Shared
production components and utilities remain normal imports; do not copy library implementation
code into a story.

> `forkOwnedStoryIds` is computed once at config load, so **adding or renaming a story export
> requires a dev-server restart** for the dedup to pick it up.

Don't try to recover a canonical package's extra variants by re-exporting them from a fork, e.g.
`export { A, B } from '../../../fluent-stories/.../index.stories'`. Those renders fine in the
Storybook UI (and in `index.json`), but they're still not _inline_ in the fork file, so they hit
the same manifest gap as any other re-export: `get-documentation-for-story` returns empty and
`get-documentation` won't list them. If a variant is worth keeping, hand-author it inline like
`Default`; otherwise it's fine to just drop it when excluding the vendored package.

### Agent Skill mirror

[`packages/coreai-fluentui-react/agent/SKILL.md`](../../packages/coreai-fluentui-react/agent/SKILL.md)
is the single authored source for agent-behavioral guidance (MCP server precedence, component-ID
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

Agent-facing component and story descriptions come from **JSDoc comments in the story file**. The
`parameters.docs.description.component` / `.story` fields feed the Storybook UI only — they
**never** reach the MCP. Two knobs: the **meta JSDoc** (above `export default`) drives the
component, and a **story JSDoc** (above each `export const <Story>`) drives that story.

**Component — JSDoc above `export default`:**

| JSDoc part                | Where it appears                                                                                                              |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| body text                 | `get-documentation` description (under `ID:`)                                                                                 |
| `@summary`                | `list-all-documentation` line — verbatim, not truncated                                                                       |
| _(no JSDoc)_              | falls back to the component's upstream docgen description                                                                     |
| `@summary` only (no body) | list line shows the summary; `get-documentation` shows **no** description (an empty body also suppresses the docgen fallback) |

```
/**
 * <body>
 * @summary <one line>
 */
export default { title, component, subcomponents, ... }
```

`list-all-documentation` → `- <Name> (<id>): <@summary · else body truncated ~90 · else upstream>`

`get-documentation` →

```
# <Name>
ID: <id>
<body · else upstream docgen · else nothing if @summary-only>
## Subcomponents   ← each subcomponent's own upstream docgen (NOT settable from this file)
## Stories         ← per-story (see below)
## Props           ← from React Component Meta (NOT from JSDoc)
```

**Story — JSDoc above `export const <Story>`:**

| JSDoc part | Where it appears                                                                                                             |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------- |
| body text  | `get-documentation-for-story`, and the story's block inside `get-documentation`                                              |
| `@summary` | **only** the compact "Other Stories" list in `get-documentation` (stories past the first 3) — **not** in the full story view |

```
/**
 * <body>
 */
export const <Story> = () => ...;
```

`get-documentation-for-story` →

```
# <Component> - <Story>
<body>
<code snippet>
```

What you **can't** control from the story file: `## Props` (RCM), `## Subcomponents` blurbs (each
subcomponent's upstream docgen), and anything in the Storybook Docs tab (`parameters.docs.*`).

**Standalone MDX docs (`docs/*.mdx`)** — no JSDoc equivalent exists here, so a plain body/heading
text falls back to a truncated, tag-stripped dump of the raw MDX (ugly — e.g. leftover `#`/`**`
markdown syntax). Set the `summary` attribute directly on the page's `<Meta>` tag instead:

```mdx
<Meta title="Docs/Theming" summary="One-line blurb shown in list-all-documentation." />
```

`list-all-documentation` → `- <title> (<id>): <summary · else truncated tag-stripped MDX>`

### Component story layout

Story files under `src/stories/` are grouped into three folders:

- `components/` — one CoreAI story per component (our customized wrappers **and** the
  formerly-generated Fluent wrappers, now merged and hand-maintained). Each owns its
  `Components/*` meta, curates an inline `Default`, and (optionally) a `@summary` on its
  `export default`.
- `templates/` — copy-paste template patterns (EmptyState, FilterableList, ShellAndNavigation).
  See [Creating a template](#creating-a-template) below for the full convention.
- `docs/` — standalone MDX docs (Introduction, Theming, Variations from Fluent, Styling with CSS
  Modules, MCP Setup).

### Dev-only stories (visible in the UI, hidden from the MCP)

Some stories exist purely to visually QA a utility or prop across every permutation we can think
of (sizes × appearances × icon-only × …) — useful in the Storybook UI, but too dense and
noisy to hand an agent through the MCP, which wants one clear, minimal example per API.

**Pattern:** move the dense/exhaustive story out of `{Name}.stories.tsx` into a sibling
`{Name}Dev.stories.tsx`, and give the API a single, focused, real-world example story back in
`{Name}.stories.tsx` (see `Button.stories.tsx`'s `SubtleContentAlignment` for a focused example).

- **File:** the dev file must be named `{Name}Dev.stories.tsx` and share the **exact same**
  `title` as `{Name}.stories.tsx`'s meta (e.g. both `"Components/Button/Button"`). Sharing the
  title keeps them as one entry in the Storybook sidebar/story index, so the dense variant is
  still reachable in the UI right next to `Default`.
- **Exports:** since title + export name is the story id, a dev story only needs a `Dev` suffix
  (e.g. `SubtleContentAlignmentDev`) when its name would otherwise collide with a same-named
  public story export in `{Name}.stories.tsx`. Otherwise, name it plainly (e.g. `Appearance`).
- **No `component`/`parameters` needed** on the dev file's default export beyond `title` — keep it
  minimal (see `ButtonDev.stories.tsx`).

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
`@coreai/fluentui-react` and `@fluentui/react-icons` installed. **No Storybook imports** (no
`Meta`, `StoryObj`, or `@storybook/*` references). Use only `tokens.*` values in `makeStyles` —
no hardcoded colours/sizes/spacing (exception: a `minHeight` with no matching token, commented
as to why). Declare all styles in a single `useStyles` call at the top of the file.

#### `{Name}.stories.tsx`

Keep it minimal: a `meta` (title `Templates/{Name}`, `layout: "fullscreen"`) plus a `Default`
`StoryObj` (never a raw function-component export — see CSF3 rule below). Add extra story
exports only for genuinely distinct, useful variants (see `EmptyState.stories.tsx` for an
example with 4) — don't add one just to show off a prop, since the full source is one click
away in the Source Code docs entry. All Fluent/CoreAI imports come from `@coreai/fluentui-react`
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
| body text above `export default meta`   | `get-documentation` description                         |
| `@summary` above `export default meta`  | `list-all-documentation` line                           |
| body text above `export const <Story>`  | that story's block inside `get-documentation`           |
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
`?raw` + `parameters.docs.source.code`, the old convention)? MCP's `get-documentation` returns
**standalone MDX docs pages as raw file text**, but reconstructs a story's `render()` into
synthesized "usage code" rather than the literal file — so an MDX page is the only way to give
an agent the _exact_, complete, copy-pasteable file contents instead of a fabricated
approximation. `<Meta name="Source Code">` renames the Docs tab and its id suffix (e.g.
`templates-empty-state--source-code` instead of `--docs`); `<Meta summary="...">` gives
`list-all-documentation` a clean one-liner instead of a truncated raw-MDX dump.

**Never hand-edit a `.mdx` file under `templates/`** — any edits are silently overwritten on the
next regeneration. If the content is wrong, fix `{Name}.tsx` or the generator script.

#### Quality checklist

- [ ] `npm --workspace apps/storybook run type-check` and `run build` both pass
- [ ] All story exports are `StoryObj` objects; no export name shadows a JS global
- [ ] All component imports come from `@coreai/fluentui-react`
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
