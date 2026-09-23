import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import globals from 'globals'

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'playwright-report', 'test-results', 'prototype', '.local'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  jsxA11y.flatConfigs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },
  {
    // Data-seam rule: only the data layer (and demo code itself) may touch
    // fixtures/demo internals; screens go through feature hooks.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/data/**', 'src/demo/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/demo/*', '**/demo/*'],
              message: 'Import app data via feature hooks (features/*/api.ts) → data/queries.ts, never from demo/ directly.',
            },
          ],
        },
      ],
    },
  },
  {
    // Frozen-clock rule: feature/UI code must read time via lib/clock.ts.
    files: ['src/features/**', 'src/ui/**', 'src/shell/**', 'src/domain/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: 'Use the Clock abstraction (lib/clock.ts) instead of new Date().',
        },
        {
          selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          message: 'Use the Clock abstraction (lib/clock.ts) instead of Date.now().',
        },
      ],
    },
  },
)
