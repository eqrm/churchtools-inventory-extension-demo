/**
 * Utilities for computing the ChurchTools extension key across environments.
 */

const DEFAULT_KEY = 'fkoinventorymanagement';

function sanitizeKey(value: string | undefined): string {
    const trimmed = (value ?? '').trim();
    if (!trimmed) {
        return DEFAULT_KEY;
    }

    return trimmed.toLowerCase();
}

export function getExtensionKey(): string {
    return sanitizeKey(import.meta.env['VITE_KEY']);
}

export function resolveModuleKey(): string {
    return getExtensionKey();
}
