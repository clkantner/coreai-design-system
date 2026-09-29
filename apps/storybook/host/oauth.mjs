export const vscodeRedirectUris = [
  'https://insiders.vscode.dev/redirect',
  'https://vscode.dev/redirect',
  'http://127.0.0.1/',
  'http://127.0.0.1:33418/',
];

export function createProtectedResourceMetadata({ resource, authorizationServer, scope }) {
  return {
    resource,
    authorization_servers: [authorizationServer],
    scopes_supported: ['openid', scope, 'offline_access'].filter(Boolean),
    bearer_methods_supported: ['header'],
  };
}

export function createAuthorizationServerMetadata({ issuer, scope }) {
  return {
    issuer,
    authorization_endpoint: `${issuer}/oauth/authorize`,
    token_endpoint: `${issuer}/oauth/token`,
    registration_endpoint: `${issuer}/oauth/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
    scopes_supported: ['openid', scope, 'offline_access'].filter(Boolean),
  };
}

function isAllowedRedirectUri(value) {
  if (typeof value !== 'string') return false;

  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  if (vscodeRedirectUris.includes(url.toString())) return true;

  // RFC 8252 section 7.3: native clients (Copilot CLI) bind an ephemeral loopback
  // port at runtime, so the port cannot be pre-registered. Entra ignores the port
  // for loopback redirect URIs on public clients. Section 8.3 prefers the literal
  // IP over `localhost`, which is reachable via DNS rebinding.
  return url.protocol === 'http:' && (url.hostname === '127.0.0.1' || url.hostname === '[::1]');
}

export function registerOAuthClient(registration, clientId, scope) {
  if (
    !registration ||
    !Array.isArray(registration.redirect_uris) ||
    registration.redirect_uris.length === 0 ||
    !registration.redirect_uris.every(isAllowedRedirectUri) ||
    (registration.token_endpoint_auth_method ?? 'none') !== 'none'
  ) {
    throw new Error('invalid_client_metadata');
  }

  // Fixed document; caller-supplied fields are never reflected back. `scope` is
  // what tells a client to request `offline_access` — without it Entra issues no
  // refresh token and every expiry becomes an interactive sign-in.
  return {
    client_id: clientId,
    redirect_uris: registration.redirect_uris,
    token_endpoint_auth_method: 'none',
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    scope,
  };
}

export function createEntraAuthorizationUrl(requestUrl, config) {
  const request = new URL(requestUrl);
  const redirectUri = request.searchParams.get('redirect_uri');

  if (
    request.searchParams.get('client_id') !== config.clientId ||
    request.searchParams.get('response_type') !== 'code' ||
    request.searchParams.get('code_challenge_method') !== 'S256' ||
    // Advertised in `code_challenge_methods_supported`, so enforce it rather
    // than relying on Entra to reject a challenge-less public client request.
    !request.searchParams.get('code_challenge') ||
    !isAllowedRedirectUri(redirectUri)
  ) {
    throw new Error('invalid_request');
  }

  const target = new URL(`${config.entraIssuer}/oauth2/v2.0/authorize`);
  for (const name of [
    'client_id',
    'response_type',
    'redirect_uri',
    'scope',
    'state',
    'code_challenge',
    'code_challenge_method',
    'prompt',
  ]) {
    const value = request.searchParams.get(name);
    if (value) target.searchParams.set(name, value);
  }

  // RFC 8707 `resource` is dropped because the Entra v2 endpoint does not accept
  // it. A client that expressed its target only via `resource` would otherwise
  // get a token for the wrong audience, so substitute the API scope instead.
  if (!hasApiScope(target.searchParams.get('scope'), config.defaultScope)) {
    target.searchParams.set('scope', config.defaultScope);
  }

  return target;
}

function hasApiScope(scope, defaultScope) {
  if (!scope || !defaultScope) return Boolean(scope);
  const apiScope = defaultScope.split(/\s+/).find((entry) => entry.startsWith('api://'));
  return apiScope ? scope.split(/\s+/).includes(apiScope) : true;
}

export function createEntraTokenRequest(body, clientId, defaultScope) {
  const parameters = new URLSearchParams(Buffer.isBuffer(body) ? body.toString('utf8') : body);
  const grantType = parameters.get('grant_type');

  if (
    parameters.get('client_id') !== clientId ||
    !['authorization_code', 'refresh_token'].includes(grantType) ||
    (grantType === 'authorization_code' &&
      (!isAllowedRedirectUri(parameters.get('redirect_uri')) ||
        !parameters.get('code') ||
        !parameters.get('code_verifier'))) ||
    (grantType === 'refresh_token' && !parameters.get('refresh_token'))
  ) {
    throw new Error('invalid_request');
  }

  if (grantType === 'refresh_token' && !hasApiScope(parameters.get('scope'), defaultScope)) {
    parameters.set('scope', defaultScope);
  }

  parameters.delete('resource');
  parameters.delete('client_secret');
  return parameters;
}

export function hasDelegatedScope(payload, requiredScope) {
  if (!requiredScope || typeof payload?.scp !== 'string') return false;

  const scopeName = requiredScope.split('/').at(-1);
  return payload.scp.split(/\s+/).includes(scopeName);
}
