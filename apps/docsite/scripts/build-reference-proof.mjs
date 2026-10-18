// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { build } from 'vite';
import react from '@vitejs/plugin-react';
import matter from 'gray-matter';
import ts from 'typescript';
import { guidanceMarkdown, renderGuidance } from '../../../shared/guidance.mjs';
import { createStoryInventory } from '../../storybook/scripts/story-inventory.mjs';
import { extractStorySource } from '../../storybook/scripts/story-source.mjs';
import { readStoryDescriptions } from '../../storybook/scripts/story-descriptions.mjs';
import { assertFluentStoryVersion } from '../../storybook/scripts/fluent-story-version.mjs';
import { readReferencePages } from './read-reference-pages.mjs';

export const appRoot = fileURLToPath(new URL('../', import.meta.url));
export const outputDirectory = path.join(appRoot, 'dist-reference-proof');
const storyRoot = path.resolve(appRoot, '../storybook');
const repositoryRoot = path.resolve(appRoot, '../..');
const require = createRequire(import.meta.url);

export const providerSource = `import * as React from 'react';
import { CoreAIFluentProvider, coreaiLightTheme } from '@coreai-ds/react-components';
import '@coreai-ds/react-components/fonts/fonts.css';
import Example from './Example';

export default function App() {
  return (
    <CoreAIFluentProvider theme={coreaiLightTheme}>
      <Example />
    </CoreAIFluentProvider>
  );
}
`;

export function normalizeBase(value = '/') {
  if (
    !/^\/(?:[A-Za-z0-9._~-]+\/?)*$/.test(value) ||
    value.split('/').some((segment) => segment === '.' || segment === '..')
  ) {
    throw new Error('Base path must be / or an absolute URL path such as /coreai-design-system/.');
  }
  return value.endsWith('/') ? value : `${value}/`;
}

export function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
  });
}

