// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import { parse } from 'yaml';

test('Pages preview deploys only the verified feature branch without touching Azure', async () => {
  const source = await fs.readFile(new URL('../docs-preview.yml', import.meta.url), 'utf8');
  const workflow = parse(source);
  assert.deepEqual(workflow.on.push.branches, ['feat/static-storybook-markdown']);
  assert.equal(workflow.on.pull_request_target, undefined);
  assert.equal(workflow.on.pull_request, undefined);
  assert.equal(workflow.concurrency['cancel-in-progress'], false);
  assert.deepEqual(workflow.permissions, { contents: 'read' });
  for (const job of Object.values(workflow.jobs)) {
    assert.match(job.if, /github\.repository == 'microsoft\/coreai-design-system'/);
    assert.match(job.if, /github\.ref == 'refs\/heads\/feat\/static-storybook-markdown'/);
    for (const step of job.steps) {
      if (step.uses) assert.match(step.uses, /@[a-f0-9]{40}$/);
    }
  }
  const build = workflow.jobs.build;
  const uploadIndex = build.steps.findIndex((step) =>
    step.uses?.startsWith('actions/upload-pages-artifact@'),
  );
  assert.equal(build.steps[uploadIndex].with.path, 'apps/docsite/dist-reference-proof');
  const verifyIndex = build.steps.findIndex((step) =>
    step.run?.includes('run verify:reference-proof'),
  );
  assert.ok(verifyIndex >= 0 && verifyIndex < uploadIndex);
  const buildIndex = build.steps.findIndex((step) =>
    step.run?.includes('run build:reference-proof'),
  );
  const testIndex = build.steps.findIndex((step) => step.run?.includes('run test:reference-proof'));
  assert.ok(
    buildIndex >= 0 && buildIndex < testIndex,
    'Build the package and fetch pinned sources before catalog tests on a clean runner',
  );
  assert.ok(build.steps.some((step) => step.run?.includes('--base=/coreai-design-system/')));
  assert.ok(
    build.steps.some((step) => step.run === 'npm --workspace apps/docsite run type-check'),
    'Prepare legacy metadata through the canonical type-check script',
  );
  assert.equal(workflow.jobs.deploy.needs, 'build');
  assert.equal(workflow.jobs.deploy.environment.name, 'github-pages');
  assert.deepEqual(workflow.jobs.deploy.permissions, { pages: 'write', 'id-token': 'write' });
  assert.doesNotMatch(source, /azure\/login|az webapp|pull_request_target|secrets\./);
  const azure = parse(await fs.readFile(new URL('../deploy.yml', import.meta.url), 'utf8'));
  assert.deepEqual(azure.on.push.branches, ['main']);
});
