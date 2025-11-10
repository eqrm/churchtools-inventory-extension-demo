import { describe, it, expect, beforeEach } from 'vitest';
import { ChurchToolsStorageProvider } from '../ChurchToolsProvider';
import { createMockChurchToolsApi } from './mockChurchToolsApiClient';
import { EdgeCaseError } from '../../../types/edge-cases';
import type { AssetCreate } from '../../../types/entities';

const MODULE_ID = '42';
const CATEGORY_ID = '101';

const baseAssetInput: AssetCreate = {
  category: { id: CATEGORY_ID, name: 'Stage Gear' },
  name: 'Generic Asset',
  description: 'Test asset',
  manufacturer: 'Acme',
  model: 'Model X',
  status: 'available',
  location: 'Warehouse',
  bookable: true,
  isParent: false,
  customFieldValues: {},
};

describe('ChurchToolsStorageProvider - Stock Takes', () => {
  let mockApi: ReturnType<typeof createMockChurchToolsApi>;
  let provider: ChurchToolsStorageProvider;

  beforeEach(() => {
    mockApi = createMockChurchToolsApi(MODULE_ID);
    provider = new ChurchToolsStorageProvider(MODULE_ID, mockApi.client);

    mockApi.seedCategory({
      id: CATEGORY_ID,
      name: 'Stage Gear',
      shorty: 'stage',
      description: null,
      data: JSON.stringify([]),
      customModuleId: Number(MODULE_ID),
    });

    mockApi.seedCategory({
      id: 'history',
      name: '__ChangeHistory__',
      shorty: 'history',
      description: null,
      data: null,
      customModuleId: Number(MODULE_ID),
    });
  });

  const createAsset = async (overrides: Partial<AssetCreate> = {}) => {
    return provider.createAsset({
      ...baseAssetInput,
      ...overrides,
    });
  };

  it('creates stock take sessions with expected assets', async () => {
    const assetA = await createAsset({ name: 'Camera A' });
    const assetB = await createAsset({ name: 'Camera B' });

    const session = await provider.createStockTakeSession({
      nameReason: 'Quarterly audit',
      startDate: new Date().toISOString(),
      completedDate: undefined,
      status: 'active',
      scope: { type: 'all' },
      conductedBy: 'user-1',
      conductedByName: 'Auditor',
    });

    expect(session.expectedAssets).toHaveLength(2);
    expect(session.expectedAssets.map((item) => item.assetId)).toEqual(
      expect.arrayContaining([assetA.id, assetB.id]),
    );

    const sessions = await provider.getStockTakeSessions();
    expect(sessions).toHaveLength(1);
  });

  it('prevents duplicate scans in active sessions', async () => {
    const asset = await createAsset({ name: 'Camera C' });

    const session = await provider.createStockTakeSession({
      nameReason: 'Check single asset',
      startDate: new Date().toISOString(),
      completedDate: undefined,
      status: 'active',
      scope: { type: 'custom', assetIds: [asset.id] },
      conductedBy: 'user-2',
      conductedByName: 'Auditor',
    });

    await provider.addStockTakeScan(session.id, asset.id, 'auditor-1');

    await expect(
      provider.addStockTakeScan(session.id, asset.id, 'auditor-1'),
    ).rejects.toBeInstanceOf(EdgeCaseError);
  });

  it('completes sessions and reports missing and unexpected assets', async () => {
    const expectedAsset = await createAsset({ name: 'Mixer' });
    const unexpectedAsset = await createAsset({ name: 'Spare Cable' });

    const session = await provider.createStockTakeSession({
      nameReason: 'Spot check',
      startDate: new Date().toISOString(),
      completedDate: undefined,
      status: 'active',
      scope: { type: 'custom', assetIds: [expectedAsset.id] },
      conductedBy: 'user-3',
      conductedByName: 'Supervisor',
    });

    await provider.addStockTakeScan(session.id, unexpectedAsset.id, 'auditor-2');

    const completed = await provider.completeStockTakeSession(session.id);

    expect(completed.status).toBe('completed');
    expect(completed.missingAssets).toHaveLength(1);
    expect(completed.missingAssets?.[0]?.assetId).toBe(expectedAsset.id);
    expect(completed.unexpectedAssets).toHaveLength(1);
    expect(completed.unexpectedAssets?.[0]?.assetId).toBe(unexpectedAsset.id);
  });
});
