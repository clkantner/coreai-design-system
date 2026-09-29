import * as React from 'react';
import { Button } from '@coreai/fluentui-react';
import { useThemeMode, type ThemePreference } from '../theme/ThemeProvider';
import { ThemeIcon } from './Icons';

const CYCLE: ThemePreference[] = ['light', 'dark'];

const LABELS: Record<ThemePreference, string> = {
  light: 'Light theme',
  dark: 'Dark theme',
};

export function ThemeSwitcher() {
  const { preference, setPreference } = useThemeMode();

  const onClick = () => {
    const next = CYCLE[(CYCLE.indexOf(preference) + 1) % CYCLE.length];
    setPreference(next);
  };

  return (
    <Button
      shape="rounded"
      appearance="subtle"
      icon={<ThemeIcon type={preference} />}
      onClick={onClick}
      aria-label={`Theme: ${LABELS[preference]}. Click to switch.`}
      title={LABELS[preference]}
    />
  );
}
