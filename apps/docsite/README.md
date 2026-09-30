# @coreai/docsite

React SPA docsite for CoreAI. Built with Vite + React 18 and themed entirely with the repo's own [`@coreai/fluentui-react`](../../packages/coreai-fluentui-react) package (wrapped Fluent UI v9), the same way `apps/storybook` consumes it (workspace symlink, no ADO feed auth needed for in-repo builds). `vite build` emits a static bundle to `dist/`, then `server.js` serves it locally or on Azure App Service.

## Source of truth

- Base page inventory / nav / IA: [`site-registry.json`](site-registry.json)
- Canonical component guidance and metadata: plain Markdown in [`content/components/`](content/components)
- Offline Storybook input: [`content/storybook-index.snapshot.json`](content/storybook-index.snapshot.json)
- Changelog data: [`changelog.json`](changelog.json)
- Typed data layer and content validation: [`src/data/`](src/data)
- App shell + routing: [`src/App.tsx`](src/App.tsx), [`src/components/`](src/components)
- Theme provider (system/light/dark using `CoreAIFluentProvider`): [`src/theme/ThemeProvider.tsx`](src/theme/ThemeProvider.tsx)
- Pages: [`src/pages/`](src/pages)
- Build config (barrel alias + optimizeDeps to consume the package from source, mirrors storybook): [`vite.config.ts`](vite.config.ts)

## Scripts

Run from repo root:

```bash
npm run docsite        # vite dev server on http://localhost:8080
npm run build:docsite  # vite build → dist/
```

Run from workspace:

```bash
npm -w apps/docsite run dev      # vite dev server
npm -w apps/docsite run build    # vite build
npm -w apps/docsite run preview  # serve the built dist/ via vite preview
npm -w apps/docsite test         # build + route/cache/bundle regression tests
npm -w apps/docsite run generate:content # regenerate from Markdown + cached/local Storybook data
npm -w apps/docsite run generate:content:refresh # refresh from deployed Storybook
```

To exercise the exact production runtime (Node static server + SPA fallback) instead of vite's preview server, run `npm -w apps/docsite run build` then `npm -w apps/docsite start`.

## What ships

- Landing page with Storybook, Figma, and public npm destination links (npm publication
  remains pending approval). Audience cards are reserved for future content.
  Resource icons and labels use the link color
  at rest. The left-aligned content is centered horizontally and vertically
  within the main area's left half.
  An oversized, full-opacity, draggable logo extends off the page on the
  right. The desktop illustration is viewport-anchored and sized from viewport
  height, so toggling the sidebar does not resize or reposition it. Only the
  viewport clips it, not the inset page container. Narrow or short screens can
  still scroll when needed to reach the actual content.
  The illustration is 25% larger on desktop and mobile. It drifts at 0.080802
  radians/second (two successive 33% reductions from 0.18) under
  stationary lights, with Paper's animated Heatmap followed by
  Image Dithering (8x8 Bayer, 2px cells, original colors, colorSteps 4).
  Dither spacing uses CSS pixels for consistent
  texture across display densities. The cubes slightly overlap at their rounded
  corners to close the gaps. A theme-matched radial fade sits above the desktop
  illustration and below the hero content, without blocking pointer interaction.
  Reduced-motion preference stops both automatic drift and heatmap animation
  but keeps dragging available. The temporary tuning controls are removed.
  On narrow screens the logo moves below the content. Shared resource URLs come from
  [`shared/site-links.ts`](../../shared/site-links.ts); package and MCP guidance stay on the local site.
- App shell with header, sidebar nav, content column, footer, and prev/next page nav, composed from CoreAI `Button`, `Card`, `Input`, `Link`, and `Text` components
- Client-routed pages for resources, changelog, colors, typography, materials, Web UI Guidelines, component package, and agent skill
- Theme preference (system/light/dark, persisted in `localStorage` as `coreai-docsite-theme`), mobile nav toggle, token copy actions
- Exposed `site-registry.json` and `changelog.json` in built output for human and agent consumption (copied into `dist/` at build time)
- Component pages rendered from canonical Markdown, with matching downloads at `/components/{id}.md`
- Story IDs, preview options, and iframe targets generated from the live Storybook index
- Component routes and built registry entries generated from the canonical component records
- LLM discovery files at `/llms.txt` and `/llms-full.txt`, generated from the same component content
- Route-level JavaScript chunks, WOFF2 fonts, Brotli/gzip responses, and enforced delivery budgets

Because it is a client-rendered SPA, `server.js` includes an SPA fallback (serves `index.html` for unknown extension-less routes) so client-side deep links resolve.

