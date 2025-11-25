import Dexie, { type EntityTable } from 'dexie';
import type { UUID, ISOTimestamp } from '../../types/entities';
import type { SyncConflict } from '../../types/sync';
import type { HistoryEntityType, HistoryEvent } from '../../utils/history/types';

export interface StockTakeSession {
    id: UUID;
    name: string;
    description?: string;
    startedAt: ISOTimestamp;
    completedAt?: ISOTimestamp;
    startedBy: string;
    startedByName: string;
    status: 'in-progress' | 'completed' | 'cancelled';
    totalScans: number;
    uniqueAssets: number;
}

export interface StockTakeScan {
    id: UUID;
    sessionId: UUID;
    assetId: UUID;
    assetNumber: string;
    assetName: string;
    scannedAt: ISOTimestamp;
    scannedBy: string;
    scannedByName: string;
    location?: string;
    condition?: string;
    synced: boolean;
    syncedAt?: ISOTimestamp;
}

export interface PersonCacheRecord {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    avatarUrl?: string;
    lastUsed: ISOTimestamp;
    searchText: string;
    defaultPrefixId?: string | null;
    defaultPrefixUpdatedAt?: ISOTimestamp;
}

export interface DemoMetadataRecord {
    id: string;
    seededAt: ISOTimestamp | null;
    seedVersion: string | null;
    seededBy?: string | null;
    lastResetAt?: ISOTimestamp | null;
    modalDismissedAt?: ISOTimestamp | null;
}

export interface DemoEntityRecord {
    id: string;
    entityId: string;
    entityType: HistoryEntityType;
    taggedAt: ISOTimestamp;
}

export interface HistoryEventCacheRecord {
    id: string;
    entityId: string;
    entityType: HistoryEntityType;
    occurredAt: ISOTimestamp;
    payload: HistoryEvent;
    cachedAt: ISOTimestamp;
}

export interface HistoryCursorRecord {
    id: string;
    entityId: string;
    entityType: HistoryEntityType;
    lastFetchedAt: ISOTimestamp;
}

export class InventoryOfflineDatabase extends Dexie {
    stockTakeSessions!: EntityTable<StockTakeSession, 'id'>;
    stockTakeScans!: EntityTable<StockTakeScan, 'id'>;
    syncConflicts!: EntityTable<SyncConflict, 'id'>;
    personCache!: EntityTable<PersonCacheRecord, 'id'>;
    demoMetadata!: EntityTable<DemoMetadataRecord, 'id'>;
    demoEntities!: EntityTable<DemoEntityRecord, 'id'>;
    historyEvents!: EntityTable<HistoryEventCacheRecord, 'id'>;
    historyCursors!: EntityTable<HistoryCursorRecord, 'id'>;

    constructor() {
        super('churchtools-inventory-offline');

        this.version(1).stores({
            stockTakeSessions: 'id, status, startedAt, startedBy',
            stockTakeScans: 'id, sessionId, assetId, scannedAt, synced',
            syncConflicts: 'id, entityType, detectedAt, resolvedAt',
            personCache: 'id, lastUsed, searchText',
        });

        this.version(2)
            .stores({
                stockTakeSessions: 'id, status, startedAt, startedBy',
                stockTakeScans: 'id, sessionId, assetId, scannedAt, synced',
                syncConflicts: 'id, entityType, detectedAt, resolvedAt',
                personCache: 'id, lastUsed, searchText',
                demoMetadata: 'id, seededAt, seedVersion',
                demoEntities: 'id, entityType, taggedAt',
                historyEvents: 'id, [entityType+entityId], entityType, occurredAt',
                historyCursors: 'id, entityType, lastFetchedAt',
            })
            .upgrade(async tx => {
                const table = tx.table('demoMetadata') as EntityTable<DemoMetadataRecord, 'id'>;
                await table.put({ id: 'global', seededAt: null, seedVersion: null });
            });
    }
}

export const offlineDb = new InventoryOfflineDatabase();

export async function initializeOfflineDb(): Promise<void> {
    try {
        if (!offlineDb.isOpen()) {
            await offlineDb.open();
        }
    } catch (error) {
        console.error('Failed to initialize offline database', error);
        throw error;
    }
}

