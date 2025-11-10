import { describe, expect, it, beforeEach, vi } from 'vitest';
import type {
    Asset,
    AssetType,
    AssetCreate,
    AssetPrefix,
    AssetUpdate,
    Booking,
    BookingCreate,
    Kit,
    KitCreate,
    MaintenanceRecord,
    MaintenanceRecordCreate,
    PersonInfo,
    StockTakeSession,
    StockTakeSessionCreate,
} from '../../../src/types/entities';
import type { IStorageProvider } from '../../../src/types/storage';
import { seedDemoData, resetDemoData } from '../../../src/services/demo/demoSeeder';

const initializeOfflineDb = vi.fn();
const loadDemoMetadata = vi.fn();
const saveDemoMetadata = vi.fn();
const tagDemoEntity = vi.fn();
const listDemoEntities = vi.fn();
const untagDemoEntity = vi.fn();

const offlineDbMock = vi.hoisted(() => ({
    personCache: {
        get: vi.fn(),
        put: vi.fn(),
        update: vi.fn(),
    },
}));

vi.mock('../../../src/utils/environment/flags', () => ({
    ensureDemoToolsEnabled: () => {},
}));

vi.mock('../../../src/state/offline/db', () => ({
    initializeOfflineDb: (...args: unknown[]) => initializeOfflineDb(...args),
    loadDemoMetadata: (...args: unknown[]) => loadDemoMetadata(...args),
    saveDemoMetadata: (...args: unknown[]) => saveDemoMetadata(...args),
    tagDemoEntity: (...args: unknown[]) => tagDemoEntity(...args),
    listDemoEntities: (...args: unknown[]) => listDemoEntities(...args),
    untagDemoEntity: (...args: unknown[]) => untagDemoEntity(...args),
    offlineDb: offlineDbMock,
}));

type MockProvider = IStorageProvider & {
    __assetTypes: AssetType[];
    __assets: Asset[];
    __assetPrefixes: AssetPrefix[];
    __kits: Kit[];
    __bookings: Booking[];
    __maintenanceRecords: MaintenanceRecord[];
    __stockTakeSessions: StockTakeSession[];
    __deletedAssetTypes: string[];
    __deletedAssets: string[];
    __deletedPrefixes: string[];
};

