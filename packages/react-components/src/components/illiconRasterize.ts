/**
 * Private rasterization helpers backing `Illicon` — not exported from the
 * package root.
 *
 * Samples the original vector paths at the requested output size using a
 * size-aware grid. Coverage is cached per icon and size; generated dots use
 * CSS-pixel coordinates rather than a scaled source viewBox.
 */

/** Supersampling factor: each grid cell is rasterized at SS×SS pixels before being averaged down. */
const SUPERSAMPLE = 4;
/** A grid cell becomes a dot once its averaged alpha coverage reaches this fraction. */
const COVERAGE_THRESHOLD = 0.5;
const DOT_DIAMETER_RATIO = 0.4;

/** Aim for 24 dots across, with whole-CSS-pixel spacing even at small sizes. */
export function getDotSettings(size: number): { pitch: number; diameter: number } {
  if (!Number.isFinite(size) || size <= 0) {
    throw new Error(`Illicon: size ${size} must be a positive, finite number.`);
  }
  const pitch = Math.max(1, Math.round(size / 24));
  return { pitch, diameter: pitch * DOT_DIAMETER_RATIO };
}

export interface RasterizedIcon {
  /** Rendered dimensions in CSS pixels. */
  width: number;
  height: number;
  columns: number;
  rows: number;
  cellWidth: number;
  cellHeight: number;
  offsetX: number;
  offsetY: number;
  diameter: number;
  /** Row-major alpha coverage per grid cell, each in the `[0, 1]` range. */
  coverage: Float32Array;
}

type Context2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

const coverageCache = new WeakMap<object, Map<number, RasterizedIcon>>();

/** Read a previously sampled icon's coverage, if any, without sampling it. */
export function peekCoverage(key: object, size: number): RasterizedIcon | undefined {
  return coverageCache.get(key)?.get(size);
}

function create2dContext(width: number, height: number): Context2D | null {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(width, height).getContext('2d', { willReadFrequently: true });
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas.getContext('2d', { willReadFrequently: true });
}

/**
 * Rasterize the source vector paths directly onto the output-size dot grid.
 * Repeated requests for the same icon and size reuse the sampled coverage.
 *
 * @throws if the source SVG's viewBox is missing, non-positive, or not a
 * whole-pixel size, or if a 2D canvas context is unavailable.
 */
export function sampleCoverage(key: object, svg: SVGSVGElement, size: number): RasterizedIcon {
  const { pitch, diameter } = getDotSettings(size);
  const cached = peekCoverage(key, size);
  if (cached) return cached;

  const viewBox = svg.viewBox.baseVal;
  const sourceWidth =
    viewBox && viewBox.width > 0 ? viewBox.width : Number(svg.getAttribute('width'));
  const sourceHeight =
    viewBox && viewBox.height > 0 ? viewBox.height : Number(svg.getAttribute('height'));
  const originX = viewBox?.x ?? 0;
  const originY = viewBox?.y ?? 0;

  if (
    !Number.isInteger(sourceWidth) ||
    !Number.isInteger(sourceHeight) ||
    sourceWidth <= 0 ||
    sourceHeight <= 0
  ) {
    throw new Error('Illicon: the source SVG must have a positive, whole-pixel viewBox.');
  }

  const scale = size / sourceWidth;
  const width = size;
  const height = sourceHeight * scale;
  const cellWidth = Math.min(pitch, width);
  const cellHeight = Math.min(pitch, height);
  const columns = Math.max(1, Math.floor(width / cellWidth));
  const rows = Math.max(1, Math.floor(height / cellHeight));
  // Centre complete cells instead of emitting clipped dots at partial edge cells.
  const offsetX = (width - columns * cellWidth) / 2;
  const offsetY = (height - rows * cellHeight) / 2;
  const rootFillRule = (svg.getAttribute('fill-rule') as CanvasFillRule | null) ?? 'nonzero';
  const rasterWidth = columns * SUPERSAMPLE;
  const rasterHeight = rows * SUPERSAMPLE;
  const ctx = create2dContext(rasterWidth, rasterHeight);
  if (!ctx) throw new Error('Illicon: 2D canvas context is unavailable.');

  ctx.setTransform(
    (scale * SUPERSAMPLE) / cellWidth,
    0,
    0,
    (scale * SUPERSAMPLE) / cellHeight,
    -((originX * scale + offsetX) * SUPERSAMPLE) / cellWidth,
    -((originY * scale + offsetY) * SUPERSAMPLE) / cellHeight,
  );

  svg.querySelectorAll('path').forEach((path) => {
    const d = path.getAttribute('d');
    if (!d) return;
    const fillRule = (path.getAttribute('fill-rule') as CanvasFillRule | null) ?? rootFillRule;
    ctx.fill(new Path2D(d), fillRule);
  });

  const { data } = ctx.getImageData(0, 0, rasterWidth, rasterHeight);
  const coverage = new Float32Array(columns * rows);
  for (let y = 0; y < rasterHeight; y++) {
    const row = Math.floor(y / SUPERSAMPLE) * columns;
    const base = y * rasterWidth * 4;
    for (let x = 0; x < rasterWidth; x++) {
      coverage[row + Math.floor(x / SUPERSAMPLE)] += data[base + x * 4 + 3];
    }
  }

  const normalize = 1 / (255 * SUPERSAMPLE * SUPERSAMPLE);
  for (let i = 0; i < coverage.length; i++) coverage[i] *= normalize;

  const rasterized: RasterizedIcon = {
    width,
    height,
    columns,
    rows,
    cellWidth,
    cellHeight,
    offsetX,
    offsetY,
    diameter: Math.min(diameter, cellWidth * DOT_DIAMETER_RATIO, cellHeight * DOT_DIAMETER_RATIO),
    coverage,
  };
  const sizes = coverageCache.get(key) ?? new Map<number, RasterizedIcon>();
  sizes.set(size, rasterized);
  coverageCache.set(key, sizes);
  return rasterized;
}

const round = (n: number) => +n.toFixed(4);

/** Build one SVG path containing a centred, spaced dot for every occupied grid cell. */
export function buildDottedPath({
  columns,
  rows,
  cellWidth,
  cellHeight,
  offsetX,
  offsetY,
  diameter,
  coverage,
}: RasterizedIcon): string {
  const radius = round(diameter / 2);
  let d = '';
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < columns; x++) {
      if (coverage[y * columns + x] < COVERAGE_THRESHOLD) continue;
      const centerX = offsetX + (x + 0.5) * cellWidth;
      const centerY = offsetY + (y + 0.5) * cellHeight;
      // Quarter arcs avoid browser radius correction at a semicircle's 180-degree boundary.
      d += `M${round(centerX - radius)} ${round(centerY)}a${radius} ${radius} 0 0 1 ${radius} -${radius}a${radius} ${radius} 0 0 1 ${radius} ${radius}a${radius} ${radius} 0 0 1 -${radius} ${radius}a${radius} ${radius} 0 0 1 -${radius} -${radius}z`;
    }
  }
  return d;
}
