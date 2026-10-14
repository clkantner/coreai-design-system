# CoreAI Prototype

A private npm workspace for a generic CoreAI prototype, using the local
`@coreai-ds/react-components` package.

## Run locally

From the repository root:

```sh
npm install
npm run prototype
```

Open <http://127.0.0.1:5174>. This port is reserved for the prototype so it does
not conflict with the docsite or Storybook. Startup requires no sign-in,
credentials, private package feed, or sibling repository.

```sh
npm --workspace apps/prototype run type-check
npm --workspace apps/prototype run lint
npm run build:prototype
npm --workspace apps/prototype run preview
```

The build outputs a static SPA in `build/client`. Production hosting must
serve `index.html` for app routes while serving assets normally.

This workspace intentionally contains no automated tests. Validate changes with
type-check, build, and manual browser checks.

## React Grab

React Grab loads only in the development browser and is excluded from production
builds. Hover over an element and press **Ctrl+C** (Windows) or **Cmd+C** (macOS)
to copy its element and component-source context, then paste it into your coding
agent. No external script or agent integration is configured.

The development-only [context plugin](app/dev/reactGrab.ts) adapts CoreaAI Sandbox's
Vellum reference mapping using Bippy and source maps. Copied context identifies
the selected element, the nearest project component, an intermediate Fluent
component when applicable, and project ancestor source locations. It removes
dependency and framework frames, consecutive same-name wrappers, noisy props,
and Fluent/Griffel classes, and decodes CSS Module class names.
Multiple selections get separate context blocks. If project context cannot be
resolved for every selection, the plugin logs a warning and preserves React
Grab's original text. React Grab prepends any user comment after this transform.
No Vellum dependency or inspector UI is included.

## Current migration stage

The source application's pages, shell, mock data, theme controls, and optional
Azure OpenAI functionality have been copied into this React Router
framework-mode SPA (`ssr: false`). Type-check and production build pass.
Home, the tool and model catalogs, the agent list and playground, the dashboard,
and Docs have been smoke-tested in the development browser.

The framework, router, and Node runtime are pinned together to public npm
version 7.15.0. The source application's 7.18.x framework versions were not
available on public npm when this workspace was created.

A local feature menu and floating variant selector replace the source tool's
feature controls. They use CoreAI menu and button components, plus the app's
custom router-backed `TabLinkList` with elevated appearance and small sizing.
No element inspector, commenting tools, sidebar, or tool-owned UI primitives
are included.

No source public images, illustration SVGs, font binaries, or favicons are
included. Some copied illustration components still request excluded SVGs and
return 404s; replacing them with large Fluent icons remains migration work.
Remaining product branding and hosted authentication references also need cleanup.

## Prototype features and variants

Edit [app/features.json](app/features.json) to register design alternatives.
The list is intentionally empty; the feature controls remain implemented and
ready for real design alternatives. Sample layout, density, and playground
definitions were cleared in a separate commit. Revert that cleanup commit to
restore the samples for visual review without changing the implementation.
The top-navigation **Prototype** button opens the feature menu; the floating
selector appears only on routes with variants.
The trigger is a compact CoreAI InteractionTag button, with hover, focus, and
keyboard interaction rather than a passive badge or a menu-button chevron.

```json
{
  "features": [
    {
      "id": "agent-layout",
      "label": "Agent layout",
      "notes": "Compare two playground layouts.",
      "defaultRoute": "/build/agents/:agent/playground",
      "defaultParams": { "agent": "agent-001" },
      "routes": ["/build/agents/:agent/playground"],
      "variants": [
        { "id": "current", "label": "Current" },
        { "id": "alternative", "label": "Alternative" }
      ]
    }
  ]
}
```

- Feature and variant IDs must be unique within their scope and use kebab case.
- `defaultRoute` must appear in `routes`. Supply `defaultParams` for required
  parameters so the menu can navigate from another page.
