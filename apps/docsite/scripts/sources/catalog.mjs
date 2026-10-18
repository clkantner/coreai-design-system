// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStoryInventory } from './story-inventory.mjs';

export const storyRoot = fileURLToPath(new URL('../../../storybook/', import.meta.url));

export async function readSourceCatalog() {
  const components = await createStoryInventory();
  const directory = path.join(storyRoot, 'src/stories/templates');
  const templates = await createStoryInventory({
    localFiles: (await fs.readdir(directory, { recursive: true }))
      .filter((filename) => /\.stories\.tsx?$/.test(filename))
      .map((filename) => path.join(directory, filename)),
    fluentFiles: [],
  });
  return {
    ...components,
    components: [...components.components, ...templates.components],
  };
}
