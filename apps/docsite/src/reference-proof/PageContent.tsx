// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as React from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@coreai-ds/react-components';
import { loadExamples } from 'virtual:reference-proof-examples';

export interface ReferencePage {
  path: string;
  title: string;
  html: string;
  status: 'ready' | 'loading' | 'error';
  message?: string;
}

class ExampleBoundary extends React.Component<
  { children: React.ReactNode; id: string },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    console.error(`Reference example failed: ${this.props.id}`, error);
  }
  render() {
    return this.state.failed ? (
      <p role="alert" data-preview-error>
        This preview failed to render. See the console for details.
      </p>
    ) : (
      this.props.children
    );
  }
}

// This subtree shares the theme, but not the site's router: examples may supply their own routers.
export function PageContent({
  page,
  onReady,
}: {
  page: ReferencePage;
  onReady: (page: ReferencePage) => void;
}) {
  const contentRef = React.useRef<HTMLDivElement>(null);
  const markup = React.useMemo(() => ({ __html: page.html }), [page.html]);
  const [targets, setTargets] = React.useState<HTMLElement[] | null>(null);
  const [examples, setExamples] = React.useState<Record<string, React.ComponentType>>({});
  const [loadError, setLoadError] = React.useState<string>();
  const [activeExample, setActiveExample] = React.useState<string>();
  React.useEffect(() => {
    if (page.status !== 'ready') return;
    let active = true;
    const containers = [
      ...(contentRef.current?.querySelectorAll<HTMLElement>('[data-example-id]') ?? []),
    ];
    const component = containers[0]?.dataset.exampleId?.split('--')[0];
    const load = component ? loadExamples[component] : undefined;
    if (component && !load) throw new Error(`Missing component example bundle: ${component}`);
    (load ? load() : Promise.resolve({ examples: {} }))
      .then((loaded) => {
        if (!active) return;
        for (const container of containers) container.replaceChildren();
        setExamples(loaded.examples);
        if (contentRef.current?.querySelector('[data-single-preview]')) {
          setActiveExample(
            (
              containers.find((container) => container.dataset.exampleId?.endsWith('--default')) ??
              containers[0]
            )?.dataset.exampleId,
          );
        }
        setTargets(containers);
        onReady(page);
      })
      .catch((error: unknown) => {
        console.error('Could not load documentation examples.', error);
        if (active)
          setLoadError('Could not load examples. Reload this page or use the source downloads.');
      });
    return () => {
      active = false;
    };
  }, [page, onReady]);
  return (
    <div
      aria-busy={page.status === 'loading'}
      data-reference-ready={page.status === 'ready' && targets !== null}
    >
      {page.status === 'loading' ? (
        <p role="status">Loading documentation…</p>
      ) : page.status === 'error' ? (
        <>
          <h1>Unable to load documentation</h1>
          <p role="alert" data-navigation-error>
            {page.message}
          </p>
        </>
      ) : (
        <div ref={contentRef} dangerouslySetInnerHTML={markup} />
      )}
      {loadError ? (
        <p role="alert" data-preview-error>
          {loadError}
        </p>
      ) : null}
      {targets?.map((container) => {
        const id = container.dataset.exampleId;
        const Example = id ? examples[id] : undefined;
        if (!id || !Example) throw new Error(`Unknown reference example: ${id}`);
        return createPortal(
          <ExampleBoundary id={id}>
            {activeExample && activeExample !== id ? (
              <Button onClick={() => setActiveExample(id)}>Run this example</Button>
            ) : (
              <Example />
            )}
          </ExampleBoundary>,
          container,
          id,
        );
      })}
    </div>
  );
}
