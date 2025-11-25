import { padAssetNumber } from '../../utils/assetNumbers';
import { initializeOfflineDb, offlineDb } from '../../state/offline/db';
import type { AssetPrefix, PersonInfo } from '../../types/entities';

const MODULE_DEFAULT_PREFIX_STORAGE_KEY = 'inventory.moduleDefaultPrefixId';

function getSafeLocalStorage(): Storage | null {
    if (typeof globalThis === 'undefined') {
        return null;
    }

    try {
        const candidate = (globalThis as unknown as { localStorage?: Storage }).localStorage;
        return candidate ?? null;
    } catch {
        return null;
    }
}

async function ensureOfflineDbOpen(): Promise<boolean> {
    if (typeof indexedDB === 'undefined') {
        return false;
    }

    try {
        if (!offlineDb.isOpen()) {
            await initializeOfflineDb();
        }
        return true;
    } catch {
        return false;
    }
}

function toPersonCacheSearchText(person: Pick<PersonInfo, 'firstName' | 'lastName' | 'email'>): string {
    return [person.firstName, person.lastName, person.email]
        .filter(Boolean)
        .map(entry => entry?.toLowerCase() ?? '')
        .join(' ')
        .trim();
}

export function getStoredModuleDefaultPrefixId(): string | null {
    const storage = getSafeLocalStorage();
    if (!storage) {
        return null;
    }

    return storage.getItem(MODULE_DEFAULT_PREFIX_STORAGE_KEY);
}

export function setStoredModuleDefaultPrefixId(prefixId: string | null): void {
    const storage = getSafeLocalStorage();
    if (!storage) {
        return;
    }

    if (prefixId) {
        storage.setItem(MODULE_DEFAULT_PREFIX_STORAGE_KEY, prefixId);
    } else {
        storage.removeItem(MODULE_DEFAULT_PREFIX_STORAGE_KEY);
    }
}

export async function getStoredPersonDefaultPrefixId(personId: string): Promise<string | null> {
    if (!personId) {
        return null;
    }

    const dbAvailable = await ensureOfflineDbOpen();
    if (!dbAvailable) {
        return null;
    }

    try {
        const record = await offlineDb.personCache.get(personId);
        return record?.defaultPrefixId ?? null;
    } catch {
        return null;
    }
}

export async function setStoredPersonDefaultPrefixId(
    person: Pick<PersonInfo, 'id' | 'firstName' | 'lastName' | 'email' | 'avatarUrl'>,
    prefixId: string | null,
): Promise<void> {
    if (!person?.id) {
        return;
    }

    const dbAvailable = await ensureOfflineDbOpen();
    if (!dbAvailable) {
        return;
    }

    const now = new Date().toISOString();

    try {
        const existing = await offlineDb.personCache.get(person.id);

        if (!prefixId) {
            if (existing) {
                await offlineDb.personCache.update(person.id, {
                    defaultPrefixId: null,
                    defaultPrefixUpdatedAt: now,
                });
            }
            return;
        }

        if (existing) {
            await offlineDb.personCache.update(person.id, {
                defaultPrefixId: prefixId,
                defaultPrefixUpdatedAt: now,
                lastUsed: now,
            });
            return;
        }

        await offlineDb.personCache.put({
            id: person.id,
            firstName: person.firstName ?? '',
            lastName: person.lastName ?? '',
            email: person.email,
            avatarUrl: person.avatarUrl,
            searchText: toPersonCacheSearchText(person),
            lastUsed: now,
            defaultPrefixId: prefixId,
            defaultPrefixUpdatedAt: now,
        });
    } catch {
        // Ignore persistence failures to keep UX responsive
    }
}

export type AutoNumberingSource =
    | 'explicit'
    | 'person-default'
    | 'module-default'
    | 'collection-first'
    | 'none';

export interface ResolveAutoNumberingOptions {
    prefixes: AssetPrefix[];
    selectedPrefixId?: string | null;
    personDefaultPrefixId?: string | null;
    moduleDefaultPrefixId?: string | null;
}

export interface AutoNumberingResolution {
    prefix: AssetPrefix | null;
    prefixId: string | null;
    source: AutoNumberingSource;
}

function findValidPrefix(prefixes: AssetPrefix[], candidate?: string | null): AssetPrefix | null {
    if (!candidate) {
        return null;
    }

    return prefixes.find(prefix => prefix.id === candidate) ?? null;
}

export function resolvePrefixForAutoNumbering(options: ResolveAutoNumberingOptions): AutoNumberingResolution {
    const { prefixes } = options;

    const explicit = findValidPrefix(prefixes, options.selectedPrefixId);
    if (explicit) {
        return { prefix: explicit, prefixId: explicit.id, source: 'explicit' };
    }

    const personDefault = findValidPrefix(prefixes, options.personDefaultPrefixId);
    if (personDefault) {
        return { prefix: personDefault, prefixId: personDefault.id, source: 'person-default' };
    }

    const moduleDefault = findValidPrefix(prefixes, options.moduleDefaultPrefixId);
    if (moduleDefault) {
        return { prefix: moduleDefault, prefixId: moduleDefault.id, source: 'module-default' };
    }

    if (prefixes.length > 0) {
        const firstPrefix = prefixes[0];
        if (firstPrefix) {
            return { prefix: firstPrefix, prefixId: firstPrefix.id, source: 'collection-first' };
        }
    }

    return { prefix: null, prefixId: null, source: 'none' };
}

export function formatNextAssetNumber(prefix: AssetPrefix, sequenceOverride?: number): string {
    const baseSequence = typeof sequenceOverride === 'number' ? sequenceOverride : prefix.sequence + 1;
    const padded = padAssetNumber(baseSequence, 3);
    return `${prefix.prefix}-${padded}`;
}

export interface ResolveAutoNumberingPreviewOptions extends ResolveAutoNumberingOptions {
    sequenceOverrides?: Record<string, number>;
}

export interface AutoNumberingPreview extends AutoNumberingResolution {
    nextAssetNumber: string | null;
}

export function resolveAutoNumberingPreview(options: ResolveAutoNumberingPreviewOptions): AutoNumberingPreview {
    const base = resolvePrefixForAutoNumbering(options);
    const { prefix } = base;

    if (!prefix) {
        return { ...base, nextAssetNumber: null };
    }

    const override = options.sequenceOverrides?.[prefix.id];
    const nextAssetNumber = formatNextAssetNumber(prefix, override);

    return { ...base, nextAssetNumber };
}
