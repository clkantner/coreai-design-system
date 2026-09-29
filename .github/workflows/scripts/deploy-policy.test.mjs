import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const deploy = readFileSync(new URL('../deploy.yml', import.meta.url), 'utf8');
const publish = readFileSync(new URL('../publish-package.yml', import.meta.url), 'utf8');
const verify = readFileSync(new URL('../verify-azure-access.yml', import.meta.url), 'utf8');

test('Azure login verification is manual, main-only, environment-scoped, and has no deployment steps', () => {
  assert.match(verify, /on:\n {2}workflow_dispatch:/);
  assert.doesNotMatch(verify, /^\s+(push|pull_request|schedule):/m);
  assert.match(verify, /github\.repository == 'microsoft\/coreai-design-system'/);
  assert.match(verify, /github\.ref == 'refs\/heads\/main'/);
  assert.match(verify, /environment: azure-production/);
  assert.match(verify, /id-token: write/);
  assert.match(verify, /uses: azure\/login@/);
  assert.match(verify, /run: node \.github\/workflows\/scripts\/check-hosting-auth\.mjs/);
  assert.match(verify, /az webapp show/);
  assert.doesNotMatch(
    verify,
    /npm (ci|install|publish)|az (deployment|role|ad)|az webapp deploy|ENABLE_AZURE_DEPLOY|secrets\./,
  );
});

for (const job of ['validate', 'deploy']) {
  test(`${job} requires main and site-deployment approval, independently of npm release approval`, () => {
    const condition = deploy.match(
      new RegExp(`^  ${job}:\\n(?:    [^\\n]+\\n)*?    if: >-\\n((?:      [^\\n]+\\n)+)`, 'm'),
    )?.[1];
    assert.ok(condition, `Missing ${job} condition`);
    assert.equal(
      condition.trim().replace(/\s+/g, ' '),
      "github.repository == 'microsoft/coreai-design-system' && " +
        "github.ref == 'refs/heads/main' && vars.ENABLE_AZURE_DEPLOY == 'true'",
    );
  });
}

test('site deployment retains CI, environment approval, OIDC, and before/after auth checks', () => {
  assert.match(deploy, /needs: validate/);
  assert.match(deploy, /environment: azure-production/);
  assert.match(deploy, /id-token: write/);
  assert.equal(
    deploy.match(/run: node \.github\/workflows\/scripts\/check-hosting-auth\.mjs/g)?.length,
    2,
  );
  assert.doesNotMatch(deploy, /npm publish|NPM_TOKEN|publish-package\.yml/);
});

test('npm publication retains its separate release approvals and manual confirmation', () => {
  assert.match(publish, /vars\.OSS_RELEASE_APPROVED == 'true'/);
  assert.match(publish, /vars\.NPM_PUBLISH_ENABLED == 'true'/);
  assert.match(publish, /workflow_dispatch:/);
  assert.match(publish, /environment: npm-production/);
  assert.match(publish, /process\.env\.CONFIRMATION/);
});
