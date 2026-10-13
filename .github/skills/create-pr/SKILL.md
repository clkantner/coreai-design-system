---
name: create-pr
description: 'Create a pull request for this repo. Use when asked to open/raise/make a PR. Reminds you to update changelogs'
argument-hint: 'e.g. "open a PR for my changes"'
---

# Creating a pull request

## PR scope and component verification

Before preparing the PR, resolve its target and inspect the complete proposed state with read-only
Git: committed changes from the merge base, staged and unstaged changes, and relevant untracked
files.

If that state changes a consumer-visible CoreAI component contract, load and follow
[component-test](../component-test/SKILL.md) using `changed components` and provide the resolved PR
target. Inspect implementation rather than relying on filenames. Skip component-test for unrelated
documentation, tooling, configuration, application code, and behavior-preserving moves or renames.

Treat the component-test handoff as authoritative; do not repeat its analysis or require tests when
existing coverage is sufficient. A `Blocked` or `Unverified` result must not be presented as
successful validation. Confirm the handoff still matches the final component-related PR state,
rerunning it only after material changes, and include its status in the PR summary.

Create-pr may invoke component-test. Component-test must not invoke create-pr or perform Git or PR
write operations.

## Documentation

Before opening a PR, make sure the docs are up to date where relevant:

- **Changelog** — if the change affects `@coreai-ds/react-components`, add an entry under `[Unreleased]` in [CHANGELOG.md](../../../packages/react-components/CHANGELOG.md).
- **Variations from Fluent** — if the change adds, removes, or alters how a component differs from stock Fluent, update [VariationsFromFluent.mdx](../../../apps/storybook/src/stories/docs/VariationsFromFluent.mdx).

Skip whichever doc doesn't apply (e.g. Storybook-only or docsite-only changes usually need neither).
Component-test may inspect these files as supporting evidence but does not edit them. If its handoff reports a documentation mismatch, resolve it through this create-pr documentation workflow.

## Quality checks

Before opening the PR, run the repository formatter and linter from the workspace root:

```sh
npm run format
npm run lint
```

Resolve any lint failures. If the formatter changes files, review and commit those changes before opening the PR.

Then open the PR with the `gh` CLI (`gh pr create`). Use only `gh` for this — if it isn't installed or the user isn't authenticated, prompt them to install it (https://cli.github.com) or run `gh auth login`, and stop until that's resolved.

## Assignee and reviewers

- **Assignee** — the author of the PR (assign it to themselves).
- **Reviewers** — everyone else on this team (exclude the author or the command will fail):
  - `arniebradfo` — James Bradford - UX Engineer
  - `Owen-Richard` — Owen Richard - UX Designer
  - `unthinkmedia` — Alex Britez - UX Engineer
  - `tinydinosaurs` — Dana Lachman - UI Engineer
  - `khamudom` — Kham Udom - UI Engineer
- **Optional reviewers** — add when the PR touches specific areas:
  - `weastler` — Will Eastler - UX Engineer - when updating anything related to build or deployment.

Set these with `gh pr create` (`--assignee`, `--reviewer`) or `gh pr edit` after creating the PR not inline as that will cause failures.

Assigning reviewers requires the `read:project` scope on the `gh` token. If it's missing, the command fails with a scope error. You can't complete the `gh` sign-in flow on the user's behalf, so prompt them to add the scope themselves by running:

```sh
gh auth refresh -s read:project
```

Then wait for them to confirm it's done before retrying.
