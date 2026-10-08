import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import ts from 'typescript';
import { createStorybookMcpHandler } from '@storybook/mcp';

const root = new URL('../storybook-static/', import.meta.url);
const liveUrl = process.env.MCP_EXPERIMENT_URL;
const handler = await createStorybookMcpHandler({
  manifestProvider: async (_request, manifestPath) =>
    fs.readFile(new URL(manifestPath, root), 'utf8'),
});
let requestId = 2000;

async function callTool(name, args) {
  const id = requestId++;
  const request = new Request(liveUrl ?? 'http://localhost/mcp', {
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
    signal: AbortSignal.timeout(60000),
  });
  const response = await (liveUrl ? fetch(request) : handler(request));
  assert.equal(response.status, 200);
  const body = await response.text();
  const messages = response.headers.get('content-type')?.includes('text/event-stream')
    ? body
        .split(/\r?\n/)
        .filter((line) => line.startsWith('data:'))
        .map((line) => JSON.parse(line.slice(5)))
    : [JSON.parse(body)];
  const message = messages.find((entry) => entry.id === id);
  assert.ok(message, `Missing response for ${name}`);
  assert.equal(message.error, undefined, `Protocol error for ${name}`);
  assert.notEqual(message.result?.isError, true, `Tool error for ${name}`);
  assert.ok(Array.isArray(message.result?.content));
  return message.result.content
    .filter((entry) => entry.type === 'text')
    .map((entry) => entry.text)
    .join('\n');
}

async function assertListed(componentId, storyNames) {
  const listing = await callTool('docs-list', { withStoryIds: true });
  assert.ok(listing.includes(`(${componentId})`));
  for (const name of storyNames) {
    assert.ok(listing.includes(`(${componentId}--${name})`));
  }
}

