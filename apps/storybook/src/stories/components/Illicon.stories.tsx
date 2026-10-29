// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Illicon } from '@coreai-ds/react-components';
import { IlliconCatalog } from '../../illicons/IlliconCatalog';

/**
 * Browse the starter illustrations, search names/tags, and copy component JSX.
 *
 * @summary Search curated Illicon artwork and copy JSX for use in a product.
 */
export const Catalog: StoryObj<typeof Illicon> = {
  render: () => <IlliconCatalog />,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: 'import { Illicon } from \'@coreai-ds/react-components\';\n\n<Illicon name="agents" />',
      },
    },
  },
};

/**
 * Displays approved, contributed CoreAI artwork with original SVG geometry
 * and monochrome color that follows the active Fluent theme.
 * Import { Illicon } from
 * '@coreai-ds/react-components' and use <Illicon name="agents" />.
 * The name selects fixed-size 80px artwork from the packaged catalog. Its default alt is empty
 * for decorative use; pass alt when the image conveys additional information.
 *
 * @summary Curated CoreAI dot-grid illustrations rendered unchanged.
 */
export default {
  title: 'Components/Illicon',
  component: Illicon,
  parameters: { layout: 'fullscreen', fullBleed: true },
} satisfies Meta<typeof Illicon>;
