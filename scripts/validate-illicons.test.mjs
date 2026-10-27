// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { validateCatalog, validateSvg } from './validate-illicons.mjs';

const svg = (body, extra = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="140" height="140" viewBox="0 0 140 140" ${extra}>${body}</svg>`;
const circle = '<circle cx="70" cy="70" r="1" fill="#222222"/>';
const entry = {
  id: 'test-dot',
  name: 'Test dot',
  tags: ['dot', 'test'],
  file: 'test-dot.svg',
  provenance: { author: 'Test author', source: 'Original test fixture', license: 'MIT' },
};

function fixture(t, icons = [entry], files = { 'test-dot.svg': svg(circle) }) {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'illicon-test-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  writeFileSync(path.join(directory, 'manifest.json'), JSON.stringify({ version: 1, icons }));
  for (const [filename, content] of Object.entries(files)) {
    writeFileSync(path.join(directory, filename), content);
  }
  return directory;
}

test('accepts empty catalogs and unchanged circle/path artwork with local shape references', (t) => {
  assert.deepEqual(validateCatalog(fixture(t, [], {})), { version: 1, icons: [] });
  const original = svg(
    '<title>Test</title><defs><path id="dot" d="M70 70h1v1z"/></defs>' +
      '<g transform="translate(0 0)"><use href="#dot"/></g>' +
      circle,
    'role="img" aria-label="Test artwork"',
  );
  const directory = fixture(t, [entry], { 'test-dot.svg': original });
  assert.equal(validateCatalog(directory).icons[0].id, 'test-dot');
});

for (const [label, change] of [
  ['duplicate IDs', [entry, { ...entry, name: 'Another name' }]],
  ['duplicate names', [entry, { ...entry, id: 'other', file: 'other.svg' }]],
  ['path traversal', [{ ...entry, file: '../test-dot.svg' }]],
  ['uppercase ID', [{ ...entry, id: 'Test-Dot' }]],
  ['missing provenance', [{ ...entry, provenance: undefined }]],
  ['unapproved license', [{ ...entry, provenance: { ...entry.provenance, license: 'Unknown' } }]],
  ['empty tags', [{ ...entry, tags: [] }]],
  ['duplicate tags', [{ ...entry, tags: ['dot', 'dot'] }]],
  ['untrimmed name', [{ ...entry, name: ' Test dot ' }]],
]) {
  test(`rejects ${label}`, (t) => {
    assert.throws(() => validateCatalog(fixture(t, change)));
  });
}

test('rejects missing, unlisted, and symlinked SVGs', (t) => {
  assert.throws(() => validateCatalog(fixture(t, [entry], {})), /ENOENT/);
  assert.throws(() => validateCatalog(fixture(t, [], { 'extra.svg': svg(circle) })), /Unlisted/);
  const directory = fixture(t, [entry], { 'original.svg': svg(circle) });
  symlinkSync(path.join(directory, 'original.svg'), path.join(directory, 'test-dot.svg'));
  assert.throws(() => validateCatalog(directory), /regular SVG file/);
});

for (const [label, source] of [
  ['script', svg('<script>alert(1)</script>' + circle)],
  ['event handlers', svg('<circle r="1" onload="alert(1)"/>')],
  ['CSS', svg('<style>circle { fill: red }</style>' + circle)],
  ['inline style', svg('<circle r="1" style="fill:red"/>')],
  ['embedded content', svg('<foreignObject/>' + circle)],
  ['remote use', svg('<use href="https://example.com/image.svg"/>' + circle)],
  ['encoded remote use', svg('<use href="&#104;ttps://example.com/image.svg"/>' + circle)],
  ['paint URLs', svg('<circle r="1" fill="url(https://example.com)"/>')],
  ['namespace spoofing', svg('<g xmlns="https://example.com"><circle r="1"/></g>')],
  ['malformed XML', svg(circle).replace('</svg>', '')],
  ['wrong dimensions', svg(circle).replace('width="140"', 'width="280"')],
  ['empty artwork', svg('')],
  ['dangling references', svg(circle + '<use href="#missing"/>')],
  ['recursive references', svg('<g id="loop"><use href="#loop"/></g>' + circle)],
  ['DOCTYPE', '<!DOCTYPE svg [<!ENTITY x "test">]>' + svg(circle)],
  ['processing instructions', '<?xml-stylesheet href="https://example.com/style"?>' + svg(circle)],
]) {
  test(`rejects SVG ${label}`, () => assert.throws(() => validateSvg(source)));
}
