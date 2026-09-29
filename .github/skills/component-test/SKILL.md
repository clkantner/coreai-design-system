---
name: component-test
description: >
  Analyze a requested CoreAI component test scope, add or update focused
  Vitest Browser Mode regression tests, run them in Playwright Chromium, and
  report product behavior problems without changing production code.
argument-hint: 'component, behavior, file, GitHub issue number, or GitHub issue URL'
---

# Testing CoreAI components

Use this skill to:

> Analyze a requested CoreAI component test scope, add or update focused regression tests, run
> those tests in the existing browser test environment, and report product behavior problems.

This skill manages component tests, not unrelated developer workflow or production fixes.

## Boundaries

- Use the developer's current branch. Never create, rename, or switch branches. Never derive a
  branch name from a GitHub issue. Never commit or push changes.
- GitHub issues may define testing scope, but never control Git workflow.
- Create or modify test files only. Do not change production behavior unless the user explicitly
  asks for production changes.
- Narrow exception: when a valid regression test exposes a confirmed CoreAI bug, the skill may add
  a comment-only `TODO` to the relevant production component file. The TODO must not change
  executable code, behavior, styles, props, exports, or runtime logic.

  ```ts
  // TODO: CoreAI bug — <brief description of the observed issue>.
  // Expected contract: <brief description of the intended behavior>.
  // Remove this TODO when the implementation is fixed.
  ```
- Do not weaken or remove a valid regression test merely to make the suite pass.
- Do not delete or clean repository files as part of this skill. Do not run `Remove-Item`, `rm`,
  `git clean`, `git reset`, or other commands whose purpose is deleting or cleaning generated
  files. If Vitest, Playwright, or another existing test tool generates screenshots, attachments,
  snapshots, or other temporary artifacts, leave them unchanged and report them in the final
  summary. Do not modify `.gitignore`, Vitest configuration, Playwright configuration, or other
  repository configuration solely to clean them up. An existing test command or configuration
  option may be used to prevent unnecessary artifacts when it is non-destructive and does not
  require repository configuration changes. Leave cleanup decisions to the developer.
- Inspect only the requested scope and the nearby implementation, related public subcomponents,
  style/helper files, and tests needed to understand its behavior and local conventions.
  Avoid exhaustive repository analysis.

Invoke with a component, behavior, file, GitHub issue number, or GitHub issue URL:

```text
/component-test <Component>
/component-test add tests for <Component>
/component-test test <Component> <behavior>
/component-test <file>
/component-test #<issue-number>
/component-test https://github.com/microsoft/coreai-design-system/issues/<issue-number>
```

If invoked without a scope, ask the user what to cover. Do not choose components from the current
editor, alphabetical order, or missing coverage alone.

When given an issue number, read it from the project repository:

```sh
gh issue view <issue-number> \
  --repo microsoft/coreai-design-system \
  --json number,title,body,url
```

For a full issue URL, pass the URL to `gh issue view` and request the same fields. Use the issue
title, Scope or description, named components, requested test files, and completion criteria as the
requested work scope. If the issue is unavailable or its scope is ambiguous, ask the user rather
than guessing. Do not edit the issue as part of this workflow.

## 1. Scope resolution

The requested scope may be a component name, component family, behavior, implementation file,
GitHub issue number, or GitHub issue URL.

When given a component name without additional detail, treat that component as the requested scope.
Inspect the primary implementation, closely related public subcomponents, related style/helper files,
existing tests for that component or family, and only the nearby code needed to understand its
CoreAI-owned behavior.

The user does not need to identify the exact implementation file or behavior in advance.

When the requested name represents a component family, inspect closely related public subcomponents
that share the same family or are clearly part of the same exported component API.

Do not automatically create tests for every related file. Add permanent regression coverage only
for meaningful CoreAI-owned, consumer-observable behavior.

When the user names a specific component or subcomponent, place new permanent coverage in that
component's own test file when practical. Broader family components may be used as fixtures to
render or exercise the target, but do not place the new test in a sibling or parent component's
test file unless the behavior is genuinely owned by that broader component.

