import type { Meta, StoryObj } from '@storybook/react-vite';
import { Accordion } from '@coreai-ds/react-components';
import { Default as FluentDefault } from '../../../fluent-stories/packages/react-components/react-accordion/stories/src/Accordion/AccordionDefault.stories';

/**
 * Tests direct assignment of an imported Fluent story to render, without
 * sharing a component ID with the existing Accordion stories.
 */
const meta = {
  title: 'Experiments/MCP/Imported Accordion Render',
  component: Accordion,
} satisfies Meta<typeof Accordion>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: FluentDefault,
};
