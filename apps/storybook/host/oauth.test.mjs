import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createAuthorizationServerMetadata,
  createEntraAuthorizationUrl,
  createEntraTokenRequest,
  createProtectedResourceMetadata,
  hasDelegatedScope,
  registerOAuthClient,
} from './oauth.mjs';

test('protected-resource metadata requests identity, API access, and refresh capability', () => {
  const metadata = createProtectedResourceMetadata({
    resource: 'https://example.test/mcp',
    authorizationServer: 'https://login.microsoftonline.com/tenant/v2.0',
    scope: 'api://example/access_as_user',
  });

  assert.deepEqual(metadata, {
    resource: 'https://example.test/mcp',
    authorization_servers: ['https://login.microsoftonline.com/tenant/v2.0'],
    scopes_supported: ['openid', 'api://example/access_as_user', 'offline_access'],
    bearer_methods_supported: ['header'],
  });
});

test('authorization-server metadata supports registration, PKCE, and refresh tokens', () => {
  assert.deepEqual(
    createAuthorizationServerMetadata({
      issuer: 'https://example.test',
      scope: 'api://example/access_as_user',
    }),
    {
      issuer: 'https://example.test',
      authorization_endpoint: 'https://example.test/oauth/authorize',
      token_endpoint: 'https://example.test/oauth/token',
      registration_endpoint: 'https://example.test/oauth/register',
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['none'],
      scopes_supported: ['openid', 'api://example/access_as_user', 'offline_access'],
    },
  );
});

test('registration maps VS Code redirect URIs to the pre-registered public client', () => {
  const registration = registerOAuthClient(
    {
      redirect_uris: ['https://vscode.dev/redirect', 'http://127.0.0.1:33418/'],
      token_endpoint_auth_method: 'none',
      application_type: 'native',
    },
    'client-id',
    'openid api://example/access_as_user offline_access',
  );

  assert.equal(registration.client_id, 'client-id');
  assert.equal(registration.client_secret, undefined);
});

test('registration pins a scope that requests a refresh token', () => {
  const registration = registerOAuthClient(
    { redirect_uris: ['https://vscode.dev/redirect'] },
    'client-id',
    'openid api://example/access_as_user offline_access',
  );

  assert.equal(registration.scope, 'openid api://example/access_as_user offline_access');
  assert.deepEqual(registration.grant_types, ['authorization_code', 'refresh_token']);
  assert.equal(registration.token_endpoint_auth_method, 'none');
});

test('registration never reflects caller-supplied fields', () => {
  const registration = registerOAuthClient(
    {
      redirect_uris: ['https://vscode.dev/redirect'],
      client_secret: 'leakme',
      jwks_uri: 'https://attacker.example/jwks',
      grant_types: ['client_credentials'],
    },
    'client-id',
    'openid offline_access',
  );

  assert.equal(registration.client_secret, undefined);
  assert.equal(registration.jwks_uri, undefined);
  assert.deepEqual(registration.grant_types, ['authorization_code', 'refresh_token']);
});

test('registration accepts the ephemeral loopback ports Copilot CLI binds at runtime', () => {
  for (const redirectUri of [
    'http://127.0.0.1:54009/',
    'http://127.0.0.1:61520/',
    'http://[::1]:8080/',
  ]) {
    const registration = registerOAuthClient(
      { redirect_uris: [redirectUri] },
      'client-id',
      'openid',
    );
    assert.deepEqual(registration.redirect_uris, [redirectUri]);
  }
});

test('registration rejects untrusted redirect URIs', () => {
  assert.throws(
    () =>
      registerOAuthClient(
        {
          redirect_uris: ['https://attacker.example/callback'],
          token_endpoint_auth_method: 'none',
        },
        'client-id',
        'openid',
      ),
    /invalid_client_metadata/,
  );
});

test('registration rejects non-loopback http, malformed URIs, and confidential clients', () => {
  const cases = [
    { redirect_uris: ['http://attacker.example/cb'] },
    { redirect_uris: ['not-a-url'] },
    { redirect_uris: ['http://localhost:8080/'] },
    {
      redirect_uris: ['https://vscode.dev/redirect'],
      token_endpoint_auth_method: 'client_secret_post',
    },
  ];

  for (const metadata of cases) {
    assert.throws(
      () => registerOAuthClient(metadata, 'client-id', 'openid'),
      /invalid_client_metadata/,
    );
  }
});

