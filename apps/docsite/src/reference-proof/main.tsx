// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { CoreAIFluentProvider, coreaiLightTheme } from '@coreai-ds/react-components';
import '@coreai-ds/react-components/fonts/fonts.css';
import { examples } from 'virtual:reference-proof-examples';
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

for (const container of document.querySelectorAll<HTMLElement>('[data-example-id]')) {
  const id = container.dataset.exampleId;
  const Example = id ? examples[id] : undefined;
  if (!Example) throw new Error(`Unknown reference example: ${id}`);
  createRoot(container).render(
    <ExampleBoundary id={id ?? ''}>
      <CoreAIFluentProvider theme={coreaiLightTheme}>
        <Example />
      </CoreAIFluentProvider>
    </ExampleBoundary>,
  );
}

for (const button of document.querySelectorAll<HTMLButtonElement>('[data-copy-source]')) {
  button.addEventListener('click', async () => {
    const id = button.dataset.copySource;
    const source = id ? document.getElementById(id) : null;
    const status = document.querySelector<HTMLElement>(`[data-copy-status="${id}"]`);
    if (!source || !status) throw new Error(`Missing copyable reference source: ${id}`);
    try {
      await navigator.clipboard.writeText(source.textContent ?? '');
      status.textContent = 'Copied.';
    } catch (error) {
      console.error('Could not copy reference source.', error);
      status.textContent = 'Copy failed. Select the source text or use Download source.';
    }
  });
}
