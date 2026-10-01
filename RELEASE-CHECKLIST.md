# Open-source release checklist

This temporary workdown tracks the remaining steps for making this repository public and
publishing `@coreai/fluentui-react`. It summarizes repository-specific actions in general terms;
the applicable approval process and current Microsoft policies remain authoritative.

Repository visibility, hosted-service access, and npm publication are separate release decisions.
Do not treat completion of one as authorization for another.

## Approval and ownership

- [ ] Record final open-source approval for the repository, its name, license, third-party
      materials, branding, and intended distribution.
- [ ] Confirm the maintainers responsible for community support, security response, dependency
      updates, and package releases.
- [x] Verify that the destination is the private `microsoft/coreai-design-system` repository, its
      default branch is `main`, and the authorized Microsoft open-source GitHub account has
      administrator access.
- [x] Verify that the active organization ruleset protects `main` from deletion and force pushes,
      requires pull requests, one approval, code-owner review, and approval after the last push, and
      cannot be bypassed by the current administrator.
- [x] Add a `CODEOWNERS` file naming the approved maintainers so the organization rule requiring
      code-owner review is effective.
- [ ] After CI is green, configure the `Validate` status check as required for `main`; the current
      organization ruleset does not require status checks and no repository-level branch protection
      is configured.

## Legal and third-party review

- [ ] Confirm that `LICENSE.txt`, `NOTICE`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`,
      and `SUPPORT.md` use the approved current text.
- [ ] Complete the third-party review for dependencies, Paper Shaders, Fluent UI stories, icons,
      images, screenshots, sample content, and generated artifacts; update `NOTICE` and bundled
      license files as required.
- [x] Document the known third-party materials and required trademark terms in the README.
- [ ] Confirm that no proprietary fonts, product icons, or other assets without redistribution
      rights are present in source or generated artifacts.
  - [ ] Confirm redistribution rights for the tracked docsite PNG illustrations and CoreAI logo
        effects under `apps/docsite/public/`.

## Source and artifact review

- [x] Run `npm run check:public-source` against the staged release-preparation contents.
- [x] Check the current generated package, docsite, and Storybook output for tracked font binaries,
      source maps, known internal URLs, common credential signatures, and analytics configuration.
- [ ] Scan the final source, commit history, npm tarball, docsite output, and Storybook output with
      the approved security and disclosure tools.
- [ ] Review public files and generated output for secrets, internal-only URLs or identifiers,
      private contact information, credentials, deployment profiles, and source maps.
- [x] Confirm that product-usage telemetry and related configuration are absent, and that any
      remaining operational diagnostics match the documented behavior.
- [x] Confirm that Aptos and other locally supplied assets are absent from tracked files and the npm
      package.

## Validation

- [x] In the current checkout, run formatting, lint, type-check, component tests, tree-shaking and
      package tests, docsite production tests, Storybook production build verification, and
      Storybook host tests.
- [ ] Repeat the required formatting, lint, type-check, test, package, docsite, and Storybook
      validations from a clean checkout with a fresh dependency install.
- [x] Build the production docsite and Storybook and pass their automated output verification.
- [ ] Manually review the production docsite and Storybook for broken links, missing assets,
      unexpected upstream content, and inaccessible public documentation.
- [ ] Verify that the final release snapshot and its Git history match the approved publication
      approach.

## npm package

- [ ] Confirm ownership and publishing permissions for the `@coreai` npm scope and
      `@coreai/fluentui-react`.
- [ ] Choose an unused public package version and confirm the intended release notes.
- [ ] After license approval, change `packages/coreai-fluentui-react/package.json` from
      `"license": "UNLICENSED"` to the approved SPDX license identifier, include the approved
      license text in the packed package, update the package-lock metadata, and verify the tarball.
- [ ] Configure and review the protected npm publishing environment and least-privileged publishing
      identity while leaving release gates disabled until publication is authorized.

## Publication and follow-up

- [ ] Receive explicit authorization before changing repository visibility.
- [ ] Make the repository public and verify anonymous access to source, issues, documentation,
      security guidance, license, and notices.
- [ ] Separately authorize and perform the first npm publication, then verify package contents,
      provenance, metadata, installation, and public links.
- [ ] Verify the intended authentication and access settings for the docsite, Storybook, MCP
      endpoint, and deployment workflows after the repository becomes public.
- [ ] Record the released source commit and package version in the approved tracking location.
- [ ] Delete `RELEASE-CHECKLIST.md` after every applicable item is complete and the release record is
      stored in its permanent location.
