// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';
import { Button, SearchBox, Text } from '@coreai-ds/react-components';
import type { ComponentType } from 'react';
import '@coreai-ds/react-components/fonts/fonts.css';
import { loadExamples } from 'virtual:reference-proof-examples';
import { ThemeProvider, useThemeMode } from '../theme/ThemeProvider';
import { CoreAILogo } from '../components/Icons';
import { Header } from '../components/Header';
import '../styles/docsite.css';
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
      <p role="alert" data-preview-error>
        This preview failed to render. See the console for details.
      </p>
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
  const [examples, setExamples] = React.useState<Record<string, ComponentType>>({});
  const [loadError, setLoadError] = React.useState<string>();
  const [query, setQuery] = React.useState('');
  const [navigationOpen, setNavigationOpen] = React.useState(false);
  const [activeExample, setActiveExample] = React.useState<string>();
  const menuButtonRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    let active = true;
    const containers = [
      ...(contentRef.current?.querySelectorAll<HTMLElement>('[data-example-id]') ?? []),
    ];
    const component = containers[0]?.dataset.exampleId?.split('--')[0];
    const load = component ? loadExamples[component] : undefined;
    if (component && !load) throw new Error(`Missing component example bundle: ${component}`);
    const ready = load ? load() : Promise.resolve({ examples: {} });
    ready
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
      })
      .catch((error: unknown) => {
        console.error('Could not load documentation examples.', error);
        if (active)
          setLoadError('Could not load examples. Reload this page or use the source downloads.');
      });
    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    const links =
      contentRef.current?.querySelectorAll<HTMLAnchorElement>('[data-navigation-entry]') ?? [];
    for (const link of links)
      link.hidden = !link.textContent?.toLowerCase().includes(query.trim().toLowerCase());
    for (const group of contentRef.current?.querySelectorAll<HTMLDetailsElement>(
      '.reference-nav-group',
    ) ?? []) {
      group.hidden = !group.querySelector('a:not([hidden])');
      if (query) group.open = true;
    }
  }, [query]);

  React.useEffect(() => {
    const sidebar = contentRef.current?.querySelector<HTMLElement>('#app-navigation');
    const page = contentRef.current?.querySelector<HTMLElement>('.app-content');
    if (!sidebar || !page) return;
    sidebar.classList.toggle('is-open', navigationOpen);
    sidebar.setAttribute(
      'aria-label',
      navigationOpen ? 'Site navigation dialog' : 'Site navigation',
    );
    if (navigationOpen) {
      sidebar.setAttribute('role', 'dialog');
      sidebar.setAttribute('aria-modal', 'true');
      sidebar.querySelector<HTMLInputElement>('input')?.focus();
    } else {
      sidebar.removeAttribute('role');
      sidebar.removeAttribute('aria-modal');
    }
    page.inert = navigationOpen;
    const close = () => {
      setNavigationOpen(false);
      requestAnimationFrame(() => menuButtonRef.current?.focus());
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (!navigationOpen) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
      if (event.key === 'Tab') {
        const controls = [
          ...sidebar.querySelectorAll<HTMLElement>('a[href], button, input, summary'),
        ].filter((element) => element.getClientRects().length);
        const first = controls[0];
        const last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    const dismiss = sidebar.querySelector('[data-close-navigation]');
    dismiss?.addEventListener('click', close);
    document.addEventListener('keydown', onKeyDown);
    const resize = () => {
      if (window.innerWidth > 1100) setNavigationOpen(false);
    };
    window.addEventListener('resize', resize);
    return () => {
      dismiss?.removeEventListener('click', close);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', resize);
    };
  }, [navigationOpen, targets]);

  const slot = (name: string) =>
    contentRef.current?.querySelector<HTMLElement>(`[data-shell-${name}]`);
  return (
    <div className="reference-application" data-reference-ready={targets !== null}>
      <div ref={contentRef} dangerouslySetInnerHTML={markup} />
      {targets !== null && slot('logo') ? createPortal(<CoreAILogo />, slot('logo')!) : null}
      {targets !== null && slot('theme')
        ? createPortal(
            <div className="reference-theme-tools">
              <Text>Theme: {mode}</Text>
              <Button
                appearance="subtle"
                onClick={() => setPreference(mode === 'light' ? 'dark' : 'light')}
              >
                Switch to {mode === 'light' ? 'dark' : 'light'} theme
              </Button>
            </div>,
            slot('theme')!,
          )
        : null}
      {targets !== null && slot('search')
        ? createPortal(
            <SearchBox
              aria-label="Filter navigation"
              placeholder="Find a component"
              value={query}
              onChange={(_event, data) => setQuery(data.value)}
            />,
            slot('search')!,
          )
        : null}
      {targets !== null && slot('header')
        ? createPortal(
            <Header
              menuButtonRef={menuButtonRef}
              navigationOpen={navigationOpen}
              onNavigationOpen={() => setNavigationOpen(true)}
            />,
            slot('header')!,
          )
        : null}
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
