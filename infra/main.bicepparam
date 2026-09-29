using './main.bicep'

param location = 'westus3'
param planName = 'plan-coreai-ds'
// B1 (Basic) gives Always On so the Storybook MCP endpoint stays warm.
param sku = 'B1'
param docsiteAppName = 'coreai-ds'
param storybookAppName = 'coreai-ds-storybook'
// Provided at deploy time by the active CI/CD deployment pipeline.
param docsiteEntraClientId = ''
// Provided at deploy time by the active CI/CD deployment pipeline.
// Production deployments require this to protect the Storybook browser UI.
param storybookEntraClientId = ''
// MCP access-token audience, e.g. 'api://<clientId>' of the MCP API app
// registration. Provided at deploy time by the active CI/CD deployment pipeline.
// Empty ⇒ the /mcp endpoint deploys open (no Entra auth).
param mcpEntraAudience = ''
