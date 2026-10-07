import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import { createStorybookMcpHandler } from '@storybook/mcp';
import { resolveComponentEntry, resolveDocEntry } from 'storybook/internal/toolsets-docs';

const root = new URL('../storybook-static/', import.meta.url);

const manifestProvider = async (_request, path) => fs.readFile(new URL(path, root), 'utf8');
const handler = await createStorybookMcpHandler({ manifestProvider });

async function callTool(id, name, args) {
  const response = await handler(
    new Request('http://localhost/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id,
        method: 'tools/call',
        params: { name, arguments: args },
      }),
    }),
  );
  assert.equal(response.status, 200);
  const body = await response.text();
  const messages = response.headers.get('content-type')?.includes('text/event-stream')
    ? body
        .split(/\r?\n/)
        .filter((line) => line.startsWith('data:'))
        .map((line) => JSON.parse(line.slice(5)))
    : [JSON.parse(body)];
  const message = messages.find((entry) => entry.id === id);
  assert.ok(message, `Missing MCP response for ${name}`);
  assert.equal(message.error, undefined, `MCP protocol error for ${name}`);
  assert.notEqual(message.result?.isError, true, `MCP tool error for ${name}`);
  assert.ok(Array.isArray(message.result?.content), `Missing MCP content for ${name}`);
  return message.result.content
    .filter((entry) => entry.type === 'text')
    .map((entry) => entry.text)
    .join('\n');
}

test('generated guidance is absent from Storybook and production MCP', async () => {
  const docs = JSON.parse(await fs.readFile(new URL('manifests/docs.json', root), 'utf8')).docs;
  const resolvedDocs = await Promise.all(
    Object.values(docs).map((doc) => resolveDocEntry(doc, undefined, manifestProvider)),
  );
  const authoredSkill = await fs.readFile(
    new URL('../../../packages/react-components/agent/SKILL.md', import.meta.url),
    'utf8',
  );
  const skillBody = authoredSkill.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '').trimStart();
  const mirroredSkill = resolvedDocs.find((doc) => doc.id === 'docs-agent-skill--docs');
  assert.ok(
    mirroredSkill?.content.includes(skillBody),
    'Built agent docs must match the authored guide',
  );
  const index = JSON.parse(await fs.readFile(new URL('index.json', root), 'utf8'));
  assert.equal(resolvedDocs.filter((entry) => entry.path.includes('/guidance/')).length, 0);
  assert.equal(
    Object.values(index.entries).filter((entry) => entry.importPath?.includes('/guidance/')).length,
    0,
  );
  const listing = await callTool(1, 'docs-list', { withStoryIds: true });
  assert.match(listing, /components-accordion--default/);
  assert.match(listing, /templates-empty-state--source-code/);
  assert.doesNotMatch(listing, /--[a-z0-9-]*guidance\)/);
});

test('MCP evaluates inline args but reports unsupported Fluent re-exports', async () => {
  const component = await callTool(2, 'docs-show', {
    id: 'components-badge-counterbadge',
  });
  assert.match(component, /<CounterBadge count=\{5\} \/>/);
  assert.match(component, /## Props/);

  const inlineStory = await callTool(3, 'docs-show-story', {
    storyId: 'components-badge-counterbadge--default',
  });
  assert.match(inlineStory, /import \{ CounterBadge \} from '@coreai-ds\/react-components'/);
  assert.match(inlineStory, /<CounterBadge count=\{5\} \/>/);

  const reExportedStory = await callTool(4, 'docs-show-story', {
    storyId: 'components-accordion--collapsible',
  });
  assert.match(reExportedStory, /No code snippet was extracted for this story/);
});

test('public docs tools read component snapshots and preserve component story coverage', async (t) => {
  const manifest = JSON.parse(await manifestProvider(undefined, './manifests/components.json'));
  for (const component of Object.values(manifest.components)) {
    assert.equal(typeof component.docgen?.$ref, 'string', `Missing API snapshot: ${component.id}`);
    assert.equal(
      typeof component.stories?.$ref,
      'string',
      `Missing story snapshot: ${component.id}`,
    );
  }
  const components = await Promise.all(
    Object.values(manifest.components).map((component) =>
      resolveComponentEntry(component, undefined, manifestProvider),
    ),
  );
  const componentEntries = components.filter((component) => {
    const path = component.path.replaceAll('\\', '/');
    return path.includes('/src/stories/components/') || path.includes('/fluent-stories/');
  });
  assert.ok(componentEntries.length > 0);

  let requestId = 10;
  const listing = await callTool(requestId++, 'docs-list', { withStoryIds: true });
  let localStories = 0;
  let fluentStories = 0;

  for (const component of componentEntries) {
    assert.ok(listing.includes(`(${component.id})`), `Missing component ${component.id}`);
    const documentation = await callTool(requestId++, 'docs-show', { id: component.id });
    assert.ok(documentation.includes(`ID: ${component.id}`));
    const isLocal = component.path.replaceAll('\\', '/').includes('/src/stories/components/');
    if (isLocal) {
      assert.equal(component.error, undefined, `Component extraction failed: ${component.id}`);
      assert.match(documentation, /## Props/);
    }

    for (const story of component.stories) {
      assert.ok(listing.includes(`(${story.id})`), `Missing story ${story.id}`);
      const example = await callTool(requestId++, 'docs-show-story', { storyId: story.id });
      if (isLocal) {
        assert.ok(story.snippet, `Missing local snippet: ${story.id}`);
        assert.ok(example.includes(story.snippet), `Incomplete local snippet: ${story.id}`);
        assert.ok(example.includes('@coreai-ds/react-components'));
        localStories++;
      } else {
        assert.match(example, /No code snippet was extracted for this story/);
        fluentStories++;
      }
    }
  }

  assert.ok(localStories > 0);
  assert.ok(fluentStories > 0);
  t.diagnostic(
    `Checked ${componentEntries.length} components, ${localStories} local snippets, ` +
      `and ${fluentStories} Fluent stories with known extraction failures.`,
  );
});
