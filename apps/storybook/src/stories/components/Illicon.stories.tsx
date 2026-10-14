import * as React from 'react';
import {
  CopyButton,
  Illicon,
  Label,
  Switch,
  ToggleButton,
  tokens,
  type IlliconIcon,
  type IlliconSize,
} from '@coreai-ds/react-components';
import {
  Beaker24Filled,
  Brain24Filled,
  Briefcase24Filled,
  BuildingMultiple24Filled,
  City24Filled,
  Code24Filled,
  Cube24Filled,
  Database24Filled,
  DocumentText24Filled,
  Flowchart24Filled,
  Heart24Filled,
  Headphones24Filled,
  Patch24Filled,
  Rocket24Filled,
  Scales24Filled,
  Shield24Filled,
  Star24Filled,
  type FluentIcon,
} from '@fluentui/react-icons';
import type { StoryObj } from '@storybook/react-vite';

/**
 * `Illicon` turns a filled Fluent icon or SVG element into a dotted
 * illustration. It samples the original paths at the requested output size
 * and renders fixed 2px dots with 3px gaps, inheriting color through
 * `currentColor`.
 */
export const Default: StoryObj = {
  render: () => (
    <Illicon
      icon={
        <svg viewBox="0 0 100 90" fill="currentColor">
          <path d="M25 0h25v5h-25zM60 0h15v5h-15zM20 5h30v5h-30zM55 5h25v5h-25zM15 10h35v5h-35zM55 10h5v5h-5zM65 10h20v5h-20zM15 15h35v5h-35zM55 15h5v5h-5zM65 15h25v5h-25zM10 20h35v5h-35zM50 20h10v5h-10zM65 20h25v5h-25zM5 25h40v5h-40zM50 25h5v5h-5zM60 25h35v5h-35zM5 30h40v5h-40zM50 30h5v5h-5zM60 30h35v5h-35zM0 35h40v5h-40zM50 35h5v5h-5zM60 35h40v5h-40zM0 40h40v5h-40zM45 40h10v5h-10zM60 40h40v5h-40zM0 45h40v5h-40zM45 45h5v5h-5zM55 45h45v5h-45zM0 50h40v5h-40zM45 50h5v5h-5zM55 50h45v5h-45zM5 55h30v5h-30zM45 55h5v5h-5zM55 55h40v5h-40zM5 60h30v5h-30zM40 60h10v5h-10zM55 60h40v5h-40zM10 65h25v5h-25zM40 65h5v5h-5zM50 65h40v5h-40zM15 70h20v5h-20zM40 70h5v5h-5zM50 70h35v5h-35zM15 75h15v5h-15zM35 75h10v5h-10zM50 75h35v5h-35zM20 80h20v5h-20zM50 80h30v5h-30zM25 85h10v5h-10zM45 85h30v5h-30z" />
        </svg>
      }
      aria-label="Microsoft Foundry"
    />
  ),
};

/**
 * Any positive, finite `size` is supported, including 16, 20, and 40px.
 * Dots have a fixed 2px diameter and 3px gap. The original vectors are
 * sampled separately for each size.
 */
export const Sizes: StoryObj = {
  render: () => {
    const foundryIcon = (
      <svg viewBox="0 0 100 90" fill="currentColor">
        <path d="M25 0h25v5h-25zM60 0h15v5h-15zM20 5h30v5h-30zM55 5h25v5h-25zM15 10h35v5h-35zM55 10h5v5h-5zM65 10h20v5h-20zM15 15h35v5h-35zM55 15h5v5h-5zM65 15h25v5h-25zM10 20h35v5h-35zM50 20h10v5h-10zM65 20h25v5h-25zM5 25h40v5h-40zM50 25h5v5h-5zM60 25h35v5h-35zM5 30h40v5h-40zM50 30h5v5h-5zM60 30h35v5h-35zM0 35h40v5h-40zM50 35h5v5h-5zM60 35h40v5h-40zM0 40h40v5h-40zM45 40h10v5h-10zM60 40h40v5h-40zM0 45h40v5h-40zM45 45h5v5h-5zM55 45h45v5h-45zM0 50h40v5h-40zM45 50h5v5h-5zM55 50h45v5h-45zM5 55h30v5h-30zM45 55h5v5h-5zM55 55h40v5h-40zM5 60h30v5h-30zM40 60h10v5h-10zM55 60h40v5h-40zM10 65h25v5h-25zM40 65h5v5h-5zM50 65h40v5h-40zM15 70h20v5h-20zM40 70h5v5h-5zM50 70h35v5h-35zM15 75h15v5h-15zM35 75h10v5h-10zM50 75h35v5h-35zM20 80h20v5h-20zM50 80h30v5h-30zM25 85h10v5h-10zM45 85h30v5h-30z" />
      </svg>
    );
    const sizes: IlliconSize[] = [16, 20, 40, 48, 96, 100, 140, 192];
    const styles = /* css */ `
      .illicon-sizes-example {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-end;
        column-gap: var(--spacingHorizontalL);
        row-gap: var(--spacingVerticalL);
      }

      .illicon-sizes-example__item {
        display: flex;
        flex-direction: column;
        align-items: center;
        row-gap: var(--spacingVerticalS);
      }

      .illicon-sizes-example__label {
        font-size: var(--fontSizeBase200);
        color: var(--colorNeutralForeground3);
      }
    `;

    return (
      <>
        <style>{styles}</style>
        <div className="illicon-sizes-example">
          {sizes.map((size) => (
            <div key={size} className="illicon-sizes-example__item">
              <Illicon icon={foundryIcon} size={size} aria-label={`Microsoft Foundry at ${size}px`} />
              <span className="illicon-sizes-example__label">{size}px</span>
            </div>
          ))}
        </div>
      </>
    );
  },
};

