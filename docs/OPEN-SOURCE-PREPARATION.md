# Open-source preparation and handoff

The destination is [microsoft/coreai-design-system](https://github.com/microsoft/coreai-design-system).
Do not initialize it, push source, change visibility, deploy, or publish npm
packages until the corresponding owner has authorized that step. A URL in source
does not mean the destination is already available.

## Source changes

- GitHub Actions replaces the old pipeline definitions. Deployment continues to
  the existing Azure App Services. Storybook and MCP target public anonymous
  access. The docsite deployment contract still requires authentication and needs
  a separate operator-approved update for public hosting. Deployments do not
  change Azure access settings.
- The docsite and MCP do not collect or transmit product usage data. Storybook's
  upstream usage reporting is explicitly disabled.
- Aptos remains preferred, but no font binaries are redistributed. Use the
  [opt-in setup guide](../packages/react-components/src/fonts/README.md).
  Download availability is not permission to redistribute, embed, or host a font.
  Microsoft affiliation alone is not a substitute for checking the applicable
  license and intended use.
- Package consumption targets public npm, and publication remains approval-gated.
- Internal employee reviewer lists, Teams/group links, and ServiceTree inventory
  metadata are removed from the source snapshot.
  If internal compliance tooling still requires inventory metadata, arrange its
  approved replacement with the repository's compliance owner before handoff.
- Figma library links, component mappings, and embedded previews are intentionally
  retained in the docsite and Storybook. They preserve existing Figma permissions;
  linking or embedding does not grant access. Review the exposed file/node
  identifiers and design-file sharing settings before public release.

## Approval blockers

These are owner/reviewer decisions, not something a code change can certify:

1. **License and governance:** obtain Microsoft's open-source approval and the
   approved license, copyright notices, contribution terms, code of conduct, and
   security-reporting policy. Do not infer a repository-wide license from package
   metadata. Add approved documents before distributing the source or npm artifact.
2. **Third-party material:** review dependency licenses, copied/forked upstream
   stories, icons, images, screenshots, sample content, and any required notices.
   Generated Storybook assets include upstream content even when that content is
   not tracked in this repository.
3. **Secrets and disclosure:** scan the final source snapshot and built npm,
   docsite, Storybook, and MCP artifacts with approved secret-scanning tools.
   Review private URLs, account/tenant/subscription identifiers, local paths,
   credentials, deployment profiles, source maps, images, and sample data. A text
   search is not a complete secret scan or a review of binary content.
   `npm run check:public-source` provides a tracked-source regression guard for
   known removed links/assets and common credential signatures. It checks the
   working contents of tracked paths, not untracked files, Git history, cloud
   settings, or generated artifacts; run it after staging intended additions.
   Figma links are allowed by this guard; they still require the disclosure and
   sharing review above.
4. **npm ownership:** confirm authorization for `@coreai-ds/react-components`, choose an
   unused public version, and configure the approved publishing identity and
   protected environment. Historical internal versions in the changelog do not
   imply those releases exist on public npm.
5. **GitHub identity:** use a personal GitHub account authorized for the Microsoft
   organization. An Enterprise Managed User account may not be able to access the
   destination. Verify the active account and exact remote before pushing.
6. **Azure deployment:** configure main-only environment access, identity,
   and variables described in [CI-CD-SETUP.md](CI-CD-SETUP.md). Verify existing
   authentication settings before and after the first approved deployment. Do
   not enable deployment merely to test a source migration.
7. **Retired services:** source removal does not delete existing cloud resources,
   stored data, credentials, or scheduled jobs. Separately approve stopping old
   schedules, deploying the reviewed apps, revoking unused credentials, and
   applying data-retention/resource-deletion policy.
8. **Visibility:** repository visibility, npm publication, and public access to
   hosted services are separate approvals. Keep all three fail-closed until each
   is explicitly authorized.

## Clean initial commit

Preparation commits stay in the existing repository for review. The new
repository must receive one initial commit, without the old `.git` directory,
branches, tags, or history.

1. Finish review and validation on the preparation branch. Record the approved
   source commit privately and confirm the working tree is clean.
2. Export tracked files from that commit with `git archive` into a **new empty
   directory**, outside the existing worktree. Do not copy the whole working
   directory: ignored local fonts, `.env` files, credentials, build outputs,
   dependency caches, and the sparse upstream checkout must not be included.
3. Inspect and scan the exported files and build artifacts. Confirm the export
   contains no Aptos binaries or internal configuration. Review the npm tarball
   after any local font setup as well as from a clean checkout.
4. Only after authorization, initialize Git in that new directory, stage the
   reviewed snapshot, and create the single initial commit. Keep workflow
   approval variables unset and deployment/publishing environments unconfigured
   or locked during initialization.
5. Verify the destination, authenticated account, visibility, and single-commit
   history before the first push. Never use a mirror push, `--all`, or `--tags`.
   Preserve the original repository and its history.
6. Submit the private destination for the required Microsoft review. Enable
   public visibility and publishing only after their respective approvals.

See [RELEASING.md](../packages/react-components/RELEASING.md) for package
release validation and [CI-CD-SETUP.md](CI-CD-SETUP.md) for deployment setup.
