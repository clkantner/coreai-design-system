import { PresenceBadge, type JSXElement } from '@coreai/fluentui-react';
import { figmaDesign } from '../../utils/figma';

import * as React from 'react';

export const Default = (): JSXElement => <PresenceBadge />;

/**
 * A presence badge is a badge that displays a status indicator such as available, away, or busy.
 *
 * @summary Badge that shows a presence status such as available, away, or busy.
 */
export default {
  title: 'Components/Badge/PresenceBadge',
  component: PresenceBadge,
  parameters: {
    ...figmaDesign('Presence Badge'),
  },
};
