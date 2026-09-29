# Unsurfaced Component Guidance

Review inventory for Owen, updated for the authored filenames on 2026-09-09.

Of 77 authored Markdown files, 50 have sidebar entries and 27 do not. Every
unsurfaced entry below has `navigation.showInSidebar: false` and a
`navigation.canonicalId` redirect. These are not independent docsite pages:
their routes redirect to the destination shown below. Their guidance bodies
are not automatically merged into the destination page.

The hidden files still generate Markdown downloads. Separate Storybook/MCP
guidance publication is currently disabled. Card Preview has been removed from
the authored inventory and is no longer listed below.

## Review List

For each entry, decide whether to keep it as separate agent guidance, merge its
unique guidance into the destination, expose a standalone docsite page, or remove
redundant content. No disposition has been assigned yet.

| Unsurfaced Source                                                                                   | Docsite Destination                                                                                                                | Review Decision |
| --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| [AvatarGroup.md](../apps/docsite/content/components/AvatarGroup.md)                                 | [Avatar.md](../apps/docsite/content/components/Avatar.md)                                                                          | Pending         |
| [AvatarGroup-pie.md](../apps/docsite/content/components/AvatarGroup-pie.md)                         | [Avatar.md](../apps/docsite/content/components/Avatar.md), via [AvatarGroup.md](../apps/docsite/content/components/AvatarGroup.md) | Pending         |
| [CompoundButton.md](../apps/docsite/content/components/CompoundButton.md)                           | [Button.md](../apps/docsite/content/components/Button.md)                                                                          | Pending         |
| [DataGrid-cell-action-header.md](../apps/docsite/content/components/DataGrid-cell-action-header.md) | [DataGrid.md](../apps/docsite/content/components/DataGrid.md)                                                                      | Pending         |
| [DataGrid-cell-large.md](../apps/docsite/content/components/DataGrid-cell-large.md)                 | [DataGrid.md](../apps/docsite/content/components/DataGrid.md)                                                                      | Pending         |
| [DataGrid-cell-small.md](../apps/docsite/content/components/DataGrid-cell-small.md)                 | [DataGrid.md](../apps/docsite/content/components/DataGrid.md)                                                                      | Pending         |
| [DataGrid-cell-smaller.md](../apps/docsite/content/components/DataGrid-cell-smaller.md)             | [DataGrid.md](../apps/docsite/content/components/DataGrid.md)                                                                      | Pending         |
| [DataGrid-content-header.md](../apps/docsite/content/components/DataGrid-content-header.md)         | [DataGrid.md](../apps/docsite/content/components/DataGrid.md)                                                                      | Pending         |
| [EmptyState-alias.md](../apps/docsite/content/components/EmptyState-alias.md)                       | [EmptyState.md](../apps/docsite/content/components/EmptyState.md) (Templates)                                                      | Pending         |
| [InfoButton.md](../apps/docsite/content/components/InfoButton.md)                                   | [InfoLabel.md](../apps/docsite/content/components/InfoLabel.md)                                                                    | Pending         |
| [InteractionTag.md](../apps/docsite/content/components/InteractionTag.md)                           | [Tag.md](../apps/docsite/content/components/Tag.md)                                                                                | Pending         |
| [LeftNav.md](../apps/docsite/content/components/LeftNav.md)                                         | [ShellAndNavigation-nav.md](../apps/docsite/content/components/ShellAndNavigation-nav.md)                                          | Pending         |
| [List-content.md](../apps/docsite/content/components/List-content.md)                               | [List.md](../apps/docsite/content/components/List.md)                                                                              | Pending         |
| [MenuItem.md](../apps/docsite/content/components/MenuItem.md)                                       | [Menu.md](../apps/docsite/content/components/Menu.md)                                                                              | Pending         |
| [Menu-section.md](../apps/docsite/content/components/Menu-section.md)                               | [Menu.md](../apps/docsite/content/components/Menu.md)                                                                              | Pending         |
| [Menu-split-item.md](../apps/docsite/content/components/Menu-split-item.md)                         | [Menu.md](../apps/docsite/content/components/Menu.md)                                                                              | Pending         |
| [PresenceBadge.md](../apps/docsite/content/components/PresenceBadge.md)                             | [Badge.md](../apps/docsite/content/components/Badge.md)                                                                            | Pending         |
| [Radio.md](../apps/docsite/content/components/Radio.md)                                             | [RadioGroup.md](../apps/docsite/content/components/RadioGroup.md)                                                                  | Pending         |
| [SplitButton.md](../apps/docsite/content/components/SplitButton.md)                                 | [Button.md](../apps/docsite/content/components/Button.md)                                                                          | Pending         |
| [ProgressBar-static.md](../apps/docsite/content/components/ProgressBar-static.md)                   | [ProgressBar.md](../apps/docsite/content/components/ProgressBar.md)                                                                | Pending         |
| [SwatchPicker-swatch.md](../apps/docsite/content/components/SwatchPicker-swatch.md)                 | [SwatchPicker.md](../apps/docsite/content/components/SwatchPicker.md)                                                              | Pending         |
| [TagPicker-dropdown.md](../apps/docsite/content/components/TagPicker-dropdown.md)                   | [TagPicker.md](../apps/docsite/content/components/TagPicker.md)                                                                    | Pending         |
| [TagPicker-item.md](../apps/docsite/content/components/TagPicker-item.md)                           | [TagPicker.md](../apps/docsite/content/components/TagPicker.md)                                                                    | Pending         |
| [TagPicker-secondary-action.md](../apps/docsite/content/components/TagPicker-secondary-action.md)   | [TagPicker.md](../apps/docsite/content/components/TagPicker.md)                                                                    | Pending         |
| [TabList-vertical.md](../apps/docsite/content/components/TabList-vertical.md)                       | [TabList.md](../apps/docsite/content/components/TabList.md)                                                                        | Pending         |
| [Tab-horizontal.md](../apps/docsite/content/components/Tab-horizontal.md)                           | [TabList.md](../apps/docsite/content/components/TabList.md)                                                                        | Pending         |
| [Tab-vertical.md](../apps/docsite/content/components/Tab-vertical.md)                               | [TabList.md](../apps/docsite/content/components/TabList.md)                                                                        | Pending         |

## Where Sidebar Membership Lives

- **Authored component membership:** each file in
  [content/components](../apps/docsite/content/components) declares `navigation`
  in its YAML frontmatter. `group` selects the sidebar section;
  `showInSidebar` controls visibility; `canonicalId` makes the entry an alias.
- **Registry assembly:** [registry-builder.ts](../apps/docsite/src/data/registry-builder.ts)
  excludes aliases from pages and creates their redirects. Alias chains are
  resolved by [guidance.mjs](../shared/guidance.mjs).
- **Sidebar group order and filtering:** [registry.ts](../apps/docsite/src/data/registry.ts)
  defines `SIDEBAR_ORDER` and constructs `sidebarGroups` by filtering pages on
  `showInSidebar` and `group`.
- **Non-component pages:** [site-registry.json](../apps/docsite/site-registry.json)
  is the authored base registry. Component entries are generated from Markdown,
  not maintained in that JSON file.

To expose one of these aliases as an independent page, remove its `canonicalId`
and set `showInSidebar: true`. Changing visibility alone is insufficient because
registry assembly excludes aliases regardless of that flag.