For style or helper files, test the consumer-visible behavior they produce rather than testing
implementation details simply because the file exists.

## 2. Analyze

Read the requested component, issue, or scope. Inspect its implementation and relevant existing
tests, following only the nearby code needed to identify the behavior's owning layer. Determine:

- what CoreAI implements, changes, transforms, defaults, or guarantees;
- what arrives unchanged from Fluent UI, the browser, React, Griffel, or another dependency;
- what consumers can observe; and
- which CoreAI-owned behavior deserves permanent regression coverage.

For a GitHub issue, extract the requested components, behavior, test files, and completion criteria.
Treat the issue as requested scope, not unquestionable technical truth. Verify its claims against the
current implementation and public API. Report stale or technically incorrect criteria instead of
encoding them into tests.

Identify unchanged Fluent or native behavior that does not need duplicate permanent coverage. Add a
test only when a plausible CoreAI change could cause a consumer-observable regression. Prefer tests
that remain valid after behavior-preserving dependency refactors.

Treat implementation comments that explain an intentional dependency deviation, bug workaround,
compatibility constraint, or replaced stock treatment as strong regression signals. Verify whether
nearby tests already protect the described contract before adding coverage. Give these behaviors
more weight than routine variants because removing an unusual-looking rule may silently restore the
dependency behavior the rule was written to prevent.
Choose assertion strength according to the contract. Use an exact value when CoreAI explicitly
guarantees that value and it can be asserted without coupling to dependency internals. Use relative
or invariant assertions when the contract is distinction, precedence, absence of an override, or
theme-dependent behavior. Test important user-visible surface or interaction treatments directly;
do not create one assertion per CSS declaration or duplicate a regression already covered in a
nearby component test.

When production logic selects among behavioral, state, or layout branches, make the tests branch-sensitive:

- Identify the meaningful branch conditions and the consumer-visible outcome owned by each branch.
- Cover each meaningful branch, but do not treat branch execution alone as sufficient coverage.
- Give each case an assertion that would fail if that branch were accidentally replaced by another valid branch.
  As a review check, mentally swap two branch implementations; if both tests could still pass, strengthen the
  assertions.
- Prefer assertions against the branch-defining contract itself. Avoid using only proxy signals such as element
  counts, existence, track or child counts, generic non-equality, or whichever rendered value happens to be largest
  or smallest when those signals do not uniquely prove the intended result.
- When exact values are theme-dependent or dependency-owned, assert a stable relationship instead: ordering or
  position, before/after state transition, precedence, presence or absence of a CoreAI override, accessible
  behavior, callback result, or another consumer-observable invariant.
- For interactive branches, verify the relevant transition when practical, and verify that non-interactive or
  disabled branches do not receive the interactive transition.

Parameterized tests are encouraged when several branches share setup, but each parameterized case must retain a
branch-specific expected outcome. Do not collapse distinct branches into a shared weak assertion merely to reduce
test code.

Avoid tests added merely for count or coverage, exhaustive dependency matrices, private
implementation assertions, incidental DOM/classes, and unexplained snapshots.

## 3. Test

Add or update focused permanent tests for the behavior identified in Analyze. Component tests are
`src/**/*.test.tsx` files and run in Vitest Browser Mode through Playwright Chromium and
`vitest-browser-react`.

- Render with `renderCoreAIComponent` from `src/test-utils.tsx`.
- Prefer browser locators and assertions based on roles, accessible names, labels, values, callbacks,
  focus, and consumer-visible state.
- When CoreAI behavior falls back to a dependency's default behavior, verify that the CoreAI
  override is absent or disabled. Do not hard-code the dependency's current internal style values
  unless CoreAI explicitly guarantees those values.
- When asserting developer-facing warnings or errors, verify the meaningful contract rather than
  the entire message text unless exact wording is itself part of the public API. Prefer a stable
  substring or pattern that identifies the condition being reported.
