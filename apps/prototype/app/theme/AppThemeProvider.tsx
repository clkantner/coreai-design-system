import type { JSX, PropsWithChildren } from 'react';

import { ThemeProvider } from './ThemeProvider';

import { useThemeProvider } from './useThemeProvider';

export function AppThemeProvider({ children }: PropsWithChildren): JSX.Element {
  const themeContext = useThemeProvider();

  return <ThemeProvider themeContext={themeContext}>{children}</ThemeProvider>;
}
