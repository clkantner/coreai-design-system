import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import { createStorybookMcpHandler } from '@storybook/mcp';

const root = new URL('../storybook-static/', import.meta.url);

test('generated guidance is absent from Storybook and production MCP', async () => {
  const docs = JSON.parse(await fs.readFile(new URL('manifests/docs.json', root), 'utf8')).docs;
  const index = JSON.parse(await fs.readFile(new URL('index.json', root), 'utf8'));
  assert.equal(Object.values(docs).filter((entry) => entry.path.includes('/guidance/')).length, 0);
  assert.equal(
    Object.values(index.entries).filter((entry) => entry.importPath?.includes('/guidance/')).length,
    0,
  );
  const handler = await createStorybookMcpHandler({
    manifestProvider: async (_request, path) => fs.readFile(new URL(path, root), 'utf8'),
  });
  const response = await handler(
    new Request('http://localhost/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'list-all-documentation', arguments: { withStoryIds: true } },
      }),
    }),
  );
  assert.equal(response.status, 200);
  const listing = await response.text();
  assert.match(listing, /components-accordion--default/);
  assert.match(listing, /templates-empty-state--source-code/);
  assert.doesNotMatch(listing, /--[a-z0-9-]*guidance\)/);
});
