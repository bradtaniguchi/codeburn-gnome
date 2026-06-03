import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        // GJS built-in globals
        log: 'readonly',
        logError: 'readonly',
        print: 'readonly',
        printerr: 'readonly',
        globalThis: 'readonly',
        ARGV: 'readonly',
        PACKAGE_VERSION: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
    },
  },
  {
    ignores: ['node_modules/', '*.shell-extension.zip'],
  },
];
