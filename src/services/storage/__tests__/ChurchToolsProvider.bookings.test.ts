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

describe('ChurchToolsStorageProvider - Bookings', () => {
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

  const createAssetForBooking = async () => {
    return provider.createAsset(createAssetInput());
  };

  it('creates bookings, stores records, and logs history', async () => {
    const asset = await createAssetForBooking();

    const booking = await provider.createBooking({
      asset: { id: asset.id, assetNumber: asset.assetNumber, name: asset.name },
      startDate: '2025-11-01',
      endDate: '2025-11-02',
      purpose: 'Weekend event',
      bookingMode: 'date-range',
      status: 'pending',
      bookedById: 'user-1',
      bookedByName: 'Test User',
      bookingForId: 'user-1',
      bookingForName: 'Test User',
      requestedBy: 'user-1',
      requestedByName: 'Test User',
    });

    expect(booking.id).toBeTruthy();
    expect(booking.asset?.id).toBe(asset.id);

    const stored = await provider.getBookings();
    expect(stored).toHaveLength(1);

    const history = mockApi.getHistoryEntries();
    const createdEntry = history.find((entry) => entry.entityType === 'booking' && entry.entityId === booking.id && entry.action === 'created');
    expect(createdEntry).toBeDefined();
  });

  it('updates bookings and records field changes', async () => {
    const asset = await createAssetForBooking();
    const booking = await provider.createBooking({
      asset: { id: asset.id, assetNumber: asset.assetNumber, name: asset.name },
      startDate: '2025-11-03',
      endDate: '2025-11-04',
      purpose: 'Film shoot',
      bookingMode: 'date-range',
      status: 'pending',
      bookedById: 'user-1',
      bookedByName: 'Test User',
      bookingForId: 'user-1',
      bookingForName: 'Test User',
      requestedBy: 'user-1',
      requestedByName: 'Test User',
    });

    const updated = await provider.updateBooking(booking.id, { status: 'approved' });
    expect(updated.status).toBe('approved');

    const history = mockApi.getHistoryEntries();
    const updateEntry = history.reverse().find((entry) => entry.entityType === 'booking' && entry.entityId === booking.id && entry.action === 'updated');
    expect(updateEntry).toBeDefined();
    expect(updateEntry?.changes?.some((change) => change.field === 'status')).toBe(true);
  });

  it('prevents overlapping bookings when asset is already approved', async () => {
    const asset = await createAssetForBooking();
    const firstBooking = await provider.createBooking({
      asset: { id: asset.id, assetNumber: asset.assetNumber, name: asset.name },
      startDate: '2025-11-10',
      endDate: '2025-11-12',
      purpose: 'Conference',
      bookingMode: 'date-range',
      status: 'pending',
      bookedById: 'user-1',
      bookedByName: 'Test User',
      bookingForId: 'user-1',
      bookingForName: 'Test User',
      requestedBy: 'user-1',
      requestedByName: 'Test User',
    });

    await provider.updateBooking(firstBooking.id, { status: 'approved' });

    await expect(
      provider.createBooking({
        asset: { id: asset.id, assetNumber: asset.assetNumber, name: asset.name },
        startDate: '2025-11-11',
        endDate: '2025-11-13',
        purpose: 'Second event',
        bookingMode: 'date-range',
        status: 'pending',
        bookedById: 'user-1',
        bookedByName: 'Test User',
        bookingForId: 'user-1',
        bookingForName: 'Test User',
        requestedBy: 'user-1',
        requestedByName: 'Test User',
      }),
    ).rejects.toThrow('Asset is not available for the selected timeframe');
  });
});
