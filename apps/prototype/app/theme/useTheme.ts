import type { Theme } from './ThemeContext';

import { useThemeContext } from './useThemeContext';

export function useTheme(): Theme {
  const context = useThemeContext();
  return context.theme;
}
