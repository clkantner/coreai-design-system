// Production host for the built Storybook + a self-hosted Storybook MCP server.
//
// Serves two things on one Azure App Service (coreai-ds-storybook):
//   1. the static `storybook build` output (storybook-static/) at `/`
//   2. a stateless MCP endpoint at `/mcp`, backed by the docs manifests that
//      the same build emits under storybook-static/manifests/.
//
// The MCP endpoint is powered by the standalone `@storybook/mcp` library — NOT
// the dev-server `@storybook/addon-mcp` — so no `storybook dev` process is
// required in production. Manifests are read from disk (server-side) so the
// `/manifests/*.json` routes never need to be publicly exposed, and the MCP
// keeps working even when the UI is gated behind Easy Auth.
import http from 'node:http';
import fs from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import {
  createAuthorizationServerMetadata,
  createEntraAuthorizationUrl,
  createEntraTokenRequest,
  createProtectedResourceMetadata,
  hasDelegatedScope,
  registerOAuthClient,
} from './oauth.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, 'storybook-static');
const port = Number(process.env.PORT || 8080);

// ---------------------------------------------------------------------------
// Microsoft Entra auth for the MCP endpoint (MCP Authorization spec).
//
// When auth is enabled the `/mcp` and `/manifests/*` routes require a valid
// Entra access token from a single tenant. The server acts as an OAuth 2.0
// protected resource (RFC 9728) AND as a thin authorization-server facade
// (RFC 8414 + RFC 7591), because Entra does not support dynamic client
// registration but MCP clients require it. Authorization and token requests are
// delegated to Entra; the facade only validates and reshapes them.
//
// Every value below is explicit configuration. An earlier version derived the
// scope and client ID from MCP_ENTRA_AUDIENCE, which created an invisible
// ordering contract between comma-separated entries. Set MCP_AUTH_ENABLED=false
// (or omit the tenant) to run open — e.g. for local testing.
//
// MCP_ENTRA_AUDIENCE is the `aud` claim to accept. The app registration sets
// requestedAccessTokenVersion: 2, and v2 access tokens carry the resource's
// client ID GUID as `aud` — NOT the api:// App ID URI. The App ID URI appears
// only in MCP_ENTRA_SCOPE, which is what clients request.
// ---------------------------------------------------------------------------
const authTenantId = process.env.MCP_ENTRA_TENANT_ID || '';
const authAudiences = (process.env.MCP_ENTRA_AUDIENCE || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const authScope = process.env.MCP_ENTRA_SCOPE || '';
const oauthClientId = process.env.MCP_OAUTH_CLIENT_ID || '';
const authEnabled = process.env.MCP_AUTH_ENABLED !== 'false' && Boolean(authTenantId);

if (authEnabled) {
  const missing = [
    ['MCP_ENTRA_AUDIENCE', authAudiences.length > 0],
    ['MCP_ENTRA_SCOPE', Boolean(authScope)],
    ['MCP_OAUTH_CLIENT_ID', Boolean(oauthClientId)],
  ]
    .filter(([, present]) => !present)
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(
      `MCP auth is enabled but required configuration is missing: ${missing.join(', ')}. ` +
        'Set MCP_AUTH_ENABLED=false to run without auth.',
    );
  }
}

const entraAuthority = authTenantId ? `https://login.microsoftonline.com/${authTenantId}` : '';
// Handed to clients at registration so they request a refresh token.
const clientScope = ['openid', authScope, 'offline_access'].filter(Boolean).join(' ');
const authIssuer = authTenantId ? `https://login.microsoftonline.com/${authTenantId}/v2.0` : '';
// Pin the public origin so a spoofed Host header cannot rewrite issued metadata.
const publicHost = process.env.WEBSITE_HOSTNAME || '';
const jwks = authEnabled
  ? createRemoteJWKSet(
      new URL(`https://login.microsoftonline.com/${authTenantId}/discovery/v2.0/keys`),
    )
  : null;

