// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import assert from 'node:assert/strict';
import test from 'node:test';
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
