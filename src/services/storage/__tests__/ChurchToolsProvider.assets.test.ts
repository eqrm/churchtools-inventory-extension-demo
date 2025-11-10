import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ChurchToolsStorageProvider } from '../ChurchToolsProvider';
import { createMockChurchToolsApi } from './mockChurchToolsApiClient';
import type { Booking } from '../../../types/entities';
import { EdgeCaseError } from '../../../types/edge-cases';

const MODULE_ID = '42';
const ASSET_TYPE_ID = '101';

const createAssetInput = () => ({
  assetType: { id: ASSET_TYPE_ID, name: 'Stage Gear' },
  name: 'Camera A',
  description: '4K cinema camera',
  manufacturer: 'Canon',
  model: 'C300',
  status: 'available' as const,
  location: 'Studio A',
  bookable: true,
  isParent: false,
  customFieldValues: {},
});

describe('ChurchToolsStorageProvider - Assets', () => {
  let mockApi: ReturnType<typeof createMockChurchToolsApi>;
  let provider: ChurchToolsStorageProvider;

  beforeEach(() => {
    mockApi = createMockChurchToolsApi(MODULE_ID);
    provider = new ChurchToolsStorageProvider(MODULE_ID, mockApi.client);
    mockApi.seedCategory({
      id: ASSET_TYPE_ID,
      name: 'Stage Gear',
      shorty: 'stage',
      description: null,
      data: JSON.stringify([]),
      customModuleId: Number(MODULE_ID),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const getStoredAssetPayload = (assetId: string): Record<string, unknown> => {
    const records = mockApi.getDataValues(ASSET_TYPE_ID);
    const record = records.find((entry) => String(entry.id) === assetId);
    if (!record) {
      throw new Error(`Unable to locate stored asset ${assetId}`);
    }
    return JSON.parse(String(record.value)) as Record<string, unknown>;
  };

  it('creates assets with sequential global numbers and logs history', async () => {
    const created = await provider.createAsset(createAssetInput());

    expect(created.assetNumber).toBe('CHT-00001');
    expect(created.barcode).toBe(created.assetNumber);

    const stored = getStoredAssetPayload(created.id);
    expect(stored.name).toBe('Camera A');
    expect(stored.assetNumber).toBe('CHT-00001');

    const history = mockApi.getHistoryEntries();
    const entry = history.find((item) => item.entityId === created.id && item.action === 'created');
    expect(entry).toBeDefined();
    expect(entry?.newValue).toBe('CHT-00001');
  });

  it('updates assets, persists changes, and records field diffs', async () => {
    const created = await provider.createAsset(createAssetInput());

    const updated = await provider.updateAsset(created.id, {
      status: 'in-use',
      location: 'Main Hall',
    });

    expect(updated.status).toBe('in-use');
    expect(updated.location).toBe('Main Hall');

    const stored = getStoredAssetPayload(created.id);
    expect(stored.status).toBe('in-use');
    expect(stored.location).toBe('Main Hall');

    const history = mockApi.getHistoryEntries();
    const updateEntry = history.reverse().find((item) => item.entityId === created.id && item.action === 'updated');
    expect(updateEntry).toBeDefined();
    expect(updateEntry?.changes?.some((change) => change.field === 'status')).toBe(true);
    expect(updateEntry?.changes?.some((change) => change.field === 'location')).toBe(true);
  });

  it('marks assets as deleted and records deletion history', async () => {
    const created = await provider.createAsset(createAssetInput());

    await provider.deleteAsset(created.id);

    const stored = getStoredAssetPayload(created.id);
    expect(stored.status).toBe('deleted');

    const history = mockApi.getHistoryEntries();
    const deleteEntry = history.find((item) => item.entityId === created.id && item.action === 'deleted');
    expect(deleteEntry).toBeDefined();
    expect(deleteEntry?.oldValue).toBe('CHT-00001');
  });

  it('prevents deleting parent assets when children have active bookings', async () => {
    const parent = await provider.createAsset({
      ...createAssetInput(),
      name: 'Lighting Rig',
      isParent: true,
    });

    const child = await provider.createAsset({
      ...createAssetInput(),
      name: 'Lighting Rig Child',
      parentAssetId: parent.id,
    });

    await provider.updateAsset(parent.id, {
      childAssetIds: [child.id],
    });

    vi.spyOn(provider, 'getBookingsForAsset').mockResolvedValue([
      {
        id: 'booking-1',
        asset: { id: child.id, assetNumber: 'CHT-00002', name: 'Lighting Rig Child' },
        kit: undefined,
        quantity: 1,
        allocatedChildAssets: undefined,
        bookedById: 'user-1',
        bookingForId: 'user-1',
        bookingMode: 'date-range',
        startDate: '2025-10-01',
        endDate: '2025-10-02',
        purpose: 'Event',
        status: 'approved',
        requestedBy: 'user-1',
        requestedByName: 'Test User',
        notes: undefined,
        createdAt: new Date().toISOString(),
        lastModifiedAt: new Date().toISOString(),
      } as Booking,
    ]);

    await expect(provider.deleteAsset(parent.id)).rejects.toBeInstanceOf(EdgeCaseError);
  });
});