// Easy Auth matches `excludedPaths` exactly, so these routes must match exactly
// too — any variant that slips past falls through to Easy Auth and gets an HTML
// login redirect (or an Entra challenge) instead of the MCP OAuth flow.
const protectedResourceMetadataPaths = new Set([
  '/.well-known/oauth-protected-resource',
  '/.well-known/oauth-protected-resource/mcp',
]);

function normalizePathname(pathname) {
  const trimmed = pathname.replace(/\/+$/, '');
  return trimmed === '' ? '/' : trimmed;
}

// Temporary, opt-in via MCP_AUTH_DIAGNOSTICS. Logs only shapes and booleans —
// never tokens, auth codes, verifiers, or request bodies.
const authDiagnostics = process.env.MCP_AUTH_DIAGNOSTICS === 'true';

function logAuth(event, fields = {}) {
  if (!authDiagnostics) return;
  const pairs = Object.entries(fields).map(
    ([key, value]) => `${key}=${JSON.stringify(String(value))}`,
  );
  process.stdout.write(`[mcp-auth] ${event} ${pairs.join(' ')}\n`);
}

function clientLabel(request) {
  return request.headers['user-agent'] || 'unknown';
}

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.otf': 'font/otf',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const compressibleTypes = new Set(['.css', '.html', '.js', '.json', '.map', '.svg', '.txt']);

// The standalone MCP handler. `manifestProvider` resolves the manifest paths
// the library asks for (e.g. "./manifests/components.json") against the built
// static output on disk. Loaded on first use so the OAuth surface does not
// depend on the MCP package being resolvable.
let mcpHandlerPromise;

function getMcpHandler() {
  mcpHandlerPromise ??= (async () => {
    const { createStorybookMcpHandler } = await import('@storybook/mcp');
    return await createStorybookMcpHandler({
      manifestProvider: async (_request, manifestPath) => {
        const file = path.join(rootDir, manifestPath.replace(/^\.\//, ''));
        return await readFile(file, 'utf8');
      },
    });
  })();
  return mcpHandlerPromise;
}

// OAuth 2.0 Protected Resource Metadata (RFC 9728) — tells MCP clients which
// local authorization facade and scope to use. The facade supplies MCP OAuth
// discovery and registration, then delegates authorization and tokens to Entra.
function resolveOrigin(request) {
  return `https://${publicHost || request.headers.host || 'localhost'}`;
}

function isTrustedHost(request) {
  return !publicHost || (request.headers.host || '') === publicHost;
}

function protectedResourceMetadata(request) {
  const origin = resolveOrigin(request);
  return JSON.stringify(
    createProtectedResourceMetadata({
      resource: `${origin}/mcp`,
      authorizationServer: origin,
      scope: authScope,
    }),
  );
}

function authorizationServerMetadata(request) {
  return JSON.stringify(
    createAuthorizationServerMetadata({
      issuer: resolveOrigin(request),
      scope: authScope,
    }),
  );
}

async function verifyBearer(request) {
  const header = request.headers.authorization || '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) {
    logAuth('verify', { ua: clientLabel(request), result: 'no_bearer_header' });
    return false;
  }
  try {
    const { payload } = await jwtVerify(match[1], jwks, {
      issuer: authIssuer,
      audience: authAudiences,
    });
    // Single-tenant lockdown: require the Microsoft tenant claim.
    if (payload.tid !== authTenantId) {
      logAuth('verify', { ua: clientLabel(request), result: 'tenant_mismatch' });
      return false;
    }
    // Load-bearing, not defence in depth: v2 access tokens carry the resource's
    // client ID as `aud`, which an ID token for the same client also carries.
    // The `scp` check is what distinguishes them, since ID tokens have no `scp`.
    if (!hasDelegatedScope(payload, authScope)) {
      logAuth('verify', { ua: clientLabel(request), result: 'missing_delegated_scope' });
      return false;
    }
    logAuth('verify', {
      ua: clientLabel(request),
      result: 'ok',
      aud: String(payload.aud),
      remaining_s: payload.exp ? payload.exp - Math.floor(Date.now() / 1000) : '',
    });
    return true;
  } catch (error) {
    logAuth('verify', {
      ua: clientLabel(request),
      result: 'jwt_invalid',
      code: error?.code ?? error?.name ?? 'unknown',
    });
    return false;
  }
}

function sendUnauthorized(request, response) {
  const metadataUrl = `${resolveOrigin(request)}/.well-known/oauth-protected-resource/mcp`;
  response.writeHead(401, {
    'Content-Type': 'application/json; charset=utf-8',
    'WWW-Authenticate': `Bearer resource_metadata="${metadataUrl}"`,
  });
  response.end(JSON.stringify({ error: 'unauthorized' }));
}

async function handleOAuthRegistration(request, response) {
  if (request.method !== 'POST') {
    response.writeHead(405, { Allow: 'POST' });
    response.end();
    return;
  }

  try {
    const registration = JSON.parse((await readRequestBody(request)).toString('utf8'));
    logAuth('register', {
      ua: clientLabel(request),
      client_name: registration?.client_name ?? '',
      redirect_uris: JSON.stringify(registration?.redirect_uris ?? []),
      scope: registration?.scope ?? '',
      grant_types: JSON.stringify(registration?.grant_types ?? []),
    });
    const result = registerOAuthClient(registration, oauthClientId, clientScope);
    response.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify(result));
  } catch (error) {
    logAuth('register_rejected', { ua: clientLabel(request), reason: error?.message ?? 'unknown' });
    const status = error?.message === 'payload_too_large' ? 413 : 400;
    sendJson(response, status, {
      error: error?.message === 'invalid_client_metadata' ? error.message : 'invalid_request',
    });
  }
}

