import React from 'react';
import ReactDOM from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { churchtoolsClient } from '@churchtools/churchtools-client';
import { theme } from './theme';
import { validateEnvironment } from './utils/envValidation';
import { initializeOfflineDb } from './state/offline/db';
import { runMigrations, registeredMigrations, SchemaVersioningService, BASE_SCHEMA_VERSION, TARGET_SCHEMA_VERSION } from './services/migrations';
import { initializeChurchToolsStorageProvider } from './services/churchTools/storageProvider';
import { churchToolsAPIClient } from './services/api/ChurchToolsAPIClient';
import { getModuleId } from './hooks/useStorageProvider';
import App from './App';
import { initI18n } from './i18n/config';

// Import Mantine styles
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/dropzone/styles.css';
import 'mantine-datatable/styles.css';

function renderFatalStartupError(title: string, error: unknown): never {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${title}]`, error);
    document.body.innerHTML = `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
            <h1 style="color: #c92a2a;">${title}</h1>
            <pre style="background: #f1f3f5; padding: 15px; border-radius: 4px; overflow-x: auto;">${message}</pre>
        </div>
    `;
    throw error instanceof Error ? error : new Error(message);
}

// Only import reset.css in development mode to keep the production bundle small
if (import.meta.env.MODE === 'development') {
    void import('./utils/reset.css');
}

// Validate environment variables before app initialization
let envConfig: ReturnType<typeof validateEnvironment>;
try {
    envConfig = validateEnvironment();
} catch (error) {
    renderFatalStartupError('Configuration Error', error);
}

declare const window: Window &
    typeof globalThis & {
        settings?: {
            base_url?: string;
        };
    };

// ChurchTools client setup
const baseUrl = window.settings?.base_url ?? envConfig.VITE_BASE_URL;
if (!baseUrl) {
    throw new Error('ChurchTools base URL not configured. Please set VITE_BASE_URL in .env file.');
}
churchtoolsClient.setBaseUrl(baseUrl);

// Development authentication
const username = envConfig.VITE_USERNAME;
const password = envConfig.VITE_PASSWORD;
if (import.meta.env.MODE === 'development' && username && password) {
    await churchtoolsClient.post('/login', { username, password });
}

// Initialize offline database (T019 - IndexedDB setup for offline stocktake)
await initializeOfflineDb();

// Initialize translations before rendering UI
await initI18n();

try {
    const schemaVersioning = new SchemaVersioningService();
    const moduleKey = envConfig.VITE_KEY;
    const moduleId = envConfig.VITE_MODULE_ID ?? await getModuleId(moduleKey);
    const storageProvider = initializeChurchToolsStorageProvider({
        moduleId,
        baseUrl,
        apiClient: churchToolsAPIClient,
        debugLabel: 'main:bootstrap',
    });

    const migrationResult = await runMigrations({
        migrations: registeredMigrations,
        schemaVersioning,
            context: {
                storageProvider,
                log: (message) => console.warn(`[Migrations] ${message}`),
        },
        baseVersion: BASE_SCHEMA_VERSION,
    });

    if (migrationResult.failed) {
        throw migrationResult.failed.error;
    }

    if (migrationResult.applied.length > 0) {
            console.warn(
            `[Migrations] Applied migrations: ${migrationResult.applied.join(', ')} (target version ${TARGET_SCHEMA_VERSION})`
        );
    } else {
            console.warn(`[Migrations] No new migrations to apply. Target version ${TARGET_SCHEMA_VERSION} already reached.`);
    }

    const currentVersion = schemaVersioning.getCurrentVersion() ?? BASE_SCHEMA_VERSION;
        console.warn(`[Migrations] Schema version is ${currentVersion}`);
} catch (error) {
    renderFatalStartupError('Migration Error', error);
}

// TanStack Query client configuration (T218 - optimized cache times)
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Cache configuration for performance
            staleTime: 2 * 60 * 1000, // 2 minutes - data considered fresh (reduced from 5 for fresher data)
            gcTime: 10 * 60 * 1000, // 10 minutes - garbage collection time (reduced from 30 to save memory)
            refetchOnWindowFocus: true, // Refetch on window focus for fresher data
            refetchOnMount: true, // Refetch on mount to ensure fresh data
            retry: 2, // Retry failed requests twice (increased for reliability)
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
        },
        mutations: {
            retry: 0, // Don't retry mutations
        },
    },
});

// Render React app
const appElement = document.getElementById('app');
if (!appElement) {
    throw new Error('App element not found');
}

ReactDOM.createRoot(appElement).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <MantineProvider theme={theme}>
                <Notifications position="top-right" />
                <App />
                {import.meta.env.MODE === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
            </MantineProvider>
        </QueryClientProvider>
    </React.StrictMode>
);

