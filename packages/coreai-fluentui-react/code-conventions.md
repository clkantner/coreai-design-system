# Code conventions

## Custom style hook `mergeClasses` order (3-tier override priority)

Every component override in `src/components/*.styles.ts` is wired into
`CoreAIFluentProvider` via FluentProvider's `customStyleHooks_unstable`
(see `src/contexts/styleHooks.ts`). These hooks receive the component's already-rendered
`state`, and can only affect appearance by mutating a slot's `className`,
e.g. `state.root.className`.

The required priority order, low to high, is:

```
stock Fluent default  <  CoreAI theme (.styles.ts)  <  consumer instance className
```

i.e. the CoreAI theme should override Fluent's stock look, but a consumer of
`@coreai/fluentui-react` must always be able to override the CoreAI theme by
passing their own `className`/slot props to a component instance.

### The pattern

```ts
import { getSlotClassNameProp_unstable, mergeClasses } from '@fluentui/react-components';

export const useXStyles = (stateUnknown: unknown): void => {
  const state = stateUnknown as XState;
  const styles = useStyles();

  state.root.className = mergeClasses(
    state.root.className, // stock default + instance className, already fused by Fluent
    styles.root, // CoreAI theme overrides
    getSlotClassNameProp_unstable(state.root), // re-assert the ORIGINAL instance className
  );
};
```

Apply this same 3-argument shape to every slot a custom style hook touches,
not just `root` (see `Tag.styles.ts` for a `primaryText`/`secondaryRoot`
example, or `Overlay.styles.ts` for a dual-slot `root ?? content` example —
pass whichever slot object was actually resolved into
`getSlotClassNameProp_unstable`).

### Why this order, specifically

`mergeClasses` does not implement real CSS cascade. It resolves conflicts
**per CSS property**, roughly like sequential `Object.assign()` over each
argument's resolved property map — the last argument to declare a given
property wins that property, and an argument that doesn't declare a property
simply can't override it (there's no "unset").

By the time our `customStyleHooks_unstable` hook runs, Fluent has _already_
fused its own stock default classes with whatever `className` the consumer
passed, into one opaque value: `state.root.className`. That fused value must
therefore be the **first** (lowest-priority) argument — otherwise our theme,
or the consumer's override, can never beat Fluent's own stock styles for any
property Fluent's default also sets.

`getSlotClassNameProp_unstable` returns _only_ the className the consumer
originally passed as a prop — captured via a symbol at slot-creation time,
before Fluent's own fusion happens. Re-merging it as the **last** argument
re-asserts the consumer's override on top of our theme, for any property both
happen to touch, regardless of how Fluent's own internal fusion resolved
things.

This is Fluent's own sanctioned mechanism for this exact problem — see
[Advanced Styling Techniques](../../.github/skills/griffel-styling/advanced-styling-techniques.md)
(added in [microsoft/fluentui#34166](https://github.com/microsoft/fluentui/pull/34166)).

### Patterns to avoid

```ts
// ❌ Theme always wins over BOTH stock default and instance className.
state.root.className = mergeClasses(state.root.className, styles.root);

// ❌ Instance (and stock default) always wins over theme — theme can never
//    override a property that stock Fluent's own default also sets.
state.root.className = mergeClasses(styles.root, state.root.className);
```

Both of the above are 2-tier merges and were bugs found in this codebase
(fixed across `Table.styles.ts`, `Button.styles.ts`, `Card.styles.ts`,
`Dialog.styles.ts`, `Overlay.styles.ts`, `Accordion.styles.ts`, and
`Tag.styles.ts`). Always use the 3-argument pattern above instead.

## Independently tree-shakeable exports

Every component exported from the package root must be independently
tree-shakeable. Importing one component from `@coreai/fluentui-react` must not
make unrelated CoreAI components or their third-party dependencies reachable
in the consumer's bundle.

### Module structure

- Put each component implementation or wrapper initializer in its own module
  under `src/components/`.
- A module may import the dependencies needed by its own export, but it must
  not initialize unrelated components.
- Do not collect multiple `withComponentDefaults(...)` calls or other
  component factory calls in an aggregate module. Bundlers must conservatively
  retain ordinary function calls because they may have side effects.
- Re-export components declaratively from `src/index.ts`. CoreAI wrappers that
  replace names from `@fluentui/react-components` must use explicit named
  exports so they shadow the stock Fluent exports.
- Keep JavaScript modules side-effect-free. If a new import has a required
  side effect, declare the narrowest matching path in `package.json`'s
  `sideEffects` field rather than marking the entire package as side-effectful.

### Dependency ownership

- Runtime packages imported by a component belong in `dependencies` unless
  consumers are expected to provide and version them as framework peers.
- React and Fluent remain `peerDependencies` so consumers provide one
  compatible installation.
- Fluent peer ranges define the lowest supported consumer versions. Matching
  `devDependencies` pin the latest releases exactly; CI validates both latest
  and peer-minimum installations, and automated updates must not change the
  peer ranges.
- Directly imported build-only types and tools belong in `devDependencies`;
  do not rely on transitive dependencies being hoisted into the workspace.
- Dependency classification controls installation and version ownership. It
  does not provide bundle isolation; module boundaries and side-effect metadata
  do that.

### Validation

Changes to root exports, wrapper factories, module boundaries, dependencies,
or `sideEffects` must run:

```sh
npm --workspace packages/coreai-fluentui-react run test:tree-shaking
```

The Vite fixture bundles public root imports and asserts against Rollup module
IDs. Extend `scripts/test-tree-shaking.mjs` when adding a component with a
distinct dependency boundary. Include both:

- a negative assertion that an unrelated lightweight import does not reach the
  component or its dependencies; and
- a positive assertion that importing the component does reach its own module
  and required dependencies.

Prefer module-ID assertions over generated-code strings or exact byte
snapshots. Byte sizes change with dependency upgrades; reachability is the
contract.

## See also

- [Griffel styling skill](../../.github/skills/griffel-styling/SKILL.md) — indexed docs on Griffel's `makeStyles`/`mergeClasses`/`makeResetStyles` and this repo's known gotchas.
