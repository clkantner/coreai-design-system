// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { chromium } from 'playwright';
import matter from 'gray-matter';
import { guidanceMarkdown, renderGuidance } from '../../../shared/guidance.mjs';
import {
  appRoot,
  outputDirectory,
  codeFence,
  escapeHtml,
  normalizeSource,
  providerSource,
} from './build-reference-proof.mjs';
import { serveReferenceProof } from './serve-reference-proof.mjs';

const require = createRequire(import.meta.url);
const metadata = JSON.parse(
  await fs.readFile(path.join(outputDirectory, 'llms/index.json'), 'utf8'),
);
const allExamples = metadata.pages.flatMap((page) => page.examples);

async function installedPackageDirectory(name) {
  let filename;
  try {
    filename = require.resolve(`${name}/package.json`);
  } catch (error) {
    if (error.code !== 'ERR_PACKAGE_PATH_NOT_EXPORTED') throw error;
    let directory = path.dirname(require.resolve(name));
    while (directory !== path.dirname(directory)) {
      try {
        const manifest = JSON.parse(
          await fs.readFile(path.join(directory, 'package.json'), 'utf8'),
        );
        if (manifest.name === name) return directory;
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
      directory = path.dirname(directory);
    }
    throw new Error(`Cannot locate installed dependency: ${name}`, { cause: error });
  }
  return path.dirname(filename);
}

async function verifyConsumerPackage() {
  assert.ok(
    process.env.npm_execpath,
    'Run this check with npm --workspace apps/docsite run verify:reference-proof.',
  );
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'coreai-reference-consumer-'));
  try {
    const packageRoot = path.resolve(appRoot, '../../packages/react-components');
    const result = execFileSync(
      process.execPath,
      [
        process.env.npm_execpath,
        'pack',
        '--ignore-scripts',
        '--json',
        '--pack-destination',
        directory,
      ],
      { cwd: packageRoot, encoding: 'utf8' },
    );
    const [{ filename }] = JSON.parse(result);
    execFileSync('tar', ['-xzf', path.join(directory, filename), '-C', directory]);
    const consumerPackage = path.join(directory, 'node_modules/@coreai-ds/react-components');
    await fs.mkdir(path.dirname(consumerPackage), { recursive: true });
    await fs.cp(path.join(directory, 'package'), consumerPackage, { recursive: true });
    const manifest = JSON.parse(
      await fs.readFile(path.join(consumerPackage, 'package.json'), 'utf8'),
    );
    const dependencies = new Set([
      ...Object.keys(metadata.versions),
      ...Object.keys(manifest.dependencies),
      '@types/react',
      '@types/react-dom',
    ]);
    dependencies.delete('@coreai-ds/react-components');
    for (const name of dependencies) {
      const target = path.join(directory, 'node_modules', name);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.symlink(await installedPackageDirectory(name), target, 'junction');
    }
    await fs.writeFile(path.join(directory, 'package.json'), '{"private":true,"type":"module"}');
    await fs.mkdir(path.join(directory, 'examples'));
    const files = [];
    const bindings = [];
    for (const [index, example] of allExamples.entries()) {
      const filename = path.basename(example.sourcePath);
      const target = path.join(directory, 'examples', filename);
      await fs.copyFile(path.join(outputDirectory, example.sourcePath), target);
      files.push(target);
      bindings.push(`import Example${index} from './examples/${path.basename(filename, '.tsx')}';`);
    }
    for (const page of metadata.pages) {
      for (const source of page.templateSources) {
        const target = path.join(directory, source.name);
        await fs.copyFile(path.join(outputDirectory, source.path), target);
        files.push(target);
      }
    }
    await fs.writeFile(
      path.join(directory, 'Example.tsx'),
      `export { default } from './examples/${path.basename(allExamples[0].sourcePath, '.tsx')}';\n`,
    );
    await fs.writeFile(path.join(directory, 'App.tsx'), providerSource);
    const consumer = path.join(directory, 'Consumer.tsx');
    await fs.writeFile(
      consumer,
      `import type { ComponentType } from 'react';\n${bindings.join('\n')}\nexport const examples = [${allExamples.map((_, index) => `Example${index}`).join(',')}] satisfies ComponentType[];\n`,
    );
    files.push(consumer, path.join(directory, 'App.tsx'), path.join(directory, 'Example.tsx'));
    const program = ts.createProgram(files, {
      noEmit: true,
      strict: true,
      skipLibCheck: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      types: ['react', 'react-dom'],
      typeRoots: [path.join(directory, 'node_modules/@types')],
    });
    const diagnostics = ts.getPreEmitDiagnostics(program);
    assert.equal(
      diagnostics.length,
      0,
      ts.formatDiagnostics(diagnostics, {
        getCanonicalFileName: (filename) => filename,
        getCurrentDirectory: () => directory,
        getNewLine: () => '\n',
      }),
    );
    console.log(
      `Consumer check: ${allExamples.length} examples, template source and provider setup compile against the packed npm artifact, without workspace paths.`,
    );
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
}

