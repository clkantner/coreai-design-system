import type { Meta } from '@storybook/react-vite';
import { Accordion } from '@coreai-ds/react-components';

/**
 * Tests a Fluent story re-export from a local CSF file, without sharing a
 * component ID with the existing Accordion stories.
 */
const meta = {
  title: 'Experiments/MCP/Re-exported Accordion',
  component: Accordion,
} satisfies Meta<typeof Accordion>;

export default meta;

export { Default } from '../../../fluent-stories/packages/react-components/react-accordion/stories/src/Accordion/AccordionDefault.stories';
