import 'fake-indexeddb/auto';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { applySettingsSnapshot, collectSettingsSnapshot, validateSettingsSnapshot } from '../../../src/services/settings/settingsSnapshot';
import type { SettingsSnapshot } from '../../../src/types/settings';
import { useFeatureSettingsStore } from '../../../src/stores/featureSettingsStore';

const masterDataMocks = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));

const providerMocks = vi.hoisted(() => ({
  getModuleDefaultPrefixId: vi.fn(),
  setModuleDefaultPrefixId: vi.fn(),
}));

const autoNumberingMocks = vi.hoisted(() => ({
  getStoredModuleDefaultPrefixId: vi.fn(),
  setStoredModuleDefaultPrefixId: vi.fn(),
}));

const hoistedScannerMocks = vi.hoisted(() => {
  const sample = {
    id: '5e7a7b6a-b5f4-4b0a-a262-c3890c2a5f8b',
    manufacturer: 'Zebra',
    modelName: 'TC52',
    modelNumber: 'TC52',
    description: 'Handheld',
    imageBase64: undefined,
    supportedFunctions: [],
    createdAt: '2025-01-01T00:00:00.000Z',
    lastModifiedAt: '2025-01-01T00:00:00.000Z',
  } satisfies SettingsSnapshot['scannerModels'][number];

  const mocks = {
    loadScannerModels: vi.fn(() => [sample]),
    saveScannerModels: vi.fn(),
  };

  return { scannerModelSample: sample, scannerModelMocks: mocks };
});

const scannerModelSample = hoistedScannerMocks.scannerModelSample;
const scannerModelMocks = hoistedScannerMocks.scannerModelMocks;

vi.mock('../../../src/services/MasterDataService', () => ({
  masterDataService: masterDataMocks,
}));

vi.mock('../../../src/services/churchTools/storageProvider', () => ({
  getChurchToolsStorageProvider: () => providerMocks,
}));

vi.mock('../../../src/services/assets/autoNumbering', () => autoNumberingMocks);

vi.mock('../../../src/services/settings/scannerModels', () => hoistedScannerMocks.scannerModelMocks);

describe('settingsSnapshot integration', () => {
  beforeEach(() => {
    Object.values(masterDataMocks).forEach((mockFn) => mockFn.mockReset());
    Object.values(providerMocks).forEach((mockFn) => mockFn.mockReset());
    Object.values(autoNumberingMocks).forEach((mockFn) => mockFn.mockReset());
    Object.values(scannerModelMocks).forEach((mockFn) => mockFn.mockReset());

    providerMocks.getModuleDefaultPrefixId.mockResolvedValue('provider-prefix');
    providerMocks.setModuleDefaultPrefixId.mockResolvedValue(undefined);
    autoNumberingMocks.getStoredModuleDefaultPrefixId.mockReturnValue(null);

    masterDataMocks.list.mockImplementation(async (entity: string) => {
      switch (entity) {
        case 'locations':
          return [{ id: 'loc-1', name: 'Warehouse' }];
        case 'manufacturers':
          return [{ id: 'mfg-1', name: 'Canon' }];
        case 'models':
          return [];
        case 'maintenanceCompanies':
          return [{ id: 'mc-1', name: 'Service Co' }];
        default:
          return [];
      }
    });

    localStorage.clear();
    localStorage.setItem('assetNumberPrefix', 'ASSET');

    useFeatureSettingsStore.setState({
      bookingsEnabled: false,
      kitsEnabled: true,
      maintenanceEnabled: false,
    });
  });

  it('falls back to default feature toggles when snapshot values are missing', () => {
    const validated = validateSettingsSnapshot({
      schemaVersion: '1.0',
      assetNumberPrefix: 'ASSET',
      moduleDefaultPrefixId: null,
      masterData: {
        locations: [],
        manufacturers: [],
        models: [],
        maintenanceCompanies: [],
      },
      scannerModels: [],
    });

    expect(validated.featureToggles).toEqual({
      bookingsEnabled: false,
      kitsEnabled: true,
      maintenanceEnabled: false,
    });
  });

  it('collects snapshot data from provider and master data service', async () => {
    const snapshot = await collectSettingsSnapshot();

    expect(snapshot.assetNumberPrefix).toBe('ASSET');
    expect(snapshot.moduleDefaultPrefixId).toBe('provider-prefix');
    expect(snapshot.masterData.locations).toEqual([{ id: 'loc-1', name: 'Warehouse' }]);
    expect(snapshot.scannerModels).toEqual([scannerModelSample]);
    expect(masterDataMocks.list).toHaveBeenCalledTimes(4);
  });

  it('applies snapshot by syncing master data, prefixes, scanners, and feature toggles', async () => {
    const snapshot: SettingsSnapshot = {
      schemaVersion: '1.0',
      assetNumberPrefix: 'LAB',
      moduleDefaultPrefixId: 'prefix-99',
      featureToggles: {
        bookingsEnabled: true,
        kitsEnabled: false,
        maintenanceEnabled: true,
      },
      masterData: {
        locations: [{ id: 'loc-2', name: 'Lab' }],
        manufacturers: [{ id: 'mfg-2', name: 'Sony' }],
        models: [],
        maintenanceCompanies: [{ id: 'mc-2', name: 'Repair Inc' }],
      },
      scannerModels: [scannerModelSample],
    };

    masterDataMocks.list.mockImplementation(async (entity: string) => {
      if (entity === 'locations') {
        return [{ id: 'loc-1', name: 'Warehouse' }];
      }
      if (entity === 'manufacturers') {
        return [{ id: 'mfg-2', name: 'Sony' }];
      }
      if (entity === 'models') {
        return [];
      }
      if (entity === 'maintenanceCompanies') {
        return [{ id: 'mc-1', name: 'Service Co' }];
      }
      return [];
    });

    await applySettingsSnapshot(snapshot);

    const state = useFeatureSettingsStore.getState();

    expect(providerMocks.setModuleDefaultPrefixId).toHaveBeenCalledWith('prefix-99');
    expect(autoNumberingMocks.setStoredModuleDefaultPrefixId).toHaveBeenCalledWith('prefix-99');
    expect(masterDataMocks.create).toHaveBeenCalledWith('locations', 'Lab');
    expect(masterDataMocks.remove).toHaveBeenCalledWith('locations', 'loc-1');
    expect(masterDataMocks.remove).not.toHaveBeenCalledWith('maintenanceCompanies', expect.any(String));
    expect(scannerModelMocks.saveScannerModels).toHaveBeenCalledWith([scannerModelSample]);
    expect(state.bookingsEnabled).toBe(true);
    expect(state.kitsEnabled).toBe(false);
    expect(state.maintenanceEnabled).toBe(true);
  });

  it('uses cached module default prefix when provider lookup fails', async () => {
    providerMocks.getModuleDefaultPrefixId.mockRejectedValueOnce(new Error('network'));
    autoNumberingMocks.getStoredModuleDefaultPrefixId.mockReturnValue('cached-prefix');

    const snapshot = await collectSettingsSnapshot();

    expect(snapshot.moduleDefaultPrefixId).toBe('cached-prefix');
  });
});
