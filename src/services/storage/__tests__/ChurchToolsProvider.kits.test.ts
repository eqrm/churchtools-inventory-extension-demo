import { describe, it, expect, beforeEach } from 'vitest';
import { ChurchToolsStorageProvider } from '../ChurchToolsProvider';
import { createMockChurchToolsApi } from './mockChurchToolsApiClient';

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

describe('ChurchToolsStorageProvider - Kits', () => {
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

  const createAsset = async () => {
    return provider.createAsset(createAssetInput());
  };

  it('creates kits with bound assets and records history', async () => {
    const asset = await createAsset();

    const kit = await provider.createKit({
      name: 'Camera Production Kit',
      description: 'All-in-one camera bundle',
      type: 'fixed',
      boundAssets: [{
        assetId: asset.id,
        assetNumber: asset.assetNumber,
        name: asset.name,
      }],
    });

    expect(kit.name).toBe('Camera Production Kit');
    expect(kit.boundAssets?.[0]?.assetId).toBe(asset.id);

    const kits = await provider.getKits();
    expect(kits).toHaveLength(1);
    expect(kits[0].name).toBe('Camera Production Kit');

    const history = mockApi.getHistoryEntries();
    const createdEntry = history.find((entry) => entry.entityType === 'kit' && entry.entityId === kit.id && entry.action === 'created');
    expect(createdEntry).toBeDefined();
  });

  it('updates kits and logs changes', async () => {
    const asset = await createAsset();
    const kit = await provider.createKit({
      name: 'Lighting Kit',
      type: 'fixed',
      boundAssets: [{ assetId: asset.id, assetNumber: asset.assetNumber, name: asset.name }],
    });

    const updated = await provider.updateKit(kit.id, { description: 'Updated description' });
    expect(updated.description).toBe('Updated description');

    const history = mockApi.getHistoryEntries();
    const updateEntry = history.reverse().find((entry) => entry.entityType === 'kit' && entry.entityId === kit.id && entry.action === 'updated');
    expect(updateEntry).toBeDefined();
  });

  it('blocks kit deletion while active bookings exist', async () => {
    const asset = await createAsset();
    const kit = await provider.createKit({
      name: 'Conference Kit',
      type: 'fixed',
      boundAssets: [{ assetId: asset.id, assetNumber: asset.assetNumber, name: asset.name }],
    });

    await provider.createBooking({
      asset: { id: asset.id, assetNumber: asset.assetNumber, name: asset.name },
      kit: { id: kit.id, name: kit.name },
      startDate: '2025-12-01',
      endDate: '2025-12-02',
      purpose: 'Conference event',
      bookingMode: 'date-range',
      status: 'pending',
      bookedById: 'user-1',
      bookedByName: 'Test User',
      bookingForId: 'user-1',
      bookingForName: 'Test User',
      requestedBy: 'user-1',
      requestedByName: 'Test User',
    });

    await expect(provider.deleteKit(kit.id)).rejects.toThrow('Cannot delete kit with active bookings (1 bookings found)');
  });

  it('reports fixed kit as unavailable when bound asset has conflicting booking', async () => {
    const asset = await createAsset();
    const kit = await provider.createKit({
      name: 'Broadcast Kit',
      type: 'fixed',
      boundAssets: [{ assetId: asset.id, assetNumber: asset.assetNumber, name: asset.name }],
    });

    const booking = await provider.createBooking({
      asset: { id: asset.id, assetNumber: asset.assetNumber, name: asset.name },
      kit: { id: kit.id, name: kit.name },
      startDate: '2025-12-10',
      endDate: '2025-12-12',
      purpose: 'Broadcast event',
      bookingMode: 'date-range',
      status: 'pending',
      bookedById: 'user-1',
      bookedByName: 'Test User',
      bookingForId: 'user-1',
      bookingForName: 'Test User',
      requestedBy: 'user-1',
      requestedByName: 'Test User',
    });

    await provider.updateBooking(booking.id, { status: 'approved' });

    const availability = await provider.isKitAvailable(kit.id, '2025-12-11', '2025-12-13');
    expect(availability.available).toBe(false);
    expect(availability.unavailableAssets).toContain(asset.id);
  });
});