/**
 * `Illicon` is white by default and renders with `fill="currentColor"`.
 * Set `color` on the component to use another value, including Fluent design
 * tokens.
 */
export const Colors: StoryObj = {
  render: () => {
    const colors = [
      { name: 'Foreground', value: tokens.colorNeutralForeground1 },
      { name: 'Brand', value: tokens.colorBrandForeground1 },
      { name: 'Berry', value: tokens.colorPaletteBerryForeground1 },
      { name: 'Lavender', value: tokens.colorPaletteLavenderForeground2 },
      { name: 'Teal', value: tokens.colorPaletteTealForeground2 },
      { name: 'Marigold', value: tokens.colorPaletteMarigoldForeground1 },
    ];
    const styles = /* css */ `
      .illicon-colors-example {
        display: flex;
        flex-wrap: wrap;
        column-gap: var(--spacingHorizontalL);
        row-gap: var(--spacingVerticalL);
      }

      .illicon-colors-example__item {
        display: flex;
        flex-direction: column;
        align-items: center;
        row-gap: var(--spacingVerticalS);
      }

      .illicon-colors-example__label {
        font-size: var(--fontSizeBase200);
        color: var(--colorNeutralForeground3);
      }
    `;

    return (
      <>
        <style>{styles}</style>
        <div className="illicon-colors-example">
          {colors.map((color) => (
            <div key={color.name} className="illicon-colors-example__item">
              <Illicon
                icon={Heart24Filled}
                size={72}
                aria-label={`Heart in ${color.name}`}
                style={{ color: color.value }}
              />
              <span className="illicon-colors-example__label">{color.name}</span>
            </div>
          ))}
        </div>
      </>
    );
  },
};

/**
 * Any filled Fluent icon can be converted. Its viewBox defines the shape
 * and aspect ratio, while dots retain their fixed size and spacing.
 */
export const IconGallery: StoryObj = {
  render: () => {
    const icons: { name: string; icon: FluentIcon }[] = [
      { name: 'Brain', icon: Brain24Filled },
      { name: 'Flowchart', icon: Flowchart24Filled },
      { name: 'Cube', icon: Cube24Filled },
      { name: 'Patch', icon: Patch24Filled },
      { name: 'Beaker', icon: Beaker24Filled },
      { name: 'Database', icon: Database24Filled },
      { name: 'Document', icon: DocumentText24Filled },
      { name: 'Scales', icon: Scales24Filled },
      { name: 'Shield', icon: Shield24Filled },
      { name: 'Briefcase', icon: Briefcase24Filled },
      { name: 'City', icon: City24Filled },
      { name: 'Buildings', icon: BuildingMultiple24Filled },
      { name: 'Headphones', icon: Headphones24Filled },
      { name: 'Code', icon: Code24Filled },
    ];
    const styles = /* css */ `
      .illicon-icon-gallery-example {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        align-items: flex-start;
        gap: var(--spacingVerticalM) var(--spacingHorizontalM);
        width: 100%;
      }

      .illicon-icon-gallery-example__item {
        display: flex;
        flex-direction: column;
        flex: 0 0 160px;
        align-items: center;
        row-gap: var(--spacingVerticalS);
      }

      .illicon-icon-gallery-example__label {
        font-size: var(--fontSizeBase200);
        color: var(--colorNeutralForeground3);
      }
    `;

    return (
      <>
        <style>{styles}</style>
        <div className="illicon-icon-gallery-example">
          {icons.map((item) => (
            <div key={item.name} className="illicon-icon-gallery-example__item">
              <Illicon icon={item.icon} aria-label={item.name} />
              <span className="illicon-icon-gallery-example__label">{item.name}</span>
            </div>
          ))}
        </div>
      </>
    );
  },
};

