import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';
import { createStoryInventory } from './story-inventory.mjs';

export const appRoot = fileURLToPath(new URL('../', import.meta.url));
export const generatedRoot = path.join(appRoot, '.storybook', '.cache', 'component-stories');

function importPath(from, target) {
  const relative = path.relative(from, target).split(path.sep).join('/');
  return relative.startsWith('.') ? relative : `./${relative}`;
}

function componentBindings(component) {
  const owner = [...component.sources].reverse().find((source) => source.metadata.component);
  if (!owner) return { imports: [], properties: [] };
  const expressions = {
    component: owner.metadata.component,
    subcomponents: owner.metadata.subcomponents,
  };
  const imports = new Map();
  for (const expression of Object.values(expressions)) {
    if (!expression) continue;
    const ast = ts.createSourceFile(
      'metadata.ts',
      `const value = ${expression};`,
      ts.ScriptTarget.Latest,
      true,
    );
    const names = new Set();
    function collect(node) {
      if (ts.isIdentifier(node)) names.add(node.text);
      ts.forEachChild(node, collect);
    }
    collect(ast);
    for (const item of owner.imports) {
      const parsed = ts.createSourceFile('import.ts', item.source, ts.ScriptTarget.Latest, true);
      const clause = parsed.statements[0].importClause;
      if (!clause?.namedBindings || !ts.isNamedImports(clause.namedBindings)) continue;
      for (const binding of clause.namedBindings.elements) {
        if (!names.has(binding.name.text)) continue;
        if (
          !['@fluentui/react-components', '@coreai-ds/react-components'].includes(item.specifier)
        ) {
          throw new Error(
            `Unsupported component metadata import in ${owner.sourceFile}: ${item.specifier}`,
          );
        }
        imports.set(
          binding.name.text,
          `${binding.propertyName?.text ?? binding.name.text} as __CoreAI_${binding.name.text}`,
        );
      }
    }
  }
  if (!imports.has(owner.metadata.component)) {
    throw new Error(
      `Cannot resolve component metadata for ${component.id}: ${owner.metadata.component}`,
    );
  }
  return {
    imports: [`import { ${[...imports.values()].join(', ')} } from '@coreai-ds/react-components';`],
    properties: Object.entries(expressions)
      .filter(([, value]) => value)
      .map(([key, value]) => {
        const ast = ts.createSourceFile(
          'expression.ts',
          `const expression = ${value};`,
          ts.ScriptTarget.Latest,
          true,
        );
        const expression = ast.statements[0].declarationList.declarations[0].initializer;
        const transformed = ts.transform(expression, [
          (context) => {
            const visit = (node) => {
              if (ts.isShorthandPropertyAssignment(node) && imports.has(node.name.text)) {
                return ts.factory.createPropertyAssignment(
                  node.name.text,
                  ts.factory.createIdentifier(`__CoreAI_${node.name.text}`),
                );
              }
              if (ts.isIdentifier(node) && imports.has(node.text)) {
                return ts.factory.createIdentifier(`__CoreAI_${node.text}`);
              }
              return ts.visitEachChild(node, visit, context);
            };
            return (node) => ts.visitNode(node, visit);
          },
        ]);
        try {
          return `${key}: ${ts.createPrinter().printNode(ts.EmitHint.Expression, transformed.transformed[0], ast)}`;
        } finally {
          transformed.dispose();
        }
      }),
  };
}

export function generateComponentIndex(
  component,
  { root = appRoot, outputRoot = generatedRoot } = {},
) {
  const bindings = componentBindings(component);
  const lines = [
    '// Generated from the shared source inventory; do not edit.',
    ...bindings.imports,
    `import { componentMetadata, storyWithMetadata } from ${JSON.stringify(importPath(outputRoot, path.join(root, 'scripts', 'story-metadata.mjs')))};`,
  ];
  const sourceNames = new Map();
  component.sources.forEach((source, index) => {
    const name = `source${index}`;
    sourceNames.set(source.sourceFile, name);
    lines.push(
      `import ${name} from ${JSON.stringify(importPath(outputRoot, path.join(root, source.sourceFile)))};`,
    );
  });
  component.stories.forEach((story, index) => {
    lines.push(
      `import { ${story.exportName} as story${index} } from ${JSON.stringify(importPath(outputRoot, path.join(root, story.sourceFile)))};`,
    );
  });
  lines.push(
    `const meta = { ...componentMetadata([${[...sourceNames.values()].join(', ')}]), title: ${JSON.stringify(component.title)}, id: ${JSON.stringify(component.id)}, ${bindings.properties.join(', ')} };`,
  );
  lines.push('export default meta;');
  component.stories.forEach((story, index) => {
    lines.push(
      `export const ${story.exportName} = storyWithMetadata(${sourceNames.get(story.sourceFile)}, story${index}, ${JSON.stringify(story.id)});`,
    );
  });
  return `${lines.join('\n')}\n`;
}

export async function generateComponentStories({
  root = appRoot,
  outputRoot = generatedRoot,
} = {}) {
  const inventory = await createStoryInventory({ root });
  const outputs = inventory.components.map((component) => [
    `${component.id}.stories.js`,
    generateComponentIndex(component, { root, outputRoot }),
  ]);
  await fs.mkdir(outputRoot, { recursive: true });
  const expected = new Set(outputs.map(([name]) => name));
  for (const file of await fs.readdir(outputRoot)) {
    if (file.endsWith('.stories.js') && !expected.has(file)) {
      await fs.unlink(path.join(outputRoot, file));
    }
  }
  for (const [file, content] of outputs) await fs.writeFile(path.join(outputRoot, file), content);
  await fs.writeFile(
    path.join(outputRoot, 'inventory.json'),
    `${JSON.stringify(inventory, null, 2)}\n`,
  );
  return inventory;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const inventory = await generateComponentStories();
  console.log(`Generated ${inventory.components.length} component indexes in ${generatedRoot}`);
}
