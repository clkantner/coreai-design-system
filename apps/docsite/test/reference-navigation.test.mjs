// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clientNavigationTarget,
  normalizeReferencePath,
} from '../src/reference-proof/navigation.mjs';

const options = {
  basePath: '/coreai-design-system/',
  currentUrl: 'https://example.com/coreai-design-system/components/button/',
  paths: new Set(['/', '/guides/setup/', '/components/button/', '/components/tree/']),
  button: 0,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  altKey: false,
  download: false,
  target: '',
};

test('client navigation preserves the Pages base path, query and fragment', () => {
  assert.equal(
    clientNavigationTarget(
      '/coreai-design-system/components/tree/?mode=test#guidance-best-practices',
      options,
    ),
    '/components/tree/?mode=test#guidance-best-practices',
  );
  assert.equal(clientNavigationTarget('/coreai-design-system/', options), '/');
  assert.equal(clientNavigationTarget('../tree/', options), '/components/tree/');
  assert.equal(
    clientNavigationTarget('/components/tree/', {
      ...options,
      basePath: '/',
      currentUrl: 'https://example.com/components/button/',
    }),
    '/components/tree/',
  );
  assert.equal(normalizeReferencePath('/components/tree/index.html'), '/components/tree/');
  assert.equal(normalizeReferencePath('/components/tree'), '/components/tree/');
});

test('Markdown, source downloads, external and unknown pages retain native navigation', () => {
  for (const href of [
    '/coreai-design-system/components/tree.md',
    '/coreai-design-system/source/examples/tree.tsx',
    '/coreai-design-system/llms.txt',
    '/coreai-design-system/components/missing/',
    '/another-site/components/tree/',
    'https://other.example/coreai-design-system/components/tree/',
    '#guidance-best-practices',
    'mailto:design@example.com',
  ])
    assert.equal(clientNavigationTarget(href, options), undefined, href);
});

test('modified clicks, new tabs, and download attributes retain native navigation', () => {
  for (const modifier of [
    { ctrlKey: true },
    { metaKey: true },
    { shiftKey: true },
    { altKey: true },
    { button: 1 },
    { button: 2 },
    { target: '_blank' },
    { download: true },
  ]) {
    assert.equal(
      clientNavigationTarget('/coreai-design-system/components/tree/', { ...options, ...modifier }),
      undefined,
    );
  }
  assert.equal(
    clientNavigationTarget('/coreai-design-system/components/tree/', {
      ...options,
      target: '_self',
    }),
    '/components/tree/',
  );
});