function handleOAuthAuthorization(request, response) {
  if (request.method !== 'GET' && request.method !== 'POST') {
    response.writeHead(405, { Allow: 'GET, POST' });
    response.end();
    return;
  }

  const requestUrl = `${resolveOrigin(request)}${request.url}`;
  const requested = new URL(requestUrl).searchParams;
  logAuth('authorize', {
    ua: clientLabel(request),
    scope: requested.get('scope') ?? '',
    has_offline_access: (requested.get('scope') ?? '').split(/\s+/).includes('offline_access'),
    redirect_uri: requested.get('redirect_uri') ?? '',
    has_code_challenge: Boolean(requested.get('code_challenge')),
    resource: requested.get('resource') ?? '',
  });

  try {
    const target = createEntraAuthorizationUrl(requestUrl, {
      clientId: oauthClientId,
      entraIssuer: entraAuthority,
      defaultScope: clientScope,
    });
    response.writeHead(302, { Location: target.toString() });
    response.end();
  } catch (error) {
    logAuth('authorize_rejected', {
      ua: clientLabel(request),
      reason: error?.message ?? 'unknown',
    });
    response.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ error: 'invalid_request' }));
  }
}

async function handleOAuthToken(request, response) {
  if (request.method !== 'POST') {
    response.writeHead(405, { Allow: 'POST' });
    response.end();
    return;
  }

  let parameters;
  try {
    parameters = createEntraTokenRequest(
      await readRequestBody(request),
      oauthClientId,
      clientScope,
    );
  } catch (error) {
    logAuth('token_rejected', { ua: clientLabel(request), reason: error?.message ?? 'unknown' });
    const status = error?.message === 'payload_too_large' ? 413 : 400;
    sendJson(response, status, { error: 'invalid_request' }, { 'Cache-Control': 'no-store' });
    return;
  }

  try {
    const tokenResponse = await fetch(`${entraAuthority}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: parameters,
      signal: AbortSignal.timeout(10_000),
    });
    const payload = Buffer.from(await tokenResponse.arrayBuffer());
    logTokenExchange(request, parameters, tokenResponse.status, payload);
    response.writeHead(tokenResponse.status, {
      'Content-Type':
        tokenResponse.headers.get('content-type') || 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    response.end(payload);
  } catch (error) {
    // Upstream failure, not caller error — never collapse this into a 400.
    process.stderr.write(`Entra token request failed: ${error?.name}: ${error?.message}\n`);
    logAuth('token_upstream_error', { ua: clientLabel(request), code: error?.name ?? 'unknown' });
    sendJson(response, 502, { error: 'temporarily_unavailable' }, { 'Cache-Control': 'no-store' });
  }
}

function logTokenExchange(request, parameters, status, payload) {
  if (!authDiagnostics) return;
  let body;
  try {
    body = JSON.parse(payload.toString('utf8')) ?? {};
  } catch {
    body = {};
  }
  logAuth('token', {
    ua: clientLabel(request),
    grant_type: parameters.get('grant_type') ?? '',
    requested_scope: parameters.get('scope') ?? '',
    status,
    has_refresh_token: Boolean(body.refresh_token),
    granted_scope: body.scope ?? '',
    expires_in: body.expires_in ?? '',
    error: body.error ?? '',
  });
}

function resolvePath(urlPathname) {
  const safePath = path.normalize(decodeURIComponent(urlPathname)).replace(/^(\.\.[/\\])+/, '');
  const joinedPath = safePath === '/' ? '/index.html' : safePath;
  const filePath = path.join(rootDir, joinedPath);

  if (!filePath.startsWith(rootDir)) {
    return null;
  }

  if (path.extname(filePath)) {
    return filePath;
  }

  return path.join(filePath, 'index.html');
}

// `/oauth/register` and `/oauth/token` are reachable anonymously, so an
// uncapped body would let any caller exhaust memory on a single small worker.
const maxRequestBodyBytes = 64 * 1024;

function readRequestBody(request, limit = maxRequestBodyBytes) {
  return new Promise((resolve, reject) => {
    let chunks = [];
    let size = 0;
    let exceeded = false;

    request.on('data', (chunk) => {
      size += chunk.length;

      if (exceeded) {
        // Keep draining so the client can finish writing and read the 413,
        // but give up entirely on an obviously abusive upload.
        if (size > limit * 10) request.destroy();
        return;
      }

      if (size > limit) {
        exceeded = true;
        chunks = [];
        reject(new Error('payload_too_large'));
        return;
      }

      chunks.push(chunk);
    });
    request.on('end', () => resolve(Buffer.concat(chunks)));
    request.on('error', reject);
  });
}

function sendJson(response, status, body, headers = {}) {
  if (response.headersSent) return;
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
  response.end(JSON.stringify(body));
}

async function handleMcp(request, response, pathname) {
  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
  // Authenticated callers, so a larger allowance than the anonymous endpoints.
  const body = hasBody ? await readRequestBody(request, 4 * 1024 * 1024) : undefined;

  const host = request.headers.host || 'localhost';
  const url = `http://${host}${pathname}${new URL(request.url, `http://${host}`).search}`;
  const headers = new Headers();
  for (const [key, value] of Object.entries(request.headers)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      for (const item of value) headers.append(key, item);
    } else {
      headers.set(key, value);
    }
  }

  const webRequest = new Request(url, {
    method: request.method,
    headers,
    body: body && body.length > 0 ? body : undefined,
  });

  const webResponse = await (await getMcpHandler())(webRequest);

  response.statusCode = webResponse.status;
  webResponse.headers.forEach((value, key) => response.setHeader(key, value));
  if (!webResponse.body) {
    response.end();
    return;
  }

  await pipeline(Readable.fromWeb(webResponse.body), response);
}

function serveStatic(request, response, pathname) {
  const resolvedPath = resolvePath(pathname);

  if (!resolvedPath) {
    response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Invalid path.');
    return;
  }

  fs.readFile(resolvedPath, (error, buffer) => {
    if (error) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Not found.');
      return;
    }

    const extension = path.extname(resolvedPath);
    const headers = {
      'Content-Type': contentTypes[extension] || 'application/octet-stream',
      'Cache-Control': extension === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
    };

    const acceptEncoding = request.headers['accept-encoding'] || '';
    if (compressibleTypes.has(extension) && acceptEncoding.includes('gzip')) {
      zlib.gzip(buffer, (gzipError, compressed) => {
        if (gzipError) {
          response.writeHead(200, headers);
          response.end(buffer);
          return;
        }
        headers['Content-Encoding'] = 'gzip';
        headers['Vary'] = 'Accept-Encoding';
        response.writeHead(200, headers);
        response.end(compressed);
      });
      return;
    }

    response.writeHead(200, headers);
    response.end(buffer);
  });
}