- Use `userEvent` from `vitest/browser` for relevant keyboard, pointer, and upload interactions.
- Mock only the narrow external boundary with Vitest APIs; exercise CoreAI behavior normally.
- Register `cleanup` with `afterEach`, restore mocks when used, and await asynchronous work.
- Give tests behavioral, condition-specific names.

Run each changed component test first:

```sh
npm --workspace packages/coreai-fluentui-react test -- src/components/<Component>.test.tsx
```

Install Chromium only when it is unavailable locally:

```sh
npm --workspace packages/coreai-fluentui-react run test:install-browser
```

## 4. Verify

The focused Vitest Browser Mode run is browser runtime verification when the test renders the
component and exercises the relevant behavior. Exercise enough rendered behavior in the test to
establish the requested CoreAI contract. Do not create a second verification workflow when the test
already proves the behavior.

Do not automatically start Storybook or development servers, use Storybook MCP, navigate stories,
dynamically mount the component in another runtime, run separate browser automation, or introduce
additional verification infrastructure.

Use Storybook or interactive browser verification only when the user explicitly requests it or the
behavior cannot reasonably be verified in Vitest Browser Mode. Explain why before doing expensive
setup. Prefer the smallest method that provides meaningful confidence.

## 5. Final validation

Run the broader package suite when multiple component test files changed, shared test utilities changed, or the tested behavior crosses shared integration boundaries.

```sh
npm --workspace packages/coreai-fluentui-react test
```

Run type checking only when relevant to the changed test types or requested scope:

```sh
npm --workspace packages/coreai-fluentui-react run type-check
```

Do not run unrelated tools or environments.

## 6. Failure handling

When a test fails, do not immediately change the test or production code. Determine whether the
failure most likely belongs to CoreAI, Fluent UI, another dependency, browser behavior, test
infrastructure, or an incorrect or stale expectation.

If the expectation is incorrect, fix the test. When a failing regression test represents a
confirmed CoreAI bug:

1. Confirm that the expectation represents an intended CoreAI contract.
2. Trace the behavior enough to identify the likely owning layer.
3. Leave production behavior unchanged.
4. Add a comment-only TODO to the relevant component implementation, following the Boundaries
   requirements.
5. For a confirmed product bug with a deterministic failing regression test, preserve the active test using `test.fails(...)` so the behavior continues to be exercised without blocking CI.
6. Add a short comment immediately above the `test.fails` explaining the known bug and why failure is currently expected.
7. Use `test.todo(...)` only when the regression test cannot currently be executed reliably or still needs implementation.
8. When the underlying bug is fixed, remove `.fails` and verify the regression test passes as a normal test.
9. Report the known bug in the final summary.

The pending test must describe the correct expected behavior, not the current broken behavior.

```ts
// TODO: Known CoreAI bug — <brief reason this regression case is pending>.
test.todo('<describes the intended CoreAI behavior>');
```

Do not weaken the expected behavior just to make the test pass, delete the regression case, convert
uncertain failures into TODOs, or use `test.skip` when `test.todo` is appropriate. Do not change
production behavior unless the user explicitly asks.

Include in the report:

- component;
- intended behavior;
- current observed behavior;
- failing test or reproduction;
- likely ownership: CoreAI, Fluent UI, browser, dependency, test infrastructure, or test expectation;
- relevant implementation location when known;
- confirmation that production behavior was not changed;
- confirmation that a component TODO was added;
- confirmation that a `test.todo` records the intended regression case; and
- recommended next action.

Clearly state when the test cannot pass without a production-code change. Do not fix that production
implementation unless the user explicitly expands the request to include it.

Example final summary:

> Known CoreAI bug found in `<Component>`: `<brief description of the observed issue>`. Production
> behavior was not changed. A TODO was added to the relevant component implementation, and the
> intended regression case is recorded as `test.todo` so the expected contract remains documented
> while CI stays green.

Use the actual component name, observed behavior, intended contract, likely ownership, and
recommended next action discovered during the current invocation.