import assert from 'node:assert/strict';
import test from 'node:test';
import { packages, updateBaseline } from './update-fluent.mjs';
import { peerMinimums } from './install-fluent-minimums.mjs';

const versions = (version) => Object.fromEntries(packages.map((name) => [name, version]));
const manifest = () => ({
  devDependencies: versions('1.2.3'),
  peerDependencies: versions('^1.0.0'),
});

test('updates only development versions without mutating input or peer floors', () => {
  const before = manifest();
  const { updated, rows } = updateBaseline(before, versions('2.0.0'));
  assert.deepEqual(before, manifest());
  assert.deepEqual(updated.peerDependencies, before.peerDependencies);
  assert.deepEqual(updated.devDependencies, versions('2.0.0'));
  assert.equal(rows.length, 2);
});

test('current baseline produces no changes', () => {
  const before = manifest();
  const { updated, rows } = updateBaseline(before, versions('1.2.3'));
  assert.deepEqual(updated, before);
  assert.deepEqual(rows, []);
});

test('rejects missing and nonstable registry versions', () => {
  for (const value of [undefined, 'next', '1.2.3-beta.1', '1.2.3\ninjected']) {
    assert.throws(() => updateBaseline(manifest(), versions(value)), /stable release/);
  }
});

test('extracts exact peer minimums and rejects changed compatibility floors', () => {
  const peers = versions('^1.0.0');
  assert.deepEqual(peerMinimums(peers, peers), versions('1.0.0'));
  assert.throws(() => peerMinimums(peers, versions('^2.0.0')), /compatibility floor/);
  assert.throws(() => peerMinimums(versions('>=1'), versions('>=1')), /simple caret/);
});
