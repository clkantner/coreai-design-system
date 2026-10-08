import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Accordion, AccordionHeader, AccordionItem } from '@coreai-ds/react-components';

const meta = {
  title: 'Experiments/MCP/Single Owner',
  component: Accordion,
} satisfies Meta<typeof Accordion>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Accordion>
      <AccordionItem value="1">
        <AccordionHeader>Local default owner marker</AccordionHeader>
      </AccordionItem>
    </Accordion>
  ),
};

export const Variant: Story = {
  render: () => (
    <Accordion collapsible>
      <AccordionItem value="1">
        <AccordionHeader>Upstream variant owner marker</AccordionHeader>
      </AccordionItem>
    </Accordion>
  ),
};
