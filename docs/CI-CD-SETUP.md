# CI/CD and Azure hosting setup

Source and pull requests: <https://github.com/microsoft/coreai-design-system>.
The [workflow overview and cutover checklist](AZURE-PIPELINES.md) cover CI and
dependency automation. Publishing has a separate approval process documented in
[RELEASING.md](../packages/coreai-fluentui-react/RELEASING.md).

## Package consumption in CI

The package targets public npm. Once an approved public release is published,
consumers can install `@coreai/fluentui-react` from
`https://registry.npmjs.org/`; no Azure Artifacts credential provider, scoped
Azure registry mapping, PAT, or Azure identity is needed for public releases.
Remove legacy `@coreai:registry` mappings when moving to the public package.
Until the first approved public release exists, do not assume a specific version
is available on npm. This migration itself does not publish anything.

For this repository, run `npm ci` with Node.js 22 at the root. The docsite and
Storybook use the local package workspace, not a separately published artifact.

## GitHub environment and OIDC

Azure remains the hosting provider. The
[deployment workflow](../.github/workflows/deploy.yml) deploys content to
**existing** Linux Azure App Services using Azure workload identity federation.
It never changes their auth/settings or provisions infrastructure.

### Explicit approval gates

Before enabling deployment, an administrator must:

1. Create the GitHub environment **`azure-production`**.
2. Configure **required reviewers**, prevent self-review, and restrict deployment
   branches to **`main`**. Use the organization's protection policy; ensure the
   repository plan supports the intended protection rules.
3. Verify the target hosts, identity, and auth prerequisites below.
4. Set repository Actions variables **`OSS_RELEASE_APPROVED` = `true`** and
   **`ENABLE_AZURE_DEPLOY` = `true`** only after open-source and deployment approval.
   These must be repository variables, not just environment variables: the
   workflow evaluates them before starting environment jobs.

The exact repository and main-ref checks also prevent a copied repository or a
manual feature-branch run from deploying. An unset/false approval variable skips
all deployment jobs, including their Azure login.

### Exact variables and secrets

Set these six **environment variables** under GitHub **Settings → Environments →
azure-production → Environment variables**. They are identifiers, not credentials;
there are deliberately no hardcoded deployment targets or tenant IDs in YAML.

| Variable                | Required value                                                   |
| ----------------------- | ---------------------------------------------------------------- |
| `AZURE_CLIENT_ID`       | Application/client ID of the deployment workload identity        |
| `AZURE_TENANT_ID`       | Entra tenant ID owning that identity and the target subscription |
| `AZURE_SUBSCRIPTION_ID` | Target Azure subscription ID                                     |
| `AZURE_RESOURCE_GROUP`  | Existing resource group containing both hosts                    |
| `DOCSITE_APP_NAME`      | Existing docsite App Service name                                |
| `STORYBOOK_APP_NAME`    | Existing Storybook/MCP App Service name                          |

Repository variables:

| Variable                | Default / effect                                                                       |
| ----------------------- | -------------------------------------------------------------------------------------- |
| `OSS_RELEASE_APPROVED`  | Absent/false: deployment disabled; exact `true`: shared open-source release approval   |
| `ENABLE_AZURE_DEPLOY`   | Absent/false: deployment disabled; exact `true`: allow protected main deployments      |
| `ENABLE_FLUENT_UPDATES` | Absent/false: update automation disabled; exact `true`: allow scheduled/manual updates |

**Secrets required for these workflows: none.** Azure login uses OIDC, and the
dependency workflow uses GitHub's automatically supplied `GITHUB_TOKEN`.
Do not create Azure client secrets, publish profiles, PATs, private-feed tokens,
or telemetry tokens for these workflows. The npm publishing workflow has its own
prerequisites in the release guide.

### Federated identity and Azure permissions

Have an Azure administrator create or reuse an Entra application/service principal
or user-assigned managed identity in the subscription's tenant. Do not create a
client secret. Add this federated identity credential:

| Field    | Value                                                              |
| -------- | ------------------------------------------------------------------ |
| Issuer   | `https://token.actions.githubusercontent.com`                      |
| Subject  | `repo:microsoft/coreai-design-system:environment:azure-production` |
| Audience | `api://AzureADTokenExchange`                                       |

The environment subject is required even though deployment is restricted to main;
`repo:…:ref:refs/heads/main` is not the claim emitted by an environment job.
The deploy job requests `id-token: write`; ordinary CI does not.

Grant the identity **Website Contributor** on each existing App Service, including
its configuration and publishing child operations, with sufficient read access to
the resource group for Azure CLI discovery. The preflight needs
`Microsoft.Web/sites/config/list/action` to read auth/app settings. A custom role
can narrow this further subject to the tenant's deployment policy. Do not grant
subscription-wide Contributor or rights to administer Entra app registrations.
Infrastructure provisioning is outside this workflow.

The administrator must confirm the role assignment supports `az webapp auth show`,
`az webapp config appsettings list`, and `az webapp deploy` for **both** apps.
An Azure DevOps service connection's federated credential does not authenticate a
GitHub workflow: add the GitHub trust explicitly and retire old trust only after
the approved cutover.

## App & MCP hosting (Azure App Service + Entra)

### Architecture and deployment contract

The existing shared Linux App Service plan hosts:

- Docsite: `https://<docsite-app-name>.azurewebsites.net`.
- Storybook and read-only MCP: `https://<storybook-app-name>.azurewebsites.net`,
  with the MCP endpoint at `/mcp`.

