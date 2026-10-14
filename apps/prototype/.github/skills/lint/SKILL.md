---
name: lint
description: 'Run the full lint workflow: format, typecheck, CSS lint, JS lint. USE WHEN: the user asks to "lint", "fix lint", "run the linters", "check types", or after making code changes that need verification.'
---

# Lint the Codebase

Run each step below in order, fixing all errors before moving to the next step.

1. `npm run format` — Auto-format code with Prettier. Run this first so formatting noise doesn't obscure real errors in later steps. Run periodically after editing TypeScript files.
2. `npm run typecheck` — Fix any TypeScript / JavaScript type errors.
3. `npm run lint:css` — Fix any CSS issues. If editing CSS, invoke the `css-styling` skill for guidance.
4. `npm run lint:js` — Fix any ESLint issues in `.ts` and `.tsx` files. If editing components, invoke the `react-components` skill for guidance.

**Verification rule**: After fixing errors in a step, re-run the `npm run` command **standalone** (not chained with other commands or piped through `tail`). Read the **full output** and confirm the exact error/warning count before moving to the next step. Never trust truncated or chained output as proof of zero errors.

Run `npm run format` again when finished.

## Related skills

- `css-styling` — required reading when fixing CSS warnings.
- `react-components` — required reading when fixing TSX warnings.
