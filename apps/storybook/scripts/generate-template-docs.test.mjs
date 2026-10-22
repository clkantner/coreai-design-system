// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { generateTemplateDocs } from './generate-template-docs.mjs';

test('Form source docs publish the exact component and portable companion tests', () => {
  const componentPath = new URL('../src/stories/templates/Form.tsx', import.meta.url);
  const testPath = new URL('../src/test/templates/Form.test.tsx', import.meta.url);
  const [generated] = generateTemplateDocs(fileURLToPath(componentPath));
  const docs = fs.readFileSync(generated, 'utf8');
  assert.ok(docs.includes(fs.readFileSync(componentPath, 'utf8')));
  assert.ok(docs.includes(fs.readFileSync(testPath, 'utf8')));
  assert.match(docs, /title="Templates\/Form" name="Source Code"/);
  assert.match(docs, /## Companion browser tests/);
  assert.match(docs, /browser\.provider: playwright\(\)/);
  assert.match(
    docs,
    /test:component -- \.\.\/\.\.\/apps\/storybook\/src\/test\/templates\/Form\.test\.tsx/,
  );
  assert.doesNotMatch(fs.readFileSync(testPath, 'utf8'), /from ['"][^'"]*test-utils/);
});

test('templates without companion tests keep their source-only documentation', () => {
  const componentPath = new URL('../src/stories/templates/DetailsList.tsx', import.meta.url);
  const [generated] = generateTemplateDocs(fileURLToPath(componentPath));
  const docs = fs.readFileSync(generated, 'utf8');
  assert.ok(docs.includes(fs.readFileSync(componentPath, 'utf8')));
  assert.match(docs, /title="Templates\/Details List" name="Source Code"/);
  assert.doesNotMatch(docs, /Companion browser tests|vitest-browser-react/);
});
