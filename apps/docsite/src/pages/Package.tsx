import * as React from 'react';
import {
  Button,
  CodeBlock,
  CopyButton,
  Link,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  MessageBarTitle,
  Text,
} from '@coreai/fluentui-react';
import { PageLayout } from '../components/PageLayout';
import { siteLinks } from '../data/content';

const installPackages = `npm install @coreai/fluentui-react --registry=https://registry.npmjs.org
npm install @fluentui/react-components @fluentui/react-icons`;

const usageExample = `import '@coreai/fluentui-react/fonts/fonts.css';
import {
  CoreAIFluentProvider,
  coreaiLightTheme,
} from '@coreai/fluentui-react';

<CoreAIFluentProvider theme={coreaiLightTheme}>
  <App />
</CoreAIFluentProvider>`;

const packageSetupPrompt = `Read the @coreai/fluentui-react package README, then set up this project to use the package:

${siteLinks.packageReadme}

Follow the README's current instructions for publication availability, public npm installation, optional Aptos setup and licensing, and CoreAIFluentProvider configuration. Make the required project changes directly and verify the result.`;

export function Package() {
  return (
    <PageLayout
      id="package"
      actions={
        <Button
          as="a"
          href={siteLinks.packageReadme}
          target="_blank"
          rel="noopener"
          appearance="outline"
        >
          View repo
        </Button>
      }
    >
      <div className="package-guide">
        <section className="page-section package-section package-section--setup">
          <MessageBar intent="brand" layout="multiline" icon={null}>
            <MessageBarBody>
              <MessageBarTitle>Let your agent handle setup.</MessageBarTitle>
              Pass the{' '}
              <Link href={siteLinks.packageReadme} target="_blank" rel="noopener" external>
                package README
              </Link>{' '}
              to your agent for current installation and configuration guidance.
            </MessageBarBody>
            <MessageBarActions
              containerAction={
                <CopyButton
                  aria-label="Copy package setup prompt"
                  contentToCopy={packageSetupPrompt}
                />
              }
            />
          </MessageBar>

          <div className="package-install">
            <div className="package-step">
              <span className="package-step__number">1</span>
              <div className="package-step__content">
                <Text as="h3" weight="semibold">
                  Check availability
                </Text>
                <Text as="p" size={300} foreground={2}>
                  Public npm publication is pending open-source approval. Once published, installing
                  the package will not require an Azure Artifacts feed or Microsoft sign-in.
                  Existing hosted documentation and MCP access controls are unchanged.
                </Text>
              </div>
            </div>

            <div className="package-step">
              <span className="package-step__number">2</span>
              <div className="package-step__content">
                <Text as="h3" weight="semibold">
                  Install from npm
                </Text>
                <Text as="p" size={300} foreground={2}>
                  After publication, run these commands in your project. Remove any old{' '}
                  <code>@coreai:registry</code> Azure Artifacts override from the project and user{' '}
                  <code>.npmrc</code> files first.
                </Text>
                <CodeBlock code={installPackages} language="bash" />
              </div>
            </div>

            <div className="package-step">
              <span className="package-step__number">3</span>
              <div className="package-step__content">
                <Text as="h3" weight="semibold">
                  Set up Aptos (recommended)
                </Text>
                <Text as="p" size={300} foreground={2}>
                  Aptos is the preferred typeface, but font files are not included in the repository
                  or npm package. Follow the{' '}
                  <Link href={siteLinks.packageReadme} target="_blank" rel="noopener" external>
                    package README
                  </Link>{' '}
                  for opt-in setup from Microsoft&apos;s official download and review the license
                  for your intended use.
                </Text>
                <Text as="p" size={300} foreground={2}>
                  The package also works without Aptos using system-font fallbacks. Do not commit
                  downloaded fonts or redistribute them without the applicable rights.
                </Text>
              </div>
            </div>

            <div className="package-step">
              <span className="package-step__number">4</span>
              <div className="package-step__content">
                <Text as="h3" weight="semibold">
                  Add it to your app
                </Text>
                <Text as="p" size={300} foreground={2}>
                  Load the font-stack stylesheet once, then wrap the app with the CoreAI provider.
                  This stylesheet does not include font binaries.
                </Text>
                <CodeBlock code={usageExample} language="tsx" />
              </div>
            </div>
          </div>
        </section>

        <Text as="p" size={300} foreground={2}>
          Need CI setup, custom themes, CSS overrides, or agent configuration?{' '}
          <Link href={siteLinks.packageReadme} target="_blank" rel="noopener" external>
            Read the full package README
          </Link>
          .
        </Text>
      </div>
    </PageLayout>
  );
}
