import { describe, it, expect, vi, beforeEach } from 'vitest';
import { collectSettingsSnapshot, applySettingsSnapshot } from '../../../services/settings/settingsSnapshot';
import type { IStorageProvider } from '../../../types/storage';
import type { SettingsSnapshot } from '../../../types/settings';

// Mocks
const mockProvider = {
  getGlobalSetting: vi.fn(),
  setGlobalSetting: vi.fn(),
  getScannerModels: vi.fn(),
  saveScannerModels: vi.fn(),
  getModuleDefaultPrefixId: vi.fn(),
  setModuleDefaultPrefixId: vi.fn(),
} as unknown as IStorageProvider;

vi.mock('../../../services/churchTools/storageProvider', () => ({
  getChurchToolsStorageProvider: vi.fn(() => mockProvider),
}));

vi.mock('../../../services/settings/scannerModels', () => ({
  loadScannerModelsAsync: vi.fn(async () => []),
  saveScannerModelsAsync: vi.fn(async () => {}),
  loadScannerModels: vi.fn(() => []),
  saveScannerModels: vi.fn(),
}));

vi.mock('../../../stores/featureSettingsStore', () => ({
  useFeatureSettingsStore: {
    getState: () => ({ bookingsEnabled: false, kitsEnabled: true, maintenanceEnabled: false }),
    setState: vi.fn(),
  },
}));

vi.mock('../../../services/MasterDataService', () => ({
  masterDataService: {
    list: vi.fn(async () => []),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock('../../../services/assets/autoNumbering', () => ({
  getStoredModuleDefaultPrefixId: vi.fn(() => null),
  setStoredModuleDefaultPrefixId: vi.fn(),
}));

describe('settingsSnapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('collectSettingsSnapshot', () => {
    it('should fetch assetNumberPrefix from provider', async () => {
      vi.mocked(mockProvider.getGlobalSetting).mockResolvedValue('PROVIDER-PREFIX');
      
      const snapshot = await collectSettingsSnapshot();
      
      expect(mockProvider.getGlobalSetting).toHaveBeenCalledWith('assetNumberPrefix');
      expect(snapshot.assetNumberPrefix).toBe('PROVIDER-PREFIX');
    });

    it('should fallback to localStorage if provider fails', async () => {
      vi.mocked(mockProvider.getGlobalSetting).mockRejectedValue(new Error('Failed'));
      localStorage.setItem('assetNumberPrefix', 'LOCAL-PREFIX');
      
      const snapshot = await collectSettingsSnapshot();
      
      expect(snapshot.assetNumberPrefix).toBe('LOCAL-PREFIX');
    });
  });

  describe('applySettingsSnapshot', () => {
    it('should save assetNumberPrefix to provider', async () => {
      const snapshot = {
        schemaVersion: '1.0',
        assetNumberPrefix: 'NEW-PREFIX',
        masterData: { locations: [], manufacturers: [], models: [], maintenanceCompanies: [] },
        scannerModels: [],
        featureToggles: {
            bookingsEnabled: false,
            kitsEnabled: false,
            maintenanceEnabled: false
        },
      } as unknown as SettingsSnapshot;

      await applySettingsSnapshot(snapshot, 'full');

      expect(mockProvider.setGlobalSetting).toHaveBeenCalledWith('assetNumberPrefix', 'NEW-PREFIX');
    });

    it('should fallback to localStorage if provider save fails', async () => {
      vi.mocked(mockProvider.setGlobalSetting).mockRejectedValue(new Error('Failed'));
      const snapshot = {
        schemaVersion: '1.0',
        assetNumberPrefix: 'NEW-PREFIX',
        masterData: { locations: [], manufacturers: [], models: [], maintenanceCompanies: [] },
        scannerModels: [],
        featureToggles: {
            bookingsEnabled: false,
            kitsEnabled: false,
            maintenanceEnabled: false
        },
      } as unknown as SettingsSnapshot;

      await applySettingsSnapshot(snapshot, 'full');

      expect(localStorage.getItem('assetNumberPrefix')).toBe('NEW-PREFIX');
    });
  });
});