export async function clearOfflineDb(): Promise<void> {
    await Promise.all([
        offlineDb.stockTakeSessions.clear(),
        offlineDb.stockTakeScans.clear(),
        offlineDb.syncConflicts.clear(),
        offlineDb.personCache.clear(),
        offlineDb.demoMetadata.clear(),
        offlineDb.demoEntities.clear(),
        offlineDb.historyEvents.clear(),
        offlineDb.historyCursors.clear(),
    ]);
}

export async function getOfflineDbStats() {
    const [sessions, scans, conflicts, people, demoEntities, historyEventCount] = await Promise.all([
        offlineDb.stockTakeSessions.count(),
        offlineDb.stockTakeScans.count(),
        offlineDb.syncConflicts.count(),
        offlineDb.personCache.count(),
        offlineDb.demoEntities.count(),
        offlineDb.historyEvents.count(),
    ]);

    return {
        stockTakeSessions: sessions,
        stockTakeScans: scans,
        syncConflicts: conflicts,
        personCache: people,
        demoEntities,
        historyEvents: historyEventCount,
    };
}

const GLOBAL_DEMO_METADATA_ID = 'global';

function toEntityKey(entityType: HistoryEntityType, entityId: string): string {
    return `${entityType}:${entityId}`;
}

export async function loadDemoMetadata(): Promise<DemoMetadataRecord> {
    const record = await offlineDb.demoMetadata.get(GLOBAL_DEMO_METADATA_ID);
    if (record) {
        return record;
    }

    const defaultRecord: DemoMetadataRecord = {
        id: GLOBAL_DEMO_METADATA_ID,
        seededAt: null,
        seedVersion: null,
        seededBy: null,
        lastResetAt: null,
        modalDismissedAt: null,
    };

    await offlineDb.demoMetadata.put(defaultRecord);
    return defaultRecord;
}

export async function saveDemoMetadata(metadata: Partial<DemoMetadataRecord>): Promise<void> {
    const current = await loadDemoMetadata();
    await offlineDb.demoMetadata.put({
        ...current,
        ...metadata,
        id: GLOBAL_DEMO_METADATA_ID,
    });
}

export async function tagDemoEntity(
    entityType: HistoryEntityType,
    entityId: string,
    taggedAt: ISOTimestamp,
): Promise<void> {
    await offlineDb.demoEntities.put({
        id: toEntityKey(entityType, entityId),
        entityType,
        entityId,
        taggedAt,
    });
}

export async function untagDemoEntity(
    entityType: HistoryEntityType,
    entityId: string,
): Promise<void> {
    await offlineDb.demoEntities.delete(toEntityKey(entityType, entityId));
}

export async function listDemoEntities(entityType?: HistoryEntityType): Promise<DemoEntityRecord[]> {
    if (!entityType) {
        return offlineDb.demoEntities.toArray();
    }

    return offlineDb.demoEntities.where('entityType').equals(entityType).toArray();
}

export async function cacheHistoryEvents(
    entityType: HistoryEntityType,
    entityId: string,
    events: HistoryEvent[],
    fetchedAt: ISOTimestamp,
): Promise<void> {
    if (events.length === 0) {
        await offlineDb.historyCursors.put({
            id: toEntityKey(entityType, entityId),
            entityType,
            entityId,
            lastFetchedAt: fetchedAt,
        });
        return;
    }

    await offlineDb.transaction('rw', offlineDb.historyEvents, offlineDb.historyCursors, async () => {
        const eventRecords = events.map(event => ({
            id: event.id,
            entityType,
            entityId,
            occurredAt: event.occurredAt,
            payload: event,
            cachedAt: fetchedAt,
        }));

        await offlineDb.historyEvents.bulkPut(eventRecords);
        await offlineDb.historyCursors.put({
            id: toEntityKey(entityType, entityId),
            entityType,
            entityId,
            lastFetchedAt: fetchedAt,
        });
    });
}

export async function getCachedHistoryEvents(
    entityType: HistoryEntityType,
    entityId: string,
): Promise<HistoryEvent[]> {
    const items = await offlineDb.historyEvents
        .where('[entityType+entityId]')
        .equals([entityType, entityId])
        .toArray();

    return items
        .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
        .map(item => item.payload);
}

export async function getHistoryCursor(
    entityType: HistoryEntityType,
    entityId: string,
): Promise<HistoryCursorRecord | undefined> {
    return offlineDb.historyCursors.get(toEntityKey(entityType, entityId));
}
