// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL, URL } from 'node:url';
import test from 'node:test';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { toString } from 'mdast-util-to-string';
import {
  parseReactComponentMeta,
  parseReactDocgen,
  parseReactDocgenTypescript,
  resolveComponentEntry,
} from 'storybook/internal/toolsets-docs';
import { createServer } from 'vite';
import { generateContent } from '../scripts/generate-content.mjs';

async function fixture(context) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'docsite-markdown-'));
  context.after(() => fs.rm(root, { recursive: true, force: true }));
  const content = path.join(root, 'content');
  const build = path.join(root, 'storybook');
  const markdown = path.join(build, 'llms');
  await fs.mkdir(content);
  await fs.mkdir(markdown, { recursive: true });
  await fs.writeFile(
    path.join(content, 'Button.md'),
    '---\nid: button\ntitle: Button\nsummary: Button guidance.\nresources: []\nstorybookTitles:\n  - Components/Button/Button\n---\n\n## Best practices\n\nUse buttons for actions.',
  );
  const entries = [
    {
      id: 'components-button-button--default',
      title: 'Components/Button/Button',
      name: 'Default',
    },
    {
      id: 'components-button-button--local',
      title: 'Components/Button/Button',
      name: 'Local',
    },
    {
      id: 'components-custom--default',
      title: 'Components/Custom',
      name: 'Default',
    },
  ];
  const indexPath = path.join(build, 'index.json');
  await fs.writeFile(
    indexPath,
    JSON.stringify({
      entries: Object.fromEntries(entries.map((entry) => [entry.id, { ...entry, type: 'story' }])),
    }),
  );
  const documents = [
    {
      id: 'components-button-button',
      title: 'Components/Button/Button',
      kind: 'component',
      path: 'llms/components-button-button.md',
      storyIds: entries.slice(0, 2).map(({ id }) => id),
    },
    {
      id: 'components-custom',
      title: 'Components/Custom',
      kind: 'component',
      path: 'llms/components-custom.md',
      storyIds: [entries[2].id],
    },
    {
      id: 'docs-installation--docs',
      title: 'Docs/Installation',
      kind: 'docs',
      path: 'llms/docs-installation--docs.md',
      storyIds: [],
    },
  ];
  const buttonMarkdown =
    '# Components/Button/Button\n\n## Props\n\n| Name | Type |\n| --- | --- |\n| appearance | string |\n\n## Examples\n\n### Default\n\nSource: Fluent upstream\n\n```tsx\nimport { Button } from "@coreai-ds/react-components";\n```\n\n### Local\n\nSource: local CoreAI override\n\n```tsx\n<Button>Local example</Button>\n```\n';
  await fs.writeFile(path.join(markdown, 'components-button-button.md'), buttonMarkdown);
  await fs.writeFile(path.join(markdown, 'components-custom.md'), '# Custom\n\nCustom API.');
  await fs.writeFile(
    path.join(markdown, 'docs-installation--docs.md'),
    '# Installation\n\nInstall.',
  );
  const index = { version: 1, documents };
  const indexFile = path.join(markdown, 'index.json');
  await fs.writeFile(indexFile, JSON.stringify(index));
  return {
    root,
    markdown,
    index,
    indexFile,
    buttonMarkdown,
    options: {
      contentDirectory: pathToFileURL(`${content}${path.sep}`),
      indexPath,
      outputDirectory: path.join(root, 'generated'),
      requireStorybookMarkdown: true,
    },
  };
}

test('Storybook Markdown generation enriches copy/downloads and publishes all references offline', async (context) => {
  const { options, buttonMarkdown } = await fixture(context);
  context.mock.method(globalThis, 'fetch', () => {
    throw new Error('Static publication must not contact a server.');
  });
  await generateContent(options);
  const guide = await fs.readFile(path.join(options.outputDirectory, 'pages/button.md'), 'utf8');
  assert.ok(guide.includes('Use buttons for actions.'));
  assert.ok(guide.includes(buttonMarkdown));
  const html = await fs.readFile(path.join(options.outputDirectory, 'pages/button.html'), 'utf8');
  assert.ok(html.includes('Use buttons for actions.'));
  assert.equal(html.includes('Local example'), false, 'Human guidance rendering must not change.');
  const [metadata] = JSON.parse(
    await fs.readFile(path.join(options.outputDirectory, 'metadata.json'), 'utf8'),
  );
  assert.equal(
    metadata.searchText.includes('Local example'),
    false,
    'API snippets must not bloat the bundled navigation/search data.',
  );
  const output = path.join(options.outputDirectory, 'llms');
  const index = JSON.parse(await fs.readFile(path.join(output, 'index.json'), 'utf8'));
  assert.equal(index.documents.length, 3, 'Unlinked custom components and MDX docs must ship too.');
  for (const document of index.documents) {
    await fs.access(path.join(output, `${document.id}.md`));
    assert.equal('markdown' in document, false);
  }
  const published = path.join(output, 'components-button-button.md');
  await fs.utimes(published, new Date(0), new Date(0));
  await fs.writeFile(path.join(output, 'stale.md'), 'stale');
  await generateContent(options);
  assert.equal((await fs.stat(published)).mtimeMs, 0);
  await assert.rejects(fs.access(path.join(output, 'stale.md')), /ENOENT/);
  await generateContent({
    ...options,
    requireStorybookMarkdown: false,
    storybookMarkdownDirectory: null,
  });
  assert.deepEqual(
    JSON.parse(await fs.readFile(path.join(output, 'index.json'), 'utf8')).documents,
    [],
  );
  await assert.rejects(fs.access(published), /ENOENT/);
});

