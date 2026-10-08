import type { Meta } from '@storybook/react-vite';
import { DataGrid } from '@coreai-ds/react-components';

const meta = {
  title: 'Experiments/MCP/Provider DataGrid',
  component: DataGrid,
} satisfies Meta<typeof DataGrid>;

export default meta;

export { Default } from '../../../fluent-stories/packages/react-components/react-table/stories/src/DataGrid/Default.stories';
