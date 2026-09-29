import { Label, type JSXElement, type LabelProps } from '@coreai/fluentui-react';
import { figmaDesign } from '../../utils/figma';

import * as React from 'react';

export const Default = (props: LabelProps): JSXElement => <Label {...props}>This is a label</Label>;

/**
 * A label provides a name or title for an input.
 *
 * @summary Provides a name or title for an input.
 */
export default {
  title: 'Components/Label',
  component: Label,
  parameters: {
    ...figmaDesign('Label'),
  },
};