test('production Markdown publication rejects missing, unsafe, stale, and incomplete exports', async (context) => {
  const { options, markdown, index, indexFile } = await fixture(context);
  await assert.rejects(
    generateContent({ ...options, storybookMarkdownDirectory: null }),
    /requires Storybook Markdown/,
  );
  await assert.rejects(
    generateContent({ ...options, storybookMarkdownDirectory: path.join(markdown, 'missing') }),
    /Run npm run build:storybook/,
  );
  for (const [mutate, pattern] of [
    [(value) => (value.version = 2), /version 1/],
    [(value) => (value.documents[0].path = '../outside.md'), /Invalid or duplicate/],
    [(value) => value.documents.push(value.documents[0]), /Invalid or duplicate/],
    [(value) => (value.documents[0].storyIds[0] = 'unknown--story'), /does not match/],
    [(value) => (value.documents[0].title = 'Stale title'), /does not match/],
    [(value) => value.documents[0].storyIds.pop(), /missing stories/],
  ]) {
    const value = globalThis.structuredClone(index);
    mutate(value);
    await fs.writeFile(indexFile, JSON.stringify(value));
    await assert.rejects(generateContent(options), pattern);
  }
  await fs.writeFile(indexFile, JSON.stringify(index));
  const document = path.join(markdown, 'components-button-button.md');
  await fs.writeFile(document, '');
  await assert.rejects(generateContent(options), /Empty Storybook Markdown/);
  await fs.unlink(document);
  await assert.rejects(generateContent(options), /ENOENT/);
});

