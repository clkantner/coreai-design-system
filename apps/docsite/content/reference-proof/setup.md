# Use these examples

This is a small static documentation proof, not the complete design system site.
It combines existing CoreAI guidance with selected Fluent and CoreAI examples.

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

## Proof boundaries

These are fixed examples, not Storybook controls or an editable playground.
Native React interactions still work. Complex Storybook setup is not emulated.
The coverage report lists examples intentionally outside this proof.

The component pages retain existing authored guidance. Some upstream examples
illustrate API capabilities rather than recommended product design. CoreAI
guidance takes precedence; an example is not permission to ignore that guidance.