function createMockProvider(): MockProvider {
    const assetTypes: AssetType[] = [];
    const assets: Asset[] = [];
    const prefixes: AssetPrefix[] = [];
    const kits: Kit[] = [];
    const bookings: Booking[] = [];
    const maintenanceRecords: MaintenanceRecord[] = [];
    const stockTakeSessions: StockTakeSession[] = [];
    const deletedAssetTypes: string[] = [];
    const deletedAssets: string[] = [];
    const deletedPrefixes: string[] = [];
    const timestamp = '2025-01-01T00:00:00.000Z';

    const provider: Partial<MockProvider> = {
        __assetTypes: assetTypes,
        __assets: assets,
        __assetPrefixes: prefixes,
        __kits: kits,
        __bookings: bookings,
        __maintenanceRecords: maintenanceRecords,
        __stockTakeSessions: stockTakeSessions,
        __deletedAssetTypes: deletedAssetTypes,
        __deletedAssets: deletedAssets,
        __deletedPrefixes: deletedPrefixes,
        async getCurrentUser(): Promise<PersonInfo> {
            return {
                id: 'demo-user',
                firstName: 'Demo',
                lastName: 'Seeder',
                name: 'Demo Seeder',
                email: 'demo@example.com',
            };
        },
        async recordChange() {
            // no-op for tests
        },
        async createAssetPrefix({ prefix, description, color }) {
            const assetPrefix: AssetPrefix = {
                id: `prefix-${prefixes.length + 1}`,
                prefix,
                description,
                color,
                sequence: 0,
                createdBy: 'demo',
                createdByName: 'Demo Seeder',
                createdAt: timestamp,
                lastModifiedBy: 'demo',
                lastModifiedByName: 'Demo Seeder',
                lastModifiedAt: timestamp,
            };
            prefixes.push(assetPrefix);
            return assetPrefix;
        },
        async deleteAssetPrefix(id: string) {
            deletedPrefixes.push(id);
        },
        async createAssetType({ name, icon, assetNameTemplate, customFields }) {
            const category: AssetType = {
                id: `cat-${assetTypes.length + 1}`,
                name,
                icon,
                assetNameTemplate,
                customFields,
                createdBy: 'demo',
                createdByName: 'Demo Seeder',
                createdAt: timestamp,
                lastModifiedBy: 'demo',
                lastModifiedByName: 'Demo Seeder',
                lastModifiedAt: timestamp,
                schemaVersion: 'demo',
            };
            assetTypes.push(category);
            return category;
        },
        async createAsset(payload: AssetCreate) {
            const asset: Asset = {
                id: `asset-${assets.length + 1}`,
                assetNumber: `DEMO-${assets.length + 1}`,
                name: payload.name,
                manufacturer: payload.manufacturer,
                model: payload.model,
                description: payload.description,
                assetType: payload.assetType,
                status: payload.status,
                location: payload.location,
                inUseBy: undefined,
                bookable: payload.bookable ?? true,
                photos: [],
                isParent: payload.isParent ?? false,
                parentAssetId: payload.parentAssetId,
                childAssetIds: payload.childAssetIds ?? [],
                barcode: `barcode-${assets.length + 1}`,
                qrCode: `qr-${assets.length + 1}`,
                customFieldValues: payload.customFieldValues,
                assetGroup: payload.assetGroup,
                fieldSources: payload.fieldSources,
                createdBy: 'demo',
                createdByName: 'Demo Seeder',
                createdAt: timestamp,
                lastModifiedBy: 'demo',
                lastModifiedByName: 'Demo Seeder',
                lastModifiedAt: timestamp,
                schemaVersion: 'demo',
            };
            assets.push(asset);
            return asset;
        },
        async deleteAsset(id: string) {
            deletedAssets.push(id);
        },
        async updateAsset(id: string, update: AssetUpdate) {
            const index = assets.findIndex(asset => asset.id === id);
            if (index === -1) {
                throw new Error(`Asset ${id} not found`);
            }
            const current = assets[index];
            const merged: Asset = {
                ...current,
                ...update,
                childAssetIds: update.childAssetIds ?? current.childAssetIds ?? [],
                assetGroup: Object.prototype.hasOwnProperty.call(update, 'assetGroup')
                    ? update.assetGroup ?? undefined
                    : current.assetGroup,
                fieldSources: Object.prototype.hasOwnProperty.call(update, 'fieldSources')
                    ? update.fieldSources ?? undefined
                    : current.fieldSources,
                lastModifiedAt: timestamp,
                lastModifiedBy: 'demo',
                lastModifiedByName: 'Demo Seeder',
            };
            assets[index] = merged;
            return merged;
        },
        async createKit(data: KitCreate) {
            const kit: Kit = {
                id: `kit-${kits.length + 1}`,
                name: data.name,
                description: data.description,
                type: data.type,
                boundAssets: data.boundAssets ?? [],
                poolRequirements: data.poolRequirements ?? [],
                createdBy: 'demo',
                createdByName: 'Demo Seeder',
                createdAt: timestamp,
                lastModifiedBy: 'demo',
                lastModifiedByName: 'Demo Seeder',
                lastModifiedAt: timestamp,
                schemaVersion: 'demo',
            };
            kits.push(kit);
            return kit;
        },
        async deleteKit(id: string) {
            // remove kit if it exists
            const index = kits.findIndex(kit => kit.id === id);
            if (index >= 0) {
                kits.splice(index, 1);
            }
        },
        async createBooking(data: BookingCreate) {
            const booking: Booking = {
                id: `booking-${bookings.length + 1}`,
                asset: data.asset,
                kit: data.kit,
                quantity: data.quantity,
                allocatedChildAssets: data.allocatedChildAssets ?? [],
                bookedById: data.bookedById,
                bookedByName: data.bookedByName,
                bookingForId: data.bookingForId,
                bookingForName: data.bookingForName,
                bookingMode: data.bookingMode,
                date: data.date,
                startTime: data.startTime,
                endTime: data.endTime,
                startDate: data.startDate,
                endDate: data.endDate,
                purpose: data.purpose,
                notes: data.notes,
                status: data.status ?? 'pending',
                requestedBy: data.requestedBy,
                requestedByName: data.requestedByName,
                approvedBy: undefined,
                approvedByName: undefined,
                checkedOutAt: undefined,
                checkedOutBy: undefined,
                checkedOutByName: undefined,
                checkedInAt: undefined,
                checkedInBy: undefined,
                checkedInByName: undefined,
                conditionOnCheckOut: undefined,
                conditionOnCheckIn: undefined,
                damageReported: false,
                damageNotes: undefined,
                createdAt: timestamp,
                lastModifiedAt: timestamp,
                schemaVersion: 'demo',
            };
            bookings.push(booking);
            return booking;
        },
        async deleteBooking(id: string) {
            const index = bookings.findIndex(booking => booking.id === id);
            if (index >= 0) {
                bookings.splice(index, 1);
            }
        },
        async createMaintenanceRecord(data: MaintenanceRecordCreate) {
            const record: MaintenanceRecord = {
                id: `maint-${maintenanceRecords.length + 1}`,
                ...data,
                createdAt: timestamp,
                lastModifiedAt: timestamp,
                schemaVersion: 'demo',
            };
            maintenanceRecords.push(record);
            return record;
        },
        async deleteMaintenanceRecord(id: string) {
            const index = maintenanceRecords.findIndex(record => record.id === id);
            if (index >= 0) {
                maintenanceRecords.splice(index, 1);
            }
        },
        async createStockTakeSession(data: StockTakeSessionCreate) {
            const session: StockTakeSession = {
                id: `stock-${stockTakeSessions.length + 1}`,
                nameReason: data.nameReason,
                startDate: data.startDate,
                completedDate: undefined,
                status: data.status,
                scope: data.scope,
                expectedAssets: [],
                scannedAssets: [],
                missingAssets: [],
                unexpectedAssets: [],
                conductedBy: data.conductedBy,
                conductedByName: data.conductedByName,
                createdAt: timestamp,
                lastModifiedAt: timestamp,
                schemaVersion: 'demo',
            };
            stockTakeSessions.push(session);
            return session;
        },
        async addStockTakeScan(sessionId: string, assetId: string, scannedBy: string, location?: string) {
            const session = stockTakeSessions.find(item => item.id === sessionId);
            if (!session) {
                throw new Error(`Stock take session ${sessionId} not found`);
            }
            session.scannedAssets.push({
                assetId,
                assetNumber: assetId,
                scannedAt: timestamp,
                scannedBy,
                scannedByName: scannedBy,
                location,
            });
            session.lastModifiedAt = timestamp;
            return session;
        },
        async completeStockTakeSession(sessionId: string) {
            const session = stockTakeSessions.find(item => item.id === sessionId);
            if (!session) {
                throw new Error(`Stock take session ${sessionId} not found`);
            }
            session.status = 'completed';
            session.completedDate = timestamp;
            session.lastModifiedAt = timestamp;
            return session;
        },
        async deleteStockTakeSession(id: string) {
            const index = stockTakeSessions.findIndex(session => session.id === id);
            if (index >= 0) {
                stockTakeSessions.splice(index, 1);
            }
        },
        async deleteAssetType(id: string) {
            deletedAssetTypes.push(id);
        },
    };

    return provider as MockProvider;
}