### Navigation

The sidebar's **Home** item under **Getting started** opens the landing page.
On desktop, the logo button hides or shows the sidebar. The collapsed sidebar
shows only that button. Its size eases between states while the contents fade,
without wrapping during the transition. Reduced motion disables the transition.
The desktop open/closed state persists across reloads in `localStorage` under
`coreai-docsite-sidebar-collapsed`. The mobile overlay still starts closed.
Cmd/Ctrl+K expands it and focuses search. On mobile,
the logo closes the existing navigation overlay.

### Illustration shaders

The pipeline is **lit 3D X → Paper Heatmap → Paper Image Dithering → CSS radial fade**.

[`src/components/paper-heatmap.tsx`](src/components/paper-heatmap.tsx) uses Paper's
published Heatmap fragment shader with a ten-stop palette: the first two stops
match the page background (black in dark mode, white in light mode), allowing
cooler parts of the shape to disappear. The next lavender stop
(`coreaiBrandVariants[140]`) has about 12% opacity over that background.
The illustration contains no Azure-blue stops.
Seven purple stops bridge the tail to the center:
`coreaiBrandVariants[140]`, `[130]`, `[110]`, `[100]`, then three `[80]` stops.
This adds lavender-to-purple transitions while keeping most of the heated
range saturated brand purple in both themes.
The app shell owns the page backdrop; the provider has no duplicate fill.
All surfaces switch theme colors together with the shader and radial fade.
Transitions are suppressed until the new theme paints, then normal hover and
sidebar transitions resume. Rapid theme switches cancel pending cleanup frames.
The colors come from the shared CoreAI theme. Contour is 1.0
to strengthen the heat around edges without adding a separate outline.
Paper's noise is set to 0.025 for subtle texture variation without changing the palette.
The heat animation runs at 67% of its original speed.
Paper expects a preprocessed image, not a live render target. The adapter supplies
its contour, broad-blur, and inner-blur channels using GPU grayscale preparation
and library Kawase blur passes. This is a live approximation of Paper's static
CPU image preprocessing; it does not rewrite the heatmap animation or color algorithm.
Those smooth fields are capped at 512px on the longest side. Scene lighting drives
the heat fields, but does not multiply and dim the finished colors a second time.
The final composite keeps the original surface alpha so the colors stay on the cubes
without changing their silhouette. Paper adds a small amount of output grain even
with noise disabled. The adapter snaps colors within 0.012 of the base back to the
exact base color, preventing dithering from amplifying that grain into stray specks.
The vertex adapter cancels Paper's static-image
padding crop. No image snapshots or CPU readbacks run per frame.

[`src/components/paper-dithering.tsx`](src/components/paper-dithering.tsx) adapts
the published `imageDitheringFragmentShader` from the pinned
`@paper-design/shaders` package. The dithering algorithm is not copied or rewritten.
The adapter supplies the live heatmap render target, resolution, and pixel ratio.
It removes Paper's image-upload Y flip for render-target input
and lets Three.js supply the GLSL version directive. At the input/output boundary,
it separates color from the scene's premultiplied alpha, dithers color at full
opacity, then restores the sampled surface coverage. This prevents dark outlines
on partially transparent white edges without changing opaque heatmap colors.
No custom shading blend or
output-level shader runs after it. Original-color mode preserves the heatmap
colors in both themes, with a transparent background.

