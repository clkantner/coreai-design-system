---
id: vertical-tab
title: Vertical Tab
navigation:
  group: Components
  showInSidebar: false
  canonicalId: horizontal-tab-list
status: complete
summary: >-
  A tablist allows people to switch between categories of related information
  without going to different pages.
resources:
  - label: Figma component
    url: >-
      https://www.figma.com/design/eXfSQrRg3poHRgmr0ivN5V/CoreAI-Figma-Library?node-id=23575-139360
  - label: Fluent guidance
    url: 'https://fluent2.microsoft.design/components/web/react/core/tablist/usage'
storybookTitles:
  - Components/TabList
---

## Behavior and states

- One tab should always be active on first render.
- Icon-only tabs require an aria-label and a tooltip.
- Identify the current selection to screen readers using aria-current.
- Keep tab labels brief and parallel.
- They’re are ideal for dividing content-heavy pages into distinct but related categories that are easier to process and require less scrolling.
- Tabs can also be used for navigation between a small set of closely related, frequently accessed pages.
- For navigation beyond closely related categories, use a link instead.
- To initiate an action, use a button instead.
