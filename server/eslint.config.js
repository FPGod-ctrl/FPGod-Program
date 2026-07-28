import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/**', 'uploads/**', 'coverage/**'] },
  js.configs.recommended,
  {
    // .mjs too — the one-off scripts in scripts/ are Node modules and need the
    // same globals, otherwise every `process`/`console` reads as undefined.
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'off',
    },
  },
];
