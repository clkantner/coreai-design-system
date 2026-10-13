import * as React from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup } from 'vitest-browser-react';
import type { FluentIcon } from '@fluentui/react-icons';
import { Heart24Filled, Sparkle24Filled } from '@fluentui/react-icons';
import { renderCoreAIComponent } from '../test-utils.js';
import { Illicon } from './Illicon.js';
import { peekCoverage } from './illiconRasterize.js';

afterEach(async () => {
  vi.restoreAllMocks();
  await cleanup();
});

/** Solid, non-square test icon (48×24) used to verify aspect ratio handling. */
const WideFilled: FluentIcon = () => (
  <svg viewBox="0 0 48 24">
    <path d="M0 0h48v24h-48z" />
  </svg>
);

/** Catches render-phase errors (e.g. `Illicon`'s size validation) so tests can assert on them. */
class IlliconErrorBoundary extends React.Component<
  React.PropsWithChildren,
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: unknown): { error: Error } {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  render(): React.ReactNode {
    if (this.state.error) {
      return <div data-testid="illicon-error">{this.state.error.message}</div>;
    }
    return this.props.children;
  }
}

function getPathD(svg: Element): string {
  const path = svg.querySelector('path');
  expect(path).not.toBeNull();
  return path!.getAttribute('d') ?? '';
}

test('produces a dotted svg after sampling a filled Fluent icon', async () => {
  const screen = await renderCoreAIComponent(
    <Illicon icon={Sparkle24Filled} aria-label="Sparkle" />,
  );
  const root = screen.getByRole('img', { name: 'Sparkle' });

  await vi.waitFor(() => {
    const svg = root.element().querySelector('svg');
    expect(svg).not.toBeNull();
    expect(getPathD(svg!)).not.toBe('');
  });
});

test('applies a default size of 96', async () => {
  const screen = await renderCoreAIComponent(
    <Illicon icon={Sparkle24Filled} aria-label="Sparkle" />,
  );
  const root = screen.getByRole('img', { name: 'Sparkle' });

  await vi.waitFor(() => {
    const svg = root.element().querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('96');
    expect(svg?.getAttribute('height')).toBe('96');
  });
});

test.each([
  [16, 1],
  [20, 1],
  [20.5, 1],
  [40, 2],
  [48, 2],
  [96, 4],
  [100, 4],
  [144, 6],
  [192, 8],
])('uses output-pixel dots at size %s with pitch %s', async (size, pitch) => {
  const screen = await renderCoreAIComponent(
    <Illicon icon={WideFilled} size={size} aria-label="Spaced dots" />,
  );
  const root = screen.getByRole('img', { name: 'Spaced dots' });

  await vi.waitFor(() => {
    const path = root.element().querySelector('path');
    expect(path).not.toBeNull();
    if (!path) throw new Error('Expected the dotted SVG path.');

    const bounds = path.getBBox();
    const columns = Math.floor(size / pitch);
    const rows = Math.floor(size / 2 / pitch);
    const offsetX = (size - columns * pitch) / 2;
    const offsetY = (size / 2 - rows * pitch) / 2;
    const centerX = offsetX + pitch / 2;
    const centerY = offsetY + pitch / 2;
    expect(bounds.x).toBeCloseTo(offsetX + pitch * 0.3);
    expect(bounds.y).toBeCloseTo(offsetY + pitch * 0.3);
    expect(bounds.width).toBeCloseTo((columns - 0.6) * pitch);
    expect(bounds.height).toBeCloseTo((rows - 0.6) * pitch);
    expect(path.isPointInFill(new DOMPoint(centerX, centerY))).toBe(true);
    expect(path.isPointInFill(new DOMPoint(centerX + pitch, centerY))).toBe(true);
    expect(path.isPointInFill(new DOMPoint(centerX, centerY + pitch))).toBe(true);
    expect(path.isPointInFill(new DOMPoint(centerX + pitch * 0.25, centerY))).toBe(false);
    expect(path.isPointInFill(new DOMPoint(centerX + pitch / 2, centerY))).toBe(false);
    expect(path.isPointInFill(new DOMPoint(centerX, centerY + pitch / 2))).toBe(false);
    expect(path.getBoundingClientRect().width).toBeCloseTo(bounds.width);
    expect(getPathD(path.ownerSVGElement!).match(/M/g)).toHaveLength(columns * rows);
    expect(path.ownerSVGElement?.getAttribute('viewBox')).toBe(`0 0 ${size} ${size / 2}`);
  });
});

