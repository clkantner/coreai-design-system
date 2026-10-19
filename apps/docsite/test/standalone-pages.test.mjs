// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import ts from 'typescript';
import { readReferencePages } from '../scripts/read-reference-pages.mjs';
import {
  expandStandaloneMarkdown,
  rewriteDocumentationLinks,
  tokenSwatches,
} from '../scripts/standalone-markdown.mjs';
import { appRoot, codeFence } from '../scripts/build-reference-proof.mjs';
import { renderGuidance } from '../../../shared/guidance.mjs';
import { publicMarkdown } from '../scripts/sources/public-markdown.mjs';
import {
  generateStandaloneDocs,
  standaloneDocsRoot,
} from '../../storybook/scripts/generate-standalone-docs.mjs';

test('every legacy standalone route has a Markdown-owned page or alias', async () => {
  const pages = await readReferencePages(path.join(appRoot, 'content'));
  const registry = JSON.parse(await fs.readFile(path.join(appRoot, 'site-registry.json'), 'utf8'));
  const routes = new Set(
    pages.flatMap((page) => [`/${page.route}${page.route ? '/' : ''}`, ...(page.aliases ?? [])]),
  );
  for (const page of registry.pages)
    assert.ok(routes.has(page.slug), `Missing migrated route ${page.slug}`);
  for (const redirect of registry.redirects.filter((redirect) =>
    registry.pages.some((page) => page.slug === redirect.to),
  )) {
    assert.ok(routes.has(redirect.from), `Missing legacy redirect ${redirect.from}`);
  }
  assert.ok(pages.some((page) => page.kind === 'foundations'));
  assert.ok(pages.some((page) => page.kind === 'patterns'));
  const ids = new Set(
    pages.flatMap((page) => [
      ...(page.legacyIds ?? []),
      ...(page.kind === 'templates' ? [`${page.component}--source-code`] : []),
    ]),
  );
  assert.equal(ids.size, 19, 'Retain all 19 standalone Storybook document endpoints');
  for (const id of [
    'docs-theming--docs',
    'docs-react-grab--docs',
    'docs-styling-with-css-modules--docs',
    'templates-react-router-router-link-slots--source-code',
  ])
    assert.ok(ids.has(id));
});

test('Markdown includes and generated sections expand without evaluating code fences', async () => {
  const input =
    '## Colors\n\n<!-- generated: colors -->\n\n```md\n<!-- generated: unknown -->\n```\n\n<!-- include: router-link-slots -->';
  const output = await expandStandaloneMarkdown(input, {
    route: 'foundations/colors',
    pages: [],
    basePath: '/repo/',
    generated: { colors: 'A real token table.' },
    renderExample: () => {
      throw new Error('Unexpected example');
    },
    fence: codeFence,
  });
  assert.match(output, /A real token table/);
  assert.match(output, /<!-- generated: unknown -->/);
  assert.match(output, /export function useRouterLinkSlot/);
  assert.match(output, /registerPlugin|useRouterNavLinkSlot/);
  await assert.rejects(
    expandStandaloneMarkdown('<!-- include: secrets -->', { fence: codeFence }),
    /Unknown included/,
  );
  await assert.rejects(
    expandStandaloneMarkdown('<!-- include: constructor -->', { fence: codeFence }),
    /Unknown included/,
  );
  await assert.rejects(
    expandStandaloneMarkdown('<!-- generated: unknown -->', { generated: {} }),
    /Unknown generated/,
  );
  await assert.rejects(expandStandaloneMarkdown('<!-- include: ../outside -->', {}), /Malformed/);
});

