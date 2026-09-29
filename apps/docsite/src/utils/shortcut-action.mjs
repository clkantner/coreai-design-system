export function getShortcutAction(event, options) {
  const key = event.key.toLowerCase();
  if (options.editable || event.metaKey || event.ctrlKey || event.altKey) {
    return null;
  }
  if (key === 'm') {
    return 'cycle-theme';
  }
  return null;
}