test('accepts a valid custom size', async () => {
  const screen = await renderCoreAIComponent(
    <Illicon icon={Sparkle24Filled} size={144} aria-label="Sparkle" />,
  );
  const root = screen.getByRole('img', { name: 'Sparkle' });

  await vi.waitFor(() => {
    const svg = root.element().querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('144');
    expect(svg?.getAttribute('height')).toBe('144');
  });
});

test.each([0, -16, NaN, Infinity, -Infinity])(
  'reports an explicit error for size %s',
  async (size) => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const screen = await renderCoreAIComponent(
      <IlliconErrorBoundary>
        <Illicon icon={Sparkle24Filled} size={size} aria-label="Sparkle" />
      </IlliconErrorBoundary>,
    );

    await vi.waitFor(() => {
      expect(screen.getByTestId('illicon-error').element().textContent).toMatch(
        /must be a positive, finite number/,
      );
    });
    expect(consoleError).toHaveBeenCalled();
  },
);

test('inherits color through currentColor', async () => {
  const screen = await renderCoreAIComponent(
    <Illicon icon={Sparkle24Filled} aria-label="Sparkle" style={{ color: 'rgb(10, 20, 30)' }} />,
  );
  const root = screen.getByRole('img', { name: 'Sparkle' });

  await vi.waitFor(() => {
    const path = root.element().querySelector('path');
    expect(path).not.toBeNull();
    expect(getComputedStyle(path!).fill).toBe('rgb(10, 20, 30)');
  });
});

test('exposes image semantics when labelled', async () => {
  const screen = await renderCoreAIComponent(
    <Illicon icon={Sparkle24Filled} aria-label="Sparkle" />,
  );
  const root = screen.getByRole('img', { name: 'Sparkle' }).element();

  expect(root.getAttribute('aria-hidden')).toBeNull();
});

test('is decorative and hidden from assistive technology when unlabelled', async () => {
  const screen = await renderCoreAIComponent(
    <Illicon icon={Sparkle24Filled} data-testid="decorative" />,
  );
  const root = screen.getByTestId('decorative').element();

  expect(root.getAttribute('role')).toBeNull();
  expect(root.getAttribute('aria-hidden')).toBe('true');
  expect(screen.getByRole('img').query()).toBeNull();
});

test('forwards native span props, className, style, and ref', async () => {
  const ref = React.createRef<HTMLSpanElement>();
  const screen = await renderCoreAIComponent(
    <Illicon
      icon={Sparkle24Filled}
      aria-label="Sparkle"
      ref={ref}
      id="illicon-instance"
      className="consumer-illicon"
      style={{ backgroundColor: 'rgb(1, 2, 3)' }}
      data-testid="illicon-root"
    />,
  );
  const root = screen.getByTestId('illicon-root').element() as HTMLSpanElement;

  expect(root.id).toBe('illicon-instance');
  expect(root.classList).toContain('consumer-illicon');
  expect(getComputedStyle(root).backgroundColor).toBe('rgb(1, 2, 3)');
  expect(ref.current).toBe(root);
});

test('renders the new icon, not stale cached output, when the icon prop changes', async () => {
  const screen = await renderCoreAIComponent(<Illicon icon={Sparkle24Filled} aria-label="Icon" />);
  const root = screen.getByRole('img', { name: 'Icon' });

  let firstPathD = '';
  await vi.waitFor(() => {
    const svg = root.element().querySelector('svg');
    expect(svg).not.toBeNull();
    firstPathD = getPathD(svg!);
    expect(firstPathD).not.toBe('');
  });

  await screen.rerender(<Illicon icon={Heart24Filled} aria-label="Icon" />);

  await vi.waitFor(() => {
    const svg = root.element().querySelector('svg');
    expect(svg).not.toBeNull();
    expect(getPathD(svg!)).not.toBe(firstPathD);
  });
});

test('renders a non-square source viewBox at the matching aspect ratio', async () => {
  const screen = await renderCoreAIComponent(
    <Illicon icon={WideFilled} size={96} aria-label="Wide" />,
  );
  const root = screen.getByRole('img', { name: 'Wide' });

  await vi.waitFor(() => {
    const svg = root.element().querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('96');
    expect(svg?.getAttribute('height')).toBe('48');
    expect(svg?.getAttribute('viewBox')).toBe('0 0 96 48');
  });
});