const server = http.createServer((request, response) => {
  handleRequest(request, response).catch((error) => {
    // A client disconnecting mid-stream is normal, not an error worth a trace.
    if (error?.code === 'ERR_STREAM_PREMATURE_CLOSE') return;
    process.stderr.write(`Request handler error: ${error?.stack || error}\n`);
    if (!response.headersSent) {
      response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    }
    response.end('Server error.');
  });
});

async function handleRequest(request, response) {
  const host = request.headers.host || 'localhost';
  const pathname = normalizePathname(new URL(request.url, `http://${host}`).pathname);

  // Reject a spoofed Host before it can be reflected into issued metadata or a
  // redirect. Defence in depth: matters most if a cache ever fronts this app.
  if (authEnabled && pathname.startsWith('/.well-known/') && !isTrustedHost(request)) {
    sendJson(response, 421, { error: 'misdirected_request' });
    return;
  }

  const metadataHeaders = { 'Cache-Control': 'public, max-age=3600' };

  // Public: OAuth protected-resource metadata (needed so clients can discover
  // how to authenticate before they have a token).
  if (authEnabled && protectedResourceMetadataPaths.has(pathname)) {
    response.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      ...metadataHeaders,
    });
    response.end(protectedResourceMetadata(request));
    return;
  }

  if (authEnabled && pathname === '/.well-known/oauth-authorization-server') {
    response.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      ...metadataHeaders,
    });
    response.end(authorizationServerMetadata(request));
    return;
  }

  if (authEnabled && pathname === '/oauth/register') {
    await handleOAuthRegistration(request, response);
    return;
  }

  if (authEnabled && pathname === '/oauth/authorize') {
    handleOAuthAuthorization(request, response);
    return;
  }

  if (authEnabled && pathname === '/oauth/token') {
    await handleOAuthToken(request, response);
    return;
  }

  // Gate the MCP endpoint and the raw manifests (the MCP's underlying data)
  // behind Entra. The MCP handler itself reads manifests from disk, so this
  // does not affect it — it only blocks direct public download.
  const requiresAuth = authEnabled && (pathname === '/mcp' || pathname.startsWith('/manifests/'));
  if (requiresAuth && !(await verifyBearer(request))) {
    sendUnauthorized(request, response);
    return;
  }

  if (pathname === '/mcp') {
    await handleMcp(request, response, pathname);
    return;
  }

  serveStatic(request, response, pathname);
}

// Only listen when started directly, so tests can import and drive the server.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  server.listen(port, () => {
    process.stdout.write(`Storybook host listening on http://localhost:${port}\n`);
    process.stdout.write(`MCP endpoint at http://localhost:${port}/mcp\n`);
    process.stdout.write(
      `MCP auth: ${authEnabled ? `Entra (tenant ${authTenantId})` : 'disabled (open)'}\n`,
    );
  });
}

export { server };
