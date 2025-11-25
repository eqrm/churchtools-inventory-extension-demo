import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Extend from vite.config.ts
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': resolve(__dirname, './src'),
            '@tests': resolve(__dirname, './src/tests'),
        },
    },
    test: {
        environment: 'jsdom',
        environmentOptions: {
            jsdom: {
                url: 'http://localhost',
            },
        },
        globals: true,
        setupFiles: ['src/tests/setup.ts'],
        include: ['**/__tests__/**/*.{test,spec}.{ts,tsx}', '**/*.{test,spec}.{ts,tsx}'],
        exclude: [...configDefaults.exclude, 'e2e/**'],
        reporters: ['default', 'html', 'json'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'json'],
            include: ['src/**/*.{ts,tsx}'],
            exclude: [
                'src/**/*.d.ts',
                'src/**/*.test.{ts,tsx}',
                'src/**/*.spec.{ts,tsx}',
                'src/tests/**',
                'src/main.tsx',
                'src/vite-env.d.ts',
            ],
            thresholds: {
                global: {
                    lines: 85,
                    functions: 85,
                    branches: 80,
                    statements: 85,
                },
                // Critical logic buckets
                'src/services/**/*.ts': {
                    lines: 90,
                    functions: 90,
                    branches: 90,
                    statements: 90,
                },
                'src/hooks/**/*.ts': {
                    lines: 90,
                    functions: 90,
                    branches: 90,
                    statements: 90,
                },
                'src/utils/**/*.ts': {
                    lines: 90,
                    functions: 90,
                    branches: 90,
                    statements: 90,
                },
                'src/state/**/*.{ts,tsx}': {
                    lines: 88,
                    functions: 88,
                    branches: 85,
                    statements: 88,
                },
                'src/components/**/*.tsx': {
                    lines: 80,
                    functions: 80,
                    branches: 80,
                    statements: 80,
                },
            },
        },
    },
});
