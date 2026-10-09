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

test('MCP publishes local examples and complete upstream variants under real component IDs', async () => {
  const component = await callTool(2, 'docs-show', {
    id: 'components-badge-counterbadge',
  });
  assert.match(component, /CounterBadge/);
  assert.match(component, /## Props/);

  const inlineStory = await callTool(3, 'docs-show-story', {
    storyId: 'components-badge-counterbadge--default',
  });
  assert.match(inlineStory, /import \{ CounterBadge \} from "@coreai-ds\/react-components"/);
  assert.match(inlineStory, /<CounterBadge \{\.\.\.args\}/);
  assert.match(inlineStory, /Default\.args = \{\s*count: 5/s);

  const reExportedStory = await callTool(4, 'docs-show-story', {
    storyId: 'components-accordion--collapsible',
  });
  assert.match(reExportedStory, /Accordion Panel 3/);
  assert.match(reExportedStory, /Source: Fluent upstream/);
});

test('direct imported render is indexed but its generated snippet omits the Fluent implementation', async () => {
  const id = 'experiments-mcp-imported-accordion-render';
  const storyId = `${id}--default`;
  const index = JSON.parse(await manifestProvider(undefined, './index.json'));
  assert.equal(
    index.entries[storyId]?.importPath,
    './src/stories/experiments/ImportedAccordionRender.stories.tsx',
  );
  const manifest = JSON.parse(await manifestProvider(undefined, './manifests/components.json'));
  assert.ok(manifest.components[id], 'The unique experiment component must be in the manifest');
  const component = await resolveComponentEntry(
    manifest.components[id],
    undefined,
    manifestProvider,
  );
  assert.equal(component.error, undefined);
  assert.equal(component.stories.length, 1);
  assert.equal(component.stories[0].id, storyId);
  assert.equal(component.stories[0].snippet, 'const Default = () => <Accordion />;');

  const upstream = await fs.readFile(
    new URL(
      '../fluent-stories/packages/react-components/react-accordion/stories/src/Accordion/AccordionDefault.stories.tsx',
      import.meta.url,
    ),
    'utf8',
  );
  assert.match(upstream, /Accordion Header 1/);
  assert.match(upstream, /Accordion Panel 3/);

  const listing = await callTool(1000, 'docs-list', { withStoryIds: true });
  assert.ok(listing.includes(`(${id})`));
  assert.ok(listing.includes(`(${storyId})`));
  const documentation = await callTool(1001, 'docs-show', { id });
  assert.match(documentation, /## Props/);
  const example = await callTool(1002, 'docs-show-story', { storyId });
  for (const text of [documentation, example]) {
    assert.ok(text.includes("import { Accordion } from '@coreai-ds/react-components';"));
    assert.ok(text.includes('const Default = () => <Accordion />;'));
    assert.doesNotMatch(text, /Accordion Header 1|Accordion Panel 3|<AccordionItem/);
  }
});

test('imported example wrapper returns a reference with an incorrect package import', async () => {
  const id = 'experiments-mcp-imported-accordion-wrapper';
  const storyId = `${id}--default`;
  const index = JSON.parse(await manifestProvider(undefined, './index.json'));
  assert.equal(
    index.entries[storyId]?.importPath,
    './src/stories/experiments/ImportedAccordionWrapper.stories.tsx',
  );
  const manifest = JSON.parse(await manifestProvider(undefined, './manifests/components.json'));
  assert.ok(manifest.components[id]);
  const component = await resolveComponentEntry(
    manifest.components[id],
    undefined,
    manifestProvider,
  );
  assert.equal(component.error, undefined);
  assert.equal(component.stories.length, 1);
  assert.equal(component.stories[0].id, storyId);
  assert.equal(component.stories[0].snippet, 'const Default = () => <FluentDefault />;');

  const listing = await callTool(1010, 'docs-list', { withStoryIds: true });
  assert.ok(listing.includes(`(${id})`));
  assert.ok(listing.includes(`(${storyId})`));
  const documentation = await callTool(1011, 'docs-show', { id });
  assert.match(documentation, /## Props/);
  const example = await callTool(1012, 'docs-show-story', { storyId });
  for (const text of [documentation, example]) {
    assert.ok(
      text.includes(
        "import { Accordion, Default as FluentDefault } from '@coreai-ds/react-components';",
      ),
    );
    assert.ok(text.includes('const Default = () => <FluentDefault />;'));
    assert.doesNotMatch(text, /Accordion Header 1|Accordion Panel 3|<AccordionItem/);
  }
});

test('local Fluent re-export resolves props but records a story extraction error', async () => {
  const id = 'experiments-mcp-re-exported-accordion';
  const storyId = `${id}--default`;
  const index = JSON.parse(await manifestProvider(undefined, './index.json'));
  assert.equal(
    index.entries[storyId]?.importPath,
    './src/stories/experiments/ReExportedAccordion.stories.tsx',
  );
  const manifest = JSON.parse(await manifestProvider(undefined, './manifests/components.json'));
  assert.ok(manifest.components[id]);
  const component = await resolveComponentEntry(
    manifest.components[id],
    undefined,
    manifestProvider,
  );
  assert.equal(component.error, undefined);
  assert.equal(component.stories.length, 1);
  const story = component.stories[0];
  assert.equal(story.id, storyId);
  assert.equal(story.snippet, undefined);
  assert.equal(story.error?.name, 'SyntaxError');
  assert.match(story.error.message, /Expected story to be a function or variable declaration/);

  const listing = await callTool(1020, 'docs-list', { withStoryIds: true });
  assert.ok(listing.includes(`(${id})`));
  assert.ok(listing.includes(`(${storyId})`));
  const documentation = await callTool(1021, 'docs-show', { id });
  assert.match(documentation, /## Props/);
  assert.doesNotMatch(documentation, /Accordion Header 1|Accordion Panel 3|<AccordionItem/);
  const example = await callTool(1022, 'docs-show-story', { storyId });
  assert.match(example, /No code snippet was extracted for this story/);
});

test('inline Accordion control returns the complete three-item example', async () => {
  const id = 'experiments-mcp-inline-accordion-control';
  const storyId = `${id}--default`;
  const index = JSON.parse(await manifestProvider(undefined, './index.json'));
  assert.equal(
    index.entries[storyId]?.importPath,
    './src/stories/experiments/InlineAccordionControl.stories.tsx',
  );
  const manifest = JSON.parse(await manifestProvider(undefined, './manifests/components.json'));
  assert.ok(manifest.components[id]);
  const component = await resolveComponentEntry(
    manifest.components[id],
    undefined,
    manifestProvider,
  );
  assert.equal(component.error, undefined);
  assert.equal(component.stories.length, 1);
  const story = component.stories[0];
  assert.equal(story.id, storyId);
  assert.equal(story.error, undefined);
  assert.equal(story.warning, undefined);
  assert.ok(story.snippet);

  const listing = await callTool(1030, 'docs-list', { withStoryIds: true });
  assert.ok(listing.includes(`(${id})`));
  assert.ok(listing.includes(`(${storyId})`));
  const documentation = await callTool(1031, 'docs-show', { id });
  assert.match(documentation, /## Props/);
  const example = await callTool(1032, 'docs-show-story', { storyId });
  for (const text of [story.snippet, documentation, example]) {
    assert.equal((text.match(/<AccordionItem value=/g) ?? []).length, 3);
    for (const value of ['1', '2', '3']) {
      assert.ok(text.includes(`<AccordionItem value="${value}">`));
      assert.ok(text.includes(`<AccordionHeader>Accordion Header ${value}</AccordionHeader>`));
      assert.ok(text.includes(`<div>Accordion Panel ${value}</div>`));
    }
  }
  for (const text of [documentation, example]) {
    assert.ok(
      text.includes(
        "import { Accordion, AccordionHeader, AccordionItem, AccordionPanel } from '@coreai-ds/react-components';",
      ),
    );
    assert.ok(text.includes(story.snippet));
  }
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
    return path.includes('/component-stories/');
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
    if (component.id !== 'components-portal-tomountnodeprops') {
      assert.equal(component.error, undefined, `Component extraction failed: ${component.id}`);
      assert.match(documentation, /## Props/);
    }

    for (const story of component.stories) {
      assert.ok(listing.includes(`(${story.id})`), `Missing story ${story.id}`);
      const example = await callTool(requestId++, 'docs-show-story', { storyId: story.id });
      {
        assert.ok(story.snippet, `Missing local snippet: ${story.id}`);
        assert.ok(example.includes(story.snippet), `Incomplete local snippet: ${story.id}`);
        assert.ok(example.includes('@coreai-ds/react-components'));
        if (example.includes('Source: local CoreAI override')) localStories++;
        else fluentStories++;
      }
    }
  }

  assert.ok(localStories > 0);
  assert.ok(fluentStories > 0);
  t.diagnostic(
    `Checked ${componentEntries.length} components, ${localStories} local snippets, ` +
      `and ${fluentStories} complete Fluent examples.`,
  );
});