These are URL patterns, not deployment targets. Use the existing host names
provided by the hosting owners. Existing hosting requires authorization;
moving source to GitHub does not change those access restrictions.
The Bicep source remains at [infra/main.bicep](../infra/main.bicep) for
separately approved infrastructure management. GitHub Actions does **not** apply it.
Infrastructure-only changes therefore do not automatically trigger app deployment.

The deployment job provisions the pinned Fluent story checkout, builds Storybook
and its MCP manifests, verifies its content, then builds the docsite against that
exact Storybook index. The ZIP layouts are:

| App           | ZIP root                                                                                   | Startup                                  |
| ------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------- |
| Docsite       | `dist/`, `package.json`, `server.js`                                                       | Existing `npm start` → `node server.js`  |
| Storybook/MCP | `storybook-static/`, `package.json`, `server.mjs`, `oauth.mjs`, production `node_modules/` | Existing `npm start` → `node server.mjs` |

Preserve the hosts' Node 22 runtime, existing startup command/default npm-start
behavior, Always On where supported, and `SCM_DO_BUILD_DURING_DEPLOYMENT=false`.
The host dependencies are installed into the Storybook staging directory
(`npm install --omit=dev --no-audit --no-fund`), as in the previous deployment.
The host currently has no standalone lockfile, so that staging install can
resolve compatible dependency versions anew; it is not a fully locked artifact.
Only application files are packaged: repository credentials/configuration and
Azure app settings are never copied into ZIPs or uploaded as workflow artifacts.

The docsite deploy waits for the normal ZIP deployment response. Storybook keeps
`--track-status false`, so successful submission does not guarantee successful
runtime startup. An operator must confirm `/healthz`, both UI sign-in flows, and
an authenticated MCP request after deployment. The two ZIP deploys are sequential,
not transactional; rerun an approved main revision if one host fails.

### Preserve authentication

Both browser UIs remain gated by single-tenant Microsoft Entra **Easy Auth**.
The Storybook `/mcp` endpoint and OAuth discovery/facade routes remain excluded
from Easy Auth so clients receive protocol-compatible OAuth challenges rather
than an HTML login redirect. Each facade route validates its own input.

Before deploying any ZIP, the workflow reads existing auth settings into memory
and requires enabled Entra Easy Auth with `requireAuthentication=true` for both
apps. It requires all of the following existing Storybook app settings and
rejects `MCP_AUTH_ENABLED=false`:

| Existing App Service setting | Meaning                                                                     |
| ---------------------------- | --------------------------------------------------------------------------- |
| `MCP_ENTRA_TENANT_ID`        | Single tenant for JWT issuer and tenant validation                          |
| `MCP_ENTRA_AUDIENCE`         | API app client ID GUID accepted as the v2 token `aud`; not its `api://` URI |
| `MCP_ENTRA_SCOPE`            | Delegated scope, e.g. `api://<clientId>/access_as_user`                     |
| `MCP_OAUTH_CLIENT_ID`        | Same client registration as Storybook Easy Auth                             |

These are **not new GitHub variables**: the workflow reads but does not overwrite
the current values. Preflight errors show setting names only, never Azure
responses or values. The preflight is a missing/disabled-auth guard, not a full
audit of every Entra policy or excluded route. Owners must preserve the existing
issuer, audience, route exclusions, allowed tenant, redirects, and authorization
policy.

The host validates JWT signature, issuer, audience, tenant, and delegated scope
on MCP/manifests requests. Scope validation is essential: an ID token for the
same client can share the audience but does not carry delegated `scp`.
The local OAuth facade supports discovery, registration, PKCE authorization-code
exchange, and refresh-token grants; tokens are never logged.

Keep the existing single-tenant app registration, ID-token issuance for the
Storybook browser callback, `isFallbackPublicClient: true`, delegated
`access_as_user` scope, existing admin consent/pre-authorized applications, and
all existing redirect URIs. In particular:

- Storybook's `/.auth/login/aad/callback` on the existing host.
- `https://insiders.vscode.dev/redirect` and `https://vscode.dev/redirect`.
- Native loopback `http://127.0.0.1/` (port-agnostic) and any existing explicit
  loopback registrations.

VS Code and Copilot CLI discover/register through the facade; clients need the
MCP URL, not a distributed secret. The host permits native literal-loopback
callbacks with ephemeral ports; `localhost` is deliberately not accepted.
Compatible clients cache and renew their refresh tokens via the no-store facade.
Keep an active owner for the API app registration to meet tenant lifecycle policy.

### Troubleshooting

| Symptom                         | Check                                                                                                                 |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Deployment jobs skipped         | Exact repository/main ref and repository `OSS_RELEASE_APPROVED=true` plus `ENABLE_AZURE_DEPLOY=true`                  |
| Waiting for deployment          | `azure-production` required-reviewer approval                                                                         |
| OIDC `AADSTS70021`              | Exact environment subject, issuer, audience, tenant, and client ID                                                    |
| Azure preflight fails           | Identity read/list permissions and existing Easy Auth/MCP configuration; inspect securely in Azure, not workflow logs |
| ZIP deploy forbidden            | Both target app scopes and publishing/configuration permissions                                                       |
| MCP returns `401` after sign-in | Existing tenant, v2 GUID audience, delegated scope, and registration agreement                                        |
| Bot PR has no CI                | Maintainer must close/reopen after the latest bot update; `GITHUB_TOKEN` does not trigger downstream workflows        |

Do not work around authentication errors by disabling Easy Auth or MCP validation.
Do not print `az webapp config appsettings list` output or enable shell tracing in
deployment jobs.
