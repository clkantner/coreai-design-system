// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

export async function readReferencePages(contentDirectory) {
  const pages = [];
  async function walk(directory) {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      if (entry.name === 'generated') continue;
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(filename);
      } else if (entry.name.endsWith('.md')) {
        const { data } = matter(await fs.readFile(filename, 'utf8'));
        if (data.reference === undefined) continue;
        const fail = (message) => {
          throw new Error(`${filename}: ${message}`);
        };
        const reference = data.reference;
        if (!reference || typeof reference !== 'object' || Array.isArray(reference)) {
          fail('reference must be an object.');
        }
        for (const key of Object.keys(reference)) {
          if (
            ![
              'component',
              'examples',
              'sources',
              'route',
              'omitDecorators',
              'exclude',
              'singlePreview',
            ].includes(key)
          ) {
            fail(`unknown reference field "${key}".`);
          }
          if (
            reference.singlePreview !== undefined &&
            (typeof reference.singlePreview !== 'string' || !reference.singlePreview.trim())
          ) {
            fail('reference.singlePreview must explain why previews run one at a time.');
          }
          if (
            reference.omitDecorators !== undefined &&
            (typeof reference.omitDecorators !== 'string' || !reference.omitDecorators.trim())
          ) {
            fail('reference.omitDecorators must explain the layout simplification.');
          }
          if (reference.exclude !== undefined) {
            if (
              !reference.exclude ||
              typeof reference.exclude !== 'object' ||
              Array.isArray(reference.exclude) ||
              Object.entries(reference.exclude).some(
                ([name, reason]) => !name.trim() || typeof reason !== 'string' || !reason.trim(),
              )
            ) {
              fail('reference.exclude must map example export names to reasons.');
            }
            if (reference.examples)
              fail('Use either reference.examples or reference.exclude, not both.');
          }
        }
        for (const key of ['id', 'title', 'summary']) {
          if (typeof data[key] !== 'string' || !data[key].trim()) fail(`${key} is required.`);
        }
        if (typeof reference.component !== 'string' || !/^[a-z0-9-]+$/.test(reference.component)) {
          fail('reference.component must be an inventory component ID.');
        }
        for (const key of ['examples', 'sources']) {
          if (
            reference[key] !== undefined &&
            (!Array.isArray(reference[key]) ||
              !reference[key].length ||
              reference[key].some((value) => typeof value !== 'string' || !value.trim()) ||
              new Set(reference[key]).size !== reference[key].length)
          ) {
            fail(`reference.${key} must be a nonempty list of unique strings.`);
          }
        }
        const guidance = path.relative(contentDirectory, filename).replaceAll('\\', '/');
        const route = reference.route ?? guidance.replace(/\.md$/, '').toLowerCase();
        if (!/^(components|templates)\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(route)) {
          fail('reference route must be components/name or templates/name.');
        }
        const [kind, id] = route.split('/');
        for (const source of reference.sources ?? []) {
          if (
            !/^src\/stories\/templates\/[\w/-]+\.tsx$/.test(source) ||
            source.split('/').some((segment) => ['.', '..'].includes(segment))
          ) {
            fail('reference.sources must name TSX files under src/stories/templates/.');
          }
        }
        if (
          new Set((reference.sources ?? []).map((source) => path.basename(source))).size !==
          (reference.sources ?? []).length
        ) {
          fail('reference.sources must have unique filenames.');
        }
        if (kind === 'templates' && !reference.sources?.length) {
          fail('template pages must provide reference.sources for copying.');
        }
        pages.push({ id, kind, guidance, ...reference });
      }
    }
  }
  await walk(contentDirectory);
  pages.sort((first, second) =>
    `${first.kind}/${first.id}`.localeCompare(`${second.kind}/${second.id}`),
  );
  if (!pages.length) throw new Error('No Markdown pages declare reference metadata.');
  const routes = pages.map((page) => `${page.kind}/${page.id}`);
  if (new Set(routes).size !== routes.length) throw new Error('Duplicate reference page route.');
  const components = pages.map((page) => page.component);
  if (new Set(components).size !== components.length)
    throw new Error('Duplicate reference component ownership.');
  return pages;
}
