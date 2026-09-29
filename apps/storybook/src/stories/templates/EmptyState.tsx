/**
 * Templates / Empty State
 *
 * Centered empty-state pattern for pages and data surfaces that have no
 * content to display. Shows an icon, a title, a brief description, and an
 * optional action.
 *
 * Copy-paste starting point — not a published, importable component. Copy
 * this file into your codebase and adjust as needed.
 */

import * as React from 'react';
import { makeStyles, tokens, Text } from '@coreai/fluentui-react';

export const useEmptyStateStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacingVerticalS,
    padding: `${tokens.spacingVerticalXXXL} 0`,
    minHeight: '400px', // no token at this scale; matches Azure portal empty state min height
  },
  icon: {
    fontSize: tokens.fontSizeHero800,
    color: tokens.colorNeutralForeground3,
  },
  headingText: {
    color: tokens.colorNeutralForeground1,
  },
  bodyText: {
    color: tokens.colorNeutralForeground2,
  },
});

export interface EmptyStateProps {
  /** Icon component rendered above the title, e.g. `DatabaseRegular`. */
  icon: React.ComponentType<{ className?: string }>;
  /** Short heading, e.g. "No items yet". */
  title: string;
  /** One or two sentences of supporting guidance. */
  description: string;
  /** Optional call to action, typically a `<Button>`. Omit when there's nothing actionable (e.g. a "no results" state). */
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  const styles = useEmptyStateStyles();
  return (
    <div className={styles.root}>
      <Icon className={styles.icon} />
      <Text size={500} weight="semibold" className={styles.headingText}>
        {title}
      </Text>
      <Text size={300} className={styles.bodyText}>
        {description}
      </Text>
      {action}
    </div>
  );
}
