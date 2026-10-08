import type { Meta } from '@storybook/react-vite';
import { Accordion } from '@coreai-ds/react-components';

const meta = {
  title: 'Experiments/MCP/Provider Accordion',
  component: Accordion,
} satisfies Meta<typeof Accordion>;

export default meta;

export { Default } from '../../../fluent-stories/packages/react-components/react-accordion/stories/src/Accordion/AccordionDefault.stories';
export { Controlled } from '../../../fluent-stories/packages/react-components/react-accordion/stories/src/Accordion/AccordionControlled.stories';