test('authorization redirects to Entra without forwarding the MCP resource parameter', () => {
  const target = createEntraAuthorizationUrl(
    'https://example.test/oauth/authorize?client_id=client-id&response_type=code&redirect_uri=https%3A%2F%2Fvscode.dev%2Fredirect&scope=openid%20offline_access%20api%3A%2F%2Fexample%2Faccess_as_user&state=state&code_challenge=challenge&code_challenge_method=S256&resource=https%3A%2F%2Fexample.test%2Fmcp',
    {
      clientId: 'client-id',
      entraIssuer: 'https://login.microsoftonline.com/tenant',
      defaultScope: 'openid api://example/access_as_user offline_access',
    },
  );

  assert.equal(target.origin, 'https://login.microsoftonline.com');
  assert.equal(target.searchParams.get('resource'), null);
  assert.equal(target.searchParams.get('code_challenge'), 'challenge');
  assert.equal(
    target.searchParams.get('scope'),
    'openid offline_access api://example/access_as_user',
  );
});

test('authorization requires a PKCE challenge, not just the method', () => {
  assert.throws(
    () =>
      createEntraAuthorizationUrl(
        'https://example.test/oauth/authorize?client_id=client-id&response_type=code&redirect_uri=https%3A%2F%2Fvscode.dev%2Fredirect&scope=openid&state=state&code_challenge_method=S256',
        {
          clientId: 'client-id',
          entraIssuer: 'https://login.microsoftonline.com/tenant',
          defaultScope: 'openid api://example/access_as_user offline_access',
        },
      ),
    /invalid_request/,
  );
});

test('a resource-only client gets the API scope substituted for the dropped resource', () => {
  const target = createEntraAuthorizationUrl(
    'https://example.test/oauth/authorize?client_id=client-id&response_type=code&redirect_uri=https%3A%2F%2Fvscode.dev%2Fredirect&state=state&code_challenge=challenge&code_challenge_method=S256&resource=https%3A%2F%2Fexample.test%2Fmcp',
    {
      clientId: 'client-id',
      entraIssuer: 'https://login.microsoftonline.com/tenant',
      defaultScope: 'openid api://example/access_as_user offline_access',
    },
  );

  assert.equal(target.searchParams.get('resource'), null);
  assert.equal(
    target.searchParams.get('scope'),
    'openid api://example/access_as_user offline_access',
  );
});

test('token translation removes unsupported resource and client secret parameters', () => {
  const parameters = createEntraTokenRequest(
    Buffer.from(
      'client_id=client-id&grant_type=refresh_token&refresh_token=refresh&resource=https%3A%2F%2Fexample.test%2Fmcp&client_secret=unexpected',
    ),
    'client-id',
    'openid api://example/access_as_user offline_access',
  );

  assert.equal(parameters.get('refresh_token'), 'refresh');
  assert.equal(parameters.get('resource'), null);
  assert.equal(parameters.get('client_secret'), null);
  assert.equal(parameters.get('scope'), 'openid api://example/access_as_user offline_access');
});

test('authorization_code grant requires code, redirect_uri, and PKCE verifier', () => {
  const valid =
    'client_id=client-id&grant_type=authorization_code&code=abc&redirect_uri=https%3A%2F%2Fvscode.dev%2Fredirect&code_verifier=xyz';
  assert.ok(createEntraTokenRequest(Buffer.from(valid), 'client-id', 'openid'));

  const invalid = [
    'client_id=client-id&grant_type=authorization_code&redirect_uri=https%3A%2F%2Fvscode.dev%2Fredirect&code_verifier=xyz',
    'client_id=client-id&grant_type=authorization_code&code=abc&code_verifier=xyz',
    'client_id=client-id&grant_type=authorization_code&code=abc&redirect_uri=https%3A%2F%2Fvscode.dev%2Fredirect',
    'client_id=other&grant_type=authorization_code&code=abc&redirect_uri=https%3A%2F%2Fvscode.dev%2Fredirect&code_verifier=xyz',
    'client_id=client-id&grant_type=client_credentials',
    'client_id=client-id&grant_type=refresh_token',
  ];

  for (const body of invalid) {
    assert.throws(
      () => createEntraTokenRequest(Buffer.from(body), 'client-id', 'openid'),
      /invalid_request/,
    );
  }
});

test('delegated scope validation accepts access_as_user among multiple scopes', () => {
  assert.equal(
    hasDelegatedScope({ scp: 'openid access_as_user profile' }, 'api://example/access_as_user'),
    true,
  );
});

test('delegated scope validation rejects missing, different, and application-only scopes', () => {
  assert.equal(hasDelegatedScope({ scp: 'openid profile' }, 'api://example/access_as_user'), false);
  assert.equal(hasDelegatedScope({ roles: ['Mcp.Read'] }, 'api://example/access_as_user'), false);
  assert.equal(hasDelegatedScope({}, 'api://example/access_as_user'), false);
});
