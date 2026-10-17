// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import assert from 'node:assert/strict';
import test from 'node:test';
import { validateHostingAuth } from './check-hosting-auth.mjs';

const publicAuth = {
  platform: { enabled: false },
  globalValidation: {
    requireAuthentication: false,
    unauthenticatedClientAction: 'AllowAnonymous',
  },
};
test('requires anonymous docsite and Storybook access', () => {
  assert.doesNotThrow(() => validateHostingAuth(publicAuth, publicAuth, []));
  assert.doesNotThrow(() =>
    validateHostingAuth({ properties: publicAuth }, { properties: publicAuth }, []),
  );
  for (const [index, name] of [
    [0, 'docsite'],
    [1, 'Storybook'],
  ]) {
    for (const invalid of [
      undefined,
      {},
      { ...publicAuth, platform: { enabled: true } },
      {
        ...publicAuth,
        globalValidation: { ...publicAuth.globalValidation, requireAuthentication: true },
      },
      { ...publicAuth, globalValidation: { requireAuthentication: false } },
      {
        ...publicAuth,
        globalValidation: {
          ...publicAuth.globalValidation,
          unauthenticatedClientAction: 'RedirectToLoginPage',
        },
      },
    ]) {
      const configs = [publicAuth, publicAuth];
      configs[index] = invalid;
      assert.throws(() => validateHostingAuth(...configs, []), new RegExp(name));
    }
  }
});

test('rejects retired MCP authentication settings', () => {
  for (const name of ['MCP_ENTRA_TENANT_ID', 'MCP_OAUTH_CLIENT_ID', 'MCP_AUTH_ENABLED']) {
    assert.throws(
      () => validateHostingAuth(publicAuth, publicAuth, [{ name, value: 'unused' }]),
      /retired/,
    );
  }
});
