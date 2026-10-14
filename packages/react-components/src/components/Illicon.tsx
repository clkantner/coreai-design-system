/**
 * `Illicon` — turns a filled Fluent icon or SVG element into a dotted illustration.
 *
 * Original vector paths are sampled at the requested output size. Dots have
 * a fixed 2px diameter and 3px gap. Coverage is cached per icon and size.
 * Output uses CSS-pixel coordinates and preserves the source aspect ratio.
 */
import * as React from 'react';
import {
  makeStyles,
  mergeClasses,
  tokens,
  type ForwardRefComponent,
} from '@fluentui/react-components';
import type { FluentIcon } from '@fluentui/react-icons';
import {
  buildDottedPath,
  getDotSettings,
  peekCoverage,
  sampleCoverage,
} from './illiconRasterize.js';

export type IlliconSize = number;
export type IlliconIcon =
  | FluentIcon
  | React.ReactElement<React.SVGProps<SVGSVGElement>>;

export type IlliconProps = Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'> & {
  /** A filled Fluent icon component or SVG element. Its viewBox defines the shape and aspect ratio. */
  icon: IlliconIcon;
  /**
   * Rendered width in CSS pixels. Must be positive and finite.
   * @default 100
   */
  size?: IlliconSize;
};

// Layout effects don't run during SSR, so this only matters for the warning
// React logs when `useLayoutEffect` is referenced in a server render; fall
// back to `useEffect` there instead.
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect;

const useIlliconStyles = makeStyles({
  root: {
    display: 'inline-flex',
    flexShrink: 0,
    color: tokens.colorNeutralForegroundOnBrand,
  },
  svg: {
    display: 'block',
  },
});

/**
 * Turns a filled Fluent icon or SVG element into a dotted illustration. Pass
 * an accessible name via `aria-label` for a meaningful image; omit it to treat
 * the icon as decorative.
 */
export const Illicon: ForwardRefComponent<IlliconProps> = React.forwardRef<
  HTMLSpanElement,
  IlliconProps
>((props, ref) => {
  const { icon, size = 100, className, style, 'aria-label': ariaLabel, ...rest } = props;
  const styles = useIlliconStyles();
  const sourceRef = React.useRef<HTMLSpanElement>(null);
  const [, forceRerender] = React.useReducer((n: number) => n + 1, 0);

  getDotSettings(size);
  const coverage = peekCoverage(icon, size);

  // A new icon/size pair samples the original paths before paint.
  useIsomorphicLayoutEffect(() => {
    if (coverage) return;
    const svg = sourceRef.current?.querySelector('svg');
    if (svg) {
      sampleCoverage(icon, svg, size);
      forceRerender();
    }
  }, [icon, coverage, size]);

  const renderedHeight = coverage ? coverage.height : size;
  const dottedPath = React.useMemo(() => (coverage ? buildDottedPath(coverage) : ''), [coverage]);

  const labelled = Boolean(ariaLabel);

  return (
    <span
      ref={ref}
      role={labelled ? 'img' : undefined}
      aria-label={ariaLabel}
      aria-hidden={labelled ? undefined : true}
      className={mergeClasses('fui-Illicon', styles.root, className)}
      style={{ width: size, height: renderedHeight, ...style }}
      {...rest}
    >
      {coverage ? (
        <svg
          className={styles.svg}
          width={size}
          height={renderedHeight}
          viewBox={`0 0 ${size} ${renderedHeight}`}
          focusable="false"
        >
          <path d={dottedPath} fill="currentColor" />
        </svg>
      ) : (
        // Rendered only until the icon is sampled; never visible.
        <span ref={sourceRef} hidden>
          {React.isValidElement(icon) ? icon : React.createElement(icon)}
        </span>
      )}
    </span>
  );
}) as ForwardRefComponent<IlliconProps>;

Illicon.displayName = 'Illicon';