export function codeFence(source, language = 'tsx') {
  const longest = Math.max(2, ...[...source.matchAll(/`+/g)].map(([ticks]) => ticks.length));
  const fence = '`'.repeat(longest + 1);
  return `${fence}${language}\n${source.trimEnd()}\n${fence}`;
}

export function normalizeSource(source) {
  return source.replace(/\r\n?/g, '\n');
}

function unwrap(node) {
  while (
    node &&
    (ts.isAsExpression(node) ||
      ts.isSatisfiesExpression(node) ||
      ts.isParenthesizedExpression(node))
  ) {
    node = node.expression;
  }
  return node;
}

export function assertSimpleStory(source, exportName, metadata = {}, label = exportName) {
  const unsupported = new Set([
    'args',
    'decorators',
    'loaders',
    'globals',
    'beforeEach',
    'afterEach',
    'render',
  ]);
  const fail = (field) => {
    throw new Error(
      `${label}: ${field} needs an explicit fixed-example adaptation or exclusion. ` +
        'The reference proof does not emulate Storybook setup.',
    );
  };
  for (const key of Object.keys(metadata)) {
    if (unsupported.has(key)) fail(`component ${key}`);
  }
  const ast = ts.createSourceFile('example.tsx', source, ts.ScriptTarget.Latest, true);
  if (ast.parseDiagnostics.length) throw new Error(`${label}: invalid TSX source.`);
  let implementation;
  for (const statement of ast.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name?.text === exportName) {
      implementation = statement;
    }
    if (ts.isVariableStatement(statement)) {
      const declaration = statement.declarationList.declarations.find(
        (item) => ts.isIdentifier(item.name) && item.name.text === exportName,
      );
      if (declaration) implementation = unwrap(declaration.initializer);
    }
    if (
      ts.isExpressionStatement(statement) &&
      ts.isBinaryExpression(statement.expression) &&
      ts.isPropertyAccessExpression(statement.expression.left) &&
      statement.expression.left.expression.getText(ast) === exportName &&
      unsupported.has(statement.expression.left.name.text)
    ) {
      fail(`example ${statement.expression.left.name.text}`);
    }
  }
  if (implementation && ts.isObjectLiteralExpression(implementation)) {
    for (const property of implementation.properties) {
      if (ts.isSpreadAssignment(property)) fail('spread story metadata');
      if (unsupported.has(property.name?.getText(ast)) && property.name.getText(ast) !== 'render') {
        fail(`example ${property.name.getText(ast)}`);
      }
    }
    implementation = unwrap(
      implementation.properties.find(
        (property) => ts.isPropertyAssignment(property) && property.name.getText(ast) === 'render',
      )?.initializer,
    );
  }
  if (
    !implementation ||
    !(
      ts.isArrowFunction(implementation) ||
      ts.isFunctionExpression(implementation) ||
      ts.isFunctionDeclaration(implementation)
    ) ||
    implementation.parameters.length > 1
  ) {
    fail('non-function render or Storybook context');
  }
}

export function accountForStories(component, selectedNames) {
  const chosen = new Map(component.stories.map((story) => [story.id, story]));
  if (selectedNames) {
    for (const name of selectedNames) {
      if (!component.stories.some((story) => story.exportName === name)) {
        throw new Error(`${component.id}: selected example ${name} does not exist.`);
      }
    }
  }
  return component.sources.flatMap((source) =>
    source.stories.map((story) => {
      const owner = chosen.get(story.id);
      const included = !selectedNames || selectedNames.includes(owner.exportName);
      const replaced = owner.origin !== story.origin || owner.sourceFile !== story.sourceFile;
      return {
        id: story.id,
        origin: story.origin,
        source: story.implementationFile,
        status: !included ? 'excluded' : replaced ? 'replaced' : 'included',
        reason: !included
          ? 'Outside the representative proof set; not a statement of component support.'
          : replaced
            ? 'Replaced by the matching CoreAI example.'
            : undefined,
      };
    }),
  );
}

function packageManifest(name) {
  const filename =
    name === '@coreai-ds/react-components'
      ? path.join(repositoryRoot, 'packages/react-components/package.json')
      : require.resolve(`${name}/package.json`);
  return JSON.parse(require('node:fs').readFileSync(filename, 'utf8'));
}

function packageName(specifier) {
  return specifier
    .split('/')
    .slice(0, specifier.startsWith('@') ? 2 : 1)
    .join('/');
}

function git(args, cwd) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function exampleHeading(example) {
  return `## ${example.name}\n\nSource: ${example.origin === 'fluent' ? 'Fluent, adapted for CoreAI' : 'CoreAI'}.\n\n${example.description}`.trim();
}

export function exampleHeadingHtml(example) {
  return renderGuidance(exampleHeading(example))
    .html.replaceAll('id="guidance-', `id="${example.id}-`)
    .replaceAll('href="#guidance-', `href="#${example.id}-`);
}

function implementationMarkdown(page, metadata, extension = '.md') {
  return [
    `## Implementation\n\nCoreAI ${metadata.versions['@coreai-ds/react-components']}; Fluent ${metadata.versions['@fluentui/react-components']}.\n\n[Setup and dependencies](${metadata.basePath}guides/setup${extension}).`,
    page.kind === 'templates'
      ? 'Copy this template into your app. It is not an npm export. Adapt actions and navigation to your product.'
      : 'Import components from `@coreai-ds/react-components`. CoreAI guidance above takes precedence over API demonstration examples.',
  ].join('\n\n');
}

export function pageMarkdown(page, metadata) {
  return [
    page.guidance,
    implementationMarkdown(page, metadata),
    ...page.examples.map((example) =>
      [
        exampleHeading(example),
        `[Download source](${metadata.basePath}${example.sourcePath})`,
        codeFence(example.source),
      ].join('\n\n'),
    ),
    ...page.templateSources.map((source) =>
      [
        `## Template source: ${source.name}`,
        `[Download ${source.name}](${metadata.basePath}${source.path})`,
        codeFence(source.source),
      ].join('\n\n'),
    ),
  ].join('\n\n');
}

function shell(title, body, metadata, assets, navigation) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} | CoreAI reference proof</title>
<link rel="icon" href="data:,">
${assets.css.map((file) => `<link rel="stylesheet" href="${metadata.basePath}${file}">`).join('\n')}
</head><body><div id="reference-root"><div id="reference-content"><a class="skip-link" href="#main">Skip to content</a>
<header><a href="${metadata.basePath}">CoreAI reference proof</a><nav aria-label="Documentation">${navigation}</nav></header>
<main id="main">${body}</main>
<footer>Current-release proof. CoreAI ${escapeHtml(metadata.versions['@coreai-ds/react-components'])}; Fluent ${escapeHtml(metadata.versions['@fluentui/react-components'])}.
<a href="${metadata.basePath}llms.txt">Agent index</a> · <a href="${metadata.basePath}llms/index.json">Coverage and provenance</a> · <a href="${metadata.basePath}THIRD-PARTY-NOTICES.txt">License</a></footer>
</div></div><script type="module" src="${metadata.basePath}${assets.entry}"></script></body></html>\n`;
}

function sourceHtml(source, id, downloadPath, base) {
  return `<div class="source-actions"><button type="button" data-copy-source="${id}">Copy source</button>
<a href="${base}${downloadPath}">Download source</a><span role="status" data-copy-status="${id}"></span></div>
<pre><code id="${id}">${escapeHtml(source)}</code></pre>`;
}

export async function buildReferenceProof({ basePath = '/', outDir = outputDirectory } = {}) {
  basePath = normalizeBase(basePath);
  const pageScope = await readReferencePages(path.join(appRoot, 'content'));
  const checkout = path.join(storyRoot, 'fluent-stories');
  const fluentRef = git(['rev-parse', 'HEAD'], checkout);
  const sourceVersion = JSON.parse(
    git(['show', 'HEAD:packages/react-components/react-components/package.json'], checkout),
  ).version;
  assertFluentStoryVersion(sourceVersion, packageManifest('@fluentui/react-components').version);
  const inventory = await createStoryInventory();
  const templateDirectory = path.join(storyRoot, 'src/stories/templates');
  const templates = await createStoryInventory({
    localFiles: (await fs.readdir(templateDirectory, { recursive: true }))
      .filter((filename) => /\.stories\.tsx?$/.test(filename))
      .map((filename) => path.join(templateDirectory, filename)),
    fluentFiles: [],
  });
  const cacheDirectory = path.join(appRoot, '.cache/reference-proof');
  const exampleDirectory = path.join(cacheDirectory, 'examples');
  await fs.mkdir(exampleDirectory, { recursive: true });
  const pages = [];
  const coverage = [];
  const sourceCache = new Map();
  const registry = ["import type { ComponentType } from 'react';"];
  const imports = [];
  const dependencies = new Set([
    '@coreai-ds/react-components',
    '@fluentui/react-components',
    '@fluentui/react-icons',
    'react',
    'react-dom',
  ]);

  for (const scope of pageScope) {
    const component = [...inventory.components, ...templates.components].find(
      (component) => component.id === scope.component,
    );
    if (!component) throw new Error(`Missing proof component: ${scope.component}`);
    coverage.push(...accountForStories(component, scope.examples));
    const guidancePath = path.join(appRoot, 'content', scope.guidance);
    const { data, content } = matter(await fs.readFile(guidancePath, 'utf8'));
    const page = {
      id: scope.id,
      title: data.title,
      summary: data.summary,
      kind: scope.kind ?? 'components',
      guidanceSource: `content/${scope.guidance}`,
      guidance: guidanceMarkdown({ ...data, body: content.trim() }),
      examples: [],
      templateSources: [],
    };
    for (const story of component.stories) {
      if (scope.examples && !scope.examples.includes(story.exportName)) continue;
      const implementationFile = path.join(storyRoot, story.implementationFile);
      const owner = component.sources.find((source) => source.sourceFile === story.sourceFile);
      assertSimpleStory(
        await fs.readFile(implementationFile, 'utf8'),
        story.implementationExport,
        owner.metadata,
        story.id,
      );
      const extracted = await extractStorySource(story, { root: storyRoot, cache: sourceCache });
      for (const dependency of extracted.requirements) dependencies.add(packageName(dependency));
      const source = normalizeSource(
        `// Copyright (c) Microsoft Corporation.\n// Licensed under the MIT license.\n\n${extracted.snippet.trim()}\n\nexport default ${story.implementationExport};\n`,
      );
      const filename = `${story.id}.tsx`;
      await fs.writeFile(path.join(exampleDirectory, filename), source);
      const binding = `Example${imports.length}`;
      registry.push(`import ${binding} from './examples/${story.id}';`);
      imports.push(`${JSON.stringify(story.id)}: ${binding}`);
      const description = await readStoryDescriptions(
        implementationFile,
        story.implementationExport,
      );
      page.examples.push({
        id: story.id,
        name: story.name,
        origin: story.origin,
        originalSource: story.implementationFile,
        description: description.description || extracted.description,
        sourcePath: `source/examples/${filename}`,
        source,
        sha256: createHash('sha256').update(source).digest('hex'),
        dependencies: extracted.requirements,
      });
    }
    for (const source of scope.sources ?? []) {
      const name = path.basename(source);
      page.templateSources.push({
        name,
        path: `source/templates/${scope.id}/${name}`,
        source: normalizeSource(await fs.readFile(path.join(storyRoot, source), 'utf8')),
      });
    }
    pages.push(page);
  }
  registry.push(
    `export const examples = {${imports.join(',')}} satisfies Record<string, ComponentType>;`,
  );
  const registryFile = path.join(cacheDirectory, 'registry.ts');
  await fs.writeFile(registryFile, `${registry.join('\n')}\n`);
  const metadata = {
    schemaVersion: 1,
    basePath,
    versions: Object.fromEntries(
      [...dependencies].sort().map((name) => [name, packageManifest(name).version]),
    ),
    fluentSource: { repository: 'https://github.com/microsoft/fluentui', ref: fluentRef },
    coreaiSourceRef: git(['rev-parse', 'HEAD'], repositoryRoot),
    runtimePackages: {},
    scope: pageScope.map((page) => page.component),
    excludedFluentPackages: inventory.scope.excludedFluentPackages,
    coverage,
  };
  await build({
    configFile: false,
    root: appRoot,
    base: basePath,
    publicDir: false,
    plugins: [
      react(),
      {
        name: 'coreai:reference-proof-examples',
        resolveId(id) {
          if (id === 'virtual:reference-proof-examples') return registryFile;
        },
      },
      {
        name: 'coreai:reference-proof-runtime-peers',
        async generateBundle() {
          const modules = [...this.getModuleIds()].filter((id) => !id.startsWith('\0'));
          if (
            modules.some((id) =>
              /\/node_modules\/(?:@storybook\/|storybook\/)/.test(id.replaceAll('\\', '/')),
            )
          ) {
            this.error('Storybook runtime code must not ship in the reference proof.');
          }
          for (const name of ['react', 'react-dom', '@fluentui/react-components']) {
            const marker = `/node_modules/${name}/`;
            const roots = new Set(
              modules
                .map((id) => id.replaceAll('\\', '/'))
                .filter((id) => id.includes(marker))
                .map((id) =>
                  path.normalize(id.slice(0, id.lastIndexOf(marker) + marker.length - 1)),
                ),
            );
            if (roots.size !== 1) {
              this.error(`Expected one bundled ${name} installation; found ${roots.size}.`);
            }
            const [root] = roots;
            const { version } = JSON.parse(
              await fs.readFile(path.join(root, 'package.json'), 'utf8'),
            );
            if (version !== metadata.versions[name]) {
              this.error(`Bundled ${name}@${version} differs from the documentation version.`);
            }
            metadata.runtimePackages[name] = { version, installations: roots.size };
          }
        },
      },
    ],
    resolve: {
      dedupe: ['react', 'react-dom', '@fluentui/react-components', '@fluentui/react-icons'],
    },
    build: {
      outDir,
      emptyOutDir: true,
      manifest: true,
      rollupOptions: { input: path.join(appRoot, 'src/reference-proof/main.tsx') },
    },
  });
  const manifest = JSON.parse(await fs.readFile(path.join(outDir, '.vite/manifest.json'), 'utf8'));
  const entry = Object.values(manifest).find((entry) => entry.isEntry);
  if (!entry) throw new Error('Reference proof bundle has no entry point.');
  const assets = { entry: entry.file, css: entry.css ?? [] };
  const write = async (filename, content) => {
    const target = path.join(outDir, filename);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, content);
  };
  const navigation = pages
    .map((page) => `<a href="${basePath}${page.kind}/${page.id}/">${escapeHtml(page.title)}</a>`)
    .join(' ');
  const indexPages = [];
  for (const page of pages) {
    const markdown = pageMarkdown(page, metadata);
    let body = `<a href="${basePath}${page.kind}/${page.id}.md">View as Markdown</a>
${renderGuidance(page.guidance).html}
${renderGuidance(implementationMarkdown(page, metadata, '/')).html}`;
    for (const example of page.examples) {
      body += `<section class="example" id="${example.id}">${exampleHeadingHtml(example)}
<div class="preview" data-example-id="${example.id}" aria-label="${escapeHtml(example.name)} preview">
<p>Loading interactive example. Full source is available below.</p></div>
<noscript>Enable JavaScript for the interactive preview. Guidance and source do not require JavaScript.</noscript>
${sourceHtml(example.source, `source-${example.id}`, example.sourcePath, basePath)}</section>`;
      await write(example.sourcePath, example.source);
    }
    for (const [index, source] of page.templateSources.entries()) {
      body += `<section><h2>Template source: ${escapeHtml(source.name)}</h2><p>Copy this file into your app. Do not import this template from the package.</p>
${sourceHtml(source.source, `template-${page.id}-${index}`, source.path, basePath)}</section>`;
      await write(source.path, source.source);
    }
    await write(`${page.kind}/${page.id}.md`, markdown);
    await write(
      `${page.kind}/${page.id}/index.html`,
      shell(page.title, body, metadata, assets, navigation),
    );
    indexPages.push({
      ...page,
      guidance: undefined,
      htmlPath: `${page.kind}/${page.id}/`,
      markdownPath: `${page.kind}/${page.id}.md`,
      examples: page.examples.map((example) => ({ ...example, source: undefined })),
      templateSources: page.templateSources.map((source) => ({ ...source, source: undefined })),
    });
  }
  const install = `npm install ${Object.entries(metadata.versions)
    .map(([name, version]) => `${name}@${version}`)
    .join(' ')}`;
  const setup = `${await fs.readFile(path.join(appRoot, 'content/reference-proof/setup.md'), 'utf8')}\n\n## Packages used by this build\n\n${codeFence(install, 'sh')}\n\nFluent source revision: \`${fluentRef}\`.\n\n## Provider setup: App.tsx\n\n${codeFence(providerSource)}\n`;
  await write('guides/setup.md', setup);
  await write('source/setup/App.tsx', providerSource);
  await write(
    'guides/setup/index.html',
    shell(
      'Setup',
      `<a href="${basePath}guides/setup.md">View as Markdown</a>${renderGuidance(setup).html}`,
      metadata,
      assets,
      navigation,
    ),
  );
  const listing = pages
    .map((page) => `- [${page.title}](${basePath}${page.kind}/${page.id}.md): ${page.summary}`)
    .join('\n');
  const introduction = `# CoreAI reference proof\n\nHelp designers code and help engineers design.\n\nThis is a representative proof, not the complete component catalog.\n\n[Setup](${basePath}guides/setup.md)\n\n${listing}\n`;
  await write('index.md', introduction);
  await write(
    'index.html',
    shell(
      'Documentation',
      renderGuidance(introduction.replaceAll('.md)', '/)')).html,
      metadata,
      assets,
      navigation,
    ),
  );
  await write(
    'llms.txt',
    `${introduction}\n## Build versions\n\n${Object.entries(metadata.versions)
      .map(([name, version]) => `- ${name}: ${version}`)
      .join(
        '\n',
      )}\n\nFluent source: ${metadata.fluentSource.repository}/tree/${fluentRef}\n\n[Coverage and provenance](${basePath}llms/index.json)\n\nCoreAI guidance takes precedence over upstream API examples. Templates are copyable source, not package exports.\n`,
  );
  await write(
    'llms/index.json',
    `${JSON.stringify({ ...metadata, pages: indexPages }, null, 2)}\n`,
  );
  await write('.nojekyll', '');
  await write(
    'THIRD-PARTY-NOTICES.txt',
    `Examples include Microsoft Fluent UI source from ${metadata.fluentSource.repository}/tree/${fluentRef}.\nCoreAI and Fluent UI examples are licensed under the MIT license.\n\n${await fs.readFile(path.join(path.dirname(require.resolve('@fluentui/react-components/package.json')), 'LICENSE'), 'utf8')}`,
  );
  console.log(
    `Reference proof: ${pages.length} pages, ${imports.length} executable examples, base ${basePath}\n${outDir}`,
  );
  return { ...metadata, pages: indexPages };
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const { values } = parseArgs({ options: { base: { type: 'string', default: '/' } } });
  await buildReferenceProof({ basePath: values.base });
}
