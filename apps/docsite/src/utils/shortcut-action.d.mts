export type ShortcutAction = 'cycle-theme';

export interface ShortcutEvent {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
}

export function getShortcutAction(
  event: ShortcutEvent,
  options: {
    editable: boolean;
  },
): ShortcutAction | null;
