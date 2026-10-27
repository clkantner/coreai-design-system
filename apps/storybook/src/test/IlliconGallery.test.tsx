// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as React from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { cleanup } from 'vitest-browser-react';
import { renderCoreAIComponent } from '../../../../packages/react-components/src/test-utils';
import { IlliconGallery, type IlliconEntry } from '../illicons/IlliconGallery';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function icon(index: number): IlliconEntry {
  return {
    id: `test-${index}`,
    name: `Test ${index}`,
    tags: [index % 2 ? 'odd' : 'even'],
    file: `test-${index}.svg`,
    provenance: { author: 'Test author', source: 'Test fixture', license: 'MIT' },
  };
}

test('shows an honest empty catalog rather than a submission success state', async () => {
  const screen = await renderCoreAIComponent(<IlliconGallery icons={[]} />);
  expect(screen.getByText(/No artwork has been published/)).toBeVisible();
});

test('paginates the catalog and resets to page one when names/tags are searched', async () => {
  const screen = await renderCoreAIComponent(
    <IlliconGallery icons={Array.from({ length: 25 }, (_, index) => icon(index))} />,
  );
  expect(screen.container.querySelectorAll('article')).toHaveLength(24);
  await userEvent.click(screen.getByRole('button', { name: 'Next', exact: true }));
  expect(screen.container.querySelectorAll('article')).toHaveLength(1);
  expect(screen.getByRole('article', { name: 'Test 24', exact: true })).toBeVisible();
  await userEvent.fill(screen.getByRole('searchbox', { name: 'Search illicons' }), 'EVEN test');
  expect(screen.container.querySelectorAll('article')).toHaveLength(13);
  expect(screen.getByRole('article', { name: 'Test 0', exact: true })).toBeVisible();
  await userEvent.fill(screen.getByRole('searchbox'), 'missing');
  expect(screen.getByText(/No illicons match/)).toBeVisible();
});

test('copies the exact stored SVG and downloads the original filename', async () => {
  const original = '<svg xmlns="http://www.w3.org/2000/svg"><path d="M1 1h2"/></svg>';
  const fetchSvg = vi
    .fn()
    .mockResolvedValue(new Response(original, { headers: { 'content-type': 'image/svg+xml' } }));
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal('fetch', fetchSvg);
  vi.spyOn(navigator.clipboard, 'writeText').mockImplementation(writeText);
  const screen = await renderCoreAIComponent(<IlliconGallery icons={[icon(0)]} />);
  const download = screen.getByRole('link', { name: 'Download Test 0 SVG' });
  expect(download).toHaveAttribute('href', './illicons/test-0.svg');
  expect(download).toHaveAttribute('download', 'test-0.svg');
  await userEvent.click(screen.getByRole('button', { name: 'Copy SVG' }));
  await expect.poll(() => writeText.mock.calls[0]?.[0]).toBe(original);
  await expect.element(screen.getByText('Copied Test 0 SVG.')).toBeVisible();
});

test.each([
  ['HTTP failure', () => Promise.resolve(new Response('Missing', { status: 404 })), /404/],
  [
    'HTML fallback',
    () => Promise.resolve(new Response('<html/>', { headers: { 'content-type': 'text/html' } })),
    /did not return an SVG/,
  ],
  [
    'network failure',
    () => Promise.reject(new Error('Network unavailable')),
    /Network unavailable/,
  ],
])('reports %s without claiming the SVG was copied', async (_, response, message) => {
  vi.stubGlobal('fetch', vi.fn(response));
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.spyOn(navigator.clipboard, 'writeText').mockImplementation(writeText);
  const screen = await renderCoreAIComponent(<IlliconGallery icons={[icon(0)]} />);
  await userEvent.click(screen.getByRole('button', { name: 'Copy SVG' }));
  await expect.element(screen.getByRole('alert').filter({ hasText: message })).toBeVisible();
  expect(writeText).not.toHaveBeenCalled();
});

test('reports clipboard rejection and preview failure explicitly', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(new Response('<svg/>', { headers: { 'content-type': 'image/svg+xml' } })),
  );
  vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(
    new Error('Clipboard permission denied'),
  );
  const screen = await renderCoreAIComponent(<IlliconGallery icons={[icon(0)]} />);
  await userEvent.click(screen.getByRole('button', { name: 'Copy SVG' }));
  await expect.element(screen.getByText('Clipboard permission denied')).toBeVisible();
  screen.container.querySelector('img')?.dispatchEvent(new Event('error'));
  await expect.element(screen.getByText('Preview unavailable for Test 0.')).toBeVisible();
});
