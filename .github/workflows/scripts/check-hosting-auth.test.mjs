import assert from 'node:assert/strict';
import test from 'node:test';
import { main, validateHostingAuth } from './check-hosting-auth.mjs';

const auth = () => ({
  platform: { enabled: true },
  globalValidation: { requireAuthentication: true },
  identityProviders: {
    azureActiveDirectory: { enabled: true, registration: { clientId: 'test-client' } },
  },
});
const settings = () =>
  Object.entries({
    MCP_ENTRA_TENANT_ID: 'test-tenant',
    MCP_ENTRA_AUDIENCE: 'test-client',
    MCP_ENTRA_SCOPE: 'api://test-client/access_as_user',
    MCP_OAUTH_CLIENT_ID: 'test-client',
  }).map(([name, value]) => ({ name, value }));

test('accepts protected existing apps without mutating their settings', () => {
  const values = settings();
  const before = globalThis.structuredClone(values);
  validateHostingAuth(auth(), auth(), values);
  assert.deepEqual(values, before);
});

test('accepts ARM properties wrapper', () => {
  validateHostingAuth({ properties: auth() }, { properties: auth() }, settings());
});

test('rejects disabled Easy Auth on either app', () => {
  const disabled = auth();
  disabled.platform.enabled = false;
  assert.throws(() => validateHostingAuth(disabled, auth(), settings()), /docsite/);
  assert.throws(() => validateHostingAuth(auth(), disabled, settings()), /Storybook/);
});

test('rejects anonymous access and missing Entra registration', () => {
  const anonymous = auth();
  anonymous.globalValidation.requireAuthentication = false;
  assert.throws(() => validateHostingAuth(anonymous, auth(), settings()), /Easy Auth/);
  const missing = auth();
  delete missing.identityProviders.azureActiveDirectory.registration.clientId;
  assert.throws(() => validateHostingAuth(auth(), missing, settings()), /Easy Auth/);
});

for (const { name } of settings()) {
  test(`rejects absent ${name} without exposing other setting values`, () => {
    assert.throws(
      () =>
        validateHostingAuth(
          auth(),
          auth(),
          settings().filter((setting) => setting.name !== name),
        ),
      new RegExp(name),
    );
  });
}

test('rejects disabled MCP authentication and mismatched registrations', () => {
  assert.throws(
    () =>
      validateHostingAuth(auth(), auth(), [
        ...settings(),
        { name: 'MCP_AUTH_ENABLED', value: 'false' },
      ]),
    /must not be disabled/,
  );
  const other = auth();
  other.identityProviders.azureActiveDirectory.registration.clientId = 'other-client';
  assert.throws(() => validateHostingAuth(auth(), other, settings()), /same client/);
});

test('preflight reads explicit V2 auth endpoints and existing app settings without writes', () => {
  const calls = [];
  main(
    (args) => {
      calls.push(args);
      return args[0] === 'rest' ? { properties: auth() } : settings();
    },
    {
      AZURE_SUBSCRIPTION_ID: 'subscription',
      AZURE_RESOURCE_GROUP: 'resource group',
      DOCSITE_APP_NAME: 'docs',
      STORYBOOK_APP_NAME: 'storybook',
    },
  );
  const url = (app) =>
    'https://management.azure.com/subscriptions/subscription/resourceGroups/resource%20group' +
    `/providers/Microsoft.Web/sites/${app}/config/authsettingsV2?api-version=2024-04-01`;
  assert.deepEqual(calls, [
    ['rest', '--method', 'get', '--url', url('docs')],
    ['rest', '--method', 'get', '--url', url('storybook')],
    [
      'webapp',
      'config',
      'appsettings',
      'list',
      '--resource-group',
      'resource group',
      '--name',
      'storybook',
    ],
  ]);
});

test('preflight requires subscription configuration before reading Azure', () => {
  assert.throws(
    () => main(() => assert.fail('Must not call Azure'), {}),
    /Missing deployment variable: AZURE_SUBSCRIPTION_ID/,
  );
});
