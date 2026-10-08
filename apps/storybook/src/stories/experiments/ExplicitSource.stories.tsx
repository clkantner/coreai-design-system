import type { Meta, StoryObj } from '@storybook/react-vite';
import { Accordion } from '@coreai-ds/react-components';
import { Default as FluentDefault } from '../../../fluent-stories/packages/react-components/react-accordion/stories/src/Accordion/AccordionDefault.stories';
import fluentSource from '../../../fluent-stories/packages/react-components/react-accordion/stories/src/Accordion/AccordionDefault.stories?raw';

/**
 * Component JSDoc marker for source parameter testing.
 */
const meta = {
  title: 'Experiments/MCP/Explicit Source',
  component: Accordion,
  parameters: {
    docs: {
      description: {
        component: 'Component parameter description marker.',
      },
    },
  },
} satisfies Meta<typeof Accordion>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Story JSDoc marker for literal source testing.
 */
export const Literal: Story = {
  render: FluentDefault,
  parameters: {
    docs: {
      description: {
        story: 'Literal parameter description marker.',
      },
      source: {
        code: `import * as React from 'react';
import { Accordion, AccordionHeader, AccordionItem, AccordionPanel } from '@coreai-ds/react-components';

export const ExplicitAccordion = () => (
  <Accordion>
    <AccordionItem value="1">
      <AccordionHeader>Accordion Header 1</AccordionHeader>
      <AccordionPanel><div>Accordion Panel 1</div></AccordionPanel>
    </AccordionItem>
    <AccordionItem value="2">
      <AccordionHeader>Accordion Header 2</AccordionHeader>
      <AccordionPanel><div>Accordion Panel 2</div></AccordionPanel>
    </AccordionItem>
    <AccordionItem value="3">
      <AccordionHeader>Accordion Header 3</AccordionHeader>
      <AccordionPanel><div>Accordion Panel 3</div></AccordionPanel>
    </AccordionItem>
  </Accordion>
);`,
      },
    },
  },
};

export const RawSource: Story = {
  render: FluentDefault,
  parameters: {
    docs: {
      description: {
        story: 'Raw source parameter description marker.',
      },
      source: {
        code: fluentSource.replace(/@fluentui\/react-components/g, '@coreai-ds/react-components'),
      },
    },
  },
};
