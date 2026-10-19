---
id: setup
title: Use these examples
summary: Provider setup, dependencies, source downloads, and template usage.
resources: []
reference: {}
---

This staged static documentation site combines existing CoreAI guidance with
the supported Fluent and CoreAI example catalog. Foundations and standalone
guidance pages are still being migrated.

## Run an example

1. Use a React application with TypeScript and a bundler, such as Vite.
2. Install the packages listed below.
3. Download an example's TSX source and save it as `Example.tsx`.
4. Save the provider setup below as `App.tsx`.
5. Render `App` from your application's normal React entry point.

Every example has a default export. The live preview executes the same generated
TSX that the page displays and the Markdown document includes.

The provider supplies CoreAI defaults, styles, and theme tokens. The package
font stylesheet supplies font stacks, not licensed font binaries. Applications
that use custom fonts must supply those fonts separately.

## Templates

Template components are not npm exports. Download their source into your app
and adapt it. The template page supplies both a complete example and the original
component source. Product-specific actions and navigation remain your app's
responsibility.

## Read without a browser

Each human page has a matching Markdown file. For example, replace
`components/button/` with `components/button.md`, preserving the site's base path.
Start at `llms.txt` to find pages and version information. Reading the Markdown
does not require JavaScript, Storybook, or MCP.

## Reference boundaries

These are fixed examples, not Storybook controls or an editable playground.
Native React interactions still work. Complex Storybook setup is not emulated.
The coverage report accounts for every selected example and CoreAI replacement.
Some pages explicitly omit Storybook-only layout decorators. List previews run
one at a time because their selection values become DOM IDs. Other pages show
their examples together.

The component pages retain existing authored guidance. Some upstream examples
illustrate API capabilities rather than recommended product design. CoreAI
guidance takes precedence; an example is not permission to ignore that guidance.

## Packages used by this build

This is the union of dependencies used by the catalog. A consuming app only
needs the dependencies required by its selected examples and package peers.

<!-- generated: install -->

## Provider setup: App.tsx

<!-- generated: provider -->
