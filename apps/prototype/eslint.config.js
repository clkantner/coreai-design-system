import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';

const productionLibraryFiles = ['packages/vellum/**'];

const libraryFiles = [
  'app/components/common/**', // app-owned component library
  ...productionLibraryFiles,     // production-derived libraries
  'app/core/**',              // framework infrastructure (theme, providers)
  'app/features/**',          // feature/variant system infrastructure
];

export default [
  {
    ignores: ['build/**', 'landing-v2/dist/**'],
  },

  // Surface stale eslint-disable comments instead of silently retaining them.
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'warn',
    },
  },

  // Keep every source surface on the CoreAI component boundary.
  {
    files: ['**/*.{js,jsx,mjs,cjs,ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@fluentui/*', '!@fluentui/react-icons'],
              message:
                'Import components from "@coreai/fluentui-react" instead of @fluentui directly. ' +
                'Import Foundry-owned adapters from "~/components/common".',
            },
          ],
        },
      ],
    },
  },

  // Keep overlapping CoreAI exports behind the app-owned adapters.
  {
    files: ['app/**/*.{js,jsx,mjs,cjs,ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@coreai/fluentui-react',
              importNames: ['Card'],
              message: 'Use Card from "~/components/common".',
            },
            {
              name: '@coreai/fluentui-react',
              importNames: ['Image'],
              message: 'Use Image from "~/components/common".',
            },
            {
              name: '@coreai/fluentui-react',
              importNames: ['Link'],
              message:
                'Use Link from "~/components/common" for app navigation or ExternalLink for external URLs.',
            },
          ],
          patterns: [
            {
              group: ['@fluentui/*', '!@fluentui/react-icons'],
              message:
                'Import components from "@coreai/fluentui-react" instead of @fluentui directly. ' +
                'Import Foundry-owned adapters from "~/components/common".',
            },
          ],
        },
      ],
    },
  },

  // Production-derived files do not accept inline lint configuration.
  {
    files: productionLibraryFiles,
    linterOptions: {
      noInlineConfig: true,
    },
  },

  // Minimal rules to keep AI agents on-track with project conventions.
  // These are NOT general code-quality rules — only corrections for common
  // mistakes where agents revert to vanilla React/HTML patterns.
  {
    files: ['app/**/*.{ts,tsx}'],
    ignores: [...libraryFiles],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      react: reactPlugin,
    },
    rules: {
      // ── No inline style attributes on DOM elements ─────────────────
      'react/forbid-dom-props': ['error', {
        forbid: [{
          propName: 'style',
          message:
            'Do not use inline styles. Use CSS Modules instead. '
            + 'Create a *.module.css file and import it: '
            + 'import styles from "./Component.module.css";',
        }],
      }],

      // ── No inline style attributes on React components ─────────────
      'react/forbid-component-props': ['error', {
        forbid: [{
          propName: 'style',
          message:
            'Do not use inline styles. Use CSS Modules instead. '
            + 'Create a *.module.css file and import it: '
            + 'import styles from "./Component.module.css";',
        }],
      }],

      // ── No native HTML elements — use our components ───────────────
      'react/forbid-elements': ['error', {
        forbid: [
          {
            element: 'button',
            message:
              'Use <Button> from "@coreai/fluentui-react" instead of native <button>. '
              + 'Use the react-components skill and CoreAI MCP to verify the appropriate interaction component.',
          },
          {
            element: 'input',
            message: 'Use <Input> from "@coreai/fluentui-react" instead of native <input>.',
          },
          {
            element: 'textarea',
            message: 'Use <Textarea> from "@coreai/fluentui-react" instead of native <textarea>.',
          },
          {
            element: 'select',
            message: 'Use <Dropdown> from "@coreai/fluentui-react" instead of native <select>.',
          },
          {
            element: 'a',
            message:
              'Use the Router-aware <Link> from "~/components/common" instead of native <a>. '
              + 'Use the react-components skill and CoreAI MCP to verify the appropriate navigation component.',
           },
          {
            element: 'label',
            message:
              'Use <Field label="..."> from "@coreai/fluentui-react" to label form controls. '
              + 'If you need a standalone label, use <Label> from "@coreai/fluentui-react".',
          },
          {
            element: 'img',
            message:
              'Use the react-components skill and CoreAI MCP to select an image component instead of <img>. '
              + 'For Fluent icons, import from @fluentui/react-icons and use bundleIcon().',
          },
          {
            element: 'style',
            message:
              'Do not use <style> tags. Write styles in CSS Modules (*.module.css) files instead.',
          },
          // ── Text elements — use <Text> component ───────────────────
          {
            element: 'h1',
            message: 'Use <Text block preset="LargeTitle"> from "@coreai/fluentui-react" instead of <h1>.',
          },
          {
            element: 'h2',
            message: 'Use <Text block preset="Title2"> from "@coreai/fluentui-react" instead of <h2>.',
          },
          {
            element: 'h3',
            message: 'Use <Text block preset="Subtitle1"> from "@coreai/fluentui-react" instead of <h3>.',
          },
          {
            element: 'h4',
            message: 'Use <Text block preset="Subtitle2"> from "@coreai/fluentui-react" instead of <h4>.',
          },
          {
            element: 'h5',
            message: 'Use <Text block preset="Caption1Strong"> from "@coreai/fluentui-react" instead of <h5>.',
          },
          {
            element: 'h6',
            message: 'Use <Text block preset="Caption2Strong"> from "@coreai/fluentui-react" instead of <h6>.',
          },
          {
            element: 'p',
            message: 'Use <Text block> from "@coreai/fluentui-react" instead of <p>. Default preset is "Body1".',
          },
          {
            element: 'strong',
            message: 'Use <Text preset="Body1Strong"> from "@coreai/fluentui-react" instead of <strong>.',
          },
          {
            element: 'em',
            message: 'Use <Text italic> from "@coreai/fluentui-react" instead of <em>.',
          },
          {
            element: 'b',
            message: 'Use <Text preset="Body1Strong"> from "@coreai/fluentui-react" instead of <b>.',
          },
          {
            element: 'i',
            message: 'Use <Text italic> from "@coreai/fluentui-react" instead of <i>.',
          },
          {
            element: 'small',
            message: 'Use <Text preset="Caption1"> from "@coreai/fluentui-react" instead of <small>.',
          }
        ],
      }],

      // ── Max file length for .tsx files ─────────────────────────────
      'max-lines': ['warn', {
        max: 1000,
        skipBlankLines: true,
        skipComments: true,
      }],
    },
  },
];
