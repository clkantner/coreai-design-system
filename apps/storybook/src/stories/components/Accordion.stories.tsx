import * as React from 'react';
import { figmaDesign } from '../../utils/figma';
import {
  type JSXElement,
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
} from '@coreai/fluentui-react';

export const Default = (): JSXElement => (
  <Accordion>
    <AccordionItem value="1">
      <AccordionHeader>Accordion Header 1</AccordionHeader>
      <AccordionPanel>
        <div>Accordion Panel 1</div>
      </AccordionPanel>
    </AccordionItem>
    <AccordionItem value="2">
      <AccordionHeader>Accordion Header 2</AccordionHeader>
      <AccordionPanel>
        <div>Accordion Panel 2</div>
      </AccordionPanel>
    </AccordionItem>
    <AccordionItem value="3">
      <AccordionHeader>Accordion Header 3</AccordionHeader>
      <AccordionPanel>
        <div>Accordion Panel 3</div>
      </AccordionPanel>
    </AccordionItem>
  </Accordion>
);

/**
 * An accordion allows users to toggle the display of content by expanding or collapsing sections.
 *
 * @summary Vertically stacked sections that expand and collapse to show or hide content. Subcomponents: AccordionItem, AccordionHeader, AccordionPanel.
 */
export default {
  title: 'Components/Accordion',
  component: Accordion,
  subcomponents: { AccordionItem, AccordionHeader, AccordionPanel },
  parameters: {
    ...figmaDesign('Accordion'),
  },
};
