/**
 * AccordionHeader CSS overrides, applied via FluentProvider's
 * `customStyleHooks_unstable`.
 *
 * - `useAccordionHeaderStyles` → `useAccordionHeaderStyles_unstable`
 *
 * The AccordionHeader's interactive element is the `button` slot (the `root`
 * is just a wrapping `<div>`/heading), so the layout / hover / pressed
 * treatment is applied there.
 *
 * Gated on `useComponentDefaults()` so Web / Teams / Teams v2.1 (or any
 * consumer that sets `withComponentDefaults={false}` on `CoreAIFluentProvider`)
 * gets stock Fluent behavior.
 */
import {
  makeStyles,
  mergeClasses,
  getSlotClassNameProp_unstable,
} from '@fluentui/react-components';
import type { AccordionHeaderState } from '@fluentui/react-components';
import { useComponentDefaults } from '../contexts/ComponentDefaultsContext.js';

const useStyles = makeStyles({
  headerButtonLayoutDefault: {
    gridTemplateColumns: 'auto 1fr',
  },
  headerButtonLayoutWithIcon: {
    gridTemplateColumns: 'auto auto 1fr',
  },
  headerButtonLayoutExpandIconEnd: {
    gridTemplateColumns: '1fr auto',
  },
  headerButtonLayoutWithIconExpandIconEnd: {
    gridTemplateColumns: 'auto 1fr auto',
  },

  // AccordionHeader button — the interactive trigger.
  headerButton: {
    display: 'grid',
    alignContent: 'center',
    // gridTemplateColumns: "auto 1fr", // headerButtonLayoutDefault

    gap: 'var(--spacingHorizontalS)',
    '& .fui-AccordionHeader__expandIcon, & .fui-AccordionHeader__icon ': {
      padding: 'unset',
      borderRadius: 'var(--borderRadiusMedium)',
    },
  },

  headerButtonInteractive: {
    color: 'var(--colorNeutralForeground2)',
    '&:hover': {
      color: 'var(--colorNeutralForeground1)',
    },

    '&:hover .fui-AccordionHeader__expandIcon': {
      backgroundColor: 'var(--colorInteractiveBackgroundHover)',
    },
    '&:active .fui-AccordionHeader__expandIcon': {
      backgroundColor: 'var(--colorInteractiveBackgroundPressed)',
    },
  },
});

export const useAccordionHeaderStyles = (stateUnknown: unknown): void => {
  const enabled = useComponentDefaults();
  const styles = useStyles();
  if (!enabled) {
    return;
  }

  const state = stateUnknown as AccordionHeaderState;
  if (!state.button) {
    return;
  }

  // Pick exactly one grid-template-columns layout. The base `headerButton`
  // already covers the default (expand icon at start, no icon) as `auto 1fr`.
  const expandIconEnd = state.expandIconPosition === 'end';
  const layoutClass = state.icon
    ? expandIconEnd
      ? styles.headerButtonLayoutWithIconExpandIconEnd
      : styles.headerButtonLayoutWithIcon
    : expandIconEnd
      ? styles.headerButtonLayoutExpandIconEnd
      : styles.headerButtonLayoutDefault;

  state.button.className = mergeClasses(
    state.button.className,
    styles.headerButton,
    layoutClass,
    !state.disabled && styles.headerButtonInteractive,
    getSlotClassNameProp_unstable(state.button),
  );
};
