// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import fs from 'node:fs/promises';
import path from 'node:path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { toString } from 'mdast-util-to-string';

export function markdownTable(headers, rows) {
  const cell = (value) =>
    String(value ?? '')
      .replaceAll('|', '\\|')
      .replaceAll('\n', ' ');
  return [
    `| ${headers.map(cell).join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(cell).join(' | ')} |`),
  ].join('\n');
}

export async function standaloneSections({ appRoot, pages, versions, providerSource, fence }) {
  async function rows(name) {
    const source = await fs.readFile(path.join(appRoot, 'content/data', `${name}.md`), 'utf8');
    const table = unified()
      .use(remarkParse)
      .use(remarkGfm)
      .parse(source)
      .children.find((node) => node.type === 'table');
    if (!table) throw new Error(`Missing authored data table: ${name}`);
    return table.children.map((row) => row.children.map((cell) => toString(cell)));
  }
  const themes = await import('@coreai-ds/react-components');
  const roles = (await rows('color-roles')).slice(1);
  const themeNames = ['coreaiLightTheme', 'coreaiDarkTheme', 'azureLightTheme', 'azureDarkTheme'];
  const colors = [
    '### Brand ramps',
    markdownTable(
      ['Step', 'CoreAI', 'Azure'],
      Array.from({ length: 16 }, (_, i) => {
        const step = (i + 1) * 10;
        return [step, themes.coreaiBrandVariants[step], themes.azureBrandVariants[step]];
      }),
    ),
    '### Semantic surface and text colors',
    markdownTable(
      ['Role', 'Token', 'Usage', 'CoreAI light', 'CoreAI dark', 'Azure light', 'Azure dark'],
      roles.map(([name, token, usage]) => [
        name,
        `\`${token}\``,
        usage,
        ...themeNames.map((theme) => {
          const value = themes[theme][token];
          if (typeof value !== 'string')
            throw new Error(`Unknown ${theme} token in color-roles.md: ${token}`);
          return value;
        }),
      ]),
    ),
  ].join('\n\n');
  const typography = await rows('typography');
  const viz = await rows('data-visualization');
  const history = JSON.parse(await fs.readFile(path.join(appRoot, 'changelog.json'), 'utf8'));
  return {
    colors,
    typography: markdownTable(typography[0], typography.slice(1)),
    'data-visualization': markdownTable(viz[0], viz.slice(1)),
    install: `${fence(
      `npm install ${Object.entries(versions)
        .map(([name, version]) => `${name}@${version}`)
        .join(' ')}`,
      'sh',
    )}\n\nFluent source and package versions are also listed in the discovery index.`,
    provider: fence(providerSource),
    catalog: ['components', 'templates']
      .map(
        (kind) =>
          `### ${kind === 'components' ? 'Components' : 'Templates'}\n\n${pages
            .filter((page) => page.kind === kind)
            .map((page) => `- [${page.title}](/${page.route}.md): ${page.summary}`)
            .join('\n')}`,
      )
      .join('\n\n'),
    'release-summaries': history.entries
      .map(
        (entry) =>
          `### ${entry.version} — ${entry.title} (${entry.date})\n\n${entry.summary}\n\n${entry.sections.map((section) => `#### ${section.title}\n\n${section.items.map((item) => `- ${item}`).join('\n')}`).join('\n\n')}`,
      )
      .join('\n\n'),
  };
}
