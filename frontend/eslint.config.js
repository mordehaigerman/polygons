// Flat ESLint config (ESLint v9+). Replaces prettier with @stylistic/eslint-plugin
// so we get formatting *and* React/React-Hooks rules from a single tool.
import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'src/api/schema.d.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: '19' },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      '@stylistic': stylistic,
    },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...react.configs.flat['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      ...stylistic.configs.customize({
        indent: 2,
        // Single quotes for JS/TS strings and imports; JSX attributes are
        // overridden to double quotes by `@stylistic/jsx-quotes` below.
        quotes: 'single',
        semi: true,
        jsx: true,
        arrowParens: true,
        braceStyle: '1tbs',
      }).rules,
      '@stylistic/jsx-quotes': ['error', 'prefer-double'],
      'react/prop-types': 'off',
      // Always brace conditional bodies; no inline single-line `if (x) return;`.
      'curly': ['error', 'all'],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['tests/**/*.{ts,tsx}', '**/*.test.{ts,tsx}'],
    rules: {
      'react/no-unknown-property': 'off',
    },
  },
  {
    files: ['vite.config.ts', 'eslint.config.js'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
);
