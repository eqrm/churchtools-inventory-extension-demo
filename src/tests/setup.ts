/**
 * Global Test Setup
 * 
 * This file is executed once before all tests run.
 * It configures the test environment and imports global test utilities.
 */

import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, vi } from 'vitest';

// Mock window.matchMedia (required for Mantine components)
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // deprecated
        removeListener: vi.fn(), // deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

// Mock window.scrollTo
Object.defineProperty(window, 'scrollTo', {
    writable: true,
    value: vi.fn(),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
    disconnect() {}
    observe() {}
    takeRecords() {
        return [];
    }
    unobserve() {}
} as unknown as typeof IntersectionObserver;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
    disconnect() {}
    observe() {}
    unobserve() {}
} as unknown as typeof ResizeObserver;

// Cleanup after each test
afterEach(() => {
    cleanup();
});

// Global test environment setup
beforeAll(() => {
    // Mock environment variables for tests
    vi.stubEnv('VITE_ENVIRONMENT', 'test');
    vi.stubEnv('VITE_KEY', 'testfkoinventorymanagement');
    vi.stubEnv('VITE_CHURCHTOOLS_API', 'https://test.church.tools');
});

// Suppress console errors in tests (optional - remove if you want to see them)
const originalError = console.error;
beforeAll(() => {
    console.error = (...args: unknown[]) => {
        // Filter out specific known warnings/errors that are expected in tests
        const message = args[0]?.toString() || '';
        if (
            message.includes('Warning: ReactDOM.render') ||
            message.includes('Not implemented: HTMLFormElement.prototype.submit')
        ) {
            return;
        }
        originalError.call(console, ...args);
    };
});

afterEach(() => {
    console.error = originalError;
});
