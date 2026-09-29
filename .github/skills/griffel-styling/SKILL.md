---
name: griffel-styling
description: 'Author and debug Fluent UI v9 styles built on the Griffel CSS-in-JS engine. Use when writing or fixing makeStyles, makeResetStyles, mergeClasses, shorthands, tokens, custom style hooks (useXStyles_unstable / CustomStyleHooksProvider_unstable), RTL/@noflip handling, build-time style transforms, or when diagnosing override-precedence and class-collision bugs.'
---

Griffel is Fluent UI v9's CSS-in-JS engine. Read the relevant doc below before writing or debugging `makeStyles`/`mergeClasses` code — do not guess at API shape or merge semantics.

## Docs index

- [Styles Handbook](./styles-handbook.md) — The core reference. Explains Griffel's atomic-CSS model, `makeStyles` (and its lack of CSS shorthand support, use `shorthands.*` instead), `mergeClasses` (Object.assign-like, **last argument wins per CSS property**, never concatenate class strings), `makeResetStyles` (single monolithic class for base styles, avoids "rule explosion" from nested selectors/pseudo-classes), RTL auto-flipping (and the `@noflip` escape hatch + CSS-variable caveat), selector-complexity/performance guidance (avoid wide selectors like `> *`), and best practices (use `tokens` not literal colors, avoid `!important`, call `mergeClasses` once per element).

- [Styling Components (Basics)](./styling-components-basics.md) — Quick-start intro to `makeStyles`/`mergeClasses`. Covers the fundamental rule that **argument order in `mergeClasses` determines precedence** (later args win), how to merge parent-passed `className` correctly (`mergeClasses(classes.root, props.className)` — props last so callers can override), applying theme tokens, common anti-patterns (string concatenation, wrong merge order), the Griffel DevTools extension for debugging, and how to override styles on stock Fluent components from consumer code via `className`/slot props.

- [Advanced Styling Techniques](./advanced-styling-techniques.md) — How Fluent v9 components call `useXStyles_unstable(state)` then `useCustomStyleHook_unstable('useXStyles_unstable')(state)`, letting an app-level `CustomStyleHooksProvider_unstable` inject theme-wide overrides per component type. **Critical rule**: custom style hooks must merge as `mergeClasses(state.root.className, themeStyles.root, getSlotClassNameProp_unstable(state.root))` — theme styles are NOT last; the slot's original `className` prop is re-applied after theme styles so a caller's `className` always wins. Also covers why nested `CustomStyleHooksProvider_unstable` providers replace (not merge) values, and the pattern for composing multiple custom style hook sets ("Smart" + "Fancy" → "Smancy") by calling them in sequence, last-called-wins.

- [Build-Time Styles](./build-time-styles.md) — How to move Griffel's runtime style-resolution cost to build time via `@griffel/webpack-loader` (apps) or `@griffel/babel-preset` (libraries), including TypeScript preset config and using a custom `moduleSource` when `makeStyles` is re-exported from a third-party package (relevant for `@coreai/fluentui-react`'s own re-export). Explains what the transform actually does (replaces `makeStyles` calls with a lightweight `__styles` call + precomputed atomic CSS) and Linaria-based build-time evaluation of style helper code.

- [Unprocessed Styles (Raw Modules)](./unprocessed-styles.md) — Explains the multi-bundle CSS class-collision problem when several bundles each ship pre-processed Griffel styles (e.g. micro-frontends, CDN bundles), and the `.raw.js` raw-module bundler-resolution mechanism (Webpack/Vite `resolve.extensions`) that lets each bundle prefix its own class names instead of colliding. Includes a package support-status table for which Fluent packages ship raw modules today.

## Known gotchas relevant to this repo

- `mergeClasses` is **not** real CSS cascade — it resolves per-CSS-property conflicts via `Object.assign`-style last-argument-wins, before the browser ever sees the CSS. A losing class's declarations are dropped entirely, even if written with `!important`.
- The canonical, documented merge order for a custom style hook's root slot is `mergeClasses(state.root.className, themeClasses, getSlotClassNameProp_unstable(state.root))` per [Advanced Styling Techniques](./advanced-styling-techniques.md) — re-applying the slot's original className last so instance-level overrides win over theme styles. Compare this against any `applyToRoot`-style helpers in `packages/coreai-fluentui-react/src/components/*.styles.ts` when debugging override-precedence bugs.
- This 3-argument pattern gives a full **stock default < CoreAI theme < instance className** priority, including for properties that stock Fluent's own base styles also set (e.g. Table's `borderCollapse`) — `getSlotClassNameProp_unstable` recovers only the consumer's original className (captured before Fluent fuses default+instance), so re-applying it last always lets it win regardless of what the fused blob or theme classes contain.

## This repo's styling convention

See [`packages/coreai-fluentui-react/code-conventions.md`](../../../packages/coreai-fluentui-react/code-conventions.md)
for the mandatory `mergeClasses` order used by every custom style hook in
`packages/coreai-fluentui-react/src/components/*.styles.ts`, plus the two
"wrong" 2-tier patterns to avoid.

