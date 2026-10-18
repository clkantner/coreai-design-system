---
id: data-grid-cell-medium
title: Data grid
navigation:
  group: Components
  showInSidebar: true
status: complete
figmaPageId: '298485:4122'
summary: >-
  Presents data in a two-dimensional DataGrid format, arranged in columns and
  rows in a rectangular form.
resources:
  - label: Figma component
    url: >-
      https://www.figma.com/design/eXfSQrRg3poHRgmr0ivN5V/CoreAI-Figma-Library?node-id=298485-9476
storybookTitles:
  - Components/DataGrid
reference:
  component: components-datagrid
---

## Best practices

### Do

- Use a hyphen (-) for any empty values.
- Left-align textual data within DataGrid cells.
- Left-align categorical numeric data within DataGrid cells.
- Use the cell link variant instead of the cell text variant to help users distinguish links from other text content in adjoining cells.
- Use a subtle badge with a status icon instead of an outline badge.

### Don't

- Allow text to wrap to more than three rows.
- Leave too much white space after cell content.

## Behavior and states

- DataGrids don’t require reflow by default, but designers can set column priorities for smaller screens.
- Less critical columns may be hidden first; essential ones should always remain visible.
- If all columns are important, keep them all and allow horizontal scrolling instead.
