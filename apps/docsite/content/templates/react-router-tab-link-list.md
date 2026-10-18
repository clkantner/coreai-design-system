---
id: react-router-tab-link-list
title: Tab Link List
summary: Route-aware CoreAI TabList for React Router navigation.
status: under-construction
resources: []
reference:
  component: templates-react-router-tab-link-list
  sources:
    - src/stories/templates/react-router/TabLinkList.tsx
    - src/stories/templates/react-router/TabLink.tsx
    - src/stories/templates/react-router/RouterLinkSlots.tsx
  route: templates/react-router-tab-link-list
---

## Guidance status

This reference includes working examples. CoreAI UX guidance for this page still needs review.

## Component description

Copy-paste template — not an importable component. Copy the full source from
the `templates-react-router-tab-link-list--source-code` docs entry.

Connects React Router's current location to a CoreAI TabList's selected tab.
Each link accepts TabLink props with `label` in place of `children`. Selection
supports absolute paths and simple relative destinations such as `profile`,
resolved against the current route's base. Use absolute paths for parent-route
navigation: this lightweight matcher does not reproduce route-relative `..`
traversal. Matching uses matchPath with `end` and `caseSensitive`; query strings
and hashes are ignored, and trailing slashes are treated as equivalent.
