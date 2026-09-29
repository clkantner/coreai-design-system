import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const indexPath = path.join(root, 'storybook-static', 'index.json');

if (!fs.existsSync(indexPath)) {
  throw new Error(`Storybook index is missing: ${indexPath}`);
}

let index;
try {
  index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
} catch (error) {
  throw new Error(`Storybook index is not valid JSON: ${indexPath}`, { cause: error });
}

if (!index || typeof index.entries !== 'object' || Array.isArray(index.entries)) {
  throw new Error(`Storybook index has no valid entries object: ${indexPath}`);
}

const entries = Object.values(index.entries);
const normalizedImportPaths = entries.map((entry) => entry.importPath?.replaceAll('\\', '/') ?? '');

const requiredSources = [
  {
    label: 'canonical Fluent stories',
    present: normalizedImportPaths.some((importPath) => importPath.includes('/fluent-stories/')),
  },
  {
    label: 'generated template documentation',
    present: normalizedImportPaths.some(
      (importPath) => importPath.includes('/src/stories/templates/') && importPath.endsWith('.mdx'),
    ),
  },
  {
    label: 'generated Agent Skill documentation',
    present: normalizedImportPaths.some((importPath) =>
      importPath.endsWith('/docs/AgentSkill.mdx'),
    ),
  },
];

const missingSources = requiredSources.filter(({ present }) => !present).map(({ label }) => label);
if (missingSources.length > 0) {
  throw new Error(`Storybook build is missing required content: ${missingSources.join(', ')}`);
}

const fluentStoryCount = normalizedImportPaths.filter((importPath) =>
  importPath.includes('/fluent-stories/'),
).length;
console.log(`Verified Storybook build with ${fluentStoryCount} canonical Fluent story entries.`);
