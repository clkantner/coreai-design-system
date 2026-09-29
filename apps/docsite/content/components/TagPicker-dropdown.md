---
id: tag-picker-dropdown
title: TagPicker/Dropdown
navigation:
  group: Components
  showInSidebar: false
  canonicalId: tag-picker
status: complete
summary: >-
  A Tag picker combines a text input and a dropdown giving people a way to
  select an option from a list or enter their own choice. These selections are
  represented as tags.
resources:
  - label: Figma component
    url: >-
      https://www.figma.com/design/eXfSQrRg3poHRgmr0ivN5V/CoreAI-Figma-Library?node-id=304788-225172
  - label: Fluent guidance
    url: 'https://fluent2.microsoft.design/components/web/react/core/tagpicker/usage'
storybookTitles:
  - Components/TagPicker
---

## Behavior and states

- Focusing the tag picker invokes a dropdown of available items.
- Typing filters the list to match the entered text.
- Pressing Enter selects the first item unless arrow keys move the active descendant.
- Selecting an item closes the dropdown.