- Route matching uses React Router patterns. An existing matching pathname keeps
  its current parameter values instead of returning to the defaults.
- The first variant is the default. Multiple features on a route have independent
  selections, encoded as repeated `variant=feature-id--variant-id` parameters.
- Floating variant options use the existing tab navigation backed by React Router
  links, not form controls. Tab selection and active-link matching include the
  destination's query parameters, since pathname-only matching cannot distinguish
  same-page variants. Existing tab roles and keyboard behavior are retained.
  Links support copying their address and opening variants in another tab.
- Unrelated query parameters are preserved. Same-page selection also preserves
  the URL fragment. Selection changes participate in browser Back/Forward;
  default and invalid-parameter normalization replace the current history entry.
- Variants are remembered during client-side navigation. Reloads use the URL.
  Invalid, duplicate, and off-route selections are normalized with a console warning.
- Omit `variants` for a feature that is only a menu link.

Route components read their selection with the app-local hook:

```tsx
import { useFeature } from '~/features/FeatureContext';

const variant = useFeature('agent-layout');
```

Call the hook inside a component or custom hook under `FeatureProvider`.
It returns a variant ID, `true` for an applicable feature without variants, or
`null` when the feature does not apply. The component must render the design
associated with the returned ID; adding JSON alone does not create alternate UI.

Visibility is controlled only by the menu's **Show feature selector** checkbox.
There is no X or hide button on the floating selector. If an earlier session
saved it as hidden, use that checkbox to show registered features.
Drag its handle to move it, or focus the handle and use arrow keys.
Shift+arrow moves farther; Home resets to the bottom-center position.
Position and visibility are saved in namespaced local storage. The selector
stays inside the viewport when resized. Storage failures are logged and shown
in the menu or selector without preventing in-session changes.

## Migration compatibility

- The workspace uses React 18. Context providers must use
  `<Context.Provider value={value}>`, not the React 19 `<Context value={value}>` syntax.
- The prototype targets ES2022 and includes its standard-library types, matching
  copied code that uses `String.replaceAll` and related APIs.
- Vite deduplicates React and React DOM so linked workspaces and optimized
  dependencies use the same React instance. If stale optimized dependencies
  produce an invalid-hook-call error after a dependency change, stop the dev
  server and run `npm --workspace apps/prototype run dev -- --force`.

## Fonts and styling

The app loads the same hosted Aptos and Inter stylesheets as the docsite and
Storybook. Fonts require network access; the theme's system fallback remains
usable when the font hosts are unavailable. Font binaries are not bundled.

The shared font host allows `http://127.0.0.1:5174` and `http://localhost:5174`
through CORS, alongside the existing docsite and Storybook origins. Its
application-level allowlist was updated on October 7, 2026. New deployment
origins must also be added to that allowlist. This app does not proxy, copy,
or rehost the font binaries.

Styles use CSS Modules and an `app` container for responsive width queries.
The layer order is `griffel, common`, with page styles unlayered.

The prototype uses an app-owned [layered renderer](app/theme/createLayeredRenderer.ts)
through `RendererProvider`, above `CoreAIFluentProvider`. It wraps inserted rules
in `@layer griffel` and retains Griffel's rule buckets and media/container metadata.
CSS Modules therefore override normal Fluent rules without specificity hacks.
The renderer is created once per theme-provider instance and works during SPA
prerendering and in the browser.

This implements the behavior described in the
[CSS Modules guidance](../storybook/src/stories/docs/StylingWithCssModules.mdx)
without patching shared dependencies. Docsite, Storybook, tests outside this
workspace, and published package consumers keep their normal renderers.
No `patch-package` hook or global Griffel override is installed.

For manual validation, check that the top-navigation brand link computes to
`display: flex` with the neutral foreground color, and that its logo and text
align horizontally at desktop width. Check navigation, dialogs, and mobile
layout in both development and production preview.