test('built docsite ships all Storybook documents and keeps complete upstream and local examples', async () => {
  const dist = new URL('../dist/', import.meta.url);
  const index = JSON.parse(await fs.readFile(new URL('llms/index.json', dist), 'utf8'));
  const source = JSON.parse(
    await fs.readFile(
      new URL('../../storybook/storybook-static/llms/index.json', import.meta.url),
      'utf8',
    ),
  );
  assert.deepEqual(index, source);
  const discovery = await fs.readFile(new URL('llms.txt', dist), 'utf8');
  for (const document of index.documents) {
    const markdown = await fs.readFile(new URL(document.path, dist), 'utf8');
    assert.ok(markdown.trim(), document.id);
    assert.ok(discovery.includes(`](/${document.path})`), `${document.id} must be discoverable`);
    for (const storyId of document.storyIds) {
      assert.ok(markdown.includes(storyId), `${document.id} omitted ${storyId}`);
    }
  }
  const accordion = await fs.readFile(new URL('llms/components-accordion.md', dist), 'utf8');
  assert.match(accordion, /## Props/);
  assert.match(accordion, /Arrow keyboard navigation is not recommended for accordions/);
  assert.match(accordion, /## Subcomponents/);
  for (const name of ['AccordionItem', 'AccordionHeader', 'AccordionPanel']) {
    assert.ok(accordion.includes(`### ${name}`));
  }
  assert.ok(
    accordion.includes('components-accordion--with-icon'),
    'The reference must not stop after the first three examples.',
  );
  assert.match(accordion, /Accordion Panel 3/);
  const combobox = await fs.readFile(new URL('llms/components-combobox.md', dist), 'utf8');
  assert.match(combobox, /Source: local CoreAI override/);
  assert.match(combobox, /Source: Fluent upstream/);
  assert.match(combobox, /@coreai-ds\/react-components/);
  assert.doesNotMatch(combobox, /from ['"]@fluentui\/react-components['"]/);
  const canonical = await fs.readFile(new URL('components/button.md', dist), 'utf8');
  assert.match(canonical, /## Best practices/);
  assert.match(canonical, /## Props/);
  assert.match(canonical, /components-button-button--with-long-text/);
  assert.match(canonical, /## Examples/);
  assert.ok(
    index.documents.some(
      (document) => document.kind === 'docs' && document.id.includes('template'),
    ),
    'Template MDX must be published.',
  );
  for (const id of ['docs-theming--docs', 'templates-shell-and-navigation--source-code']) {
    const markdown = await fs.readFile(new URL(`llms/${id}.md`, dist), 'utf8');
    const nodes = unified().use(remarkParse).parse(markdown).children;
    for (const node of nodes) {
      if (node.type === 'paragraph') {
        assert.doesNotMatch(toString(node), /^import\s/, `${id} leaks MDX module imports.`);
      }
      if (node.type === 'html') {
        assert.doesNotMatch(
          node.value,
          /<(?:Meta|Canvas|Source)\b|\{\/\*/,
          `${id} contains unprocessed Storybook MDX.`,
        );
      }
    }
    assert.ok(
      nodes.some((node) => node.type === 'code'),
      `${id} lost its code examples.`,
    );
  }
});

test('every published component and subcomponent API retains its props, types, and descriptions', async (context) => {
  const buildRoot = new URL('../../storybook/storybook-static/', import.meta.url);
  const distRoot = new URL('../dist/llms/', import.meta.url);
  const manifest = JSON.parse(
    await fs.readFile(new URL('manifests/components.json', buildRoot), 'utf8'),
  );
  const provider = (_request, file) => fs.readFile(new URL(file, buildRoot), 'utf8');
  const normalize = (value) =>
    String(value)
      .replace(/<br\s*\/?>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  const descriptionFragments = (value) => {
    const fragments = [];
    const visit = (node) => {
      if (['text', 'inlineCode', 'code'].includes(node.type)) {
        const fragment = normalize(node.value);
        if (fragment) fragments.push(fragment);
      }
      node.children?.forEach(visit);
    };
    visit(unified().use(remarkParse).parse(String(value)));
    return fragments;
  };
  let propCount = 0;
  let subcomponentCount = 0;
  for (const source of Object.values(manifest.components)) {
    const component = await resolveComponentEntry(source, undefined, provider);
    const markdown = await fs.readFile(new URL(`${component.id}.md`, distRoot), 'utf8');
    const nodes = unified().use(remarkParse).use(remarkGfm).parse(markdown).children;
    const tables = nodes
      .filter((node) => node.type === 'table' && toString(node.children[0].children[0]) === 'Name')
      .map((table) =>
        table.children.slice(1).map((row) => {
          assert.equal(row.children.length, 5, component.id);
          return row.children.map((cell) => normalize(toString(cell)));
        }),
      );
    for (const entry of [component, ...Object.values(component.subcomponents ?? {})]) {
      if (entry !== component) subcomponentCount++;
      const parsed = entry.reactComponentMeta
        ? parseReactComponentMeta(entry.reactComponentMeta)
        : entry.reactDocgenTypescript
          ? parseReactDocgenTypescript(entry.reactDocgenTypescript)
          : entry.reactDocgen
            ? parseReactDocgen(entry.reactDocgen)
            : undefined;
      const props = Object.entries(parsed?.props ?? {});
      if (!props.length) continue;
      propCount += props.length;
      assert.ok(
        tables.some(
          (table) =>
            table.length === props.length &&
            props.every(([name, prop]) =>
              table.some(
                ([rowName, type, required, defaultValue, description]) =>
                  rowName === name &&
                  (prop.type === undefined || type === normalize(prop.type)) &&
                  required === (prop.required ? 'Yes' : 'No') &&
                  (prop.defaultValue === undefined ||
                    defaultValue === normalize(prop.defaultValue)) &&
                  (!prop.description ||
                    descriptionFragments(prop.description).every((fragment) =>
                      description.includes(fragment),
                    )),
              ),
            ),
        ),
        `${component.id} has an incomplete API table for ${entry.name}`,
      );
    }
  }
  assert.ok(propCount > 0);
  context.diagnostic(`Verified ${propCount} props and ${subcomponentCount} subcomponents.`);
});

test('development middleware serves Markdown and returns real 404s for missing documents', async (context) => {
  const server = await createServer({
    root: fileURLToPath(new URL('../', import.meta.url)),
    configFile: fileURLToPath(new URL('../vite.config.ts', import.meta.url)),
    server: { host: '127.0.0.1', port: 0 },
    plugins: [
      {
        name: 'markdown-middleware-test',
        configResolved(config) {
          config.optimizeDeps.noDiscovery = true;
          config.optimizeDeps.include = [];
        },
      },
    ],
    logLevel: 'error',
  });
  context.after(() => server.close());
  await server.listen();
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  for (const pathname of [
    '/llms/components-accordion.md',
    '/llms/docs-agent-skill--docs.md',
    '/components/button.md',
  ]) {
    const response = await globalThis.fetch(`${origin}${pathname}`);
    assert.equal(response.status, 200, pathname);
    assert.equal(response.headers.get('content-type'), 'text/markdown; charset=utf-8');
    assert.ok((await response.text()).startsWith('#'));
  }
  for (const pathname of ['/llms/nonexistent-document.md', '/components/nonexistent-document.md']) {
    const response = await globalThis.fetch(`${origin}${pathname}`);
    assert.equal(response.status, 404, pathname);
    assert.equal(await response.text(), 'Not found.');
  }
  const response = await globalThis.fetch(`${origin}/llms/index.json`);
  assert.equal(response.status, 200);
  assert.ok((await response.json()).documents.length > 0);
});
