// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('static Storybook publishes the catalog doc and exact manifest/SVG bytes together', () => {
  const source = new URL('../../../assets/illicons/', import.meta.url);
  const output = new URL('../storybook-static/', import.meta.url);
  const manifestBytes = readFileSync(new URL('manifest.json', source));
  const manifest = JSON.parse(manifestBytes);
  assert.deepEqual(readFileSync(new URL('illicons/manifest.json', output)), manifestBytes);
  for (const icon of manifest.icons) {
    assert.deepEqual(
      readFileSync(new URL(`illicons/${icon.file}`, output)),
      readFileSync(new URL(icon.file, source)),
    );
  }
  const index = JSON.parse(readFileSync(new URL('index.json', output), 'utf8'));
  assert.equal(index.entries['illustrations-illicon-catalog--docs']?.type, 'docs');
  const docs = JSON.parse(readFileSync(new URL('manifests/docs.json', output), 'utf8'));
  assert.ok(docs.docs['illustrations-illicon-catalog--docs']);
});
