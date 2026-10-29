// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as React from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { cleanup } from 'vitest-browser-react';
import { illicons } from '@coreai-ds/react-components';
import { renderCoreAIComponent } from '../../../../packages/react-components/src/test-utils';
import { IlliconCatalog } from '../illicons/IlliconCatalog';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

test('previews the catalog page and exposes component JSX instead of downloads', async () => {
  const screen = await renderCoreAIComponent(<IlliconCatalog />);
  const images = Array.from(screen.container.querySelectorAll('img'));
  expect(images).toHaveLength(Math.min(illicons.length, 24));
  for (const image of images) {
    image.loading = 'eager';
    await image.decode();
    expect(image.naturalWidth).toBe(140);
    expect(image.naturalHeight).toBe(140);
    expect(image.getBoundingClientRect().width).toBe(80);
    expect(image.getBoundingClientRect().height).toBe(80);
    expect(image.parentElement?.tagName).toBe('ARTICLE');
    expect(getComputedStyle(image).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(getComputedStyle(image.parentElement!).backgroundColor).toBe('rgba(0, 0, 0, 0)');
  }
  expect(screen.getByRole('article', { name: 'Agents', exact: true })).toBeVisible();
  expect(screen.container.querySelectorAll('a[download]')).toHaveLength(0);
  expect(screen.container.querySelector('code')?.textContent).toContain(
    "import { Illicon } from '@coreai-ds/react-components'",
  );
  expect(screen.container.querySelector('code')?.textContent).not.toContain('size=');
  const guide = screen.getByRole('link', { name: 'Create a new illicon' });
  expect(guide).toHaveAttribute(
    'href',
    'https://mini-foundry.azurewebsites.net/ckantner/illicon-creator/',
  );
  expect(guide).toHaveAttribute('target', '_blank');
  expect(guide).toHaveAttribute('rel', 'noopener noreferrer');
  for (const name of ['Agents', 'Workflows', 'Models', 'Foundry', 'Home']) {
    const tile = screen.getByRole('article', { name, exact: true }).element();
    expect(tile.querySelector('p')).toBeNull();
  }
  expect(screen.getByRole('article', { name: 'Fine-tune', exact: true })).toHaveTextContent(
    'beaker, lab, test',
  );
});

test('searches names and tags case-insensitively and reports no matches', async () => {
  const screen = await renderCoreAIComponent(<IlliconCatalog />);
  await userEvent.fill(
    screen.getByRole('searchbox', { name: 'Search illicons' }),
    'SECURITY shield',
  );
  expect(screen.container.querySelectorAll('article')).toHaveLength(1);
  expect(screen.getByRole('article', { name: 'Shield', exact: true })).toBeVisible();
  await userEvent.fill(screen.getByRole('searchbox'), 'brain');
  expect(screen.getByText(/No illicons match/)).toBeVisible();
  await userEvent.fill(screen.getByRole('searchbox'), 'agents');
  expect(screen.getByRole('article', { name: 'Agents', exact: true })).toBeVisible();
  await userEvent.fill(screen.getByRole('searchbox'), 'test');
  expect(screen.container.querySelectorAll('article')).toHaveLength(1);
  expect(screen.getByRole('article', { name: 'Fine-tune', exact: true })).toBeVisible();
  await userEvent.fill(screen.getByRole('searchbox'), 'scale');
  expect(screen.getByRole('article', { name: 'Evaluations', exact: true })).toBeVisible();
  await userEvent.fill(screen.getByRole('searchbox'), 'networking');
  expect(screen.getByRole('article', { name: 'Globe', exact: true })).toBeVisible();
  expect(screen.getByText('networking, network, world')).toBeVisible();
  await userEvent.fill(screen.getByRole('searchbox'), 'missing');
  expect(screen.getByText(/No illicons match/)).toBeVisible();
  await userEvent.clear(screen.getByRole('searchbox'));
  expect(screen.container.querySelectorAll('article')).toHaveLength(Math.min(illicons.length, 24));
});

test('confirms each copy above its button without shifting the icon grid', async () => {
  const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
  const screen = await renderCoreAIComponent(<IlliconCatalog />);
  const positions = () =>
    Array.from(
      screen.container.querySelectorAll('article'),
      (tile) => tile.getBoundingClientRect().top + window.scrollY,
    );
  const before = positions();
  for (const [name, id] of [
    ['Shield', 'shield'],
    ['Home', 'home'],
  ]) {
    const button = screen.getByRole('button', { name: `Copy ${name} JSX`, exact: true });
    await userEvent.click(button);
    await expect.poll(() => writeText.mock.lastCall?.[0]).toBe(`<Illicon name="${id}" />`);
    const feedback = screen.getByText(`Copied ${name} JSX`, { exact: true });
    await expect.element(feedback).toBeVisible();
    expect(feedback.element().getBoundingClientRect().bottom).toBeLessThanOrEqual(
      button.element().getBoundingClientRect().top,
    );
    expect(positions()).toEqual(before);
  }
});

test('reports clipboard rejection and preview failure without claiming success', async () => {
  vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('Permission denied'));
  const screen = await renderCoreAIComponent(<IlliconCatalog />);
  await userEvent.click(screen.getByRole('button', { name: 'Copy Agents JSX', exact: true }));
  await expect.element(screen.getByRole('alert')).toHaveTextContent(/Could not copy Agents JSX/);
  screen.container.querySelector('img')?.dispatchEvent(new Event('error'));
  await expect
    .element(screen.getByRole('alert'))
    .toHaveTextContent('Preview unavailable for Agents.');
});
