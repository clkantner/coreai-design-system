# CoreaAI Sandbox — AI Coding Assistant Instructions

Microsoft Foundry is a platform for building, deploying, and managing AI-powered applications and agents. **CoreaAI Sandbox** is a demo app for agentic-assisted prototyping of design solutions intended for carryover into the real production codebase.

## Project Overview

- React Router v7 SPA (SSR disabled in `react-router.config.ts`)
- Vite + TypeScript + CSS Modules
- CoreAI Design System components from `@coreai-ds/react-components`, plus Foundry-owned app adapters
- TanStack Query against mock JSON data in `app/data/` (no real APIs)

To run it:

1. Run `npm run setup` to authenticate the private `@coreai` feed and install dependencies.
2. If the credential provider reports an authentication error, wait 1–2 hours and retry `npm run setup`; for persistent errors, follow the [CoreaAI Sandbox installation guide](../README.md#installation).
3. `npm run dev` (background, serves `http://localhost:5173/`)
4. Open via the Playwright MCP — or invoke the **`start-app`** skill.

**Never commit directly to `main`.** Only engineer maintainers open reviewed PRs to `main`. `proto/*` branches are (usually) designer-owned prototype forks: they may merge `main` to refresh the template, but do not merge back into it (unless maintainers explicitly select one for PR).

## How to find guidance — invoke skills

Most repo-specific conventions, schemas, and workflows live in skills under `.github/skills/`. Their descriptions appear in your `<available_skills>` list every turn. Invoke the relevant skill **before** doing the matching work.

### Workflow skills (explicit user requests)

| User says / wants to…                                                   | Invoke skill        |
| ----------------------------------------------------------------------- | ------------------- |
| "Start the app", run dev server, open in Playwright                     | `start-app`         |
| "Lint", typecheck, fix lint errors                                      | `lint`              |
| Try a different design / option B / variant / A/B / layout alternative  | `new-variant`       |
| Convert pasted HTML into repo components                                | `convert-html`      |
| Convert a Figma design into repo components                             | `convert-figma`     |
| Adapt code copied from the production codebase (strip i18n / telemetry) | `convert-prod-code` |
| "Commit" / save current work to a proto branch                          | `commit-proto`      |
| "Push" / deploy a proto branch                                          | `push-proto`        |
| Permanently delete a proto branch                                       | `delete-proto`      |
| "Merge main" / update / catch up a proto branch from `main`             | `merge-main`        |
| "Check for hotfixes" / apply missing hotfixes to this branch            | `passive-hotfix`    |
| Explicitly create or extract a hotfix commit                            | `create-hotfix`     |
| Explicitly update the changelog or draft release notes                  | `update-changelog`  |

### Reference skills (proactive on matching work)

| About to edit / work with…                       | Invoke skill        |
| ------------------------------------------------ | ------------------- |
| Any `*.css` / `*.module.css` file                | `css-styling`       |
| Any `*.tsx` file or picking a component          | `react-components`  |
| Icons (`@fluentui/react-icons`, custom SVGs)     | `icons`             |
| `app/routes.ts` or navigation                    | `routing`           |
| Data-fetching hooks or `app/data/`               | `state-management`  |
| `app/features/**` or any design alternative      | `features-variants` |
| `packages/vellum/**`                             | `vellum`            |
| Figma MCP output                                 | `figma-usage`       |
| Rendered/pasted HTML (Playwright DOM, debugging) | `interpreting-html` |

Skills are the canonical source for task-specific workflows and reference guidance; do not recreate duplicate prompt or instruction wrappers.

## MCP tools

Config in `.vscode/mcp.json`. You may prompt the user to copy these tools to the global location if needed.

- **Playwright MCP** — DOM access for rendered pages. Before interpreting class names, invoke the `interpreting-html` skill. Playwright opens in a secondary Edge browser instance (not the default browser).
- **Fluent MCP** — Fluent React UI docs. Requires auth — prompt the user if unauthenticated. Pair with the `react-components` skill (advice does not apply exactly to wrapped FLUENT OVERRIDE components).
- **Figma MCP** — Designs from Figma desktop. If unavailable, prompt the user to enable "Figma Desktop MCP Server". Pair with the `figma-usage` skill.

## Quick conventions

- **Imports**: CoreAI components from `@coreai-ds/react-components`; Foundry-owned adapters from `~/components/common`; never from `@fluentui/react-components` directly.
- **Path alias**: `~/` resolves to `app/`.
- **Styles**: `.module.css` only. No inline `style={}` except for JS-driven values. Use `clsx` for conditional classes.
- **Theme**: `useTheme()` from `~/components/common`.
- **No SSR**: avoid SSR-specific patterns.

## Common npm scripts

```bash
npm run dev          # dev server on :5173
npm run build        # production build
npm run typecheck    # tsc + route typegen
npm run lint         # full lint (use the `lint` skill for the recommended workflow)
npm run start        # serve production build
```

## Component / route scaffolding

- **New component**: `app/components/common/ComponentName/` with `ComponentName.tsx` + `ComponentName.module.css`. Export only Foundry-owned behavior from `app/components/common/index.ts`; import CoreAI components directly.
- **New route**: file in `app/routes/`, registered in `app/routes.ts`, use `import type { Route } from "./+types/routeName"`.

See the `react-components`, `css-styling`, and `routing` skills for full details.