await verifyConsumerPackage();
const server = await serveReferenceProof({ port: 0 });
const address = server.httpServer.address();
assert.ok(address && typeof address !== 'string');
const origin = `http://127.0.0.1:${address.port}`;
const root = `${origin}${metadata.basePath}`;
let browser;
try {
  const get = async (relative) => {
    const response = await fetch(`${root}${relative}`);
    assert.equal(response.status, 200, relative);
    return response.text();
  };
  await get('');
  await get('guides/setup/');
  assert.match(await get('guides/setup.md'), /CoreAIFluentProvider/);
  assert.match(
    await get('llms.txt'),
    new RegExp(metadata.versions['@fluentui/react-components'].replaceAll('.', '\\.')),
  );
  assert.match(await get('THIRD-PARTY-NOTICES.txt'), /Permission is hereby granted/);
  assert.equal((await fetch(`${root}components/not-a-page/`)).status, 404);
  assert.equal((await fetch(`${root}components/not-a-page.md`)).status, 404);
  await fs.access(path.join(outputDirectory, '.nojekyll'));
  const included = metadata.coverage.filter((entry) => entry.status === 'included');
  assert.equal(included.length, allExamples.length);
  assert.ok(
    metadata.coverage.every((entry) => ['included', 'replaced', 'excluded'].includes(entry.status)),
  );
  assert.ok(metadata.coverage.every((entry) => entry.status === 'included' || entry.reason));
  assert.equal(new Set(allExamples.map((example) => example.id)).size, allExamples.length);
  for (const name of ['react', 'react-dom', '@fluentui/react-components']) {
    assert.deepEqual(metadata.runtimePackages[name], {
      version: metadata.versions[name],
      installations: 1,
    });
  }

  for (const page of metadata.pages) {
    const html = await get(page.htmlPath);
    const markdown = await get(page.markdownPath);
    const authored = matter(await fs.readFile(path.join(appRoot, page.guidanceSource), 'utf8'));
    const guidance = guidanceMarkdown({ ...authored.data, body: authored.content.trim() });
    assert.ok(markdown.includes(guidance), `${page.id}: authored guidance in Markdown`);
    assert.ok(
      html.includes(renderGuidance(guidance).html),
      `${page.id}: authored guidance in HTML`,
    );
    for (const example of page.examples) {
      const source = await get(example.sourcePath);
      assert.equal(createHash('sha256').update(source).digest('hex'), example.sha256);
      assert.ok(markdown.includes(codeFence(source)), `${example.id}: Markdown source parity`);
      assert.ok(html.includes(escapeHtml(source)), `${example.id}: HTML source parity`);
      assert.doesNotMatch(source, /from\s+['"](?:@storybook\/|storybook|\.{1,2}\/)/);
      assert.doesNotMatch(source, /from\s+['"]@fluentui\/react-components['"]/);
    }
    for (const template of page.templateSources) {
      const source = await get(template.path);
      assert.ok(markdown.includes(codeFence(source)));
      assert.ok(html.includes(escapeHtml(source)));
    }
  }
  console.log(
    `Static HTTP check: ${metadata.pages.length} paired pages, setup, raw TSX, guidance/source parity, 404s, coverage, licenses and base path ${metadata.basePath}.`,
  );

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  for (const record of metadata.pages) {
    await page.goto(`${root}${record.htmlPath}`);
    await page.waitForFunction(() =>
      [...globalThis.document.querySelectorAll('[data-example-id]')].every((container) =>
        container.querySelector('.fui-FluentProvider'),
      ),
    );
    assert.equal(await page.locator('[data-example-id]').count(), record.examples.length);
    assert.equal(await page.getByRole('alert').count(), 0);
    const duplicateIds = await page.evaluate(() => {
      const ids = [...globalThis.document.querySelectorAll('[id]')].map((element) => element.id);
      return [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
    });
    assert.deepEqual(duplicateIds, [], `${record.id}: duplicate DOM IDs`);
    for (const example of record.examples) {
      assert.equal(
        await page.locator(`[id="source-${example.id}"]`).textContent(),
        await get(example.sourcePath),
      );
    }
  }

  await page.goto(`${root}components/button/`);
  const defaultButton = page.locator('[data-example-id="components-button-button--default"]');
  await defaultButton.getByRole('button', { name: 'Example', exact: true }).waitFor();
  await page.locator('[data-copy-source="source-components-button-button--default"]').click();
  assert.equal(
    normalizeSource(await page.evaluate(() => navigator.clipboard.readText())),
    await get('source/examples/components-button-button--default.tsx'),
  );
  assert.equal(
    await page
      .locator('[data-copy-status="source-components-button-button--default"]')
      .textContent(),
    'Copied.',
  );

  await page.goto(`${root}components/dropdown/`);
  const inlineLabel = page.locator('[data-example-id="components-dropdown--inline-label"]');
  const dropdown = inlineLabel.getByRole('combobox').first();
  await dropdown.click();
  await page.getByRole('option', { name: 'In progress', exact: true }).click();
  assert.match(await dropdown.innerText(), /In progress/);

  await page.goto(`${root}components/dialog/`);
  await page
    .locator('[data-example-id="components-dialog--default"]')
    .getByRole('button', { name: 'Open dialog', exact: true })
    .click();
  await page.getByRole('dialog').waitFor();
  await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });

  await page.goto(`${root}components/tree/`);
  await page.getByRole('treeitem', { name: 'People', exact: true }).click();
  await page.getByText('People 1', { exact: true }).waitFor();

  await page.goto(`${root}components/codeblock/`);
  await page
    .locator('[data-example-id="components-codeblock--header"]')
    .getByRole('combobox')
    .click();
  await page.getByRole('option', { name: 'YAML', exact: true }).click();
  await page
    .locator('[data-example-id="components-codeblock--header"] pre')
    .filter({ hasText: 'name: coreai-docs' })
    .waitFor();

  await page.goto(`${root}templates/empty-state/`);
  await page
    .locator('[data-example-id="templates-empty-state--default"]')
    .getByRole('heading', { name: 'Benefit from Action Artifact' })
    .waitFor();
  assert.deepEqual(errors, [], 'Browser errors');
  const noJavaScript = await browser.newContext({ javaScriptEnabled: false });
  const staticPage = await noJavaScript.newPage();
  await staticPage.goto(`${root}components/button/`);
  assert.equal(await staticPage.getByRole('heading', { name: 'Button', exact: true }).count(), 1);
  assert.ok(
    (
      await staticPage.locator('[id="source-components-button-button--default"]').textContent()
    ).includes('export default Default'),
  );
  await noJavaScript.close();
  console.log(
    'Chromium check: all previews render, copying matches source, inline labels select, dialog opens/closes, relative Tree helpers load data, CodeBlock changes format, template renders, and guidance/source work without JavaScript. No browser errors.',
  );
} finally {
  if (browser) await browser.close();
  await new Promise((resolve, reject) => {
    server.httpServer.close((error) => (error ? reject(error) : resolve()));
    server.httpServer.closeAllConnections();
  });
}
