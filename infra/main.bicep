// Consolidated infrastructure for the CoreAI Design System hosted apps.
//
// Provisions ONE Linux App Service Plan shared by two web apps:
//   - coreai-ds            → the static docsite            (https://coreai-ds.azurewebsites.net)
//   - coreai-ds-storybook  → the static Storybook + the
//                            self-hosted Storybook MCP at  /mcp
//
// Both apps run the Node 22 runtime and are gated behind Microsoft Entra
// Easy Auth (single tenant, secretless implicit id_token flow). The Storybook
// app additionally excludes `/mcp` and the OAuth discovery/facade routes from
// Easy Auth so MCP clients reach the Node host's own OAuth flow (which serves
// only read-only component/docs knowledge).
//
// This template supersedes apps/docsite/infra/main.bicep — it is the single
// source of truth for all CoreAI DS Azure hosting and is meant to grow to
// future apps.

@description('Azure region for the App Service plan and web apps')
param location string = 'westus3'

@description('Name of the shared Linux App Service plan')
param planName string = 'plan-coreai-ds'

@description('SKU of the App Service plan. B1 (Basic) enables Always On so the MCP endpoint stays warm.')
param sku string = 'B1'

@description('Name of the docsite App Service')
param docsiteAppName string = 'coreai-ds'

@description('Name of the Storybook + MCP App Service')
param storybookAppName string = 'coreai-ds-storybook'

@description('Entra ID (Microsoft tenant) app registration client ID used for the docsite Easy Auth. Required.')
param docsiteEntraClientId string

@description('Entra ID app registration client ID for Storybook Easy Auth. This may be the same registration that exposes the MCP API scope. Leave empty only for local or transitional deployments where the UI may be public.')
param storybookEntraClientId string = ''

@description('Entra tenant ID used to validate MCP access tokens. Defaults to the deployment tenant.')
param mcpEntraTenantId string = tenant().tenantId

@description('Accepted audience(s) for MCP access tokens, comma-separated. The app registration requests v2 access tokens, whose `aud` is the MCP API app registration CLIENT ID (a GUID) — not the api:// App ID URI. Empty disables MCP auth (the /mcp endpoint is then open).')
param mcpEntraAudience string = ''

@description('Delegated scope MCP clients must request, e.g. api://<clientId>/access_as_user. Required whenever mcpEntraAudience is set; the host fails to start without it.')
param mcpEntraScope string = ''

var entraIssuerUrl = '${environment().authentication.loginEndpoint}${tenant().tenantId}/v2.0'
var enableStorybookAuth = !empty(storybookEntraClientId)

// ---------------------------------------------------------------------------
// Shared plan
// ---------------------------------------------------------------------------
resource appServicePlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: planName
  location: location
  kind: 'linux'
  sku: {
    name: sku
  }
  properties: {
    reserved: true
  }
}

// ---------------------------------------------------------------------------
// Docsite (static site served by apps/docsite/server.js)
// ---------------------------------------------------------------------------
resource docsiteApp 'Microsoft.Web/sites@2023-12-01' = {
  name: docsiteAppName
  location: location
  kind: 'app,linux'
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|22-lts'
      alwaysOn: sku != 'F1'
      appSettings: [
        {
          name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
          value: 'false'
        }
        {
          name: 'WEBSITE_AUTH_AAD_ALLOWED_TENANTS'
          value: tenant().tenantId
        }
      ]
    }
  }
}

