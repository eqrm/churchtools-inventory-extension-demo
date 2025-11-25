/**
 * Lightweight instrumentation utilities for tracking storage provider singleton usage.
 * The data is stored on a global object for easy inspection during manual QA sessions.
 */

export interface StorageProviderInitializationEvent {
    moduleId: string;
    baseUrl: string;
    initializationCount: number;
    caller?: string;
    timestamp: string;
}

interface StorageProviderMetricState {
    totalInitializations: number;
    events: StorageProviderInitializationEvent[];
    lastUpdated?: string;
}

const METRICS_GLOBAL_KEY = '__CT_INVENTORY_METRICS__';

function ensureMetricState(): StorageProviderMetricState {
    const globalObject = globalThis as Record<string, unknown>;

    if (!globalObject[METRICS_GLOBAL_KEY]) {
        globalObject[METRICS_GLOBAL_KEY] = {
            storageProvider: {
                totalInitializations: 0,
                events: [],
                lastUpdated: undefined,
            } satisfies StorageProviderMetricState,
        };
    }

    const bucket = globalObject[METRICS_GLOBAL_KEY] as {
        storageProvider: StorageProviderMetricState;
    };

    return bucket.storageProvider;
}

export function recordStorageProviderInitialization(details: {
    moduleId: string;
    baseUrl: string;
    caller?: string;
}): StorageProviderInitializationEvent {
    const state = ensureMetricState();
    state.totalInitializations += 1;

    const event: StorageProviderInitializationEvent = {
        moduleId: details.moduleId,
        baseUrl: details.baseUrl,
        caller: details.caller,
        initializationCount: state.totalInitializations,
        timestamp: new Date().toISOString(),
    };

    state.events.push(event);
    state.lastUpdated = event.timestamp;

    if (import.meta.env.DEV) {
        console.warn('[metrics] storageProvider initialized', event);
    }

    return event;
}

export function getStorageProviderMetrics(): StorageProviderMetricState {
    const state = ensureMetricState();
    return {
        totalInitializations: state.totalInitializations,
        events: [...state.events],
        lastUpdated: state.lastUpdated,
    };
}

export function resetStorageProviderMetrics(): void {
    const state = ensureMetricState();
    state.totalInitializations = 0;
    state.events = [];
    state.lastUpdated = undefined;
}
