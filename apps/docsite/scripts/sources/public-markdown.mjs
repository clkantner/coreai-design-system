// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import matter from 'gray-matter';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function publicMarkdown(content, file) {
  if (file.replaceAll('\\', '/').includes('/apps/docsite/content/')) {
    const root = fileURLToPath(new URL('../../../../', import.meta.url));
    return matter(content)
      .content.replace(
        /<!-- example: ([\w-]+) -->/g,
        (_match, id) => `[Open live example](?path=/story/${id})`,
      )
      .replace(/\]\((\.\.?\/[^)]+)\)/g, (_match, target) => {
        const filename = path
          .relative(root, path.resolve(path.dirname(file), target))
          .replaceAll('\\', '/');
        return `](https://github.com/microsoft/coreai-design-system/blob/main/${filename})`;
      })
      .replace(
        /\]\(\/((?:guides|foundations|patterns|overview|components|templates)\/[^)]+\.md)\)/g,
        '](' +
          'https://github.com/microsoft/coreai-design-system/blob/main/apps/docsite/content/$1)',
      );
  }
  return file.replaceAll('\\', '/').includes('/fluent-stories/')
    ? content.replace(
        /\[([^\]]+)\]\(https?:\/\/(?:[^/)]+\.)?(?:visualstudio\.com|dev\.azure\.com)\/[^)]+\)/gi,
        '$1',
      )
    : content;
}
