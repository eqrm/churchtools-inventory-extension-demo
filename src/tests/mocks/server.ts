/**
 * MSW Mock Server Setup
 * 
 * Configures Mock Service Worker for intercepting API requests during tests.
 */

import { setupServer } from 'msw/node';
import { handlers } from './handlers';
import { kvStoreState } from './kv-store-state';

/**
 * Mock server instance for tests
 */
export const server = setupServer(...handlers);

/**
 * Start the mock server before all tests
 */
export function startMockServer() {
    server.listen({
        onUnhandledRequest: 'warn',
    });
}

/**
 * Stop the mock server after all tests
 */
export function stopMockServer() {
    server.close();
}

/**
 * Reset handlers after each test
 */
export function resetMockServer() {
    server.resetHandlers();
    kvStoreState.reset();
}

/**
 * Export the KV store state for direct manipulation in tests
 */
export { kvStoreState };
