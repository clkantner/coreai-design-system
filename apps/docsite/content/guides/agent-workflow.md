---
id: agent-workflow
title: Agent workflow
summary: Read CoreAI UX guidance and implementation examples over ordinary HTTP.
resources: []
reference: {}
---

## Read the same content as people

1. Start at the site's `llms.txt` discovery index.
2. Check the documented CoreAI and Fluent versions against the consuming app.
3. Select a page by its purpose, not only its component name.
4. Replace the human page's trailing slash with `.md` to read its Markdown.
   Preserve the site's deployment base path.
5. Read the UX guidance and relevant examples before choosing props or patterns.
6. Verify generated code in the consuming app.

MCP, a running Storybook, and browser JavaScript are not required to read these
documents. Do not invent undocumented APIs. Report missing guidance or APIs
instead of presenting a guess as documented behavior.

## Follow CoreAI guidance

CoreAI guidance takes precedence over upstream API demonstrations. An example
shows a supported capability; it does not override the page's do's and don'ts.
Use the CoreAI package for wrapped components and tokens. Preserve keyboard
behavior, accessible names, focus visibility, responsive behavior, and both themes.

## Copy templates into the app

Templates are not npm exports. Download every source file listed on the template
page, install the listed dependencies, and adapt the component in the consuming
repository. Inspect existing local adapters before adding another composition.

## Keep the local skill small

A local skill only needs to identify the documentation site, discovery index,
URL convention, and version check. Keep component rules on the remotely updated
site rather than copying them into agent configuration.

The [packaged skill](./package-skill.md) and [MCP setup](./mcp-setup.md) are
compatibility references for existing clients. They are not prerequisites for
this HTTP workflow.

## When documentation is unavailable

State what could not be retrieved. Use the installed package README, TypeScript
declarations, and changelog as explicit fallbacks. Do not claim that an API was
verified against the live documentation when it was not.
