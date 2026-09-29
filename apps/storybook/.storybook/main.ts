import type { StorybookConfig } from '@storybook/react-vite';
import type { Plugin } from 'vite';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { storyNameFromExport, toId } from 'storybook/internal/csf';
import { generateTemplateDocs } from '../scripts/generate-template-docs.mjs';
import { generateSkillDoc } from '../scripts/generate-skill-doc.mjs';

// Storybook 10 loads config files as native ESM, where `__dirname` doesn't
// exist. Recreate it from `import.meta.url` for the path math below.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// fluent-stories is a sparse-checkout sibling git repo at the Storybook app
// root (kept out of source control via the root .gitignore). From
// apps/storybook/.storybook/ that's one level up.
const fluentStoriesRoot = path.resolve(__dirname, '../fluent-stories/packages/react-components');

if (!fs.existsSync(fluentStoriesRoot)) {
  throw new Error(
    'Canonical Fluent stories are missing. Run `npm --workspace apps/storybook run stories:init`.',
  );
}

/**
 * Packages whose stories we deliberately skip:
 * - `react-headless-components-preview` shadows ~30 canonical components
 *   with the same Storybook titles (e.g. "Components/Combobox"),
 *   which causes "duplicate story id" indexer errors.
 * - `react-aria`, `react-motion`, `react-migration-v0-v9`, `react-migration-v8-v9`
 *   only contribute to the Utilities/, Motion/, and Migration Shims/
 *   sidebar sections — hidden to keep the playground focused on themable
 *   visual components.
 * - The remaining excludes are aggregators / addons / sub-packages with
 *   no stories of their own.
 */
const excludePackages = new Set([
  'react-headless-components-preview',
  // Deliberately hidden from the docs: the Nav component and its stories are
  // not part of the CoreAI design system surface.
  'react-nav',
  // Deliberately hidden from the docs: the FluentProvider stories are not part
  // of the CoreAI design system surface (CoreAIFluentProvider is the supported
  // provider — see Docs/CoreAIFluentProvider).
  'react-provider',
  // Replaced by the CoreAI `Divider` wrapper (a simplified `<hr>`); its
  // stories live in src/stories/components/Divider.stories.tsx. Hidden here so
  // the canonical Fluent Divider stories don't duplicate the sidebar entry.
  'react-divider',
  // Hidden sidebar sections (Utilities / Motion / Migration Shims):
  'react-aria',
  'react-motion',
  'react-motion-components-preview',
  'react-positioning',
  'react-migration-v0-v9',
  'react-migration-v8-v9',
  // No-story / infra packages:
  'react-components', // meta-package — empty
  'eslint-plugin-react-components',
  'babel-preset-global-context',
  'babel-preset-storybook-full-source',
  'global-context',
  'keyboard-keys',
  'priority-overflow',
  'react-conformance-griffel',
  'react-context-selector',
  'react-jsx-runtime',
  'react-shared-contexts',
  'react-storybook-addon',
  'react-storybook-addon-export-to-sandbox',
  'react-utilities',
  'react-utilities-compat',
  'theme-designer',
  'recipes',
  'deprecated',
  'component-selector-preview',
]);

const includedPackageGlobs = fs
  .readdirSync(fluentStoriesRoot, { withFileTypes: true })
  .filter(
    (d) =>
      d.isDirectory() &&
      !excludePackages.has(d.name) &&
      fs.existsSync(path.join(fluentStoriesRoot, d.name, 'stories/src')),
  )
  .map(
    (d) =>
      `../fluent-stories/packages/react-components/${d.name}/stories/src/**/index.stories.@(ts|tsx)`,
  );

if (includedPackageGlobs.length === 0) {
  throw new Error(
    'Canonical Fluent stories checkout contains no usable story packages. Run `npm --workspace apps/storybook run stories:init`.',
  );
}

// Story ids owned by the in-repo forks under src/. A canonical Fluent story in
// fluent-stories/ that re-exports the same `title` + export name produces an
// identical id and would make the indexer fail with "Duplicate stories with
// id". We drop the canonical entry at index time (see `experimental_indexers`
// below) so the fork is the single source of truth — no need to mutate the
// vendored fluent-stories/ sources.
//
// The list is derived from the fork files themselves (single source of truth):
// add a fork under src/ and it automatically wins its id, with no second list
// to keep in sync.
const srcStoriesRoot = path.resolve(__dirname, '../src');

