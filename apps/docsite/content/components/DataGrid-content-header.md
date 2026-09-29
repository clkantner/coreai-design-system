---
id: data-grid-content-header
title: Content header
navigation:
  group: Components
  showInSidebar: false
  canonicalId: data-grid-cell-medium
status: complete
summary: >-
  Presents data in a two-dimensional DataGrid format, arranged in columns and
  rows in a rectangular form.
resources:
  - label: Figma component
    url: >-
      https://www.figma.com/design/eXfSQrRg3poHRgmr0ivN5V/CoreAI-Figma-Library?node-id=298485-9617
storybookTitles:
  - Components/DataGrid
---

## Best practices

### Do

- Consider a sticky header when a DataGrid has more than 20 items per page.
- Consider a sticky header when values may be ambiguous without column headers.
- Consider a sticky header when users need to act on resources upon selection.
- Consider a sticky header when a DataGrid has more than five columns or sortable columns.

### Don't

- Use a sticky header in DataGrids without actions in the header.
- Use a sticky header for continuous scrolling.
- Place interactive elements inside DataGrid header cells.

## Behavior and states

- DataGrids don’t require reflow by default, but designers can set column priorities for smaller screens.
- Less critical columns may be hidden first; essential ones should always remain visible.
- If all columns are important, keep them all and allow horizontal scrolling instead.
