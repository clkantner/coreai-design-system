import * as React from 'react';
import { CodeBlock, CopyButton } from '@coreai/fluentui-react';
import {
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  MessageBarTitle,
} from '@coreai/fluentui-react';
import { Tab, TabList, type SelectTabData, type SelectTabEvent } from '@coreai/fluentui-react';
import { Text } from '@coreai/fluentui-react';
import { PageLayout } from '../components/PageLayout';

const vscodeConfig = `{
  "servers": {
    // Official Fluent Docs MCP - requires Microsoft Entra OAuth signin
    // Documentation: https://chat.fluentui.dev/mcp.html & Demo: https://chat.fluentui.dev/
    "fluent-agent": {
      "type": "http",
      "url": "https://chat.fluentui.dev/mcp/server/"
    },

    // CoreAI Design System MCP - requires Microsoft Entra OAuth signin
    "coreai-ds-docs": {
      "type": "http",
      "url": "https://coreai-ds-storybook.azurewebsites.net/mcp"
    }
  },
  "inputs": []
}`;

const serverDetails = `Name: fluent-agent
Type: http
URL: https://chat.fluentui.dev/mcp/server/
Authentication: Microsoft Entra sign-in, in your browser

Name: coreai-ds-docs
Type: http
URL: https://coreai-ds-storybook.azurewebsites.net/mcp
Authentication: Microsoft Entra sign-in, in your browser

Headers: none for either server`;

const copilotAppServerDetails = `Add Server 1
Name: fluent-agent
Type: HTTP
URL: https://chat.fluentui.dev/mcp/server/

Add Server 2
Name: coreai-ds-docs
Type: HTTP
URL: https://coreai-ds-storybook.azurewebsites.net/mcp`;

const clients = {
  vscode: {
    label: 'VS Code',
    location: '.vscode/mcp.json',
    stepTitle: 'Open .vscode/mcp.json',
    setup:
      'Create or update the workspace MCP configuration. This keeps the server available to everyone using the repository.',
    config: vscodeConfig,
    language: 'json',
    verify:
      'Start an agent session. VS Code starts the configured MCP servers and opens a Microsoft sign-in in your browser.',
  },
  copilot: {
    label: 'Copilot CLI',
    location: 'Copilot CLI /mcp add flow',
    stepTitle: 'Run /mcp add',
    setup:
      'Enter /mcp add inside Copilot CLI for each server, choose the HTTP server type, then provide the connection details below.',
    config: serverDetails,
    language: 'text',
    verify:
      'Start an agent session, then run /mcp show. Each server opens a Microsoft sign-in in your browser.',
  },
  copilotApp: {
    label: 'Copilot App',
    location: 'Customize > Add > MCP Server',
    stepTitle: 'Open the MCP Server form',
    setup:
      'In the left sidebar, open Customize. In the top-right corner, select Add, then choose MCP Server from the dropdown.',
    config: copilotAppServerDetails,
    language: 'text',
    verify:
      'Select Add Server after entering each server. When an agent session starts, each server opens a Microsoft sign-in in your browser.',
  },
} as const;

type ClientId = keyof typeof clients;

export function McpServer() {
  const [clientId, setClientId] = React.useState<ClientId>('vscode');
  const client = clients[clientId];
  const setupPrompt = `Set up the CoreAI and Fluent MCP servers in ${client.label}.

Use this location or setup surface: ${client.location}

${client.setup}

Configuration:
${client.config}

Do not add headers, API keys, or bearer tokens. ${client.verify}`;

  const onClientSelect = (_event: SelectTabEvent, data: SelectTabData) => {
    setClientId(data.value as ClientId);
  };

  return (
    <PageLayout id="mcp-server">
      <div className="mcp-guide">
        <section className="mcp-section">
          <TabList
            className="mcp-client-tabs"
            appearance="elevated"
            selectedValue={clientId}
            onTabSelect={onClientSelect}
          >
            {Object.entries(clients).map(([id, entry]) => (
              <Tab key={id} value={id}>
                {entry.label}
              </Tab>
            ))}
          </TabList>

          <MessageBar intent="brand" layout="multiline" icon={null}>
            <MessageBarBody>
              <MessageBarTitle>Let your agent handle setup.</MessageBarTitle>
              Copy a prompt tailored to the selected MCP client.
            </MessageBarBody>
            <MessageBarActions
              containerAction={
                <CopyButton
                  aria-label={`Copy ${client.label} setup prompt`}
                  contentToCopy={setupPrompt}
                />
              }
            />
          </MessageBar>

          <div className="package-install">
            <div className="package-step">
              <span className="package-step__number">1</span>
              <div className="package-step__content">
                <Text as="h3" weight="semibold">
                  {client.stepTitle}
                </Text>
                <Text as="p" size={300} foreground={2}>
                  {client.setup}
                </Text>
              </div>
            </div>

            <div className="package-step">
              <span className="package-step__number">2</span>
              <div className="package-step__content">
                <Text as="h3" weight="semibold">
                  Add both MCP servers
                </Text>
                <Text as="p" size={300} foreground={2}>
                  Add both the CoreAI server and the upstream Fluent fallback using the
                  configuration format expected by {client.label}.
                </Text>
                <CodeBlock
                  code={client.config}
                  language={client.language}
                  header={
                    clientId === 'vscode' ? (
                      <Text preset="heading6" foreground={3}>
                        .vscode/mcp.json
                      </Text>
                    ) : undefined
                  }
                  headerAppearance="subtle"
                />
              </div>
            </div>

            <div className="package-step">
              <span className="package-step__number">3</span>
              <div className="package-step__content">
                <Text as="h3" weight="semibold">
                  Start an agent session
                </Text>
                <Text as="p" size={300} foreground={2}>
                  {client.verify} Neither server needs an API key, bearer token, custom header, or
                  Azure CLI login.
                </Text>
              </div>
            </div>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
