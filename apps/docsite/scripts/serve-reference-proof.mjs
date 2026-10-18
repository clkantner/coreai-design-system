// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { preview } from 'vite';
import { appRoot, outputDirectory } from './build-reference-proof.mjs';

export async function serveReferenceProof({ port = 8081 } = {}) {
  const metadata = JSON.parse(
    await fs.readFile(path.join(outputDirectory, 'llms/index.json'), 'utf8'),
  );
  return preview({
    configFile: false,
    root: appRoot,
    appType: 'mpa',
    base: metadata.basePath,
    build: { outDir: outputDirectory },
    preview: { host: '127.0.0.1', port, strictPort: true },
  });
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const server = await serveReferenceProof();
  server.printUrls();
}
