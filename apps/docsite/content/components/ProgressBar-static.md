---
id: static-progress-bar
title: Static_ProgressBar
navigation:
  group: Components
  showInSidebar: false
  canonicalId: animated-progress-bar
status: complete
summary: >-
  Progress bars communicate system information, like how much cloud storage
  someone is using in OneDrive, or task information, like how long until a
  download is complete.
resources:
  - label: Figma component
    url: >-
      https://www.figma.com/design/eXfSQrRg3poHRgmr0ivN5V/CoreAI-Figma-Library?node-id=41988-213166
  - label: Fluent guidance
    url: >-
      https://fluent2.microsoft.design/components/web/react/core/progressbar/usage
storybookTitles:
  - Components/ProgressBar
---

## Behavior and states

- Progress bars can be determinate or indeterminate.
- Use determinate progress bars whenever possible.
- Only use indeterminate progress bars for short tasks.
- Switch to determinate when enough data becomes available to communicate remaining time.
- Progress bars should only be used for tasks that take longer than a second.
- If you’re loading new content with a known structure that doesn’t block the UI, try a skeleton.
