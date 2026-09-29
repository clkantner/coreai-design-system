---
name: create-pr
description: 'Create a GitHub pull request for this repo, optionally link an issue, and verify checks. Use when asked to open/raise/make/update a PR. Reminds you to update changelogs.'
argument-hint: 'e.g. "open a PR for my changes"'
---

# Creating a pull request

1. Confirm the requested repository, remote, branch, and authenticated GitHub
   account before any push. The destination is `microsoft/coreai-design-system`.
   During open-source preparation, do not push to that destination without
   explicit authorization. A Microsoft Enterprise Managed User account may not
   have access; use an authorized personal account linked to Microsoft.

   ```sh
   git remote -v
   git status --short
   gh auth status
   ```

2. Update directly related docs:
   - For package changes, add an entry under `[Unreleased]` in
     [CHANGELOG.md](../../../packages/coreai-fluentui-react/CHANGELOG.md).
   - For changes to CoreAI's differences from Fluent, update
     [VariationsFromFluent.mdx](../../../apps/storybook/src/stories/docs/VariationsFromFluent.mdx).
   - Follow the package [contribution guide](../../../packages/coreai-fluentui-react/CONTRIBUTING.md).

3. Ask whether to link an issue if the user has not supplied one. Verify a
   supplied issue before referring to it; do not invent issue numbers or migrate
   legacy issue numbers to the new repository.

   ```sh
   gh issue view <issue-number> --repo microsoft/coreai-design-system --json number,title,url
   ```

4. Run formatting checks, lint, and the tests/builds appropriate to the change.
   Review any formatter changes and do not include unrelated work.

   ```sh
   npm run format:check
   npm run lint
   ```

5. Commit scoped changes, push to the verified remote, and open a PR:

   ```sh
   git push -u <verified-remote> <source-branch>
   gh pr create --repo microsoft/coreai-design-system --base main --head <source-branch> \
     --title "<title>" --body "<summary, validation, and optional issue link>"
   ```

   Use `Closes #<number>` only when the PR actually resolves that repository's
   issue. For fork contributions, use `<owner>:<source-branch>` for `--head`.
   Let repository review rules select reviewers; do not embed employee email
   addresses or internal project identifiers in this skill.

6. Verify the PR URL and checks. Report any failed follow-up explicitly; do not
   create a duplicate PR when a check or optional project update fails.

   ```sh
   gh pr view <number> --repo microsoft/coreai-design-system --json url,state
   gh pr checks <number> --repo microsoft/coreai-design-system
   ```
