// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as React from 'react';
import { Button, Link, Text } from '@coreai-ds/react-components';
import { CoreAILogo, ExternalIcon } from '../components/Icons';
import { ResourceIcon } from './PagePresentation';
import type { PageWidgetProps } from './FoundationViews';

const Logo = React.lazy(() =>
  import('../components/CoreAILogoCube').then((module) => ({ default: module.CoreAILogoCube })),
);

class GraphicBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    console.error('The optional 3D homepage graphic could not render.', error);
  }
  render() {
    return this.state.failed ? (
      <span className="sr-only">The 3D graphic is unavailable. A static CoreAI logo is shown.</span>
    ) : (
      this.props.children
    );
  }
}

export default function HomeView({ model, sourceHtml }: PageWidgetProps) {
  const prompt = React.useMemo(
    () =>
      new DOMParser().parseFromString(sourceHtml, 'text/html').querySelector('[data-agent-prompt]')
        ?.textContent,
    [sourceHtml],
  );
  if (!prompt) throw new Error('Missing canonical agent starter prompt.');
  const base = new URL('.', new URL(model.markdownUrl, window.location.href));
  return (
    <div className="home-landing">
      <div className="home-foreground">
        <header className="home-heading">
          <Text as="h1" id={model.headingId} size={900} weight="regular">
            {model.title}
          </Text>
          <Text as="p" size={400} foreground={2}>
            <span dangerouslySetInnerHTML={{ __html: model.summaryHtml }} />
          </Text>
        </header>
        <nav className="home-resource-links app-sidenav__quick-links" aria-label="Get started">
          {model.resources.map((resource) => {
            const external = new URL(resource.href).origin !== window.location.origin;
            return (
              <Link
                key={resource.href}
                className="app-sidenav__quick-link"
                href={resource.href}
                target={external ? '_blank' : undefined}
                rel={external ? 'noopener noreferrer' : undefined}
              >
                <span className="app-sidenav__quick-link-brand">
                  <ResourceIcon href={resource.href} />
                </span>
                <span className="app-sidenav__quick-link-title">
                  {resource.label}
                  <ExternalIcon className="app-sidenav__quick-link-open" />
                </span>
              </Link>
            );
          })}
        </nav>
        <section className="home-agent-entry" aria-labelledby="home-agent-title">
          <Text as="h2" id="home-agent-title" preset="heading3">
            Build with your agent
          </Text>
          <Text as="p" foreground={2}>
            Give your coding agent CoreAI guidance, APIs, and working examples. No setup needed.
          </Text>
          <div className="home-agent-actions">
            <Button appearance="primary" data-copy={prompt} data-copy-label="starter prompt">
              Copy starter prompt
            </Button>
            <Link href={new URL('guides/use-with-agents/', base).href}>How it works</Link>
          </div>
          <div className="home-agent-links">
            <Link href={new URL('guides/package-skill/', base).href}>Reusable skill</Link>
            <Link href={new URL('llms.txt', base).href}>Agent index</Link>
          </div>
          <details>
            <summary>Preview the prompt</summary>
            <pre data-agent-prompt>{prompt}</pre>
          </details>
        </section>
      </div>
      <div className="home-visual">
        <CoreAILogo className="home-logo-fallback" />
        <GraphicBoundary>
          <React.Suspense fallback={null}>
            <Logo />
          </React.Suspense>
        </GraphicBoundary>
      </div>
    </div>
  );
}
