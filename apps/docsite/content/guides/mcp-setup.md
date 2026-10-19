---
id: mcp-setup
title: MCP setup (optional compatibility)
summary: Client setup for the hosted CoreAI component-docs MCP server.
resources: []
reference:
  legacyIds: [docs-mcp-setup--docs]
  route: guides/mcp-setup
  aliases:
    - /mcp-server/
  migratedFrom:
    - apps/docsite/src/pages/McpServer.tsx
    - apps/storybook/src/stories/docs/MCPSetup.mdx
---

> This optional guide preserves the existing MCP integration. Reading this documentation site does not require MCP. Start with the [HTTP agent workflow](/guides/agent-workflow.md). Hosting retirement is a separate step; this migration does not verify or change the legacy endpoint.

CoreAI ships a **Model Context Protocol (MCP)** server so AI agents (VS Code Copilot, Copilot
CLI, and other MCP-aware clients) read accurate, CoreAI-specific component knowledge — props,
example stories, templates — instead of guessing prop names or reaching for the raw upstream
`@fluentui/react-components` API.

## Servers

- **`coreai-ds-docs`** — `https://coreai-ds-storybook.azurewebsites.net/mcp` — **Primary.**
  Existing hosted CoreAI component docs (props, stories, templates).

Connect using an `http`-type MCP client. Authentication: none.
The catalog combines selected Fluent stories with CoreAI stories and overrides.

> Connection setup only — for agent behavior see [Agent Skill](?path=/docs/docs-agent-skill--docs)
> (`agent/SKILL.md` in the package).

## `mcp.json`

Add the server to your MCP client config (VS Code: `.vscode/mcp.json`; Copilot CLI:
`~/.copilot/mcp-config.json`):

```json
{
  "servers": {
    // CoreAI Design System MCP
    "coreai-ds-docs": {
      "type": "http",
      "url": "https://coreai-ds-storybook.azurewebsites.net/mcp"
    }
  },
  "inputs": []
}
```

Just the `url` — no headers, secrets, or token setup.

## Toolsets

### Client setup surfaces

- **VS Code:** create or update `.vscode/mcp.json` with the configuration above.
  Start the configured server and confirm the documentation tools are available.
- **Copilot CLI:** run `/mcp add`, choose HTTP, and enter the server name and URL
  above. Run `/mcp show` to confirm the connection.
- **Copilot App:** open **Customize > Add > MCP Server**, choose HTTP, enter the
  server name and URL, and select **Add Server**. Start an agent session and
  confirm the documentation tools are available.

Review the configuration and its destination before asking an agent to change
client settings. Do not add headers, API keys, or bearer tokens.

`coreai-ds-docs` exposes:

- `docs-list` — enumerate every component and standalone docs entry, optionally with story IDs.
- `docs-show` — full docs for one component: prop types, initial examples, and its story index.
- `docs-show-story` — complete docs for a single named story variant.

## Scope, safety, and data handling

### Read-only documentation

All three tools return design-system documentation and examples. The server does not
read your project files, access customer resources, execute examples, or change data. It does
not host an AI model. Your MCP client, agent, or model decides how to use the responses and
may have capabilities beyond this server.

The catalog covers selected Fluent stories, CoreAI overrides, and local examples, not every
upstream story or API. Documentation and generated examples can be incomplete or incorrect.
Review and test returned code for correctness, accessibility, security, and applicable licenses
before using it. Report missing or incorrect documentation through
[GitHub issues](https://github.com/microsoft/coreai-design-system/issues).

### Connection and data handling

The hosted endpoint uses HTTPS and accepts MCP requests without credentials. Requests contain
tool names and arguments, such as component or story IDs. Do not include secrets, access tokens,
personal information, or confidential project content in those arguments; the tools do not need it.

The application does not collect product-usage telemetry or intentionally log request bodies.
The host logs server failures. Azure hosting and your chosen MCP client or model may process
connection metadata or use their own logging and data-handling policies. No application telemetry
does not mean that no data reaches the hosting platform. See the
[Microsoft Privacy Statement](https://privacy.microsoft.com/privacystatement) and your client's
privacy documentation. Do not assume processing stays in your region.

### Client safety and licensing

Review the security and permissions of your MCP client, agent, and model before connecting.
Use only the capabilities your workflow needs, review proposed code changes, and follow your
organization's security and data-handling requirements. See
[MCP security best practices](https://modelcontextprotocol.io/specification/draft/basic/security_best_practices).

See [Legal](https://github.com/microsoft/coreai-design-system#legal) for the source-code license,
hosted MCP terms of use, privacy statement, and third-party notices. You are responsible for
ensuring your client integration meets your organization's compliance requirements.

Report security vulnerabilities privately using
[SECURITY.md](https://github.com/microsoft/coreai-design-system/blob/main/SECURITY.md), not through
public issues.
