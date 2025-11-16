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
        reporters: ['default'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'json-summary', 'lcov'],
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
                    lines: 25,
                    functions: 25,
                    branches: 15,
                    statements: 25,
                },
                'src/services/UndoService.ts': {
                    lines: 80,
                    functions: 65,
                    branches: 60,
                    statements: 80,
                },
                'src/services/PhotoStorageService.ts': {
                    lines: 75,
                    functions: 80,
                    branches: 70,
                    statements: 75,
                },
                'src/services/PropertyInheritanceService.ts': {
                    lines: 85,
                    functions: 85,
                    branches: 65,
                    statements: 85,
                },
                'src/services/DataViewService.ts': {
                    lines: 55,
                    functions: 65,
                    branches: 40,
                    statements: 55,
                },
                'src/services/machines/InternalWorkOrderMachine.ts': {
                    lines: 60,
                    functions: 60,
                    branches: 60,
                    statements: 60,
                },
                'src/services/machines/ExternalWorkOrderMachine.ts': {
                    lines: 60,
                    functions: 0,
                    branches: 60,
                    statements: 60,
                },
                'src/services/machines/WorkOrderMachineAdapter.ts': {
                    lines: 55,
                    functions: 60,
                    branches: 60,
                    statements: 55,
                },
            },
        },
    },
});
