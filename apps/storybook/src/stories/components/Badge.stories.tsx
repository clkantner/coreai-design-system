import { Badge, type BadgeProps, type JSXElement } from '@coreai/fluentui-react';
import { figmaDesign } from '../../utils/figma';

import * as React from 'react';

export const Default = (props: BadgeProps): JSXElement => <Badge {...props} />;

/**
 * A badge is a visual decoration for UI elements.
 *
 * Different badges can display different content.
 *
 * - `Badge` displays text and/or an icon
 * - `CounterBadge` displays numerical values
 * - `PresenceBadge` displays status
 *
 * @summary Compact visual decoration that displays text and/or an icon on a UI element.
 */
export default {
  title: 'Components/Badge/Badge',
  component: Badge,
  parameters: {
    ...figmaDesign('Badge'),
  },
};
