// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';
import { Button, Text } from '@coreai-ds/react-components';
import '@coreai-ds/react-components/fonts/fonts.css';
import { examples } from 'virtual:reference-proof-examples';
import { ThemeProvider, useThemeMode } from '../theme/ThemeProvider';
import './reference-proof.css';

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
      <p role="alert">This preview failed to render. See the console for details.</p>
    ) : (
      this.props.children
    );
  }
}

function DocumentationApp({ html }: { html: string }) {
  const { mode, setPreference } = useThemeMode();
  const contentRef = React.useRef<HTMLDivElement>(null);
  const markup = React.useMemo(() => ({ __html: html }), [html]);
  const [targets, setTargets] = React.useState<HTMLElement[] | null>(null);

  React.useLayoutEffect(() => {
    const containers = [
      ...(contentRef.current?.querySelectorAll<HTMLElement>('[data-example-id]') ?? []),
    ];
    for (const container of containers) container.replaceChildren();
    setTargets(containers);
  }, []);

  return (
    <div className="reference-application" data-reference-ready={targets !== null}>
      <div className="reference-theme-tools">
        <Text>Theme: {mode}</Text>
        <Button
          appearance="subtle"
          onClick={() => setPreference(mode === 'light' ? 'dark' : 'light')}
        >
          Switch to {mode === 'light' ? 'dark' : 'light'} theme
        </Button>
      </div>
      <div ref={contentRef} dangerouslySetInnerHTML={markup} />
      {targets?.map((container) => {
        const id = container.dataset.exampleId;
        const Example = id ? examples[id] : undefined;
        if (!id || !Example) throw new Error(`Unknown reference example: ${id}`);
        return createPortal(
          <ExampleBoundary id={id}>
            <Example />
          </ExampleBoundary>,
          container,
          id,
        );
      })}
    </div>
  );
}

const container = document.getElementById('reference-root');
const content = document.getElementById('reference-content');
if (!container || !content) throw new Error('Missing static documentation content.');
const html = content.innerHTML;
createRoot(container).render(
  <ThemeProvider>
    <DocumentationApp html={html} />
  </ThemeProvider>,
);

container.addEventListener('click', async (event) => {
  const button =
    event.target instanceof Element
      ? event.target.closest<HTMLButtonElement>('[data-copy-source]')
      : null;
  if (!button) return;
  const id = button.dataset.copySource;
  const source = id ? document.getElementById(id) : null;
  const status = container.querySelector<HTMLElement>(`[data-copy-status="${id}"]`);
  if (!source || !status) throw new Error(`Missing copyable reference source: ${id}`);
  try {
    await navigator.clipboard.writeText(source.textContent ?? '');
    status.textContent = 'Copied.';
  } catch (error) {
    console.error('Could not copy reference source.', error);
    status.textContent = 'Copy failed. Select the source text or use Download source.';
  }
});
