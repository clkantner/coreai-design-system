// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as React from 'react';
import { makeStyles, mergeClasses } from '@fluentui/react-components';
import { illicons, type IlliconName } from '../illicons.generated.js';
import { useFluentThemeMode } from '../contexts/FluentThemeModeContext.js';

export interface IlliconProps extends Omit<
  React.ImgHTMLAttributes<HTMLImageElement>,
  'src' | 'srcSet' | 'children' | 'name' | 'width' | 'height'
> {
  /** Stable name of a curated illustration. Browse Components / Illicon in Storybook. */
  name: IlliconName;
}

const useStyles = makeStyles({
  root: { display: 'block', flexShrink: 0 },
  // Match the creator's monochrome previews without editing the original SVG.
  dark: { filter: 'brightness(0) invert(1)' },
  light: { filter: 'brightness(0) invert(0.1411764706)' },
});

/**
 * Displays a curated CoreAI dot-grid illustration with theme-aware monochrome
 * color at a fixed 80px size while preserving the original SVG geometry. Import the named Illicon
 * component from the package and choose a name from the catalog, for example
 * <Illicon name="agents" />.
 * The default empty alt makes it decorative beside explanatory text; supply
 * alt when the illustration conveys additional information.
 */
export const Illicon = React.forwardRef<HTMLImageElement, IlliconProps>(
  ({ name, alt = '', className, loading = 'lazy', ...rest }, ref) => {
    const styles = useStyles();
    const mode = useFluentThemeMode();
    const artwork = illicons.find((icon) => icon.id === name);
    if (!artwork) throw new Error(`Unknown Illicon: ${name}`);
    return (
      <img
        {...rest}
        ref={ref}
        src={artwork.src}
        alt={alt}
        width={80}
        height={80}
        loading={loading}
        className={mergeClasses('fui-Illicon', styles.root, styles[mode], className)}
      />
    );
  },
);

Illicon.displayName = 'Illicon';
