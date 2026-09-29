---
id: tag-picker-item
title: TagPicker/Item
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
      https://www.figma.com/design/eXfSQrRg3poHRgmr0ivN5V/CoreAI-Figma-Library?node-id=304788-14612
  - label: Fluent guidance
    url: 'https://fluent2.microsoft.design/components/web/react/core/tagpicker/usage'
storybookTitles:
  - Components/TagPicker
---

## Behavior and states

- The dropdown shows system-provided items that can represent files, people, or meetings.
- Selecting an item closes the dropdown and inserts a tag into the input.
- The active descendant starts on the closest matching item.
- Arrow keys move through the filtered list.
