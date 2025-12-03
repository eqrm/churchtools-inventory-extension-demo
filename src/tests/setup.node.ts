/**
 * Node Environment Test Setup
 * 
 * This file is executed for tests running in node environment.
 * It provides minimal setup without DOM-specific mocks.
 */

import { beforeAll, vi } from 'vitest';

// Global test environment setup
beforeAll(() => {
    // Mock environment variables for tests
    vi.stubEnv('VITE_ENVIRONMENT', 'test');
    vi.stubEnv('VITE_KEY', 'testfkoinventorymanagement');
    vi.stubEnv('VITE_CHURCHTOOLS_API', 'https://test.church.tools');
});
