# Contributing illicons

This directory is the source of truth for finished Illicon SVGs. Storybook
publishes `manifest.json` and the SVGs together under `illicons/`. The gallery
reads the same manifest. There is no separate per-icon component or story.

The initial catalog is intentionally empty. Do not copy private design-library
exports or other artwork into this public repository without confirmed public
redistribution rights. The validator checks provenance fields, not legal rights;
maintainers must verify those rights during review.

## Add artwork

1. Check the catalog for an existing concept.
2. Export a transparent, monochrome SVG at `width="140"`, `height="140"` and
   `viewBox="0 0 140 140"`. Keep finished dot geometry unchanged. Check centering,
   visual weight, and family consistency; do not re-sample through a converter.
   When using an export scale control, select 100%, with background and
   construction-grid options disabled.
3. Save it here as a lowercase kebab-case filename, such as `trash.svg`.
4. Add an entry to `manifest.json`:

   ```json
   {
     "id": "trash",
     "name": "Trash",
     "tags": ["delete", "remove", "trash"],
     "file": "trash.svg",
     "provenance": {
       "author": "Contributor name",
       "source": "Original artwork by the contributor",
       "license": "MIT"
     }
   }
   ```

5. From the repository root, run:

   ```bash
   npm run illicons:check
   node --test scripts/validate-illicons.test.mjs
   npm run storybook
   ```

6. Open **Illustrations / Illicon catalog**. Check search, preview, copy, and
   download. Include light/dark screenshots, context of use, and a description
   of the artwork's provenance in your PR. Complete the repository's CLA.

See the [repository contribution policy](../../CONTRIBUTING.md) for setup and
review requirements. Only merged and deployed assets are published. Do not
commit directly to the default branch. Submission automation and browser-side
repository write credentials are not part of this catalog.

## Manifest contract (version 1)

- `id`: unique, stable lowercase kebab-case identifier. Never recycle an ID for
  another concept.
- `name`: unique, trimmed, human-readable display name.
- `tags`: at least one unique, trimmed, lowercase search term.
- `file`: exactly `<id>.svg`, alongside the manifest. No remote URLs or traversal.
- `provenance`: author, publicly shareable source/permission explanation, and MIT
  redistribution rights. Do not include private links or confidential details.

Adding an icon is an additive change. Removing/renaming an existing ID or file is
a breaking change for catalog consumers and needs explicit maintainer agreement.
Change `version` only alongside a coordinated consumer migration.

## SVG contract

The validator parses XML and rejects malformed documents, executable content,
event handlers, CSS, embedded images, remote references, DOCTYPE, and processing
instructions. It accepts static SVG shapes, groups, definitions, text-only
titles/descriptions, and local `use` references directly to shapes. References
to groups or other `use` elements are not supported. Files must be regular files,
at most 1 MiB, and at most 20,000 elements.

Supported paints are `none`, `currentColor`, `black`, `white`, and hex colors.
Transforms and original path/circle geometry are preserved. Export unsupported
effects as static vector shapes before submitting; the validator never rewrites
artwork. Automated checks are not a visual or accessibility review: maintainers
still verify dot spacing, size, contrast, centering, meaningful names/tags, and
consistency with the illustration family.

The manifest and all listed SVGs are validated whenever Storybook starts or
builds. Missing files, duplicate IDs/names, missing provenance, invalid tags,
unsafe SVGs, and unlisted SVG files fail the build.
