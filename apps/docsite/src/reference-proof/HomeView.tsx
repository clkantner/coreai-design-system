// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as React from 'react';
import { Link, Text } from '@coreai-ds/react-components';
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

export default function HomeView({ model }: PageWidgetProps) {
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
