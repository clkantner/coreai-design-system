---
name: release-package
description: 'Prepare or release @coreai/fluentui-react on public npm. Read RELEASING.md first; publication requires explicit OSS approval, protected environment approval, and manual confirmation.'
---

# Releasing @coreai/fluentui-react

Before any release work, read
[RELEASING.md](../../../packages/coreai-fluentui-react/RELEASING.md), the source of
truth for approval, versioning, packaging checks, and manual publishing.

- Preparation alone never authorizes publishing, pushes, version bumps, tags,
  repository creation or visibility changes. Do not enable release gates without
  recorded legal/open-source and package/access approval.
- Target only `microsoft/coreai-design-system`, public npm, and approved `main`.
  The manual workflow requires repository variables `OSS_RELEASE_APPROVED=true`
  and `NPM_PUBLISH_ENABLED=true`, a protected `npm-production` environment and
  exact `publish @coreai/fluentui-react@VERSION` confirmation.
- Before bumping, inspect every merged PR since the last approved release baseline
  (`git log --merges --first-parent <last-tag>..HEAD`) and reconcile all user-visible
  changes with `## [Unreleased]`. Log breaking migrations explicitly.
- Validate an actual tarball with `npm run test:package --workspace
  packages/coreai-fluentui-react`. Main/types/exports must already target compiled
  `dist`; never rely on npm rewriting them through `publishConfig`. Do not ship
  locally installed Aptos assets or any other font binaries.
- Review private package selection, npm scope ownership and access before the first
  public release. Consumer installs require no authentication. Publisher credentials
  belong only in the protected environment; prefer trusted publishing once explicitly
  configured and reviewed.
- Versions are immutable. The workflow publishes the checked/packed version, never
  bumps it or pushes a tag, and duplicate versions fail. Follow RELEASING exactly.