Upstream: [Heatmap](https://shaders.paper.design/heatmap),
[Image Dithering](https://shaders.paper.design/image-dithering), and
[shader source](https://github.com/paper-design/shaders/blob/main/packages/shaders/src/shaders/image-dithering.ts).
The Apache 2.0 license and Paper notice ship in
[`public/third-party/`](public/third-party/). When updating the package, verify
orientation, transparency, resizing, display density, theme switching, and dragging.

## Updating component guidance

Edit the `.md` files in [content/components](content/components); use
[Accordion.md](content/components/Accordion.md) as an example. Don't edit generated output.

Name sources `ComponentName.md`, matching component casing, or
`ComponentName-kebab-case-variant.md` for variants. Design-only patterns keep
descriptive PascalCase names. Frontmatter `id` remains the stable kebab-case route
and download name; renaming a source must not change it. Keep separate alias
documents distinct (for example, `EmptyState-alias.md`).

Nonstandard behavior in [shared/guidance.mjs](../../shared/guidance.mjs):

- **Do/Don't cards:** `## Best practices` with exactly two nonempty H3 sections,
  `### Do` and `### Don't`, becomes a green/red pair on the docsite only.
  Matching is case-sensitive; curly apostrophes work. Other shapes remain plain
  Markdown. See `bestPracticesCards` for boundaries and ordering.
- **Anchors:** docsite heading IDs and direct `#fragment` links receive a
  `guidance-` prefix automatically. See `renderGuidance`.
- **Exports:** status/resources come from frontmatter, not body headings.
  Previews prefer Storybook; design-only pages can use `figmaPreview` for an
  embedded Figma frame. Figma resources also appear as links alongside code and
  Fluent guidance. Pages may omit `storybookTitles` and use `resources: []`;
  exports omit an empty Resources section. See `guidanceMarkdown`.
- **Aliases:** `navigation.canonicalId` redirects a hidden page without merging
  its content. See `readGuidance`.

Generation runs on dev/build and Markdown saves. The
[docsite generator](scripts/generate-content.mjs) uses a local Storybook index or
the committed offline snapshot.
Guidance is published only on the docsite, not as separate Storybook or MCP entries.
The homepage links to the Figma library through
[`shared/site-links.ts`](../../shared/site-links.ts). Figma links and embeds keep
the design file's existing sharing permissions; readers may need to sign in or
request access.

### Build Inputs and Outputs

- Commit only the environment-free [offline snapshot](content/storybook-index.snapshot.json).
  `generate:content:refresh` updates it from hosted Storybook; set an absolute
  `STORYBOOK_INDEX_PATH` to refresh from a local build instead. Routine generation
  never updates it. Refresh deliberately when story associations change.
- All of `content/generated/` is ignored, including the runtime manifest and its
  `STORYBOOK_ROOT`. Storybook's generated MDX, build folders, and `.playwright*`
  artifacts are also ignored. The docsite `clean` script removes its generated output.
- CI/deploy build Storybook before testing/building the docsite against that exact
  index. Missing explicit paths fail instead of falling back. Without a local
  build, docsite generation works offline after dependencies are installed;
  Storybook itself still requires its pinned Fluent checkout.
- Story options are ordered by authored family order, then Default first and
  story ID. Unchanged docsite output is not rewritten. Dev/build/type-check use
  explicit preparation commands, including when `ignore-scripts=true`.

## Privacy and runtime diagnostics

The docsite does not collect or forward application telemetry, load analytics
scripts, or expose analytics configuration. Navigation search stays in the
browser, and the saved theme preference is used only for local presentation.
Ordinary startup logs and actionable console errors remain available.

The unauthenticated `/healthz` endpoint returns `{"status":"ok"}` for health
checks. The hosting template preserves the existing apps and their Entra
authentication without provisioning monitoring resources. Removing those
resources from the template does not delete existing Azure resources or
previously collected data; any cloud cleanup requires a separate, deliberate
administrator action.

## Deployment

The shared [GitHub deployment workflow](../../.github/workflows/deploy.yml)
deploys this workspace alongside Storybook and the MCP using ZIP deployments to
**existing** Azure App Services. It does not apply Bicep or change existing app
settings, startup commands, or authentication. The hosts retain Node 22 LTS on
Linux, with the docsite served by `npm start` / `node server.js`.

Deployment requires all of the following:

- The exact repository `microsoft/coreai-design-system` and branch `main`
- Repository variable `ENABLE_AZURE_DEPLOY=true`; authenticated site deployment
  does not require OSS release approval or enable npm publishing
- Passing CI and main-only access to the `azure-production` environment;
  the protected PR merge is approval, with no second human deployment gate
- Azure OIDC configuration and existing host identifiers supplied through that
  environment, as documented in [CI/CD setup](../../docs/CI-CD-SETUP.md)

The workflow responds to every main-branch push,
and supports manual dispatch subject to the same gates. It verifies existing
hosting authentication before deploying. No monitoring workflow is included.

## Easy Auth setup

Existing hosted apps remain restricted to their configured Entra tenant.
Unauthenticated docsite requests redirect to Microsoft Entra sign-in, except
the health endpoint. Publishing source does not make these hosts public.

Easy Auth is declared in [`infra/main.bicep`](../../infra/main.bicep) using the
**secretless implicit `id_token` flow**. Tenant lockdown comes from a
single-tenant app registration plus the tenant-specific issuer. This browser
sign-in configuration is separate from the workflow's Azure OIDC identity.

Bicep remains available for separately approved operator-managed infrastructure
changes, not routine app deployment. Preserve both apps' existing Easy Auth and
MCP settings when making such changes. See the
[hosting contract and prerequisites](../../docs/CI-CD-SETUP.md#app--mcp-hosting-azure-app-service--entra)
before changing infrastructure.
