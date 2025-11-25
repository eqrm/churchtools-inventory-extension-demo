/**
 * @deprecated Import from `src/state/offline/db` instead.
 * This file re-exports the new centralized offline database module
 * to maintain backward compatibility with existing imports.
 */

export type {
    StockTakeSession,
    StockTakeScan,
    PersonCacheRecord as PersonCache,
    DemoMetadataRecord,
    DemoEntityRecord,
    HistoryEventCacheRecord,
    HistoryCursorRecord,
} from '../state/offline/db';

export {
    InventoryOfflineDatabase as OfflineDatabase,
    offlineDb,
    initializeOfflineDb,
    clearOfflineDb,
    getOfflineDbStats,
    loadDemoMetadata,
    saveDemoMetadata,
    tagDemoEntity,
    untagDemoEntity,
    listDemoEntities,
    cacheHistoryEvents,
    getCachedHistoryEvents,
    getHistoryCursor,
} from '../state/offline/db';