test('links use canonical routes, base paths and HTML heading IDs without changing code samples', () => {
  const pages = [
    {
      route: 'foundations/theming',
      aliases: ['/theming/'],
      legacyIds: ['docs-theming--docs'],
      guidanceSource: 'content/foundations/theming.md',
    },
    { route: 'components/field', guidanceSource: 'content/components/Field.md' },
  ];
  const input =
    '[Theme](../foundations/theming.md#set-up-aptos)\n\n[Field](../components/Field.md)\n\n[Old](/theming.md)\n\n[Storybook](https://coreai-ds-storybook.azurewebsites.net/?path=/docs/docs-theming--docs)\n\n```md\n[Example](../do-not-rewrite.md)\n```';
  const options = {
    route: 'guides/package',
    pages,
    basePath: '/repo/',
    sourceFile: 'apps/docsite/content/guides/package.md',
  };
  const markdown = rewriteDocumentationLinks(input, options);
  assert.match(markdown, /\/repo\/foundations\/theming\.md#set-up-aptos/);
  assert.match(markdown, /\/repo\/components\/field\.md/);
  assert.doesNotMatch(markdown, /azurewebsites\.net/);
  assert.match(markdown, /\[Example\]\(\.\.\/do-not-rewrite\.md\)/);
  const html = rewriteDocumentationLinks(markdown, { ...options, html: true });
  assert.match(html, /\/repo\/foundations\/theming\/#guidance-set-up-aptos/);
  assert.doesNotMatch(html, /\/repo\/repo\//);
  assert.equal(
    tokenSwatches('<td>#ff00aa</td>'),
    '<td><span class="reference-color-swatch" style="background-color:#ff00aa" aria-hidden="true"></span><code>#ff00aa</code></td>',
  );
});

test('only registered live examples become preview slots in authored guidance', () => {
  const html = renderGuidance('# Guide\n\n<!-- live-example:components-text--presets -->', {
    examples: { 'components-text--presets': { id: 'components-text--presets', name: 'Presets' } },
  }).html;
  assert.match(html, /data-example-id="components-text--presets"/);
  assert.match(html, /class="preview"/);
  assert.throws(() => renderGuidance('<!-- live-example:unknown -->'), /Missing live example/);
  assert.throws(() => renderGuidance('<!-- live-example:constructor -->'), /Missing live example/);
  const referenced = renderGuidance(
    '## [Unreleased]\n\n[Unreleased]: #unreleased\n\n[Top](#)\n\n[Already scoped](#guidance-unreleased)',
  ).html;
  assert.match(referenced, /href="#guidance-unreleased"/);
  assert.doesNotMatch(referenced, /href="#unreleased"|guidance-guidance/);
  assert.match(referenced, /href="#"/);
});

test('Storybook snapshots embed canonical Markdown for manifest-only readers without a second authored copy', async () => {
  const mirrors = await generateStandaloneDocs();
  assert.equal(mirrors.length, 5);
  const pages = await readReferencePages(path.join(appRoot, 'content'));
  for (const filename of [
    'Theming',
    'VariationsFromFluent',
    'StylingWithCssModules',
    'ReactGrab',
    'MCPSetup',
  ]) {
    const snapshot = await fs.readFile(path.join(standaloneDocsRoot, `${filename}.mdx`), 'utf8');
    const page = pages.find((page) =>
      page.migratedFrom?.some((source) => source.endsWith(`/docs/${filename}.mdx`)),
    );
    const sourceFile = path.join(appRoot, 'content', page.guidance);
    assert.ok(snapshot.includes(publicMarkdown(await fs.readFile(sourceFile, 'utf8'), sourceFile)));
    assert.doesNotMatch(snapshot, /import content from/);
  }
  const file = path.join(appRoot, 'content/foundations/theming.md');
  const mirror = publicMarkdown(await fs.readFile(file, 'utf8'), file);
  assert.doesNotMatch(mirror, /migratedFrom:|legacyIds:/);
  assert.match(mirror, /Open live example/);
  assert.match(mirror, /Only Microsoft-hosted projects/);
});

test('content principles, workflow, examples and support details survive migration in full', async () => {
  const source = await fs.readFile(path.join(appRoot, 'src/pages/Content.tsx'), 'utf8');
  const markdown = (
    await fs.readFile(path.join(appRoot, 'content/foundations/content.md'), 'utf8')
  ).replace(/\s+/g, ' ');
  const ast = ts.createSourceFile(
    'Content.tsx',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  let checked = 0;
  for (const statement of ast.statements.filter(ts.isVariableStatement)) {
    for (const declaration of statement.declarationList.declarations) {
      if (
        !['principles', 'contentDesignSteps', 'supportSteps', 'editingChecklist'].includes(
          declaration.name.getText(ast),
        )
      )
        continue;
      const visit = (node) => {
        if (ts.isStringLiteralLike(node)) {
          assert.ok(
            markdown.includes(node.text.replace(/\s+/g, ' ')),
            `Missing original content: ${node.text}`,
          );
          checked++;
        }
        ts.forEachChild(node, visit);
      };
      visit(declaration.initializer);
    }
  }
  assert.ok(checked > 40, 'Check original details, not only section headings');
});
