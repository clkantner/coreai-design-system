import * as React from 'react';
import {
  CopyButton,
  Illicon,
  Label,
  Switch,
  ToggleButton,
  tokens,
  type IlliconSize,
} from '@coreai-ds/react-components';
import {
  Bot24Filled,
  Camera24Filled,
  Cloud24Filled,
  Emoji24Filled,
  Globe24Filled,
  Heart24Filled,
  Lightbulb24Filled,
  Mail24Filled,
  Rocket24Filled,
  Sparkle24Filled,
  Star24Filled,
  Trophy24Filled,
  type FluentIcon,
} from '@fluentui/react-icons';
import type { StoryObj } from '@storybook/react-vite';

/**
 * `Illicon` turns a filled Fluent icon into a dotted illustration. It
 * samples the original paths at the requested output size and chooses dot
 * spacing in CSS pixels, inheriting color through `currentColor`.
 */
export const Default: StoryObj = {
  render: () => <Illicon icon={Sparkle24Filled} aria-label="Sparkle" />,
};

/**
 * Any positive, finite `size` is supported, including 16, 20, and 40px.
 * Dot pitch is max(1, round(size / 24)) CSS pixels and dot diameter is 40%
 * of the pitch. The original vectors are sampled separately for each size.
 */
export const Sizes: StoryObj = {
  render: () => {
    const sizes: IlliconSize[] = [16, 20, 40, 48, 96, 100, 144, 192];
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
              <Illicon icon={Sparkle24Filled} size={size} aria-label={`Sparkle at ${size}px`} />
              <span className="illicon-sizes-example__label">{size}px</span>
            </div>
          ))}
        </div>
      </>
    );
  },
};

/**
 * `Illicon` has no fixed color of its own — it renders with `fill="currentColor"`,
 * so it inherits whatever color is set on it or an ancestor, including Fluent
 * design tokens.
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
 * and aspect ratio, while the requested output width determines dot spacing.
 */
export const IconGallery: StoryObj = {
  render: () => {
    const icons: { name: string; icon: FluentIcon }[] = [
      { name: 'Sparkle', icon: Sparkle24Filled },
      { name: 'Heart', icon: Heart24Filled },
      { name: 'Star', icon: Star24Filled },
      { name: 'Globe', icon: Globe24Filled },
      { name: 'Lightbulb', icon: Lightbulb24Filled },
      { name: 'Rocket', icon: Rocket24Filled },
      { name: 'Bot', icon: Bot24Filled },
      { name: 'Cloud', icon: Cloud24Filled },
      { name: 'Trophy', icon: Trophy24Filled },
      { name: 'Camera', icon: Camera24Filled },
      { name: 'Mail', icon: Mail24Filled },
      { name: 'Emoji', icon: Emoji24Filled },
    ];
    const styles = /* css */ `
      .illicon-icon-gallery-example {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
        column-gap: var(--spacingHorizontalM);
        row-gap: var(--spacingVerticalM);
      }

      .illicon-icon-gallery-example__item {
        display: flex;
        flex-direction: column;
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
              <Illicon icon={item.icon} size={72} aria-label={item.name} />
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
 * The background grid stays at a fixed 4px pitch regardless of icon size;
 * it is a pixel reference, not the adaptive dot-placement grid.
 */
export const Playground: StoryObj = {
  render: () => {
    const icons: { name: string; icon: FluentIcon }[] = [
      { name: 'Sparkle', icon: Sparkle24Filled },
      { name: 'Heart', icon: Heart24Filled },
      { name: 'Star', icon: Star24Filled },
      { name: 'Rocket', icon: Rocket24Filled },
    ];
    const sizes: IlliconSize[] = [16, 20, 40, 48, 96, 100, 144, 192];
    const GRID_PITCH = 4;

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
      const [size, setSize] = React.useState<IlliconSize>(96);
      const [showGrid, setShowGrid] = React.useState(true);
      const current = icons[iconIndex];
      const code = `<Illicon icon={${current.name}24Filled} size={${size}} aria-label="${current.name}" />`;

      const gridStyle: React.CSSProperties | undefined = showGrid
        ? {
            backgroundImage: `linear-gradient(to right, ${tokens.colorNeutralStroke2} 1px, transparent 1px), linear-gradient(to bottom, ${tokens.colorNeutralStroke2} 1px, transparent 1px)`,
            backgroundSize: `${GRID_PITCH}px ${GRID_PITCH}px`,
            outline: `1px solid ${tokens.colorNeutralStroke2}`,
          }
        : undefined;

      return (
        <div className="illicon-playground-example">
          <div className="illicon-playground-example__stage">
            <Illicon icon={current.icon} size={size} aria-label={current.name} style={gridStyle} />
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
                    icon={<item.icon />}
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
              label={`Show pixel reference grid (${GRID_PITCH}px pitch)`}
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
 * Turns a filled Fluent icon into a dotted illustration by rasterizing the
 * original vector paths at the requested output size, with size-aware dot
 * spacing in CSS pixels and preserved aspect ratio.
 *
 * @summary Converts a filled Fluent icon into a dotted illustration.
 */
export default {
  title: 'Components/Illicon',
  component: Illicon,
};
