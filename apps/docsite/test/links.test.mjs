import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import { URL } from 'node:url';

const repoRoot = new URL('../../../', import.meta.url);

async function read(path) {
  return fs.readFile(new URL(path, repoRoot), 'utf8');
}

test('docsite destinations follow the repository README', async () => {
  const [
    readme,
    packageReadme,
    agentSkill,
    links,
    resources,
    faqs,
    packagePage,
    mcpPage,
    skillPage,
    homePage,
  ] = await Promise.all([
    read('README.md'),
    read('packages/react-components/README.md'),
    read('packages/react-components/agent/SKILL.md'),
    read('shared/site-links.ts'),
    read('apps/docsite/src/data/resources.ts'),
    read('apps/docsite/src/data/faqs.ts'),
    read('apps/docsite/src/pages/Package.tsx'),
    read('apps/docsite/src/pages/McpServer.tsx'),
    read('apps/docsite/src/pages/CoreAISkill.tsx'),
    read('apps/docsite/src/pages/Introduction.tsx'),
  ]);
  const skillName = agentSkill.match(/^name: ([^\r\n]+)$/m)?.[1];
  assert.ok(skillName, 'The package skill must declare a frontmatter name.');

  assert.match(readme, /https:\/\/github\.com\/microsoft\/coreai-design-system/);
  assert.match(readme, /Public access and npm publication are pending approval/);
  assert.match(readme, /https:\/\/coreai-ds-storybook\.azurewebsites\.net\s+\|/);

  assert.match(links, /const repo = 'https:\/\/github\.com\/microsoft\/coreai-design-system'/);
  assert.match(links, /const storybook = 'https:\/\/coreai-ds-storybook\.azurewebsites\.net\/'/);
  assert.doesNotMatch(links, /components-accordion--default/);
  assert.match(
    links,
    /packageReadme: `\$\{repo\}\/blob\/main\/packages\/react-components\/README\.md`/,
  );
  assert.match(
    links,
    /changelog: `\$\{repo\}\/blob\/main\/packages\/react-components\/CHANGELOG\.md`/,
  );

  assert.match(resources, /href: siteLinks\.repo/);
  assert.match(resources, /Public publication is pending open-source approval/);
  assert.match(resources, /title: 'Issues and support'/);
  assert.match(faqs, /Public npm publication is pending open-source approval/);
  assert.match(faqs, /href: siteLinks\.storybookDocs\.mcpSetup/);
  assert.match(faqs, /href: `\$\{siteLinks\.repo\}\/blob\/main\/README\.md`/);
  assert.match(faqs, /href: `\$\{siteLinks\.repo\}\/blob\/main\/CONTRIBUTING\.md`/);
  assert.match(faqs, /label: 'Open a GitHub issue', href: siteLinks\.feedback/);
  assert.doesNotMatch(faqs, /CoreAI DS Community/);

  assert.match(
    packagePage,
    /const installPackages = `npm install @coreai-ds\/react-components\nnpm install @fluentui\/react-components @fluentui\/react-icons # peer dependencies as needed`/,
  );
  assert.doesNotMatch(packagePage, /--registry=https:\/\/registry\.npmjs\.org/);
  assert.doesNotMatch(
    packagePage,
    /const usageExample = `import '@coreai-ds\/react-components\/fonts\/fonts\.css'/,
  );
  assert.match(packagePage, /you can optionally load/);
  assert.match(packagePage, />\s*View package README\s*</);
  assert.match(mcpPage, /"url": "\$\{siteLinks\.mcp\}"/);
  assert.doesNotMatch(mcpPage, /coreai-ds-storybook\.azurewebsites\.net/);
  assert.match(skillPage, new RegExp(`\\.github/skills/${skillName}/SKILL\\.md`));
  assert.match(packageReadme, new RegExp(`\\.github/skills/${skillName}/SKILL\\.md`));
  assert.match(packageReadme, new RegExp(`\\.claude/skills/${skillName}/SKILL\\.md`));
  assert.match(homePage, /<span>npm \(pending\)<\/span>/);
  assert.match(
    packageReadme,
    /\.\.\/\.\.\/apps\/storybook\/src\/stories\/docs\/StylingWithCssModules\.mdx/,
  );
  assert.doesNotMatch(
    packageReadme,
    /\.\.\/\.\.\/apps\/storybook\/src\/stories\/StylingWithCssModules\.mdx/,
  );
});
