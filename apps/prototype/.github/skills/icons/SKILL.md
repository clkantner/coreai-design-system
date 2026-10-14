---
name: icons
description: 'Conventions for picking, sizing, and bundling Fluent icons. USE WHEN: adding or changing an icon in a `*.tsx` file, or picking an icon name.'
---

# Icon Usage

When looking for icon names,

- use the Fluent MCP tools: `search_fluent_icons` and `validate_fluent_icon` if available
- search the icon repo names: `https://github.com/microsoft/fluentui-system-icons/blob/main/icons_regular.md` or `https://github.com/microsoft/fluentui-system-icons/blob/main/icons_filled.md`

Prefer using the unsized icons without the number suffix, e.g. `TextBulletListTreeFilled` instead of `TextBulletListTree20Filled`. This allows the icon to scale dynamically within buttons and other components.

When adding icons to Fluent components, use the `bundleIcon` utility from `@fluentui/react-icons` to combine filled and regular icons. For example:

```tsx
const TraceIcon = bundleIcon(TextBulletListTreeFilled, TextBulletListTreeRegular);

<Button icon={<TraceIcon />} />;
```
