import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { URL } from 'node:url';

const repoRoot = new URL('../../../', import.meta.url);
const read = (relativePath) => fs.readFile(new URL(relativePath, repoRoot), 'utf8');

test('docsite source and shipped scripts contain no application analytics integration', async () => {
  for (const directory of ['apps/docsite/src/', 'apps/docsite/dist/']) {
    const root = new URL(directory, repoRoot);
    const files = await fs.readdir(root, { recursive: true });
    for (const file of files.filter((file) => /\.(?:[cm]?[jt]sx?|html)$/.test(file))) {
      const source = await fs.readFile(new URL(file.split(path.sep).join('/'), root), 'utf8');
      assert.doesNotMatch(
        source,
        /applicationinsights|telemetry-config\.json|trackDocsiteEvent|TELEMETRY_EVENTS|RouteTelemetry|clarity\.ms|data-clarity|analytics.session/i,
        `${directory}${file}`,
      );
    }
  }

  const manifest = JSON.parse(await read('apps/docsite/package.json'));
  assert.equal('@microsoft/applicationinsights-web' in manifest.dependencies, false);
  assert.doesNotMatch(
    await read('apps/docsite/server.js'),
    /APPLICATIONINSIGHTS|CLARITY_PROJECT_ID|COREAI_ENVIRONMENT|telemetry/i,
  );
  for (const removed of [
    'apps/docsite/src/telemetry/client.ts',
    'apps/docsite/src/telemetry/clarity.ts',
    'apps/docsite/src/telemetry/analytics-session.ts',
    'apps/docsite/src/telemetry/events.ts',
    'apps/docsite/src/telemetry/schema.ts',
    'apps/docsite/src/telemetry/RouteTelemetry.tsx',
    'scripts/telemetry/sync-clarity.mjs',
    'azure-pipelines/sync-clarity.yml',
    'infra/workbooks/coreai-ds-telemetry.workbook.json',
  ]) {
    await assert.rejects(fs.access(new URL(removed, repoRoot)), { code: 'ENOENT' }, removed);
  }
});

test('Storybook usage telemetry remains disabled', async () => {
  assert.match(
    await read('apps/storybook/.storybook/main.ts'),
    /core:\s*\{\s*disableTelemetry:\s*true,\s*\}/,
  );
});

test('hosting retains Entra and MCP settings without monitoring resources or configuration', async () => {
  const source = await read('infra/main.bicep');
  const parameters = await read('infra/main.bicepparam');
  assert.doesNotMatch(
    source + parameters,
    /Microsoft\.Insights|Microsoft\.OperationalInsights|telemetry|clarity|ApplicationInsights|logAnalytics|COREAI_ENVIRONMENT/i,
  );
  assert.deepEqual(
    [...source.matchAll(/^resource (\w+) /gm)].map((match) => match[1]),
    ['appServicePlan', 'docsiteApp', 'docsiteAuth', 'storybookApp', 'storybookAuth'],
  );
  for (const setting of [
    'SCM_DO_BUILD_DURING_DEPLOYMENT',
    'WEBSITE_AUTH_AAD_ALLOWED_TENANTS',
    'MCP_ENTRA_TENANT_ID',
    'MCP_ENTRA_AUDIENCE',
    'MCP_ENTRA_SCOPE',
    'MCP_OAUTH_CLIENT_ID',
  ]) {
    assert.ok(source.includes(`name: '${setting}'`), setting);
  }
  assert.equal((source.match(/name: 'authsettingsV2'/g) ?? []).length, 2);
  assert.equal((source.match(/requireAuthentication: true/g) ?? []).length, 2);
  assert.equal(
    (source.match(/unauthenticatedClientAction: 'RedirectToLoginPage'/g) ?? []).length,
    2,
  );
  assert.equal((source.match(/'response_type=id_token'/g) ?? []).length, 2);
  assert.match(source, /clientId: docsiteEntraClientId/);
  assert.match(source, /clientId: storybookEntraClientId/);
  assert.match(source, /storybookAuth .* = if \(enableStorybookAuth\)/);
  for (const route of [
    '/healthz',
    '/mcp',
    '/mcp/',
    '/.well-known/oauth-protected-resource',
    '/.well-known/oauth-protected-resource/',
    '/.well-known/oauth-protected-resource/mcp',
    '/.well-known/oauth-protected-resource/mcp/',
    '/.well-known/oauth-authorization-server',
    '/.well-known/oauth-authorization-server/',
    '/oauth/register',
    '/oauth/authorize',
    '/oauth/token',
  ]) {
    assert.ok(source.includes(`'${route}'`), route);
  }
});