test('module-level dependencies are referenced but not included in default snippets', async () => {
  const id = 'experiments-mcp-module-dependencies';
  await assertListed(id, ['data', 'helper', 'styles-and-icons']);
  const docs = await callTool('docs-show', { id });
  assert.match(docs, /## Props/);
  const data = await callTool('docs-show-story', { storyId: `${id}--data` });
  assert.match(data, /items\.map/);
  assert.doesNotMatch(data, /const items\s*=|Module heading one|Module panel two/);
  const helper = await callTool('docs-show-story', { storyId: `${id}--helper` });
  assert.match(helper, /<ExampleItem value="1"/);
  assert.doesNotMatch(helper, /function ExampleItem|Helper heading|Helper panel/);
  const styles = await callTool('docs-show-story', { storyId: `${id}--styles-and-icons` });
  assert.match(styles, /useStyles\(\)/);
  assert.match(styles, /<CalendarMonth \/>/);
  assert.match(styles, /import \{ CalendarMonthRegular \} from '@fluentui\/react-icons'/);
  assert.doesNotMatch(
    styles,
    /const useStyles\s*=|makeStyles\(|bundleIcon\(|const CalendarMonth\s*=/,
  );
});

test('literal and raw source parameters do not replace the MCP snippet or description', async () => {
  const id = 'experiments-mcp-explicit-source';
  await assertListed(id, ['literal', 'raw-source']);
  const docs = await callTool('docs-show', { id });
  assert.match(docs, /## Props/);
  assert.match(docs, /Component JSDoc marker/);
  assert.doesNotMatch(docs, /Component parameter description marker/);
  for (const [name, displayName] of [
    ['literal', 'Literal'],
    ['raw-source', 'RawSource'],
  ]) {
    const example = await callTool('docs-show-story', { storyId: `${id}--${name}` });
    assert.ok(example.includes(`const ${displayName} = () => <Accordion />;`));
    assert.doesNotMatch(
      example,
      /Accordion Header 1|ExplicitAccordion|parameter description marker/,
    );
    if (name === 'literal') {
      assert.match(example, /Story JSDoc marker/);
    }
  }
});

test('two local files sharing a title lose coverage, while one owner retains both stories', async () => {
  const index = liveUrl
    ? await fetch(new URL('/index.json', liveUrl), {
        signal: AbortSignal.timeout(30000),
      }).then(async (response) => {
        assert.equal(response.status, 200);
        return response.json();
      })
    : JSON.parse(await fs.readFile(new URL('index.json', root), 'utf8'));
  const splitId = 'experiments-mcp-split-owner';
  const mergedId = 'experiments-mcp-single-owner';
  for (const id of [splitId, mergedId]) {
    for (const name of ['default', 'variant']) {
      assert.ok(index.entries[`${id}--${name}`], `UI story missing: ${id}--${name}`);
    }
  }
  const listing = await callTool('docs-list', { withStoryIds: true });
  const splitStories = ['default', 'variant'].filter((name) =>
    listing.includes(`(${splitId}--${name})`),
  );
  assert.equal(splitStories.length, 1);
  const splitDocs = await callTool('docs-show', { id: splitId });
  assert.equal(
    ['Local default owner marker', 'Upstream variant owner marker'].filter((marker) =>
      splitDocs.includes(marker),
    ).length,
    1,
  );
  await assertListed(mergedId, ['default', 'variant']);
  for (const [name, marker] of [
    ['default', 'Local default owner marker'],
    ['variant', 'Upstream variant owner marker'],
  ]) {
    const example = await callTool('docs-show-story', { storyId: `${mergedId}--${name}` });
    assert.ok(example.includes(marker));
  }
});

function assertTypeChecksSnippet(source, label) {
  const configPath = fileURLToPath(new URL('../tsconfig.json', import.meta.url));
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  assert.equal(config.error, undefined);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, path.dirname(configPath));
  assert.equal(parsed.errors.length, 0);
  const virtualPath = fileURLToPath(
    new URL('../src/stories/experiments/ProviderSnippetCheck.tsx', import.meta.url),
  );
  const host = ts.createCompilerHost(parsed.options);
  const originalGetSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) =>
    path.resolve(fileName) === virtualPath
      ? ts.createSourceFile(fileName, source, languageVersion, true, ts.ScriptKind.TSX)
      : originalGetSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile);
  const program = ts.createProgram([virtualPath], parsed.options, host);
  const diagnostics = ts.getPreEmitDiagnostics(program);
  assert.equal(
    diagnostics.length,
    0,
    `${label} snippet does not type-check:\n${ts.formatDiagnosticsWithColorAndContext(diagnostics, host)}`,
  );
}

for (const [componentName, storyName, sourcePath, markers] of [
  [
    'accordion',
    'default',
    'react-accordion/stories/src/Accordion/AccordionDefault.stories.tsx',
    ['Accordion Header 1', 'Accordion Panel 3'],
  ],
  [
    'accordion',
    'controlled',
    'react-accordion/stories/src/Accordion/AccordionControlled.stories.tsx',
    ['React.useState', 'setOpenItems', 'AccordionToggleEventHandler'],
  ],
  [
    'button',
    'appearance',
    'react-button/stories/src/Button/ButtonAppearance.stories.tsx',
    ['const useStyles = makeStyles', 'const CalendarMonth = bundleIcon', '@fluentui/react-icons'],
  ],
  [
    'datagrid',
    'default',
    'react-table/stories/src/DataGrid/Default.stories.tsx',
    ['type Item =', 'const items:', 'const columns:', 'createTableColumn', 'Meeting notes'],
  ],
]) {
  test(`custom provider publishes complete ${componentName} ${storyName} source`, async () => {
    const id = `experiments-mcp-provider-${componentName}`;
    await assertListed(id, [storyName]);
    const docs = await callTool('docs-show', { id });
    assert.match(docs, /## Props/);
    const example = await callTool('docs-show-story', { storyId: `${id}--${storyName}` });
    const source = (
      await fs.readFile(
        new URL(`../fluent-stories/packages/react-components/${sourcePath}`, import.meta.url),
        'utf8',
      )
    ).replaceAll('@fluentui/react-components', '@coreai-ds/react-components');
    assert.ok(example.includes(source), 'MCP must include the entire transformed source');
    assert.ok(docs.includes(source), 'Component docs must include the entire transformed source');
    for (const marker of markers) {
      assert.ok(example.includes(marker), `Missing dependency: ${marker}`);
    }
    assert.doesNotMatch(example, /from ['"]@fluentui\/react-components['"]/);
    assertTypeChecksSnippet(source, `${componentName} ${storyName}`);
  });
}
