---
name: create-pr
description: 'Create a pull request for this repo. Use when asked to open/raise/make a PR. Reminds you to update changelogs'
argument-hint: 'e.g. "open a PR for my changes"'
---

# Creating a pull request

Before opening a PR, make sure the docs are up to date where relevant:

- **Changelog** — if the change affects `@coreai/fluentui-react`, add an entry under `[Unreleased]` in [CHANGELOG.md](../../../packages/coreai-fluentui-react/CHANGELOG.md).
- **Variations from Fluent** — if the change adds, removes, or alters how a component differs from stock Fluent, update [VariationsFromFluent.mdx](../../../apps/storybook/src/stories/docs/VariationsFromFluent.mdx).

Skip whichever doc doesn't apply (e.g. Storybook-only or docsite-only changes usually need neither).

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
  - `???` — Owen Richard - UX Designer
  - `???` — Alex Britez - UX Engineer
  - `???` — Dana Lachman - UI Engineer
  - `???` — Kham Udom - UI Engineer
- **Optional reviewers** — add when the PR touches specific areas:
  - `weastler` — Will Eastler - UX Engineer - when updating anything related to build or deployment.

Set these with `gh pr create` (`--assignee`, `--reviewer`) or `gh pr edit` after creating the PR not inline as that will cause failures.

Assigning reviewers requires the `read:project` scope on the `gh` token. If it's missing, the command fails with a scope error. You can't complete the `gh` sign-in flow on the user's behalf, so prompt them to add the scope themselves by running:

```sh
gh auth refresh -s read:project
```

Then wait for them to confirm it's done before retrying.
