import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import ts from 'typescript';
import { createStorybookMcpHandler } from '@storybook/mcp';
import { createStoryInventory } from './story-inventory.mjs';

const root = new URL('../storybook-static/', import.meta.url);
const liveUrl = process.env.MCP_EXPERIMENT_URL;
const experimentsEnabled = process.env.STORYBOOK_INGESTION_EXPERIMENTS === 'true';
const experimentTest = experimentsEnabled ? test : test.skip;
const handler = await createStorybookMcpHandler({
  manifestProvider: async (_request, manifestPath) =>
    fs.readFile(new URL(manifestPath, root), 'utf8'),
});
let requestId = 2000;

test('generated real component IDs publish selected local and Fluent stories with source-complete snippets', async () => {
  const inventory = await createStoryInventory();
  const listing = await callTool('docs-list', { withStoryIds: true });
  for (const id of [
    'components-accordion',
    'components-button-button',
    'components-datagrid',
    'components-combobox',
    'components-dropdown',
  ]) {
    const component = inventory.components.find((item) => item.id === id);
    assert.ok(listing.includes(`(${id})`));
    const docs = await callTool('docs-show', { id });
    assert.match(docs, /## Props/);
    for (const story of component.stories) {
      assert.ok(listing.includes(`(${story.id})`), `Missing selected story ${story.id}`);
    }
    for (const name of ['Default', 'Controlled']) {
      const story = component.stories.find((item) => item.exportName === name);
      if (!story) continue;
      const example = await callTool('docs-show-story', { storyId: story.id });
      assert.ok(
        example.includes(
          story.origin === 'local' ? 'Source: local CoreAI override' : 'Source: Fluent upstream',
        ),
      );
      assert.ok(example.includes('@coreai-ds/react-components'));
      assert.doesNotMatch(example, /No code snippet|from ['"]@fluentui\/react-components['"]/);
      if (name === 'Controlled' && ['components-combobox', 'components-dropdown'].includes(id)) {
        assert.match(example, /Partial<Omit<(Combobox|Dropdown)Props, "label" \| "dynamicWidth">>/);
      }
    }
  }
  const accordion = await callTool('docs-show-story', { storyId: 'components-accordion--default' });
  assert.match(accordion, /Accordion Panel 3/);
  const button = await callTool('docs-show-story', {
    storyId: 'components-button-button--appearance',
  });
  assert.match(button, /makeStyles/);
  assert.match(button, /bundleIcon/);
  const combobox = await callTool('docs-show-story', {
    storyId: 'components-combobox--inline-label',
  });
  assert.match(combobox, /Source: local CoreAI override/);
});

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
    signal: AbortSignal.timeout(180000),
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

experimentTest(
  'module-level dependencies are referenced but not included in default snippets',
  async () => {
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
  },
);

experimentTest(
  'literal and raw source parameters do not replace the MCP snippet or description',
  async () => {
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
  },
);

experimentTest(
  'two local files sharing a title lose coverage, while one owner retains both stories',
  async () => {
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
  },
);

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
  experimentTest(
    `custom provider publishes complete ${componentName} ${storyName} source`,
    async () => {
      const id = `experiments-mcp-provider-${componentName}`;
      await assertListed(id, [storyName]);
      const docs = await callTool('docs-show', { id });
      assert.match(docs, /## Props/);
      const example = await callTool('docs-show-story', { storyId: `${id}--${storyName}` });
      const isLocal = componentName === 'accordion' && storyName === 'default';
      const source = (
        await fs.readFile(
          new URL(
            isLocal
              ? '../src/stories/components/Accordion.stories.tsx'
              : `../fluent-stories/packages/react-components/${sourcePath}`,
            import.meta.url,
          ),
          'utf8',
        )
      ).replaceAll('@fluentui/react-components', '@coreai-ds/react-components');
      let snippet = source;
      if (isLocal) {
        const ast = ts.createSourceFile(
          'Accordion.stories.tsx',
          source,
          ts.ScriptTarget.Latest,
          true,
        );
        const declaration = ast.statements.find(
          (statement) =>
            ts.isVariableStatement(statement) &&
            statement.declarationList.declarations.some(
              (item) => ts.isIdentifier(item.name) && item.name.text === 'Default',
            ),
        );
        assert.ok(declaration);
        assert.ok(example.includes(declaration.getText(ast)));
        assert.ok(docs.includes(declaration.getText(ast)));
        assert.match(example, /Source: local CoreAI override/);
        assert.doesNotMatch(example, /figmaDesign|export default|title:/);
        const code = example.match(/```\r?\n([\s\S]*?)\r?\n```/);
        assert.ok(code, 'Local example must contain a code block');
        snippet = code[1];
      } else {
        assert.ok(example.includes(source), 'MCP must include the entire transformed source');
        assert.ok(
          docs.includes(source),
          'Component docs must include the entire transformed source',
        );
        assert.match(example, /Source: Fluent upstream/);
      }
      for (const marker of markers) {
        assert.ok(example.includes(marker), `Missing dependency: ${marker}`);
      }
      assert.doesNotMatch(example, /from ['"]@fluentui\/react-components['"]/);
      assertTypeChecksSnippet(snippet, `${componentName} ${storyName}`);
    },
  );
}

experimentTest(
  'one component document merges the actual local Default and Fluent Controlled sources',
  async () => {
    const id = 'experiments-mcp-provider-accordion';
    await assertListed(id, ['default', 'controlled']);
    const docs = await callTool('docs-show', { id });
    assert.match(
      docs,
      /Source: local CoreAI override - src\/stories\/components\/Accordion\.stories\.tsx/,
    );
    assert.match(
      docs,
      /Source: Fluent upstream - fluent-stories\/packages\/react-components\/react-accordion\/stories\/src\/Accordion\/AccordionControlled\.stories\.tsx/,
    );
    assert.ok(docs.includes(`Story ID: ${id}--default`));
    assert.ok(docs.includes(`Story ID: ${id}--controlled`));
    assert.match(docs, /Accordion Header 1/);
    assert.match(docs, /React\.useState/);
  },
);

test(
  'normal discovery contains no temporary experiment stories or docs',
  { skip: experimentsEnabled },
  async () => {
    const listing = await callTool('docs-list', { withStoryIds: true });
    assert.doesNotMatch(listing, /experiments-mcp-|Experiments\/MCP/);
    const index = liveUrl
      ? await fetch(new URL('/index.json', liveUrl), { signal: AbortSignal.timeout(30000) }).then(
          async (response) => {
            assert.equal(response.status, 200);
            return response.json();
          },
        )
      : JSON.parse(await fs.readFile(new URL('index.json', root), 'utf8'));
    assert.ok(
      Object.values(index.entries).every(
        (entry) =>
          !entry.id.startsWith('experiments-') && !entry.importPath?.includes('/experiments/'),
      ),
    );
  },
);
