import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      'node_modules',
      'dist',
      'dist-ssr',
      '.vite',
      'build',
      'coverage', // Exclude coverage reports from linting
      'html', // Exclude test HTML reports
      'releases',
      'specs/**', // Exclude specification contracts from linting
      'src/utils/ct-types.d.ts', // Third-party ChurchTools type definitions
      '*.config.ts', // Config files (vite.config.ts, etc.)
      '*.config.js',
      '*.log',
      '.env',
      '.DS_Store',
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.strict],
  files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_' 
      }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // 'max-lines-per-function': ['warn', { max: 200, skipBlankLines: true, skipComments: true }],
    },
  },
)
