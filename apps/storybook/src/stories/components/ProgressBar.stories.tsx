import { Field, ProgressBar, type JSXElement, type ProgressBarProps } from '@coreai/fluentui-react';
import { figmaDesign } from '../../utils/figma';

import * as React from 'react';

export const Default = (props: Partial<ProgressBarProps>): JSXElement => {
  return (
    <Field validationMessage="Default ProgressBar" validationState="none">
      <ProgressBar {...props} value={0.5} />
    </Field>
  );
};

/**
 * A ProgressBar provides a visual representation of content being loaded or processed.
 *
 * @summary Visualizes the progress of content being loaded or processed.
 */
export default {
  title: 'Components/ProgressBar',
  component: ProgressBar,
  parameters: {
    ...figmaDesign('ProgressBar'),
  },
};
