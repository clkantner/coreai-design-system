---
id: faqs
title: FAQs
summary: 'Answers about CoreAI, Fluent, setup, components, and agents.'
resources: []
reference:
  route: overview/faqs
  aliases:
    - /faqs/
  migratedFrom:
    - apps/docsite/src/data/faqs.ts
---

## About CoreAI

### How is CoreAI different from Fluent?

CoreAI builds on Fluent UI v9. It adds a shared visual language, themes, and component defaults, such as circular buttons and filled cards. Components without CoreAI changes pass through from Fluent.

Use the Variations from Fluent guide to check differences before copying a Fluent example.

- [Variations from Fluent](https://coreai-ds-storybook.azurewebsites.net/?path=/docs/docs-variations-from-fluent--docs)

### Why does CoreAI have a shared design system?

CoreAI gives teams one Fluent UI v9 design system for shared components, themes, guidance, and tools. This helps apps stay consistent without each team maintaining its own version of the same patterns.

### What is the difference between components, templates, and samples?

Components are reusable controls maintained in the npm package.

Templates are larger starting points that you copy into your project and maintain yourself. They are not package imports.

Samples show how components work together in a form, layout, or workflow.

## Getting started

### How do I install the npm package?

Install @coreai-ds/react-components from npm, then follow the package README for provider, font, and usage guidance.

- [View the npm package](https://www.npmjs.com/package/@coreai-ds/react-components)
- [Package README](https://github.com/microsoft/coreai-design-system/blob/main/packages/react-components/README.md)

### Why does my app still look like stock Fluent?

Import components from @coreai-ds/react-components instead of @fluentui/react-components, then wrap the app in CoreAIFluentProvider. Icons can still come from @fluentui/react-icons.

Check that withComponentDefaults has not been set to false. The optional fonts.css import only registers Aptos fonts already installed on the device. The theming guide covers the provider, fonts, and defaults.

- [Theming](https://coreai-ds-storybook.azurewebsites.net/?path=/docs/docs-theming--docs)

## Using components

### Does a Figma preview mean the component is available in code?

No. Some pages show a Figma preview because a code component is not available. Check the component documentation and page resources before assuming it is part of the package.

### Can I change the theme or customize a component?

Yes. CoreAI supports light and dark themes, Azure themes, and custom brand colors through its theme factories.

For individual components, start with documented props and design tokens. Preserve the existing behavior and accessibility. The theming guide covers theme setup.

- [Theming](https://coreai-ds-storybook.azurewebsites.net/?path=/docs/docs-theming--docs)

## Working with agents

### What does my coding agent need to use CoreAI?

Install the package to build an application. Agents can read the same UX guidance and complete examples as people through this site’s Markdown endpoints. MCP is not required for read-only documentation.

Start with the remote discovery index, check package versions, and follow the agent workflow. The packaged skill and MCP setup remain optional compatibility resources during this migration.

- [Agent workflow](/guides/agent-workflow.md)

### How can I give my agent the guidance on a component page?

Use View as Markdown on a page, or replace its trailing slash with .md. Preserve the deployment base path. Share that URL with the agent; it contains the same guidance and example source as the human page.

### What if the documentation server will not connect?

Check the endpoint URL and your network connection against the MCP setup guide.

If the server is unavailable, have your agent use the installed package README, changelog, and skill, and state that it cannot access live docs. Report persistent connection problems through GitHub issues.

- [MCP setup](https://coreai-ds-storybook.azurewebsites.net/?path=/docs/docs-mcp-setup--docs)

## Help and feedback

### How do I give feedback or contribute?

Use GitHub Issues to report a bug, request a component or pattern, or ask a usage question. Search existing issues first, then include what you need and a small example.

Contributions can include guidance and design ideas as well as code. Do not report security vulnerabilities through a public issue; follow the private instructions in SECURITY.md.

- [Open a GitHub issue](https://github.com/microsoft/coreai-design-system/issues/new)
- [Browse GitHub issues](https://github.com/microsoft/coreai-design-system/issues)