function collectForkStoryIds(dir: string, ids: Set<string>): Set<string> {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectForkStoryIds(full, ids);
    } else if (/\.stories\.(ts|tsx)$/.test(entry.name)) {
      const source = fs.readFileSync(full, 'utf8');
      // The `title:` of the default export / meta (a quoted string — the
      // `title: { ... }` makeStyles keys and `title=` JSX props don't match).
      const titleMatch = source.match(/title:\s*['"]([^'"]+)['"]/);
      if (!titleMatch) {
        continue;
      }
      const title = titleMatch[1];
      // Every named export is a candidate story name. Ids come from the export
      // name run through `storyNameFromExport` ("ResizableColumns" -> "Resizable
      // Columns" -> `--resizable-columns`), matching how Storybook indexes them.
      for (const m of source.matchAll(/export\s+(?:const|function)\s+(\w+)/g)) {
        ids.add(toId(title, storyNameFromExport(m[1])));
      }
    }
  }
  return ids;
}

const forkOwnedStoryIds = fs.existsSync(srcStoriesRoot)
  ? collectForkStoryIds(srcStoriesRoot, new Set<string>())
  : new Set<string>();

const config: StorybookConfig = {
  // Only `index.stories.tsx` files are full stories — sibling `*.stories.tsx`
  // files are helper modules re-exported by the index. Globbing them all
  // would cause CSF errors ("missing default export").
  //
  // The `react-theme` package is special-cased: its sidebar entries come
  // from `index.mdx` docs files (with <Meta title="Theme/..." />), and
  // the sibling `*.stories.tsx` files are React helper components that
  // the MDX imports directly — they have no CSF default export and must
  // NOT be globbed as stories.
  stories: [
    '../src/**/*.mdx',
    '../src/**/*.stories.@(ts|tsx)',
    ...includedPackageGlobs,
    // The Theme/* MDX docs are temporarily disabled: the helper components
    // (ThemeColors, ThemeSpacing, ...) are hardcoded against a fixed set of
    // Fluent themes and don't react to our Theme/Mode toolbar globals, so
    // they're misleading inside this playground. Re-enable once we have a
    // dynamic version that reads the active theme.
    // '../fluent-stories/packages/react-components/react-theme/stories/src/**/index.mdx',
  ],

  // Drop canonical fluent-stories entries whose id collides with an in-repo
  // fork (see `forkOwnedStoryIds`). This replaces the old build-time patch
  // that edited the vendored `index.stories.tsx` files — dedup now happens
  // purely in-memory during indexing, leaving fluent-stories/ pristine.
  experimental_indexers: (existingIndexers = []) =>
    (existingIndexers ?? []).map((indexer) => ({
      ...indexer,
      createIndex: async (fileName, options) => {
        const entries = await indexer.createIndex(fileName, options);
        // Only canonical fluent-stories entries are removal candidates;
        // never filter our own src/stories forks.
        if (!fileName.replace(/\\/g, '/').includes('/fluent-stories/')) {
          return entries;
        }
        return entries.filter((entry) => {
          const id =
            entry.__id ??
            toId(options.makeTitle(entry.title), storyNameFromExport(entry.exportName));
          return !forkOwnedStoryIds.has(id);
        });
      },
    })),

  addons: [
    '@storybook/addon-docs',
    '@storybook/addon-a11y',
    '@storybook/addon-links',
    // Adds a "Design" tab to each story that embeds the linked Figma frame.
    // Per-story wiring lives in `parameters.design` (see src/utils/figma.ts).
    '@storybook/addon-designs',
    // Exposes an MCP server at /mcp so AI agents can read this design system's
    // component docs/manifests, generate stories, and (with the optional
    // Vitest addon) run story tests. Authoring docs: apps/storybook/README.md
    // ("MCP for AI agents"); hosting/auth: docs/CI-CD-SETUP.md.
    '@storybook/addon-mcp',
  ],

  framework: {
    name: '@storybook/react-vite',
    options: {},
  },

  core: {
    disableTelemetry: true,
  },

  features: {
    // Higher-quality, faster component metadata (Volar + TS language server)
    // used by the MCP docs toolset so agents get real prop types instead of
    // guessing. Experimental in 10.4; will eventually also drive autodocs.
    // Lets us keep `typescript.reactDocgen: false` (fast) while still giving
    // the MCP server accurate component APIs.
    experimentalReactComponentMeta: true,
  },

  typescript: {
    // Skip slow prop-table generation; Fluent props are large and we don't
    // need autodocs tables for this playground. Flip to 'react-docgen' (or
    // 'react-docgen-typescript') if you want them.
    reactDocgen: false,
  },

  viteFinal: async (config) => {
    const { mergeConfig } = await import('vite');

    // Reroute every bare `@fluentui/react-components` import to the CoreAI
    // theme barrel, so canonical Fluent story files under fluent-stories/ —
    // which we don't own and which would be wiped on any sparse-checkout
    // pull — automatically pick up our wrapped components (e.g. <Button>
    // with shape="circular" default). Subpath imports like
    // `@fluentui/react-components/foo` are intentionally NOT touched.
    //
    // The barrel itself does `export * from '@fluentui/react-components'`,
    // so we MUST skip the rewrite when the importer lives inside the
    // package's own src/ — otherwise we'd create an infinite self-loop.
    //
    // Storybook develops against package source so a clean checkout does not
    // need a package build and source edits are never hidden by stale dist output.
    const themeBarrel = path.resolve(
      __dirname,
      '../../../packages/coreai-fluentui-react/src/index.ts',
    );
    const themeDir = path.dirname(themeBarrel);
    // npm workspaces symlinks the package into node_modules; Vite importer
    // paths may surface either the symlinked path or the real path. Match the
    // package's real source dir to be safe.
    const themeSrcDir = path.resolve(__dirname, '../../../packages/coreai-fluentui-react/src');
    const barrelRedirectRe = /^@fluentui\/(react-components)$/;
    // Normalize path separators: `path.resolve` yields backslashes on Windows,
    // but Vite/Rollup module ids (and file-watcher paths) always use forward
    // slashes, so an un-normalized `includes`/`startsWith` never matches on
    // Windows.
    const toPosix = (p: string) => p.replace(/\\/g, '/');
    const themeSrcDirPosix = toPosix(themeSrcDir);

    const coreaiBarrelAlias: Plugin = {
      name: 'coreai:fluent-barrel-alias',
      enforce: 'pre',
      async resolveId(source, importer, options) {
        if (!barrelRedirectRe.test(source)) {
          return null;
        }
        // Skip the rewrite for imports originating inside the barrel's own
        // package so its `export * from '@fluentui/react-components'` resolves
        // to the real package instead of looping back onto itself.
        // self-loops (makeStyles/mergeClasses come back undefined at build).
        const from = toPosix(importer ?? '');
        if (from.includes(toPosix(themeDir)) || from.includes(themeSrcDirPosix)) {
          return null;
        }
        // Resolve to the CoreAI barrel by its package specifier (not the raw
        // source path) so Vite serves the *pre-bundled* copy — see the
        // `optimizeDeps.include` entry below. esbuild flattens the barrel's
        // `export *` chains into concrete named exports (makeStyles, tokens,
        // …); serving the raw source module would leave those names invisible
        // to Vite's import analysis and they'd resolve to `undefined`.
        const resolved = await this.resolve('@coreai/fluentui-react', importer, {
          ...options,
          skipSelf: true,
        });
        return resolved ?? themeBarrel;
      },
    };

    // `@coreai/fluentui-react` is force-pre-bundled by esbuild (see
    // `optimizeDeps.include` below) so its `export *` chains resolve to real
    // named bindings. That pre-bundle is a single frozen snapshot cached on
    // disk — Vite's normal per-file watcher/HMR graph doesn't cover the
    // source files baked into it, so editing anything under the package's
    // src/ (e.g. Table.styles.ts) silently has NO EFFECT until something
    // forces a re-optimization. (Previously not an issue on webpack5, which
    // has no equivalent pre-bundle-freeze step.) Watch the package's source
    // directory directly and force a full dev-server restart with a fresh
    // dependency re-bundle (`restart(true)`, equivalent to `--force`) so
    // edits actually show up without a manual cache wipe.
    const coreaiThemeWatcher: Plugin = {
      name: 'coreai:theme-restart-on-change',
      configureServer(server) {
        server.watcher.add(themeSrcDir);
        let restarting = false;
        let debounceTimer: NodeJS.Timeout | undefined;
        const scheduleRestart = (file: string) => {
          clearTimeout(debounceTimer);
          // Debounce: editors/save-atomicity can fire several change events
          // for one logical save (temp-file rename, chmod, ...), and the
          // forced restart itself briefly disconnects the browser's HMR
          // websocket, which can otherwise cascade into a reconnect-retry
          // storm layered on top of a second restart. Coalesce to one.
          debounceTimer = setTimeout(() => {
            if (restarting) {
              return;
            }
            restarting = true;
            server.config.logger.info(
              `\ncoreai theme source changed (${path.basename(file)}) — restarting Vite with a forced dependency re-bundle...\n`,
            );
            server
              .restart(true)
              .catch((err) => server.config.logger.error(String(err)))
              .finally(() => {
                restarting = false;
              });
          }, 300);
        };
        server.watcher.on('change', (file) => {
          if (!toPosix(file).startsWith(themeSrcDirPosix) || restarting) {
            return;
          }
          scheduleRestart(file);
        });
      },
    };

    // Many Fluent stories do `import description from './Foo.md'` to embed
    // markdown documentation in story metadata. Vite has no built-in loader
    // for bare `.md` imports, so expose the file source as the default export.
    // (`?raw` for .ts/.tsx and font assets are handled natively by Vite.)
    const rawMarkdown: Plugin = {
      name: 'coreai:raw-markdown',
      enforce: 'pre',
      transform(code, id) {
        if (id.split('?')[0].endsWith('.md')) {
          return { code: `export default ${JSON.stringify(code)};`, map: null };
        }
        return null;
      },
    };

    // Templates/{Name}.tsx is the single source of truth for its copy-paste
    // component; Templates/{Name}.mdx is a generated doc page that shows the
    // real source (see scripts/generate-template-docs.mjs for why — MCP's
    // docs endpoint returns MDX pages as raw text, so this is how agents see
    // the actual component code instead of reconstructed/fabricated usage).
    // `predev`/`prebuild` already regenerate it once; this watcher keeps it
    // live while `storybook dev` keeps running, so editing a template's .tsx
    // and saving immediately refreshes its .mdx without a server restart.
    const templateDocsWatcher: Plugin = {
      name: 'coreai:template-docs-watcher',
      configureServer(server) {
        const templatesDir = path.resolve(__dirname, '../src/stories/templates');
        const templatesDirNormalized = templatesDir.replace(/\\/g, '/') + '/';
        generateTemplateDocs();
        server.watcher.add(templatesDir);
        const updateTemplateDocs = (file: string) => {
          const normalized = file.replace(/\\/g, '/');
          // `server.watcher` covers the whole project (not just templatesDir,
          // which is only an extra watch root), so this fires for every
          // changed .tsx anywhere — filter to templatesDir itself or the
          // generator would resolve unrelated files (e.g. .storybook/preview.tsx)
          // into a bogus templatesDir/{basename}.mdx.
          if (
            normalized.startsWith(templatesDirNormalized) &&
            normalized.endsWith('.tsx') &&
            !normalized.endsWith('.stories.tsx')
          ) {
            generateTemplateDocs(fs.existsSync(file) ? file : undefined);
          }
        };
        server.watcher.on('add', updateTemplateDocs);
        server.watcher.on('change', updateTemplateDocs);
        server.watcher.on('unlink', updateTemplateDocs);
      },
    };

    // agent/SKILL.md (in the theme package) is the single source of truth for
    // Docs/Agent Skill; mirrors it into a generated .mdx on every save so
    // editing the shipped skill doc doesn't require a dev-server restart to
    // see it reflected in Storybook/MCP (see scripts/generate-skill-doc.mjs).
    const skillDocWatcher: Plugin = {
      name: 'coreai:skill-doc-watcher',
      configureServer(server) {
        const skillPath = path.resolve(
          __dirname,
          '../../../packages/coreai-fluentui-react/agent/SKILL.md',
        );
        generateSkillDoc();
        server.watcher.add(skillPath);
        server.watcher.on('change', (file) => {
          if (file.replace(/\\/g, '/') === skillPath.replace(/\\/g, '/')) {
            generateSkillDoc();
          }
        });
      },
    };

    return mergeConfig(config, {
      resolve: {
        alias: [
          {
            find: /^@coreai\/fluentui-react$/,
            replacement: themeBarrel,
          },
          {
            find: /^@coreai\/fluentui-react\/fonts\/(.*)$/,
            replacement: `${themeSrcDir}/fonts/$1`,
          },
        ],
      },
      plugins: [
        coreaiBarrelAlias,
        coreaiThemeWatcher,
        rawMarkdown,
        templateDocsWatcher,
        skillDocWatcher,
      ],
      // The vendored fluent-stories packages each ship a `stories/tsconfig.json`
      // that `extends` a base tsconfig which isn't part of our sparse checkout.
      // Vite's esbuild transform auto-discovers the nearest tsconfig.json per
      // file and throws on the unresolvable `extends`. Passing `tsconfigRaw` as
      // a *string* makes Vite skip the on-disk tsconfig lookup entirely and use
      // these options for every file (an object value would NOT skip the lookup
      // — Vite still reads the file to merge "meaningful" compiler fields).
      esbuild: {
        tsconfigRaw: '{"compilerOptions":{"jsx":"react-jsx","useDefineForClassFields":false}}',
      },
      // Pre-bundle CommonJS + `export *` re-export chains so their named
      // exports become real ESM bindings that Vite's import analysis can see:
      //  - `@coreai/fluentui-react` (the barrel) does `export * from
      //    '@fluentui/react-components'`; esbuild must flatten it so aliased
      //    imports of makeStyles/tokens/etc. resolve (see the alias plugin).
      //  - `scheduler` / `use-sync-external-store` are CommonJS; several
      //    Fluent / React-Router packages import named exports from them
      //    (`unstable_NormalPriority`, `useSyncExternalStore`).
      optimizeDeps: {
        include: [
          '@coreai/fluentui-react',
          'scheduler',
          'use-sync-external-store',
          'use-sync-external-store/shim',
          'use-sync-external-store/shim/with-selector',
          'react-is',
        ],
      },
    });
  },
};

export default config;