const baseMetadata = {
    id: 'global',
    seededAt: null,
    seedVersion: null,
    seededBy: null,
    lastResetAt: null,
    modalDismissedAt: null,
};

beforeEach(() => {
    vi.clearAllMocks();
    initializeOfflineDb.mockResolvedValue(undefined);
    loadDemoMetadata.mockResolvedValue({ ...baseMetadata });
    saveDemoMetadata.mockResolvedValue(undefined);
    tagDemoEntity.mockResolvedValue(undefined);
    listDemoEntities.mockResolvedValue([]);
    untagDemoEntity.mockResolvedValue(undefined);
    offlineDbMock.personCache.get.mockResolvedValue(undefined);
    offlineDbMock.personCache.put.mockResolvedValue(undefined);
    offlineDbMock.personCache.update.mockResolvedValue(undefined);
});

describe('demoSeeder seedDemoData', () => {
    it('creates demo asset types and assets, tagging each entity', async () => {
        const provider = createMockProvider();
        const result = await seedDemoData({ provider, now: () => '2025-03-01T10:00:00.000Z' });

        expect(provider.__assetTypes).toHaveLength(4);
        expect(provider.__assets).toHaveLength(13);
        expect(result.assetTypes).toHaveLength(4);
        expect(result.assets).toHaveLength(13);

        const tagCalls = tagDemoEntity.mock.calls;
        expect(tagCalls.filter(([type]) => type === 'category')).toHaveLength(4);
        expect(tagCalls.filter(([type]) => type === 'asset')).toHaveLength(13);

        expect(saveDemoMetadata).toHaveBeenCalledWith(
            expect.objectContaining({
                seededAt: '2025-03-01T10:00:00.000Z',
                seededBy: 'Demo Seeder',
                seedVersion: '2025-10-demo-expanded-v3',
                modalDismissedAt: '2025-03-01T10:00:00.000Z',
            }),
        );
    });
});

describe('demoSeeder resetDemoData', () => {
    it('deletes tagged entities and clears metadata flags', async () => {
        const provider = createMockProvider();
        listDemoEntities.mockResolvedValue([
            { id: 'a', entityId: 'asset-1', entityType: 'asset', taggedAt: '2025-03-01T10:00:00.000Z' },
            { id: 'b', entityId: 'cat-1', entityType: 'category', taggedAt: '2025-03-01T10:00:00.000Z' },
        ]);

        await resetDemoData({ provider, now: () => '2025-04-02T08:30:00.000Z' });

        expect(provider.__deletedAssets).toEqual(['asset-1']);
        expect(provider.__deletedAssetTypes).toEqual(['cat-1']);
        expect(untagDemoEntity).toHaveBeenCalledTimes(2);
        expect(saveDemoMetadata).toHaveBeenCalledWith(
            expect.objectContaining({
                seededAt: null,
                lastResetAt: '2025-04-02T08:30:00.000Z',
            }),
        );
    });
});
