// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { readReferencePages } from '../scripts/read-reference-pages.mjs';
import {
  normalizeBase,
  escapeHtml,
  codeFence,
  normalizeSource,
  assertSimpleStory,
  accountForStories,
  pageMarkdown,
  exampleHeadingHtml,
} from '../scripts/build-reference-proof.mjs';

test('Markdown owns page routes, scope, and template downloads without a scripted page list', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'reference-pages-'));
  try {
    await fs.mkdir(path.join(root, 'components'));
    await fs.mkdir(path.join(root, 'templates'));
    await fs.mkdir(path.join(root, 'generated'));
    const writePage = (filename, reference) =>
      fs.writeFile(
        path.join(root, filename),
        `---\nid: example\ntitle: Example\nsummary: Useful guidance.\nreference:\n${reference}\n---\n\nGuidance.`,
      );
    await writePage('components/Button.md', '  component: components-button');
    await writePage(
      'templates/Example.md',
      '  component: templates-example\n  sources: [src/stories/templates/Example.tsx]',
    );
    await fs.writeFile(path.join(root, 'generated/ignored.md'), '---\nreference: invalid\n---');
    const pages = await readReferencePages(root);
    assert.deepEqual(
      pages.map((page) => `${page.kind}/${page.id}`),
      ['components/button', 'templates/example'],
    );
    assert.equal(pages[0].examples, undefined, 'All examples are selected by default');
    await writePage('components/Button.md', '  component: components-button\n  examples: []');
    await assert.rejects(readReferencePages(root), /nonempty list/);
    await writePage('components/Button.md', '  component: components-button\n  unknown: true');
    await assert.rejects(readReferencePages(root), /unknown reference field/);
    await writePage(
      'components/Button.md',
      '  component: components-button\n  route: components/../outside',
    );
    await assert.rejects(readReferencePages(root), /reference route/);
    await writePage(
      'components/Button.md',
      '  component: components-button\n  route: templates/example',
    );
    await assert.rejects(readReferencePages(root), /template pages must provide/);
    await writePage('components/Button.md', '  component: components-button');
    await writePage(
      'templates/Example.md',
      '  component: templates-example\n  sources: [src/stories/templates/../private.tsx]',
    );
    await assert.rejects(readReferencePages(root), /reference.sources must name/);
    await writePage(
      'templates/Example.md',
      '  component: templates-example\n  route: components/button',
    );
    await assert.rejects(readReferencePages(root), /Duplicate reference page route/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('base paths preserve a repository prefix and reject unsafe or ambiguous paths', () => {
  assert.equal(normalizeBase(), '/');
  assert.equal(normalizeBase('/coreai-design-system'), '/coreai-design-system/');
  assert.equal(normalizeBase('/docs/v1/'), '/docs/v1/');
  for (const value of [
    'docs',
    'https://example.com/',
    '//example.com/',
    '/docs//',
    '/docs/../',
    '/./',
    '/docs?version=1',
    '/docs#example',
    '/docs\\example',
  ]) {
    assert.throws(() => normalizeBase(value), /Base path/);
  }
});

test('source is HTML-escaped and Markdown fences survive embedded code fences', () => {
  assert.equal(
    escapeHtml('<script>"&\'</script>'),
    '&lt;script&gt;&quot;&amp;&#39;&lt;/script&gt;',
  );
  const source = 'const markdown = "```tsx\\nexample\\n```";\n';
  assert.equal(codeFence(source), `\`\`\`\`tsx\n${source.trimEnd()}\n\`\`\`\``);
});

test('generated source uses LF so browser copy, downloads and Markdown agree on Windows', () => {
  assert.equal(normalizeSource('first\r\nsecond\rthird\n'), 'first\nsecond\nthird\n');
  assert.equal(normalizeSource('const escaped = "\\r\\n";\r\n'), 'const escaped = "\\r\\n";\n');
});

test('example headings cannot collide with authored component headings', () => {
  const html = exampleHeadingHtml({
    id: 'templates-empty-state--default',
    name: 'Empty state',
    origin: 'local',
    description: '[Return to example](#empty-state).',
  });
  assert.match(html, /id="templates-empty-state--default-empty-state"/);
  assert.match(html, /href="#templates-empty-state--default-empty-state"/);
  assert.doesNotMatch(html, /id="guidance-empty-state"/);
});

test('simple function and object examples do not require Storybook runtime', () => {
  for (const source of [
    'export const Default = () => <button>Example</button>;',
    'export function Default(props: { label?: string }) { return <button>{props.label}</button>; }',
    'export const Default: StoryObj = { render: () => <button>Example</button>, parameters: { controls: { disable: true } } };',
    'export const Default = () => null; Default.play = async () => {};',
  ]) {
    assert.doesNotThrow(() => assertSimpleStory(source, 'Default'));
  }
});

test('args, decorators, loaders and context are not silently dropped', () => {
  for (const source of [
    'export const Default = { render: () => null, args: { label: "Fixed" } };',
    'export const Default = () => null; Default.args = { label: "Fixed" };',
    'export const Default = { render: () => null, decorators: [withProvider] };',
    'export const Default = { render: () => null, loaders: [loadData] };',
    'export const Default = { ...baseStory, render: () => null };',
    'export const Default = { args: {} };',
    'export const Default = (args, context) => null;',
  ]) {
    assert.throws(() => assertSimpleStory(source, 'Default'), /adaptation or exclusion/);
  }
  assert.throws(
    () => assertSimpleStory('export const Default = () => null;', 'Default', { decorators: '[]' }),
    /component decorators/,
  );
});

test('coverage accounts for upstream replacements and deliberately unselected examples', () => {
  const upstream = {
    id: 'button--default',
    origin: 'fluent',
    exportName: 'Default',
    sourceFile: 'upstream/index.tsx',
    implementationFile: 'upstream/Default.tsx',
  };
  const local = {
    ...upstream,
    origin: 'local',
    sourceFile: 'local.tsx',
    implementationFile: 'local.tsx',
  };
  const another = { ...upstream, id: 'button--size', exportName: 'Size' };
  const component = {
    id: 'button',
    sources: [{ stories: [upstream, another] }, { stories: [local] }],
    stories: [local, another],
  };
  const report = accountForStories(component, ['Default']);
  assert.deepEqual(
    report.map(({ status }) => status),
    ['replaced', 'excluded', 'included'],
  );
  assert.ok(report.every((entry) => entry.status === 'included' || entry.reason));
  assert.throws(() => accountForStories(component, ['Missing']), /does not exist/);
});

test('Markdown includes authored guidance, exact example source, base-aware links and template source', () => {
  const source = 'export default function Example() { return null; }\n';
  const page = {
    guidance: '# Empty state\n\nDo not confuse no results with missing permissions.',
    kind: 'templates',
    examples: [
      {
        name: 'Default',
        origin: 'local',
        description: 'A complete example.',
        sourcePath: 'source/examples/default.tsx',
        source,
      },
    ],
    templateSources: [{ name: 'EmptyState.tsx', path: 'source/templates/EmptyState.tsx', source }],
  };
  const markdown = pageMarkdown(page, {
    basePath: '/repo/',
    versions: { '@coreai-ds/react-components': '0.11.1', '@fluentui/react-components': '9.74.9' },
  });
  assert.match(markdown, /Do not confuse no results with missing permissions/);
  assert.match(markdown, /not an npm export/);
  assert.match(markdown, /\(\/repo\/guides\/setup\.md\)/);
  assert.match(markdown, /\(\/repo\/source\/examples\/default\.tsx\)/);
  assert.equal(markdown.split(codeFence(source)).length - 1, 2);
  assert.doesNotMatch(markdown, /<Example|<ApiTable/);
});
