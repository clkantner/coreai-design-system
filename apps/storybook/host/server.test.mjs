// Integration tests for the host's HTTP surface. The OAuth facade is a public,
// unauthenticated boundary, so routing and status codes are covered here rather
// than only at the pure-function level in oauth.test.mjs.
import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';

const tenantId = '11111111-2222-3333-4444-555555555555';
const clientId = '99999999-8888-7777-6666-555555555555';
const apiScope = `api://${clientId}/access_as_user`;

process.env.MCP_ENTRA_TENANT_ID = tenantId;
process.env.MCP_ENTRA_AUDIENCE = clientId;
process.env.MCP_ENTRA_SCOPE = apiScope;
process.env.MCP_OAUTH_CLIENT_ID = clientId;
delete process.env.WEBSITE_HOSTNAME;

const { server } = await import('./server.mjs');

let origin = '';

before(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.close();
});

const registration = () => ({
  client_name: 'test',
  redirect_uris: ['https://vscode.dev/redirect'],
  token_endpoint_auth_method: 'none',
});

const postJson = (path, body) =>
  fetch(`${origin}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

const postForm = (path, body) =>
  fetch(`${origin}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

test('unauthenticated /mcp returns a challenge pointing at the resource metadata', async () => {
  const response = await postJson('/mcp', { jsonrpc: '2.0', id: 1, method: 'initialize' });

  assert.equal(response.status, 401);
  assert.equal(
    response.headers.get('www-authenticate'),
    `Bearer resource_metadata="${origin.replace('http://', 'https://')}/.well-known/oauth-protected-resource/mcp"`,
  );
});

test('discovery documents are served on both exact paths and their trailing-slash variants', async () => {
  for (const path of [
    '/.well-known/oauth-protected-resource',
    '/.well-known/oauth-protected-resource/',
    '/.well-known/oauth-protected-resource/mcp',
    '/.well-known/oauth-protected-resource/mcp/',
    '/.well-known/oauth-authorization-server',
    '/.well-known/oauth-authorization-server/',
  ]) {
    const response = await fetch(`${origin}${path}`);
    assert.equal(response.status, 200, `${path} should be served by the host`);
    assert.match(response.headers.get('content-type'), /application\/json/);
  }
});

test('authorization server metadata advertises the facade, PKCE, and refresh tokens', async () => {
  const metadata = await (await fetch(`${origin}/.well-known/oauth-authorization-server`)).json();

  assert.deepEqual(metadata.code_challenge_methods_supported, ['S256']);
  assert.deepEqual(metadata.token_endpoint_auth_methods_supported, ['none']);
  assert.ok(metadata.grant_types_supported.includes('refresh_token'));
  assert.ok(metadata.scopes_supported.includes('offline_access'));
  assert.ok(metadata.registration_endpoint.endsWith('/oauth/register'));
});

test('registration returns a fixed public-client document and echoes nothing', async () => {
  const response = await postJson('/oauth/register', {
    ...registration(),
    client_secret: 'leakme',
    jwks_uri: 'https://attacker.example/jwks',
  });
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(body.client_id, clientId);
  assert.equal(body.client_secret, undefined);
  assert.equal(body.jwks_uri, undefined);
  assert.equal(body.scope, `openid ${apiScope} offline_access`);
});

test('registration rejects untrusted and malformed redirect URIs', async () => {
  for (const redirectUri of [
    'https://attacker.example/cb',
    'http://attacker.example/cb',
    'not-a-url',
  ]) {
    const response = await postJson('/oauth/register', { redirect_uris: [redirectUri] });
    assert.equal(response.status, 400, `${redirectUri} must be rejected`);
    assert.equal((await response.json()).error, 'invalid_client_metadata');
  }
});

test('registration accepts an ephemeral loopback port', async () => {
  const response = await postJson('/oauth/register', {
    redirect_uris: ['http://127.0.0.1:54321/'],
  });

  assert.equal(response.status, 201);
  assert.deepEqual((await response.json()).redirect_uris, ['http://127.0.0.1:54321/']);
});

test('oversized anonymous bodies are refused rather than buffered', async () => {
  const response = await postJson('/oauth/register', 'x'.repeat(128 * 1024));

  assert.equal(response.status, 413);
});

test('authorize redirects to Entra and enforces PKCE', async () => {
  const base = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: 'https://vscode.dev/redirect',
    scope: `openid ${apiScope} offline_access`,
    state: 'state',
    code_challenge_method: 'S256',
  });

  const withChallenge = new URLSearchParams(base);
  withChallenge.set('code_challenge', 'challenge');
  const redirected = await fetch(`${origin}/oauth/authorize?${withChallenge}`, {
    redirect: 'manual',
  });

  assert.equal(redirected.status, 302);
  const location = new URL(redirected.headers.get('location'));
  assert.equal(location.origin, 'https://login.microsoftonline.com');
  assert.equal(location.searchParams.get('resource'), null);
  assert.equal(location.searchParams.get('scope'), `openid ${apiScope} offline_access`);

  const rejected = await fetch(`${origin}/oauth/authorize?${base}`, { redirect: 'manual' });
  assert.equal(rejected.status, 400);
});

test('authorize rejects a client_id or redirect_uri it did not issue', async () => {
  const parameters = new URLSearchParams({
    client_id: 'someone-else',
    response_type: 'code',
    redirect_uri: 'https://vscode.dev/redirect',
    code_challenge: 'challenge',
    code_challenge_method: 'S256',
  });
  assert.equal(
    (await fetch(`${origin}/oauth/authorize?${parameters}`, { redirect: 'manual' })).status,
    400,
  );

  parameters.set('client_id', clientId);
  parameters.set('redirect_uri', 'https://attacker.example/cb');
  assert.equal(
    (await fetch(`${origin}/oauth/authorize?${parameters}`, { redirect: 'manual' })).status,
    400,
  );
});

test('token endpoint rejects malformed grants with no-store', async () => {
  const response = await postForm(
    '/oauth/token',
    'grant_type=client_credentials&client_id=' + clientId,
  );

  assert.equal(response.status, 400);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal((await response.json()).error, 'invalid_request');
});

test('token endpoint requires a PKCE verifier on the authorization_code grant', async () => {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    code: 'abc',
    redirect_uri: 'https://vscode.dev/redirect',
  });
  const response = await postForm('/oauth/token', body);

  assert.equal(response.status, 400);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('OAuth endpoints reject methods they do not implement', async () => {
  assert.equal((await fetch(`${origin}/oauth/register`)).status, 405);
  assert.equal((await fetch(`${origin}/oauth/token`)).status, 405);
  assert.equal((await fetch(`${origin}/oauth/authorize`, { method: 'DELETE' })).status, 405);
});

test('a rejected bearer token never reaches the MCP handler', async () => {
  const response = await fetch(`${origin}/mcp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer not.a.real.token' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize' }),
  });

  assert.equal(response.status, 401);
  assert.equal((await response.json()).error, 'unauthorized');
});

test('raw manifests stay behind auth', async () => {
  assert.equal((await fetch(`${origin}/manifests/components.json`)).status, 401);
});
