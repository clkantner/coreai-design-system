# GitHub Actions (Azure Pipelines migration)

The source repository and pull requests move to
<https://github.com/microsoft/coreai-design-system>. This document retains its
filename to preserve existing links; Azure Pipelines is no longer the automation
entry point.

| Workflow                | Definition                                                                | Trigger                                                                 |
| ----------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| CI / Validate           | [ci.yml](../.github/workflows/ci.yml)                                     | Pull requests and pushes to `main`; manual; reusable                    |
| Deploy Azure apps       | [deploy.yml](../.github/workflows/deploy.yml)                             | Relevant pushes to `main`; manual; disabled until approved              |
| Check Fluent UI updates | [check-fluent-updates.yml](../.github/workflows/check-fluent-updates.yml) | Monday 09:00 UTC; manual; disabled until enabled                        |
| Publish package         | [publish-package.yml](../.github/workflows/publish-package.yml)           | See the [release guide](../packages/coreai-fluentui-react/RELEASING.md) |

There is no telemetry workflow. The replaced Azure CI, deployment, dependency-update
definitions, and Azure PR API script have been removed.

## Validation

CI uses Node.js 22 and public npm dependencies; it needs **no secrets, Azure
connection, private feed, or write token**. In-repository apps resolve
`@coreai/fluentui-react` through npm workspaces.

Validation preserves formatting, zero-warning lint, workspace type checks,
guidance-generation tests, Storybook build/content verification, docsite tests
against the same built Storybook index, host OAuth tests, Chromium installation,
and browser component tests. Automation safeguards have additional Node tests.
Fork contributions use `pull_request`, not privileged `pull_request_target`.

Before dependency installation, CI runs `npm run check:public-source` and the
public-source check's Node tests. Deployment repeats the source check before
building, packaging, or logging into Azure. This screens tracked source for
disallowed links, metadata, font binaries, and obvious credential patterns; it
is not an exhaustive secret, license, artifact, or Git-history audit.

After the first successful run, configure a `main` ruleset requiring the
**Validate** job from **CI**, pull-request reviews, and resolution of review
conversations. Do not require a deployment or publishing check for contributions.
If enabling merge queues, add and validate a `merge_group` trigger first.

## Azure deployment approval and identity

See [CI/CD setup](CI-CD-SETUP.md#github-environment-and-oidc) for the exact variables,
OIDC subject, Azure permissions, and existing-host prerequisites.

The deployment workflow requires all of:

1. Repository is exactly `microsoft/coreai-design-system`.
2. Ref is exactly `refs/heads/main`, including for manual runs.
3. Repository Actions variables `OSS_RELEASE_APPROVED` and `ENABLE_AZURE_DEPLOY`
   are both exactly `true`. The first is the shared open-source approval gate;
   the second enables Azure deployments specifically.
4. The reusable CI validation succeeds for the same source revision.
5. The `azure-production` environment's protection rules approve the deployment.

Leave both repository variables absent or `false` in a clean repository. GitHub
environments do not automatically require approval: an administrator must create
the environment, configure required reviewers and main-only deployment branches,
and prevent self-approval **before** enabling the variable. No Azure credentials
are available to ordinary PR CI.

Only ZIP application content is deployed. The workflow **does not run Bicep,
create resources, reset app settings, alter Easy Auth, or change Entra
registrations**. Existing infrastructure must be prepared separately by its
owners. The authenticated preflight reads the current auth configuration and
fails closed if either UI or MCP authentication is missing/disabled. Responses,
app settings, and credentials are not printed or uploaded as artifacts.

The docsite ZIP retains `dist/`, `package.json`, and `server.js` at its root.
The Storybook ZIP retains `storybook-static/`, `server.mjs`, `oauth.mjs`,
the host `package.json`, and production dependencies installed in the staging
directory. Both preserve `npm start` behavior. Storybook deploy retains
`--track-status false` for its existing App Service behavior.

Deployment runs are serialized without cancelling an in-progress deployment.
The two apps are deployed sequentially, not atomically. An operator must verify
both hosts after a run; the Storybook CLI invocation deliberately does not wait
for runtime startup.

## Fluent dependency automation

Set repository variable `ENABLE_FLUENT_UPDATES=true` to opt in, only after:

- Actions is allowed to create and approve pull requests in repository settings
  (the workflow creates PRs; it does not approve them).
- The `dependencies` and `fluent-ui` labels exist.
- Repository/organization policy permits `GITHUB_TOKEN` to write contents and
  pull requests and maintain the bot-owned `chore/fluent-ui-updates` branch.
  Do not grant the bot bypass privileges on `main`.

The workflow runs only in the target repository on `main`. It updates the exact
Fluent **development** versions and root lockfile while preserving peer floors.
It installs Chromium, tests latest versions, then installs and verifies the exact
minimum peer versions and repeats package type/build/browser/tree-shaking checks.
Storybook type checks run against the latest versions. Failed validation creates
no PR. The same branch/PR is updated rather than creating a new PR every week.
If dependencies are current, the workflow makes no changes.

The workflow uses only the short-lived `GITHUB_TOKEN`; no PAT or GitHub App secret
is needed. **GitHub suppresses workflows triggered by that token.** A maintainer
must close and reopen the generated PR (after each automated update) to trigger
normal required pull-request CI, then review and merge normally. A manual CI run
on `main` is not a substitute for PR-head checks. Do not bypass branch protection.

## Cutover checklist

These are operator prerequisites, **not actions performed by the migration**:

1. Create/approve the GitHub repository and migrate source/history through the
   organization's normal process.
2. Permit the pinned `actions/checkout`, `actions/setup-node`, `azure/login`,
   and `peter-evans/create-pull-request` actions in organization policy.
3. Run secretless PR CI and configure the `main` ruleset.
4. Disable the retired Azure Pipelines schedules/triggers and retire obsolete
   build-service grants, variable groups, and service-connection authorizations.
   Deleting YAML alone does not disable existing Azure DevOps pipeline records.
5. Configure the protected Azure environment and OIDC trust, verify the existing
   hosting settings, and only then opt in to deployment.
6. Configure dependency-update permissions/labels and opt in separately.
7. Complete the separate npm publishing approval and trusted-publisher setup in
   [RELEASING.md](../packages/coreai-fluentui-react/RELEASING.md).

No target-repository API access, pushes, publication, deployments, or cloud
configuration changes are needed to prepare or locally validate this migration.
