import type { IStorageProvider } from '../../types/storage';
import type { ChurchToolsAPIClient } from '../api/ChurchToolsAPIClient';
import { createStorageProvider } from '../storage/StorageProviderFactory';
import { recordStorageProviderInitialization } from '../../utils/metrics/storageProviderInstrumentation';

export type ChurchToolsStorageProviderOptions = {
    moduleId: string;
    baseUrl: string;
    apiClient: ChurchToolsAPIClient;
    debugLabel?: string;
};

type ProviderSignature = string;

let cachedProvider: IStorageProvider | null = null;
let cachedSignature: ProviderSignature | null = null;

function createSignature({ moduleId, baseUrl }: ChurchToolsStorageProviderOptions): ProviderSignature {
    return `${baseUrl.replace(/\/$/, '')}::${moduleId}`;
}

function resolveDebugLabel(rawLabel?: string): string | undefined {
    if (rawLabel) return rawLabel;

    const stack = new Error().stack;
    if (!stack) return undefined;

    const [, , callerLine] = stack.split('\n');
    return callerLine?.trim();
}

export function initializeChurchToolsStorageProvider(
    options: ChurchToolsStorageProviderOptions,
): IStorageProvider {
    const signature = createSignature(options);

    if (!cachedProvider || cachedSignature !== signature) {
        cachedProvider = createStorageProvider({
            type: 'churchtools',
            churchtools: {
                moduleId: options.moduleId,
                baseUrl: options.baseUrl,
                apiClient: options.apiClient,
            },
        });
        cachedSignature = signature;

        recordStorageProviderInitialization({
            moduleId: options.moduleId,
            baseUrl: options.baseUrl,
            caller: resolveDebugLabel(options.debugLabel),
        });
    }

    return cachedProvider;
}

export function getChurchToolsStorageProvider(): IStorageProvider {
    if (!cachedProvider) {
        throw new Error(
            'Storage provider has not been initialized. Call initializeChurchToolsStorageProvider first.',
        );
    }

    return cachedProvider;
}

export function resetChurchToolsStorageProvider(): void {
    cachedProvider = null;
    cachedSignature = null;
}

export async function withChurchToolsStorageProvider<T>(
    options: ChurchToolsStorageProviderOptions,
    callback: (provider: IStorageProvider) => Promise<T> | T,
): Promise<T> {
    const provider = initializeChurchToolsStorageProvider(options);
    return callback(provider);
}