resource docsiteAuth 'Microsoft.Web/sites/config@2023-12-01' = {
  parent: docsiteApp
  name: 'authsettingsV2'
  properties: {
    platform: {
      enabled: true
    }
    globalValidation: {
      requireAuthentication: true
      unauthenticatedClientAction: 'RedirectToLoginPage'
      redirectToProvider: 'azureactivedirectory'
      excludedPaths: [
        '/healthz'
      ]
    }
    identityProviders: {
      azureActiveDirectory: {
        enabled: true
        registration: {
          clientId: docsiteEntraClientId
          openIdIssuer: entraIssuerUrl
        }
        login: {
          loginParameters: [
            'response_type=id_token'
          ]
        }
        validation: {
          allowedAudiences: [
            'api://${docsiteEntraClientId}'
            docsiteEntraClientId
          ]
          defaultAuthorizationPolicy: {
            allowedApplications: [
              docsiteEntraClientId
            ]
          }
        }
      }
    }
    login: {
      tokenStore: {
        enabled: false
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Storybook + MCP (static build served by apps/storybook/host/server.mjs,
// which also mounts the self-hosted @storybook/mcp endpoint at /mcp)
// ---------------------------------------------------------------------------
resource storybookApp 'Microsoft.Web/sites@2023-12-01' = {
  name: storybookAppName
  location: location
  kind: 'app,linux'
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|22-lts'
      alwaysOn: sku != 'F1'
      appCommandLine: 'node server.mjs'
      appSettings: [
        {
          name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
          value: 'false'
        }
        {
          name: 'WEBSITE_AUTH_AAD_ALLOWED_TENANTS'
          value: tenant().tenantId
        }
        {
          name: 'MCP_ENTRA_TENANT_ID'
          value: mcpEntraTenantId
        }
        {
          name: 'MCP_ENTRA_AUDIENCE'
          value: mcpEntraAudience
        }
        {
          name: 'MCP_ENTRA_SCOPE'
          value: mcpEntraScope
        }
        {
          name: 'MCP_OAUTH_CLIENT_ID'
          value: storybookEntraClientId
        }
      ]
    }
  }
}

// Easy Auth for Storybook is only provisioned when a client ID is supplied.
// `/mcp` and its public OAuth discovery document are excluded so MCP clients
// receive protocol-compatible JSON instead of a browser login redirect. Raw
// manifests remain behind Easy Auth as defense in depth and are also checked
// by the Node host if a bearer request reaches it.
resource storybookAuth 'Microsoft.Web/sites/config@2023-12-01' = if (enableStorybookAuth) {
  parent: storybookApp
  name: 'authsettingsV2'
  properties: {
    platform: {
      enabled: true
    }
    globalValidation: {
      requireAuthentication: true
      unauthenticatedClientAction: 'RedirectToLoginPage'
      redirectToProvider: 'azureactivedirectory'
      // Easy Auth matches these exactly and supports no wildcards, so every
      // trailing-slash variant the Node host answers must be listed here too.
      excludedPaths: [
        '/mcp'
        '/mcp/'
        '/.well-known/oauth-protected-resource'
        '/.well-known/oauth-protected-resource/'
        '/.well-known/oauth-protected-resource/mcp'
        '/.well-known/oauth-protected-resource/mcp/'
        '/.well-known/oauth-authorization-server'
        '/.well-known/oauth-authorization-server/'
        '/oauth/register'
        '/oauth/authorize'
        '/oauth/token'
      ]
    }
    identityProviders: {
      azureActiveDirectory: {
        enabled: true
        registration: {
          clientId: storybookEntraClientId
          openIdIssuer: entraIssuerUrl
        }
        login: {
          loginParameters: [
            'response_type=id_token'
          ]
        }
        validation: {
          allowedAudiences: [
            'api://${storybookEntraClientId}'
            storybookEntraClientId
          ]
          defaultAuthorizationPolicy: {
            allowedApplications: [
              storybookEntraClientId
            ]
          }
        }
      }
    }
    login: {
      tokenStore: {
        enabled: false
      }
    }
  }
}

output docsiteUrl string = 'https://${docsiteApp.properties.defaultHostName}'
output storybookUrl string = 'https://${storybookApp.properties.defaultHostName}'
output mcpUrl string = 'https://${storybookApp.properties.defaultHostName}/mcp'
output storybookAuthEnabled bool = enableStorybookAuth
output mcpAuthEnabled bool = !empty(mcpEntraAudience)
