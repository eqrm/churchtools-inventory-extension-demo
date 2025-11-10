import { beforeEach, describe, expect, it } from 'vitest';
import { ChurchToolsStorageProvider } from '../ChurchToolsProvider';
import { createMockChurchToolsApi } from './mockChurchToolsApiClient';

const MODULE_ID = '42';
const ASSET_TYPE_ID = '100';

const createAssetInput = () => ({
  assetType: { id: ASSET_TYPE_ID, name: 'Lighting' },
  name: 'Stage Light',
  description: 'LED Stage Light',
  manufacturer: 'BeamCo',
  model: 'LX-900',
  status: 'available' as const,
  location: 'Studio',
  bookable: true,
  isParent: false,
  customFieldValues: {},
});

describe('ChurchToolsStorageProvider - Maintenance', () => {
  let mockApi: ReturnType<typeof createMockChurchToolsApi>;
  let provider: ChurchToolsStorageProvider;

  beforeEach(() => {
    mockApi = createMockChurchToolsApi(MODULE_ID);
    provider = new ChurchToolsStorageProvider(MODULE_ID, mockApi.client);
    mockApi.seedCategory({
      id: ASSET_TYPE_ID,
      name: 'Lighting',
      shorty: 'light',
      description: null,
      data: JSON.stringify([]),
      customModuleId: Number(MODULE_ID),
    });
  });

  const createAsset = async () => {
    return provider.createAsset(createAssetInput());
  };

  it('creates maintenance records and retrieves them for an asset', async () => {
    const asset = await createAsset();

    const record = await provider.createMaintenanceRecord({
      asset: { id: asset.id, assetNumber: asset.assetNumber, name: asset.name },
      type: 'inspection',
      date: '2025-11-01',
      performedBy: 'user-1',
      performedByName: 'Technician',
      description: 'Quarterly inspection',
    });

    expect(record.type).toBe('inspection');

    const records = await provider.getMaintenanceRecords(asset.id);
    expect(records).toHaveLength(1);
    expect(records[0].asset.id).toBe(asset.id);

    const history = mockApi.getHistoryEntries();
    const createdEntry = history.find(
      (entry) => entry.entityType === 'maintenance' && entry.entityId === record.id && entry.action === 'created',
    );
    expect(createdEntry).toBeDefined();
  });

  it('updates maintenance schedules and reflects changes', async () => {
    const asset = await createAsset();

    const schedule = await provider.createMaintenanceSchedule({
      assetId: asset.id,
      scheduleType: 'time-based',
      intervalMonths: 6,
      reminderDaysBefore: 7,
    });

    expect(schedule.reminderDaysBefore).toBe(7);

    const updated = await provider.updateMaintenanceSchedule(schedule.id, { reminderDaysBefore: 3 });
    expect(updated.reminderDaysBefore).toBe(3);

    const schedules = await provider.getMaintenanceSchedules(asset.id);
    expect(schedules[0].reminderDaysBefore).toBe(3);
  });

  it('identifies overdue maintenance assets', async () => {
    const asset = await createAsset();

    const schedule = await provider.createMaintenanceSchedule({
      assetId: asset.id,
      scheduleType: 'time-based',
      intervalMonths: 3,
      reminderDaysBefore: 5,
    });

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 10);
    const pastDateStr = pastDate.toISOString().split('T')[0] as string;

    await provider.updateMaintenanceSchedule(schedule.id, {
      nextDue: pastDateStr,
    });

    const overdueSchedules = await provider.getOverdueMaintenanceSchedules();
    expect(overdueSchedules).toHaveLength(1);

    const overdueAssets = await provider.getOverdueMaintenance();
    expect(overdueAssets).toHaveLength(1);
    expect(overdueAssets[0].id).toBe(asset.id);
  });

  it('creates and releases maintenance holds', async () => {
    const asset = await createAsset();

    const hold = await provider.createMaintenanceHold({
      planId: 'plan-1',
      assetId: asset.id,
      startDate: '2025-12-10',
      endDate: '2025-12-12',
    });

    expect(hold.status).toBe('active');

    const released = await provider.releaseMaintenanceHold(hold.id);
    expect(released.status).toBe('released');

    const holds = await provider.getMaintenanceHolds({ status: 'released' });
    expect(holds).toHaveLength(1);
    expect(holds[0].id).toBe(hold.id);
  });
});