/**
 * Pick an icon and a size to preview the result, then copy the matching JSX.
 * Toggle the screen-pixel hairline grid to inspect each CSS pixel.
 */
export const Playground: StoryObj = {
  render: () => {
    const foundryIcon = (
      <svg viewBox="0 0 100 90" fill="currentColor">
        <path d="M25 0h25v5h-25zM60 0h15v5h-15zM20 5h30v5h-30zM55 5h25v5h-25zM15 10h35v5h-35zM55 10h5v5h-5zM65 10h20v5h-20zM15 15h35v5h-35zM55 15h5v5h-5zM65 15h25v5h-25zM10 20h35v5h-35zM50 20h10v5h-10zM65 20h25v5h-25zM5 25h40v5h-40zM50 25h5v5h-5zM60 25h35v5h-35zM5 30h40v5h-40zM50 30h5v5h-5zM60 30h35v5h-35zM0 35h40v5h-40zM50 35h5v5h-5zM60 35h40v5h-40zM0 40h40v5h-40zM45 40h10v5h-10zM60 40h40v5h-40zM0 45h40v5h-40zM45 45h5v5h-5zM55 45h45v5h-45zM0 50h40v5h-40zM45 50h5v5h-5zM55 50h45v5h-45zM5 55h30v5h-30zM45 55h5v5h-5zM55 55h40v5h-40zM5 60h30v5h-30zM40 60h10v5h-10zM55 60h40v5h-40zM10 65h25v5h-25zM40 65h5v5h-5zM50 65h40v5h-40zM15 70h20v5h-20zM40 70h5v5h-5zM50 70h35v5h-35zM15 75h15v5h-15zM35 75h10v5h-10zM50 75h35v5h-35zM20 80h20v5h-20zM50 80h30v5h-30zM25 85h10v5h-10zM45 85h30v5h-30z" />
      </svg>
    );
    const icons: { name: string; icon: IlliconIcon; iconExpression: string }[] = [
      {
        name: 'Microsoft Foundry',
        icon: foundryIcon,
        iconExpression: `(
    <svg viewBox="0 0 100 90" fill="currentColor">
      <path d="M25 0h25v5h-25zM60 0h15v5h-15zM20 5h30v5h-30zM55 5h25v5h-25zM15 10h35v5h-35zM55 10h5v5h-5zM65 10h20v5h-20zM15 15h35v5h-35zM55 15h5v5h-5zM65 15h25v5h-25zM10 20h35v5h-35zM50 20h10v5h-10zM65 20h25v5h-25zM5 25h40v5h-40zM50 25h5v5h-5zM60 25h35v5h-35zM5 30h40v5h-40zM50 30h5v5h-5zM60 30h35v5h-35zM0 35h40v5h-40zM50 35h5v5h-5zM60 35h40v5h-40zM0 40h40v5h-40zM45 40h10v5h-10zM60 40h40v5h-40zM0 45h40v5h-40zM45 45h5v5h-5zM55 45h45v5h-45zM0 50h40v5h-40zM45 50h5v5h-5zM55 50h45v5h-45zM5 55h30v5h-30zM45 55h5v5h-5zM55 55h40v5h-40zM5 60h30v5h-30zM40 60h10v5h-10zM55 60h40v5h-40zM10 65h25v5h-25zM40 65h5v5h-5zM50 65h40v5h-40zM15 70h20v5h-20zM40 70h5v5h-5zM50 70h35v5h-35zM15 75h15v5h-15zM35 75h10v5h-10zM50 75h35v5h-35zM20 80h20v5h-20zM50 80h30v5h-30zM25 85h10v5h-10zM45 85h30v5h-30z" />
    </svg>
  )`,
      },
      { name: 'Heart', icon: Heart24Filled, iconExpression: 'Heart24Filled' },
      { name: 'Star', icon: Star24Filled, iconExpression: 'Star24Filled' },
      { name: 'Rocket', icon: Rocket24Filled, iconExpression: 'Rocket24Filled' },
    ];
    const sizes: IlliconSize[] = [16, 20, 40, 48, 96, 100, 140, 192];
    const DOT_PITCH = 5;
    const GRID_PITCH = 1;

    const styles = /* css */ `
      .illicon-playground-example {
        display: flex;
        flex-direction: column;
        row-gap: var(--spacingVerticalL);
      }

      .illicon-playground-example__stage {
        display: grid;
        place-items: center;
        min-height: 220px;
        border-radius: var(--borderRadiusXLarge);
        background-color: var(--colorNeutralBackground2);
      }

      .illicon-playground-example__controls {
        display: flex;
        flex-wrap: wrap;
        column-gap: var(--spacingHorizontalL);
        row-gap: var(--spacingVerticalM);
      }

      .illicon-playground-example__field {
        display: flex;
        flex-direction: column;
        row-gap: var(--spacingVerticalS);
      }

      .illicon-playground-example__row {
        display: flex;
        column-gap: var(--spacingHorizontalS);
      }

      .illicon-playground-example__code-row {
        display: flex;
        align-items: center;
        column-gap: var(--spacingHorizontalS);
      }

      .illicon-playground-example__code {
        margin: 0;
        padding: var(--spacingVerticalM) var(--spacingHorizontalM);
        font-family: var(--fontFamilyMonospace);
        font-size: var(--fontSizeBase200);
        background-color: var(--colorNeutralBackground3);
        border-radius: var(--borderRadiusMedium);
        white-space: pre;
      }
    `;

    function PlaygroundExample(): React.JSX.Element {
      const [iconIndex, setIconIndex] = React.useState(0);
      const [size, setSize] = React.useState<IlliconSize>(100);
      const [showGrid, setShowGrid] = React.useState(true);
      const [gridLineWidth, setGridLineWidth] = React.useState(0.2);
      const current = icons[iconIndex];
      const code = `<Illicon
  icon={${current.iconExpression}}
  size={${size}}
  aria-label="${current.name}"
/>`;

      React.useEffect(() => {
        const updateGridLineWidth = () => {
          setGridLineWidth(Math.min(0.2, 1 / window.devicePixelRatio));
        };

        updateGridLineWidth();
        window.addEventListener('resize', updateGridLineWidth);
        return () => window.removeEventListener('resize', updateGridLineWidth);
      }, []);

      const gridLineStart = (GRID_PITCH - gridLineWidth) / 2;
      const gridLineEnd = gridLineStart + gridLineWidth;
      const gridOffset = Math.floor(size / DOT_PITCH) % 2 === 0 ? GRID_PITCH / 2 : 0;
      const gridStyle: React.CSSProperties | undefined = showGrid
        ? {
            backgroundImage: `linear-gradient(to right, transparent ${gridLineStart}px, ${tokens.colorNeutralStroke2} ${gridLineStart}px, ${tokens.colorNeutralStroke2} ${gridLineEnd}px, transparent ${gridLineEnd}px), linear-gradient(to bottom, transparent ${gridLineStart}px, ${tokens.colorNeutralStroke2} ${gridLineStart}px, ${tokens.colorNeutralStroke2} ${gridLineEnd}px, transparent ${gridLineEnd}px)`,
            backgroundPosition: `calc(50% + ${gridOffset}px) calc(50% + ${gridOffset}px)`,
            backgroundSize: `${GRID_PITCH}px ${GRID_PITCH}px`,
          }
        : undefined;

      return (
        <div className="illicon-playground-example">
          <div className="illicon-playground-example__stage" style={gridStyle}>
            <Illicon icon={current.icon} size={size} aria-label={current.name} />
          </div>

          <div className="illicon-playground-example__controls">
            <div className="illicon-playground-example__field">
              <Label weight="semibold">icon</Label>
              <div className="illicon-playground-example__row">
                {icons.map((item, index) => (
                  <ToggleButton
                    key={item.name}
                    size="small"
                    checked={index === iconIndex}
                    appearance={index === iconIndex ? 'primary' : 'subtle'}
                    icon={
                      React.isValidElement<React.SVGProps<SVGSVGElement>>(item.icon)
                        ? React.cloneElement(item.icon, { width: 20, height: 20 })
                        : React.createElement(item.icon)
                    }
                    onClick={() => setIconIndex(index)}
                  />
                ))}
              </div>
            </div>

            <div className="illicon-playground-example__field">
              <Label weight="semibold">size</Label>
              <div className="illicon-playground-example__row">
                {sizes.map((value) => (
                  <ToggleButton
                    key={value}
                    size="small"
                    shape="circular"
                    checked={value === size}
                    onClick={() => setSize(value)}
                  >
                    {value}
                  </ToggleButton>
                ))}
              </div>
            </div>

            <Switch
              checked={showGrid}
              onChange={(_, data) => setShowGrid(data.checked)}
              label="Show 1px pixel grid"
            />
          </div>

          <div className="illicon-playground-example__code-row">
            <pre className="illicon-playground-example__code">{code}</pre>
            <CopyButton aria-label="Copy Illicon usage" contentToCopy={code} />
          </div>
        </div>
      );
    }

    return (
      <>
        <style>{styles}</style>
        <PlaygroundExample />
      </>
    );
  },
};

/**
 * Turns a filled Fluent icon or SVG element into a dotted illustration by
 * rasterizing the original vector paths at the requested output size, with
 * fixed 2px dots, 3px gaps, and preserved aspect ratio.
 *
 * @summary Converts a filled Fluent icon into a dotted illustration.
 */
export default {
  title: 'Components/Illicon',
  component: Illicon,
};
