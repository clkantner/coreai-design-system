// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as React from 'react';
import { EmptyState } from '../templates/EmptyState';
import { Button, Illicon, Link, tokens, type IlliconSize } from '@coreai-ds/react-components';
import {
  Brain24Filled,
  CodeRegular,
  Cube24Filled,
  Database24Filled,
  Heart24Filled,
  Rocket24Filled,
  Shield24Filled,
  Star24Filled,
} from '@fluentui/react-icons';
import type { Meta, StoryObj } from '@storybook/react-vite';

const agentIcon = (
  <svg viewBox="0 0 100 90" fill="currentColor">
    <path d="M25 0h25v5h-25zM60 0h15v5h-15zM20 5h30v5h-30zM55 5h25v5h-25zM15 10h35v5h-35zM55 10h5v5h-5zM65 10h20v5h-20zM15 15h35v5h-35zM55 15h5v5h-5zM65 15h25v5h-25zM10 20h35v5h-35zM50 20h10v5h-10zM65 20h25v5h-25zM5 25h40v5h-40zM50 25h5v5h-5zM60 25h35v5h-35zM5 30h40v5h-40zM50 30h5v5h-5zM60 30h35v5h-35zM0 35h40v5h-40zM50 35h5v5h-5zM60 35h40v5h-40zM0 40h40v5h-40zM45 40h10v5h-10zM60 40h40v5h-40zM0 45h40v5h-40zM45 45h5v5h-5zM55 45h45v5h-45zM0 50h40v5h-40zM45 50h5v5h-5zM55 50h45v5h-45zM5 55h30v5h-30zM45 55h5v5h-5zM55 55h40v5h-40zM5 60h30v5h-30zM40 60h10v5h-10zM55 60h40v5h-40zM10 65h25v5h-25zM40 65h5v5h-5zM50 65h40v5h-40zM15 70h20v5h-20zM40 70h5v5h-5zM50 70h35v5h-35zM15 75h15v5h-15zM35 75h10v5h-10zM50 75h35v5h-35zM20 80h20v5h-20zM50 80h30v5h-30zM25 85h10v5h-10zM45 85h30v5h-30z" />
  </svg>
);

const iconOptions = {
  Agent: agentIcon,
  Brain: Brain24Filled,
  Cube: Cube24Filled,
  Database: Database24Filled,
  Heart: Heart24Filled,
  Rocket: Rocket24Filled,
  Shield: Shield24Filled,
  Star: Star24Filled,
};
const exampleSizes: IlliconSize[] = [16, 20, 40, 48, 96, 100, 140, 192];

/**
 * `Illicon` turns a filled Fluent icon or SVG element into a dotted
 * illustration. It samples the original paths at the requested output size
 * and renders fixed 2px dots with 3px gaps, inheriting color through
 * `currentColor`. Use the Controls panel to choose an icon and size.
 */
export const Default: StoryObj<
  Omit<React.ComponentProps<typeof Illicon>, 'icon'> & { icon: keyof typeof iconOptions }
> = {
  args: {
    icon: 'Agent',
    size: 100,
    'aria-label': 'Dotted illustration',
  },
  argTypes: {
    icon: {
      description: 'SVG or Fluent Filled icon to render as a dotted illustration.',
      control: 'select',
      options: Object.keys(iconOptions),
    },
    size: {
      description: 'Width in pixels. Defaults to 100; smaller sizes may lose detail.',
      control: 'select',
      options: exampleSizes,
    },
  },
  parameters: {
    controls: { disable: false, include: ['icon', 'size'] },
  },
  render: ({ icon, ...args }) => <Illicon {...args} icon={iconOptions[icon]} />,
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
 * Uses an Illicon as the dotted illustration in an empty state.
 *
 * @summary Illicon used as an empty-state illustration.
 */
export const EmptyStateExample: StoryObj = {
  name: 'Empty State',
  render: () => (
    <EmptyState
      illustration={<Illicon icon={agentIcon} size={100} />}
      header="Benefit from Action Artifact"
      description="Disambiguate with text or exclude entirely."
      actions={
        <>
          <Button appearance="primary">Create agent</Button>
          <Button icon={<CodeRegular />}>Code</Button>
        </>
      }
      links={<Link href="#">How to make the coolest artifact ever</Link>}
    />
  ),
};

/**
 * Converts a filled icon or SVG into a single-color dotted illustration,
 * preserving aspect ratio with fixed 2px dots and 3px gaps.
 * Prefer Fluent Filled icons. Custom SVGs require static, flattened filled
 * paths without strokes, transforms, or effects. See IlliconProps for details.
 *
 * @summary Converts a filled Fluent icon into a dotted illustration.
 */
export default {
  title: 'Components/Illicon',
  component: Illicon,
} satisfies Meta<typeof Illicon>;
