import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  Button,
  makeStyles,
  tokens,
} from '@coreai-ds/react-components';
import { bundleIcon, CalendarMonthFilled, CalendarMonthRegular } from '@fluentui/react-icons';

const items = [
  { value: '1', heading: 'Module heading one', panel: 'Module panel one' },
  { value: '2', heading: 'Module heading two', panel: 'Module panel two' },
];

function ExampleItem({ value }: { value: string }) {
  return (
    <AccordionItem value={value}>
      <AccordionHeader>Helper heading</AccordionHeader>
      <AccordionPanel>Helper panel</AccordionPanel>
    </AccordionItem>
  );
}

const CalendarMonth = bundleIcon(CalendarMonthFilled, CalendarMonthRegular);
const useStyles = makeStyles({
  wrapper: {
    display: 'flex',
    columnGap: tokens.spacingHorizontalM,
  },
});

const meta = {
  title: 'Experiments/MCP/Module Dependencies',
  component: Accordion,
} satisfies Meta<typeof Accordion>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Data: Story = {
  render: () => (
    <Accordion>
      {items.map((item) => (
        <AccordionItem key={item.value} value={item.value}>
          <AccordionHeader>{item.heading}</AccordionHeader>
          <AccordionPanel>{item.panel}</AccordionPanel>
        </AccordionItem>
      ))}
    </Accordion>
  ),
};

export const Helper: Story = {
  render: () => (
    <Accordion>
      <ExampleItem value="1" />
    </Accordion>
  ),
};

export const StylesAndIcons: Story = {
  render: () => {
    const styles = useStyles();
    return (
      <div className={styles.wrapper}>
        <Button icon={<CalendarMonthRegular />}>Regular calendar</Button>
        <Button icon={<CalendarMonth />}>Bundled calendar</Button>
      </div>
    );
  },
};
