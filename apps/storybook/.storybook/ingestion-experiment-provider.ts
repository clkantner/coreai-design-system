import { readFile } from 'node:fs/promises';
import type { StoryDocsProvider } from 'storybook/internal/types';
import { storyNameFromExport, toId } from 'storybook/internal/csf';

const experiments = new Map([
  [
    'Experiments/MCP/Provider Accordion',
    [
      ['Default', 'react-accordion/stories/src/Accordion/AccordionDefault.stories.tsx'],
      ['Controlled', 'react-accordion/stories/src/Accordion/AccordionControlled.stories.tsx'],
    ],
  ],
  [
    'Experiments/MCP/Provider Button',
    [['Appearance', 'react-button/stories/src/Button/ButtonAppearance.stories.tsx']],
  ],
  [
    'Experiments/MCP/Provider DataGrid',
    [['Default', 'react-table/stories/src/DataGrid/Default.stories.tsx']],
  ],
]);

// Deliberately limited to experiment titles; production entries use the built-in provider.
export const ingestionExperimentProvider = (
  nextStoryDocs: StoryDocsProvider | undefined,
): StoryDocsProvider => {
  if (!nextStoryDocs) {
    throw new Error('The ingestion experiment requires the built-in story-docs provider');
  }
  return async (input) => {
    const sources = experiments.get(input.entry.title);
    if (!sources) {
      return nextStoryDocs(input);
    }

    const payload = await nextStoryDocs(input);
    if (!payload) {
      throw new Error(`Missing built-in story-docs payload for ${input.entry.title}`);
    }

    const stories = await Promise.all(
      sources.map(async ([exportName, sourcePath]) => {
        const id = toId(input.entry.title, storyNameFromExport(exportName));
        const source = await readFile(
          new URL(`../fluent-stories/packages/react-components/${sourcePath}`, import.meta.url),
          'utf8',
        );
        return [
          id,
          {
            id,
            name: storyNameFromExport(exportName),
            snippet: source.replace(/@fluentui\/react-components/g, '@coreai-ds/react-components'),
          },
        ] as const;
      }),
    );

    return {
      id: payload.id,
      name: payload.name,
      path: payload.path,
      stories: Object.fromEntries(stories),
    };
  };
};
