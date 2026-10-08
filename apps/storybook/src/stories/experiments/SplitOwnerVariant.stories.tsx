import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Accordion, AccordionHeader, AccordionItem } from '@coreai-ds/react-components';

const meta = {
  title: 'Experiments/MCP/Split Owner',
  component: Accordion,
} satisfies Meta<typeof Accordion>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Variant: Story = {
  render: () => (
    <Accordion collapsible>
      <AccordionItem value="1">
        <AccordionHeader>Upstream variant owner marker</AccordionHeader>
      </AccordionItem>
    </Accordion>
  ),
};
