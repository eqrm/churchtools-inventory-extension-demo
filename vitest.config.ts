import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Shared configuration
const sharedConfig = {
    resolve: {
        alias: {
            '@': resolve(__dirname, './src'),
            '@tests': resolve(__dirname, './src/tests'),
        },
    },
};

// Extend from vite.config.ts
export default defineConfig({
    plugins: [react()],
    ...sharedConfig,
    test: {
        // Use workspace projects for different environments
        workspace: [
            // Node environment for pure logic tests (faster)
            {
                extends: true,
                test: {
                    name: 'unit',
                    environment: 'node',
                    include: [
                        'src/tests/services/bulkUndo.test.ts',
                        'src/tests/services/DataViewService.test.ts',
                        'src/tests/services/maintenanceScheduler.test.ts',
                        'src/tests/services/PropertyInheritanceService.test.ts',
                        'src/tests/services/workOrderGenerator.test.ts',
                        'src/tests/services/WorkOrderStateMachine.test.ts',
                        'src/tests/utils/assetResolution.test.ts',
                        'src/tests/utils/scanUtils.test.ts',
                        'src/tests/utils/assetNavigation.test.ts',
                        'src/tests/utils/filterEvaluation.test.ts',
                        'src/tests/utils/filterEvaluation.standard.test.ts',
                        'src/utils/__tests__/formatting.test.ts',
                        'src/utils/__tests__/assetNumbers.test.ts',
                        'src/utils/__tests__/validation.test.ts',
                        'src/tests/unit/bookings/**/*.test.ts',
                        'src/tests/unit/storage/**/*.test.ts',
                        'src/tests/unit/maintenance/**/*.test.ts',
                        'src/tests/unit/services/**/*.test.ts',
                        'src/tests/constants/**/*.test.ts',
                        'src/tests/stores/**/*.test.ts',
                        'src/tests/state/**/*.test.ts',
                        'tests/unit/utils/viewFilters.test.ts',
                        'tests/unit/utils/kitAssets.test.ts',
                        'tests/unit/stores/**/*.test.ts',
                        'tests/unit/assets/**/*.test.ts',
                        'tests/unit/maintenance/**/*.test.ts',
                    ],
                    setupFiles: ['src/tests/setup.node.ts'],
                },
            },
            // jsdom environment for component/DOM tests
            {
                extends: true,
                test: {
                    name: 'dom',
                    environment: 'jsdom',
                    environmentOptions: {
                        jsdom: {
                            url: 'http://localhost',
                        },
                    },
                    include: [
                        'src/tests/**/*.test.tsx',
                        'src/tests/integration/**/*.test.ts',
                        'src/tests/kv-store.test.ts',
                        'src/tests/i18n/**/*.test.ts',
                        'src/tests/utils/urlFilters.test.ts',
                        'src/tests/utils/workOrderStatus.test.ts',
                        'src/tests/services/UndoService.test.ts',
                        'src/tests/services/PhotoStorageService.test.ts',
                        'src/tests/services/settings/**/*.test.ts',
                        'src/tests/services/migrations/**/*.test.ts',
                        'src/services/storage/__tests__/**/*.test.ts',
                        'tests/unit/hooks/**/*.test.ts',
                        'tests/unit/utils/matchesBoundAssetSearch.test.ts',
                        'tests/unit/utils/scannerLoader.test.ts',
                        'tests/unit/utils/urlFilters.test.ts',
                        // Additional files with __tests__ pattern
                        'src/components/**/__tests__/**/*.test.tsx',
                        'src/pages/**/__tests__/**/*.test.tsx',
                        'src/utils/__tests__/selectControl.test.ts',
                        'tests/unit/pages/**/*.test.tsx',
                        'tests/unit/services/**/*.test.ts',
                    ],
                    exclude: [...configDefaults.exclude, 'e2e/**', 'tests/e2e/**', '**/e2e/**'],
                    setupFiles: ['src/tests/setup.ts'],
                },
            },
        ],
        globals: true,
        reporters: ['default'],
        // Parallel execution settings
        pool: 'forks',
        poolOptions: {
            forks: {
                singleFork: false,
                isolate: true,
            },
        },
        fileParallelism: true,
        // Sequence tests by file size (smaller first)
        sequence: {
            shuffle: false,
        },
        // Optimize dependency handling
        deps: {
            optimizer: {
                web: {
                    include: ['@mantine/core', '@mantine/hooks', '@tabler/icons-react'],
                },
            },
        },
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
                    lines: 22.4,
                    functions: 47,
                    branches: 63,
                    statements: 22.4,
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
                'src/services/settings/settingsSnapshot.ts': {
                    lines: 90,
                    functions: 100,
                    branches: 65,
                    statements: 90,
                },
                'src/services/storage/churchToolsProvider/kits.ts': {
                    lines: 70,
                    functions: 90,
                    branches: 55,
                    statements: 70,
                },
            },
        },
    },
});
