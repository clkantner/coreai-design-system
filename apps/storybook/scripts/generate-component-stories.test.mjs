import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { loadCsf } from 'storybook/internal/csf-tools';
import { createStoryInventory } from './story-inventory.mjs';
import { generateComponentIndex, generateComponentStories } from './generate-component-stories.mjs';
import { componentMetadata, storyWithMetadata } from './story-metadata.mjs';

test('each generated component owns exactly its selected canonical stories', async () => {
  const inventory = await createStoryInventory();
  for (const component of inventory.components) {
    const source = generateComponentIndex(component);
    const csf = loadCsf(source, {
      fileName: `${component.id}.stories.js`,
      makeTitle: (title) => title,
    }).parse();
    assert.equal(csf.meta.title, component.title);
    assert.deepEqual(
      csf.stories.map((story) => story.id).sort(),
      component.stories.map((story) => story.id).sort(),
    );
    assert.ok(
      !source.includes('export { Default }'),
      'Definitions must carry source-specific metadata',
    );
  }
  const accordion = inventory.components.find(
    (component) => component.id === 'components-accordion',
  );
  const source = generateComponentIndex(accordion);
  assert.ok(source.includes('src/stories/components/Accordion.stories.tsx'));
  assert.ok(source.includes('fluent-stories/packages/react-components/react-accordion'));
  assert.match(source, /component: __CoreAI_Accordion/);
  assert.match(source, /subcomponents:/);
});

test('source metadata stays per story, with original functions and nested parameters preserved', () => {
  const render = () => null;
  render.args = { count: 3 };
  const decorator = () => null;
  const loader = () => null;
  const meta = {
    title: 'Test',
    component: render,
    args: { count: 1, label: 'base' },
    decorators: [decorator],
    loaders: [loader],
    parameters: { design: { url: 'figma' }, docs: { description: { component: 'base' } } },
  };
  const story = storyWithMetadata(meta, render, 'test--default');
  assert.equal(story.render, render);
  assert.deepEqual(story.args, { count: 3, label: 'base' });
  assert.deepEqual(story.decorators, [decorator]);
  assert.deepEqual(story.loaders, [loader]);
  assert.equal(story.parameters.design.url, 'figma');
  assert.equal(story.parameters.__id, 'test--default');
  const objectStory = storyWithMetadata(
    meta,
    { render, parameters: { docs: { description: { story: 'variant' } } } },
    'test--variant',
  );
  assert.deepEqual(objectStory.parameters.docs.description, {
    component: 'base',
    story: 'variant',
  });
  const combined = componentMetadata([
    meta,
    { component: render, parameters: { design: 'local' } },
  ]);
  assert.equal(combined.component, render);
  assert.equal(combined.decorators, undefined);
  assert.equal(combined.parameters, undefined);
});

test('regeneration is deterministic and removes only stale generated story files', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coreai-generated-indexes-'));
  try {
    await fs.writeFile(path.join(dir, 'removed.stories.js'), 'stale');
    await fs.writeFile(path.join(dir, 'keep.txt'), 'keep');
    const inventory = await generateComponentStories({ outputRoot: dir });
    const file = path.join(dir, `${inventory.components[0].id}.stories.js`);
    const before = await fs.readFile(file, 'utf8');
    await generateComponentStories({ outputRoot: dir });
    assert.equal(await fs.readFile(file, 'utf8'), before);
    assert.equal(await fs.readFile(path.join(dir, 'keep.txt'), 'utf8'), 'keep');
    await assert.rejects(fs.access(path.join(dir, 'removed.stories.js')), { code: 'ENOENT' });
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
