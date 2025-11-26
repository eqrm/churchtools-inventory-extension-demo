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

// T4.1.5: Work Order Storage Provider Tests
describe('ChurchToolsStorageProvider - WorkOrders', () => {
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

  const createWorkOrderData = (assetId: string) => ({
    id: crypto.randomUUID(),
    workOrderNumber: 'WO-2025-0001',
    type: 'internal' as const,
    orderType: 'planned' as const,
    state: 'backlog' as const,
    lineItems: [
      {
        id: crypto.randomUUID(),
        assetId,
        workType: 'inspection' as const,
        description: 'Quarterly inspection',
      },
    ],
    offers: [],
    history: [
      {
        id: crypto.randomUUID(),
        state: 'backlog' as const,
        changedAt: new Date().toISOString(),
        changedBy: 'user-1',
        changedByName: 'Test User',
      },
    ],
    createdBy: 'user-1',
    createdByName: 'Test User',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  it('creates a work order and retrieves it', async () => {
    const asset = await createAsset();
    const workOrderData = createWorkOrderData(asset.id);

    const created = await provider.createWorkOrder(workOrderData);
    
    expect(created.workOrderNumber).toBe('WO-2025-0001');
    expect(created.type).toBe('internal');
    expect(created.lineItems).toHaveLength(1);
    expect(created.lineItems[0].assetId).toBe(asset.id);

    const retrieved = await provider.getWorkOrder(created.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.workOrderNumber).toBe('WO-2025-0001');
  });

  it('retrieves all work orders', async () => {
    const asset = await createAsset();
    const workOrderData1 = createWorkOrderData(asset.id);
    const workOrderData2 = {
      ...createWorkOrderData(asset.id),
      id: crypto.randomUUID(),
      workOrderNumber: 'WO-2025-0002',
    };

    await provider.createWorkOrder(workOrderData1);
    await provider.createWorkOrder(workOrderData2);

    const workOrders = await provider.getWorkOrders();
    expect(workOrders).toHaveLength(2);
  });

  it('updates a work order', async () => {
    const asset = await createAsset();
    const workOrderData = createWorkOrderData(asset.id);

    const created = await provider.createWorkOrder(workOrderData);
    
    const updated = await provider.updateWorkOrder(created.id, {
      ...created,
      state: 'in-progress',
    });

    expect(updated.state).toBe('in-progress');

    const retrieved = await provider.getWorkOrder(created.id);
    expect(retrieved?.state).toBe('in-progress');
  });

  it('deletes a work order', async () => {
    const asset = await createAsset();
    const workOrderData = createWorkOrderData(asset.id);

    const created = await provider.createWorkOrder(workOrderData);
    
    await provider.deleteWorkOrder(created.id);

    const retrieved = await provider.getWorkOrder(created.id);
    expect(retrieved).toBeNull();
  });

  it('returns null for non-existent work order', async () => {
    const retrieved = await provider.getWorkOrder('non-existent-id');
    expect(retrieved).toBeNull();
  });
});
