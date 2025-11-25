import { useEffect, useState } from 'react';
import type { IStorageProvider } from '../types/storage';
import { churchToolsAPIClient } from '../services/api/ChurchToolsAPIClient';
import { churchtoolsClient } from '@churchtools/churchtools-client';
import { resolveModuleKey } from '../utils/extensionKey';
import { initializeChurchToolsStorageProvider } from '../services/churchTools/storageProvider';

interface Module {
    id: number;
    shorty: string;
    name: string;
    description: string | null;
}

// Cache for module ID to avoid repeated API calls
let cachedModuleId: string | null = null;

/**
 * Fetch the custom module ID from ChurchTools by its key and cache it
 */
export async function getModuleId(moduleKey: string): Promise<string> {
    // Check in-memory cache first
    if (cachedModuleId) return cachedModuleId;

    const normalizedKey = moduleKey.trim().toLowerCase();

    // Check localStorage cache (persist across page reloads)
    try {
        const stored = localStorage.getItem(`ct_module_${normalizedKey}`);
        if (stored) {
            cachedModuleId = stored;
            return cachedModuleId;
        }
    } catch {
        // Ignore localStorage failures
    }

    // Prefer explicit module id from environment before making network requests
    const envModuleId = (import.meta.env['VITE_MODULE_ID'] ?? '').trim();
    if (envModuleId) {
        cachedModuleId = envModuleId;
        return cachedModuleId;
    }

    try {
        // Fetch the module by its key
        // The churchtoolsClient returns the data directly (not wrapped in { data: ... })
        const module = await churchtoolsClient.get<Module>(`/custommodules/${moduleKey}`);
        cachedModuleId = String(module.id);

        // Persist to localStorage for faster subsequent loads
        try {
            localStorage.setItem(`ct_module_${normalizedKey}`, cachedModuleId);
        } catch {
            // ignore storage errors
        }

        return cachedModuleId;
    } catch (apiError) {
        // If API call fails, try environment variable
        console.error('Could not fetch module via API and no cached module id or env var available:', apiError);
        throw new Error(
            'Unable to initialize storage: Custom module not found. ' +
            'Please create a custom module in ChurchTools admin panel with key "' + moduleKey + '".'
        );
    }
}

/**
 * Hook to get the current storage provider instance
 * Creates and caches the provider based on environment configuration
 * Fetches or creates the custom module in ChurchTools on first use
 */
export function useStorageProvider(): IStorageProvider | null {
    const [provider, setProvider] = useState<IStorageProvider | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function initializeProvider() {
            try {
                const baseUrl = import.meta.env.VITE_BASE_URL;
                const moduleKey = resolveModuleKey();
                
                if (!baseUrl) {
                    throw new Error('VITE_BASE_URL not configured. Please set it in your .env file.');
                }

                const moduleId = await getModuleId(moduleKey);

                const storageProvider = initializeChurchToolsStorageProvider({
                    moduleId,
                    baseUrl,
                    apiClient: churchToolsAPIClient,
                    debugLabel: 'hook:useStorageProvider',
                });

                setProvider(storageProvider);
                setIsLoading(false);
            } catch (err) {
                setError(err instanceof Error ? err : new Error('Unknown error'));
                setIsLoading(false);
            }
        }

        void initializeProvider();
    }, []);

    if (error) {
        throw error;
    }

    if (isLoading) {
        return null;
    }

    return provider;
}

export { resolveModuleKey } from '../utils/extensionKey';
