import type { Meta } from '@storybook/react-vite';
import { Button } from '@coreai-ds/react-components';

const meta = {
  title: 'Experiments/MCP/Provider Button',
  component: Button,
} satisfies Meta<typeof Button>;

export default meta;

export { Appearance } from '../../../fluent-stories/packages/react-components/react-button/stories/src/Button/ButtonAppearance.stories';
