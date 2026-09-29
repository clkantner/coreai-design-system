---
name: write-story
description: >
  Write or update CoreAI Design System Storybook stories. Use when asked to
  create, add, edit, migrate, or review a story under apps/storybook, including
  component stories, template stories, CSF3 StoryObj examples, JSDoc for MCP,
  and MCP-visible code snippets. ALWAYS read apps/storybook/README.md first.
---

# Writing a Storybook story

Before writing or updating a story, read
[apps/storybook/README.md](../../../apps/storybook/README.md). It is the source
of truth for story ownership, CSF3 format, MCP-visible examples, JSDoc,
dev-only stories, and templates. Follow the relevant sections exactly.

## Required workflow

1. Read **MCP for AI agents**, especially **How stories reach the agent-facing
   manifest** and **Curating descriptions & summaries**.
2. Read **Component story layout** and, when applicable, **Dev-only stories**
   or **Creating a template**.
3. Keep every MCP-facing example wholly contained in that story's `render`
   function. Do not reference module-level example helpers, constants, hooks,
   or styles that would be missing from the synthesized MCP snippet.
4. Author public stories as CSF3 `StoryObj` objects. Use JSDoc on the story and
   meta exports for agent-facing descriptions; do not substitute
   `parameters.docs.description`.
5. Do not write behavior tests in StoryObj `play` functions. Put component
   behavior tests in the owning package's colocated `.test.tsx` file; stories
   are documentation and visual examples only.
6. Import CoreAI and Fluent components through `@coreai/fluentui-react` and
   icons through `@fluentui/react-icons`, following the README exceptions.
7. Run `npm --workspace apps/storybook run type-check`. Preview changed
   stories and run the Storybook build when the change affects indexing,
   generated docs, or MCP output.

For a new copy-paste template, also use the
[`create-template` skill](../create-template/SKILL.md); its file layout and
generation workflow are additional requirements.

## Styling MCP-facing stories

This literal CSS pattern applies only to styles authored in `*.stories.tsx`
files. Component files and copy-paste template source files must use `makeStyles`
with `tokens.*` values, following their existing conventions.

When an MCP-facing story demonstrates custom layout or a component's class name
hooks, follow this self-contained pattern:

1. Declare the example data inside the story's `render` function.
2. Declare the styles as a `const styles = /* css */ \`...\`` template literal
   inside `render` but outside the JSX. Pass it to a normal `<style>{styles}</style>`
   element followed by the rendered example. When the example is a single
   component or already has a container, apply the unique `{component}-example`
   class to that element directly. Add a wrapper `div` only when multiple sibling
   components or elements need a shared container.
3. Use unique, BEM-like classes for the elements and component slots the story
   styles. Select those classes directly; do not prefix every selector with the
   root class.
4. In literal CSS, reference Fluent design tokens with CSS custom properties such
   as `var(--spacingVerticalM)` instead of interpolating imported `tokens` values.
   Continue to use `${tokens.tokenName}` in `makeStyles` style objects.
5. Pass classes only through `className` or slot class name props that the
   component actually exposes. Check its public API and do not invent generic
   slot props; component-specific hooks belong only in that component's story.

Keep the data, CSS, and rendered example together in `render` so the synthesized
MCP snippet is complete:

```tsx
export const WithCustomClasses: StoryObj = {
  render: () => {
    const items = [{ key: 'first', label: 'Label', value: 'Value' }];

    const styles = /* css */ `
      .custom-classes-example {
        display: grid;
        padding: var(--spacingVerticalM);
        row-gap: var(--spacingVerticalS);
      }
    `;

    return (
      <>
      <style>{styles}</style>
      <ExampleComponent items={items} className="custom-classes-example" />
      </>
    );
  },
};
```

Do not use the obsolete `<style scoped>` attribute, broad/global selectors, or
module-level style constants, `makeStyles`, or CSS imports that the MCP snippet
cannot include. This is the story-example pattern, not a replacement for a
component's production styling API. Component and copy-paste template source
files continue to use `makeStyles`; template source files follow the README's
single-`useStyles` convention.