test('resamples on size changes and reuses coverage when returning to a cached size', async () => {
  const screen = await renderCoreAIComponent(
    <Illicon icon={Heart24Filled} size={16} aria-label="Heart" />,
  );
  const root = screen.getByRole('img', { name: 'Heart' });
  let firstPath = '';
  await vi.waitFor(() => {
    firstPath = getPathD(root.element().querySelector('svg')!);
    expect(firstPath).not.toBe('');
  });
  const firstCoverage = peekCoverage(Heart24Filled, 16);
  expect(firstCoverage?.width).toBe(16);

  await screen.rerender(<Illicon icon={Heart24Filled} size={40} aria-label="Heart" />);
  await vi.waitFor(() => {
    const svg = root.element().querySelector('svg')!;
    expect(svg.getAttribute('viewBox')).toBe('0 0 40 40');
    expect(getPathD(svg)).not.toBe(firstPath);
    expect(peekCoverage(Heart24Filled, 40)).not.toBe(firstCoverage);
  });

  await screen.rerender(<Illicon icon={Heart24Filled} size={16} aria-label="Heart" />);
  await vi.waitFor(() => {
    expect(getPathD(root.element().querySelector('svg')!)).toBe(firstPath);
    expect(peekCoverage(Heart24Filled, 16)).toBe(firstCoverage);
  });
});

test('dotifies equivalent source geometry identically regardless of native viewBox size', async () => {
  const SmallSource: FluentIcon = () => (
    <svg viewBox="10 20 16 16">
      <path d="M18 20h8v16h-8z" />
    </svg>
  );
  const LargeSource: FluentIcon = () => (
    <svg viewBox="0 0 48 48">
      <path d="M24 0h24v48H24z" />
    </svg>
  );
  const screen = await renderCoreAIComponent(
    <>
      <Illicon icon={SmallSource} size={40} aria-label="Small source" />
      <Illicon icon={LargeSource} size={40} aria-label="Large source" />
    </>,
  );
  await vi.waitFor(() => {
    const smallSvg = screen
      .getByRole('img', { name: 'Small source' })
      .element()
      .querySelector('svg')!;
    const largeSvg = screen
      .getByRole('img', { name: 'Large source' })
      .element()
      .querySelector('svg')!;
    expect(getPathD(smallSvg)).not.toBe('');
    expect(getPathD(smallSvg)).toBe(getPathD(largeSvg));
    const path = smallSvg.querySelector('path')!;
    expect(path.isPointInFill(new DOMPoint(19, 1))).toBe(false);
    expect(path.isPointInFill(new DOMPoint(21, 1))).toBe(true);
  });
});

test('fails explicitly when the source SVG has a malformed viewBox', async () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  const MalformedIcon: FluentIcon = () => (
    <svg viewBox="0 0 24.5 24">
      <path d="M0 0h24.5v24h-24.5z" />
    </svg>
  );

  const screen = await renderCoreAIComponent(
    <IlliconErrorBoundary>
      <Illicon icon={MalformedIcon} aria-label="Malformed" />
    </IlliconErrorBoundary>,
  );

  await vi.waitFor(() => {
    expect(screen.getByTestId('illicon-error').element().textContent).toMatch(
      /the source SVG must have a positive, whole-pixel viewBox/,
    );
  });
  expect(consoleError).toHaveBeenCalled();
});

test('fails explicitly when no 2D canvas context is available', async () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  vi.spyOn(OffscreenCanvas.prototype, 'getContext').mockImplementation(() => null);
  const UncachedIcon: FluentIcon = () => (
    <svg viewBox="0 0 24 24">
      <path d="M0 0h24v24h-24z" />
    </svg>
  );

  const screen = await renderCoreAIComponent(
    <IlliconErrorBoundary>
      <Illicon icon={UncachedIcon} aria-label="Uncached" />
    </IlliconErrorBoundary>,
  );

  await vi.waitFor(() => {
    expect(screen.getByTestId('illicon-error').element().textContent).toMatch(
      /2D canvas context is unavailable/,
    );
  });
  expect(consoleError).toHaveBeenCalled();
});
