import { readFile } from 'node:fs/promises';
import type { StoryDocsProvider } from 'storybook/internal/types';
import { storyNameFromExport, toId } from 'storybook/internal/csf';
import ts from 'typescript';

const experiments = new Map([
  [
    'Experiments/MCP/Provider Accordion',
    [
      ['Default', 'src/stories/components/Accordion.stories.tsx'],
      [
        'Controlled',
        'fluent-stories/packages/react-components/react-accordion/stories/src/Accordion/AccordionControlled.stories.tsx',
      ],
    ],
  ],
  [
    'Experiments/MCP/Provider Button',
    [
      [
        'Appearance',
        'fluent-stories/packages/react-components/react-button/stories/src/Button/ButtonAppearance.stories.tsx',
      ],
    ],
  ],
  [
    'Experiments/MCP/Provider DataGrid',
    [
      [
        'Default',
        'fluent-stories/packages/react-components/react-table/stories/src/DataGrid/Default.stories.tsx',
      ],
    ],
  ],
]);

function localAccordionDefaultSource(source: string): string {
  const file = ts.createSourceFile('Accordion.stories.tsx', source, ts.ScriptTarget.Latest, true);
  const declaration = file.statements.find(
    (statement): statement is ts.VariableStatement =>
      ts.isVariableStatement(statement) &&
      statement.declarationList.declarations.some(
        (item) => ts.isIdentifier(item.name) && item.name.text === 'Default',
      ),
  );
  if (!declaration) {
    throw new Error('The merged pilot requires a local Accordion Default declaration');
  }
  const references = new Set<string>();
  function collectReferences(node: ts.Node) {
    if (ts.isIdentifier(node)) {
      references.add(node.text);
    }
    ts.forEachChild(node, collectReferences);
  }
  collectReferences(declaration);

  const imports = file.statements.filter((statement): statement is ts.ImportDeclaration => {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) {
      return false;
    }
    if (statement.moduleSpecifier.text === 'react') {
      return true;
    }
    const bindings = statement.importClause?.namedBindings;
    return (
      bindings !== undefined &&
      ts.isNamedImports(bindings) &&
      bindings.elements.some((item) => references.has(item.name.text))
    );
  });
  return `${imports.map((item) => item.getText(file)).join('\n')}\n\n${declaration.getText(file)}\n`;
}

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
        const source = await readFile(new URL(`../${sourcePath}`, import.meta.url), 'utf8');
        const isLocal = sourcePath === 'src/stories/components/Accordion.stories.tsx';
        const snippet = isLocal ? localAccordionDefaultSource(source) : source;
        return [
          id,
          {
            id,
            name: storyNameFromExport(exportName),
            description: `Source: ${isLocal ? 'local CoreAI override' : 'Fluent upstream'} - ${sourcePath}`,
            snippet: snippet.replace(/@fluentui\/react-components/g, '@coreai-ds/react-components'),
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
