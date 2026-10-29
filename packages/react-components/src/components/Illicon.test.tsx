// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as React from 'react';
import { afterEach, expect, test } from 'vitest';
import { cleanup, render } from 'vitest-browser-react';
import { renderCoreAIComponent } from '../test-utils.js';
import { Illicon } from './Illicon.js';
import { CoreAIFluentProvider } from '../contexts/CoreAIFluentProvider.js';
import { coreaiDarkTheme, coreaiLightTheme } from '../theme/theme.js';

afterEach(cleanup);

test('loads fixed-size packaged artwork, forwards its image ref, and supports meaningful alt', async () => {
  const ref = React.createRef<HTMLImageElement>();
  const screen = await renderCoreAIComponent(
    <Illicon ref={ref} name="shield" alt="Protected workspace" loading="eager" />,
  );
  const image = screen.getByRole('img', { name: 'Protected workspace' });
  expect(image).toHaveAttribute('width', '80');
  expect(image).toHaveAttribute('height', '80');
  expect(ref.current).toBe(screen.container.querySelector('img'));
  await ref.current?.decode();
  expect(ref.current?.naturalWidth).toBe(140);
  expect(ref.current?.src).toMatch(/^data:image\/svg\+xml;base64,/);
});

test('uses the same fixed size for decorative illustrations', async () => {
  const screen = await renderCoreAIComponent(<Illicon name="agents" />);
  const image = screen.container.querySelector('img');
  expect(image).toHaveAttribute('alt', '');
  expect(image).toHaveAttribute('width', '80');
  expect(image).toHaveAttribute('height', '80');
});

function inkPixel(image: HTMLImageElement) {
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is required to check illustration colors');
  context.filter = getComputedStyle(image).filter;
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  let ink = [0, 0, 0, 0];
  for (let index = 0; index < pixels.length; index += 4) {
    if (pixels[index + 3] > ink[3]) ink = Array.from(pixels.subarray(index, index + 4));
  }
  return ink;
}

test('switches ink from white to dark with the active theme without remounting or changing artwork', async () => {
  const ref = React.createRef<HTMLImageElement>();
  const artwork = <Illicon ref={ref} name="agents" loading="eager" />;
  const screen = await render(
    <CoreAIFluentProvider theme={coreaiDarkTheme}>{artwork}</CoreAIFluentProvider>,
  );
  const image = ref.current;
  if (!image) throw new Error('Illicon did not render an image');
  await image.decode();
  const source = image.src;
  const darkInk = inkPixel(image);
  expect(darkInk[0]).toBeGreaterThan(250);

  await screen.rerender(
    <CoreAIFluentProvider theme={coreaiLightTheme}>{artwork}</CoreAIFluentProvider>,
  );
  await expect.poll(() => inkPixel(image)[0]).toBeLessThan(40);
  const lightInk = inkPixel(image);
  expect(lightInk[0]).toBeGreaterThan(30);
  expect(lightInk[3]).toBe(darkInk[3]);
  expect(ref.current).toBe(image);
  expect(image.src).toBe(source);

  await screen.rerender(
    <CoreAIFluentProvider theme={coreaiDarkTheme}>{artwork}</CoreAIFluentProvider>,
  );
  await expect.poll(() => inkPixel(image)).toEqual(darkInk);
});
