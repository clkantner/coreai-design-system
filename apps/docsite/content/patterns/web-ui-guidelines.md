---
id: web-ui-guidelines
title: Web UI guidelines
summary: >-
  Accessibility, layout, interactions, content, and motion rules for production
  UI.
resources: []
reference:
  route: patterns/web-ui-guidelines
  aliases:
    - /web-ui-guidelines/
  migratedFrom:
    - apps/docsite/src/data/content.ts
---

## Accessibility

- Keyboard-only navigation. All flows work with tab key alone. Tested before ship.
- Zoom to 320x256px. UI scales at 4x zoom on 1080p with no loss of functionality or horizontal scrolling.
- Semantic HTML first. Use headings, landmarks, labels. Prefer native elements before aria-*.
- Accessible names on everything. Every interactive element has a label or aria-label.
- Icons are decorative. Add aria-hidden to icons where text label is sufficient for screen readers.
- Redundant status cues. Don't rely on color alone. Include text labels.

## Components and styling

- Use common components. Browse the component catalog for available controls. If you write too much CSS, you're probably not using an existing component.
- Layout with flex and gap. Prefer flexbox with gap over block with margin. Reduce nesting, prefer flat structures.

## Interactions

- Clear focus rings. Prefer :focus-visible over :focus. Don't override built-in focus indicators.
- Manage focus in overlays. Dialogs trap focus. When an overlay closes, return focus to the trigger.
- Match visual and hit targets. If a visual target is < 24px, expand hit target to >= 24px.
- No dead zones. If part of a control looks interactive, it should be interactive.
- Links are links. Use a or Link for navigation. Never button or div.

## Content and states

- All states designed. Empty, loading, error, and success states required for every view.
- No dead ends. Every screen offers a next step or recovery path.
- Stable skeletons. Skeletons mirror final content dimensions to avoid layout shift.
- Tabular numbers for data. Use font-variant-numeric: tabular-nums for tables and metrics.

## Animations

- Honor prefers-reduced-motion. Provide a reduced-motion variant for every animation.
- Compositor-friendly. Prioritize transform and opacity. Avoid animating width, height, top, left.
- Necessity check. Only animate when it clarifies cause and effect.
- Never transition: all. Explicitly list only the properties you intend to animate.
- Interruptible. Animations are cancelable by user input.

## Tone and content

- Warm and relaxed. Like a helpful conversation, not a manual.
- Crisp and clear. Built for speed: easy to scan, quick to grasp.
- Customer-centric. Focused on user goals, context, and experience.
- Active voice. "Create a resource" not "The resource will be created."
- Sentence case. Headings, buttons, labels per Microsoft content style.
- Second person. Address the user directly. Avoid first person in UI text.
- Use numerals. "8 deployments" not "eight deployments."
- Default to positive language. Encouraging, problem-solving framing, even for errors.
