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
      ...(metadata.versions['react-window'] ? ['@types/react-window'] : []),
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
        const target = path.join(directory, 'templates', page.id, source.name);
        await fs.mkdir(path.dirname(target), { recursive: true });
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
  const pageProblems = [];
  const expectedNavigationErrors = [];
  let simulatingNavigationFailure = false;
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      if (
        simulatingNavigationFailure &&
        /503|Could not load documentation page/.test(message.text())
      )
        expectedNavigationErrors.push(message.text());
      else errors.push(message.text());
    }
  });
  for (const record of metadata.pages) {
    await page.goto(`${root}${record.htmlPath}`);
    await page.waitForFunction(
      () =>
        globalThis.document.querySelector('[data-reference-ready="true"]') &&
        [...globalThis.document.querySelectorAll('[data-example-id]')].every(
          (container) => container.children.length > 0,
        ),
    );
    assert.equal(await page.locator('[data-example-id]').count(), record.examples.length);
    assert.equal(
      await page.locator('nav[aria-label="Documentation"] a[aria-current="page"]').count(),
      1,
      `${record.id}: active navigation`,
    );
    for (const link of await page
      .locator('nav[aria-label="Documentation"] a')
      .evaluateAll((links) => links.map((link) => link.getAttribute('href')))) {
      assert.ok(link?.startsWith(metadata.basePath), `${record.id}: base-aware navigation ${link}`);
    }
    if (record.singlePreview) {
      for (const example of record.examples) {
        const container = page.locator(`[data-example-id="${example.id}"]`);
        const run = container.getByRole('button', { name: 'Run this example', exact: true });
        if (await run.count()) await run.click();
        assert.equal(await run.count(), 0, `${example.id}: activated preview`);
        assert.equal(await container.locator('[data-preview-error]').count(), 0);
      }
    }
    assert.equal(
      await page.locator('#reference-root > .coreai-docsite-provider').count(),
      1,
      `${record.id}: one app-level provider`,
    );
    const previewErrors = await page.locator('[data-preview-error]').count();
    if (previewErrors)
      pageProblems.push(
        `${record.id}: failed previews ${JSON.stringify(await page.locator('[data-preview-error]').evaluateAll((elements) => elements.map((element) => element.closest('[data-example-id]')?.getAttribute('data-example-id'))))}; ${errors.slice(-4).join('\n')}`,
      );
    const duplicateIds = await page.evaluate(() => {
      const ids = [...globalThis.document.querySelectorAll('[id]')].map((element) => element.id);
      return [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
    });
    if (duplicateIds.length)
      pageProblems.push(`${record.id}: duplicate IDs ${duplicateIds.join(', ')}`);
    for (const example of record.examples) {
      assert.equal(
        await page.locator(`[id="source-${example.id}"]`).textContent(),
        await get(example.sourcePath),
      );
    }
    assert.deepEqual(pageProblems, [], 'Whole-catalog page checks');
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
  const beforeTheme = await page
    .locator('[data-example-id]')
    .evaluateAll((containers) =>
      containers.map((container) =>
        globalThis.getComputedStyle(container).getPropertyValue('--colorNeutralBackground1'),
      ),
    );
  await page.getByRole('button', { name: 'Switch to dark theme', exact: true }).click();
  await page.waitForFunction(() => globalThis.document.documentElement.dataset.theme === 'dark');
  const darkTheme = await page
    .locator('[data-example-id]')
    .evaluateAll((containers) =>
      containers.map((container) =>
        globalThis.getComputedStyle(container).getPropertyValue('--colorNeutralBackground1'),
      ),
    );
  assert.ok(
    darkTheme.every((color, index) => color && color !== beforeTheme[index]),
    'All examples inherit the changed theme',
  );
  assert.match(
    await dropdown.innerText(),
    /In progress/,
    'Theme changes must preserve example state',
  );
  await page.getByRole('link', { name: 'Button', exact: true }).click();
  await page.getByRole('button', { name: 'Switch to light theme', exact: true }).waitFor();
  assert.equal(await page.locator('#reference-root > .coreai-docsite-provider').count(), 1);
  await page.getByRole('button', { name: 'Switch to light theme', exact: true }).click();
  const navigation = page.getByRole('navigation', { name: 'Documentation', exact: true });
  const tree = navigation.getByRole('tree', { name: 'Documentation pages', exact: true });
  await tree.waitFor();
  const timeOrigin = await page.evaluate(() => {
    globalThis.document
      .querySelector('#reference-root > .coreai-docsite-provider')
      .setAttribute('data-provider-sentinel', 'persistent');
    globalThis.document
      .querySelector('.app-sidenav')
      .setAttribute('data-sidebar-sentinel', 'persistent');
    return globalThis.performance.timeOrigin;
  });
  await page
    .locator('#main')
    .getByRole('link', { name: 'Setup and dependencies', exact: true })
    .click();
  await page.getByRole('heading', { name: 'Use these examples', exact: true }).waitFor();
  await page.locator('[data-reference-ready="true"]').waitFor();
  assert.equal(
    await page.evaluate(() => globalThis.performance.timeOrigin),
    timeOrigin,
    'Links inside static article content use the same router',
  );
  await page.goBack();
  await page.getByRole('heading', { name: 'Button', exact: true }).waitFor();
  await page.locator('[data-reference-ready="true"]').waitFor();
  const templates = tree.getByRole('treeitem', { name: 'Templates', exact: true });
  await templates.focus();
  await page.keyboard.press('ArrowLeft');
  assert.equal(await templates.getAttribute('aria-expanded'), 'false');
  const savedScroll = await page.locator('.app-page').evaluate((region) => {
    region.scrollTop = 600;
    return region.scrollTop;
  });
  await navigation.getByRole('link', { name: 'Dropdown', exact: true }).click();
  await page.getByRole('heading', { name: 'Dropdown', exact: true }).waitFor();
  await page.locator('[data-reference-ready="true"]').waitFor();
  assert.equal(
    await page.evaluate(() => globalThis.performance.timeOrigin),
    timeOrigin,
    'Client navigation must not reload the document',
  );
  assert.equal(await page.locator('[data-provider-sentinel="persistent"]').count(), 1);
  assert.equal(await page.locator('[data-sidebar-sentinel="persistent"]').count(), 1);
  assert.equal(
    await templates.getAttribute('aria-expanded'),
    'false',
    'Tree expansion persists across page navigation',
  );
  assert.ok(
    await page.locator('#main').evaluate((main) => main === globalThis.document.activeElement),
  );

  await page.goBack();
  await page.getByRole('heading', { name: 'Button', exact: true }).waitFor();
  await page.locator('[data-reference-ready="true"]').waitFor();
  await page.waitForFunction(
    (expected) => Math.abs(globalThis.document.querySelector('.app-page').scrollTop - expected) < 2,
    savedScroll,
  );
  await page.goForward();
  await page.getByRole('heading', { name: 'Dropdown', exact: true }).waitFor();
  await page.locator('[data-reference-ready="true"]').waitFor();
  assert.equal(await page.evaluate(() => globalThis.performance.timeOrigin), timeOrigin);
  const treeItem = tree.getByRole('treeitem', { name: 'Tree', exact: true });
  await treeItem.focus();
  await page.keyboard.press('Enter');
  await page.getByRole('heading', { name: 'Tree', exact: true }).waitFor();
  await page.locator('[data-reference-ready="true"]').waitFor();
  assert.equal(await page.title(), 'Tree | CoreAI design system');
  assert.equal(
    await navigation.getByRole('link', { name: 'Tree', exact: true }).getAttribute('aria-current'),
    'page',
  );
  assert.equal(
    await page.evaluate(() => globalThis.performance.timeOrigin),
    timeOrigin,
    'Enter activation uses the router',
  );

  await templates.focus();
  await page.keyboard.press('ArrowRight');
  await navigation.getByRole('link', { name: 'Tab Link List', exact: true }).click();
  await page.getByRole('heading', { name: 'Tab Link List', exact: true }).waitFor();
  await page.locator('[data-reference-ready="true"]').waitFor();
  const routerExample = page.locator(
    '[data-example-id="templates-react-router-tab-link-list--default"]',
  );
  await routerExample.getByRole('tab', { name: 'Activity', exact: true }).click();
  await routerExample
    .locator('[role="tab"][aria-selected="true"]')
    .filter({ hasText: 'Activity' })
    .waitFor();
  assert.equal(
    await routerExample
      .getByRole('tab', { name: 'Activity', exact: true })
      .getAttribute('aria-selected'),
    'true',
  );
  assert.ok(
    page.url().endsWith('/templates/react-router-tab-link-list/'),
    'Demo router must not navigate the documentation app',
  );
  assert.equal(await page.evaluate(() => globalThis.performance.timeOrigin), timeOrigin);

  const failureUrl = `${root}components/button/`;
  await page.route(failureUrl, (route) =>
    route.fulfill({ status: 503, contentType: 'text/plain', body: 'Simulated outage' }),
  );
  simulatingNavigationFailure = true;
  await navigation.getByRole('link', { name: 'Button', exact: true }).click();
  await page.locator('[data-navigation-error]').filter({ hasText: 'HTTP 503' }).waitFor();
  assert.ok(
    expectedNavigationErrors.some((message) =>
      message.includes('Could not load documentation page'),
    ),
    'Navigation failures are logged, not silently hidden',
  );
  assert.equal(await page.evaluate(() => globalThis.performance.timeOrigin), timeOrigin);
  await page.unroute(failureUrl);
  simulatingNavigationFailure = false;
  await page.getByRole('button', { name: 'Retry page loading', exact: true }).click();
  await page.getByRole('heading', { name: 'Button', exact: true }).waitFor();
  await page.locator('[data-reference-ready="true"]').waitFor();
  assert.equal(await page.locator('[data-navigation-error]').count(), 0);

  let release;
  let started;
  let finished;
  const blocked = new Promise((resolve) => {
    release = resolve;
  });
  const requestStarted = new Promise((resolve) => {
    started = resolve;
  });
  const requestFinished = new Promise((resolve) => {
    finished = resolve;
  });
  const delayedUrl = `${root}components/dropdown/`;
  const delayedHtml = await get('components/dropdown/');
  await page.route(delayedUrl, async (route) => {
    started();
    await blocked;
    await route.fulfill({ status: 200, contentType: 'text/html', body: delayedHtml });
    finished();
  });
  await navigation.getByRole('link', { name: 'Dropdown', exact: true }).click();
  await requestStarted;
  await navigation.getByRole('link', { name: 'Tree', exact: true }).click();
  await page.getByRole('heading', { name: 'Tree', exact: true }).waitFor();
  await page.locator('[data-reference-ready="true"]').waitFor();
  release();
  await requestFinished;
  await page.unroute(delayedUrl);
  assert.equal(
    await page.title(),
    'Tree | CoreAI design system',
    'Late responses cannot replace a newer page',
  );

  await page.evaluate((href) => {
    const link = globalThis.document.createElement('a');
    link.href = href;
    link.textContent = 'Go to Dropdown guidance';
    globalThis.document.getElementById('main').prepend(link);
  }, `${root}components/dropdown/#guidance-best-practices`);
  await page.getByRole('link', { name: 'Go to Dropdown guidance', exact: true }).click();
  await page.getByRole('heading', { name: 'Dropdown', exact: true }).waitFor();
  await page.locator('[data-reference-ready="true"]').waitFor();
  assert.ok(page.url().endsWith('/components/dropdown/#guidance-best-practices'));
  await page.waitForFunction(() => {
    const heading = globalThis.document.getElementById('guidance-best-practices');
    const region = globalThis.document.querySelector('.app-page');
    return Math.abs(heading.getBoundingClientRect().top - region.getBoundingClientRect().top) < 8;
  });
  assert.equal(await page.evaluate(() => globalThis.performance.timeOrigin), timeOrigin);

  const [newTab] = await Promise.all([
    context.waitForEvent('page'),
    navigation
      .getByRole('link', { name: 'Button', exact: true })
      .click({ modifiers: ['ControlOrMeta'] }),
  ]);
  await newTab.getByRole('heading', { name: 'Button', exact: true }).waitFor();
  await newTab.close();
  assert.ok(
    page.url().includes('/components/dropdown/'),
    'Modified clicks do not navigate the current page',
  );

  const rawPage = await context.newPage();
  await rawPage.goto(`${root}components/button/`);
  await rawPage.locator('[data-reference-ready="true"]').waitFor();
  await Promise.all([
    rawPage.waitForRequest(
      (request) => request.isNavigationRequest() && request.url() === `${root}components/button.md`,
    ),
    rawPage.getByRole('link', { name: 'View as Markdown', exact: true }).click(),
  ]);
  await rawPage.close();

  await page.goto(`${root}components/dialog/`);
  await page
    .locator('[data-example-id="components-dialog--default"]')
    .getByRole('button', { name: 'Open dialog', exact: true })
    .click();
  await page.getByRole('dialog').waitFor();
  await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });

  await page.goto(`${root}components/tree/`);
  const lazyTree = page.locator('[data-example-id="components-tree--lazy-loading"]');
  await lazyTree.getByRole('treeitem', { name: 'People', exact: true }).click();
  await lazyTree.getByText('People 1', { exact: true }).waitFor();

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
  await page.goto(`${root}components/button/`);
  await page.getByRole('searchbox', { name: 'Filter navigation' }).fill('dropdown');
  const filtered = page.locator('[data-navigation-entry]:visible');
  assert.ok((await filtered.count()) >= 1);
  for (const title of await filtered.allTextContents())
    assert.match(title.toLowerCase(), /dropdown/);
  await page.getByRole('searchbox', { name: 'Filter navigation' }).fill('');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  await page.getByRole('dialog', { name: 'Site navigation dialog', exact: true }).waitFor();
  assert.ok(await page.locator('.app-content').evaluate((element) => element.inert));
  await page.keyboard.press('Escape');
  assert.equal(
    await page.getByRole('dialog', { name: 'Site navigation dialog', exact: true }).count(),
    0,
  );
  assert.ok(
    await page
      .getByRole('button', { name: 'Open navigation', exact: true })
      .evaluate((button) => globalThis.document.activeElement === button),
  );
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  await page
    .getByRole('navigation', { name: 'Documentation', exact: true })
    .getByRole('link', { name: 'Dropdown', exact: true })
    .click();
  await page.getByRole('heading', { name: 'Dropdown', exact: true }).waitFor();
  assert.equal(
    await page.getByRole('dialog', { name: 'Site navigation dialog', exact: true }).count(),
    0,
  );
  assert.equal(await page.locator('#reference-root > .coreai-docsite-provider').count(), 1);
  assert.deepEqual(errors, [], 'Browser errors after navigation checks');
  console.log(
    'Chromium check: persistent React Router navigation, CoreAI Tree keyboard/expansion/filtering, history and scroll restoration, mobile focus, fragments, failure/retry/cancellation, native downloads/new tabs, isolated demo routers, shared theme, all previews and source parity. No unexpected browser errors.',
  );
} finally {
  if (browser) await browser.close();
  await new Promise((resolve, reject) => {
    server.httpServer.close((error) => (error ? reject(error) : resolve()));
    server.httpServer.closeAllConnections();
  });
}
