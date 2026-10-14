---
name: interpreting-html
description: 'Map rendered/pasted HTML class names back to source code (CSS Modules, Fluent UI, Griffel). USE WHEN: inspecting Playwright DOM output, debugging styles in the browser, or reverse-engineering pasted HTML.'
---

# How to Interpret Pasted HTML Code

For a live page, use the `inspect-live-ui` skill first. Its bundled script captures the Fluent
provider, component roots and slots, CSS Module families, authored stylesheet rules, semantics,
and computed geometry in one pass. Use this skill to interpret that report or pasted HTML.

When the site is rendered to HTML, you can identify several aspects of the app code via HTML properties:

- Class names with the pattern `_camelCase_123ab_45` correspond to class names applied from CSS Modules.
  - For example, `class="_headerWrapper_16arl_15"` in HTML comes from `className={styles.headerWrapper}` in React.
- Class names prefixed with `fui-` are derived from Fluent UI components.
  - These are Fluent component root elements. For example, `fui-Button` is a `<Button/>`.
  - These are Fluent component sub-elements if they contain the `__` delimiter (BEM style). For example, `fui-Button__icon` comes from `<Button icon={<SomeIcon20Regular/>}/>`.
- Class names that follow the pattern `f123abc` are from Fluent Griffel build. These are auto-generated and don't exist in the codebase. For example: `class="f11589ue f1q5o8ev f1pdflbu fkfq4zb"`.
- Any `data-*` attributes are likely static and match between React and HTML.
- `aria-label` attributes and text content usually cannot be matched because they are i18n translated on the production site. They don't exist in code the same way.
