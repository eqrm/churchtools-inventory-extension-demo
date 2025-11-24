import { describe, it, expect, vi, beforeEach } from 'vitest';
import { moveLocalSettingsToChurchTools } from '../../../services/migrations/migrations/moveLocalSettingsToCt';
import type { IStorageProvider } from '../../../types/storage';
import type { MigrationContext } from '../../../services/migrations/types';

// Mock storage provider
const mockProvider = {
  setGlobalSetting: vi.fn(),
  saveScannerModels: vi.fn(),
} as unknown as IStorageProvider;

vi.mock('../../../services/churchTools/storageProvider', () => ({
  getChurchToolsStorageProvider: vi.fn(() => mockProvider),
}));

describe('moveLocalSettingsToChurchTools Migration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should migrate asset prefix if found in localStorage', async () => {
    localStorage.setItem('assetNumberPrefix', 'TEST-');
    
    const context = { log: vi.fn() } as unknown as MigrationContext;
    await moveLocalSettingsToChurchTools.up(context);

    expect(mockProvider.setGlobalSetting).toHaveBeenCalledWith('assetNumberPrefix', 'TEST-');
    expect(localStorage.getItem('assetNumberPrefix_migrated')).toBe('TEST-');
  });

  it('should migrate scanner models if found in localStorage', async () => {
    const models = [{ id: '1', name: 'Test Model' }];
    localStorage.setItem('scannerModels', JSON.stringify(models));

    const context = { log: vi.fn() } as unknown as MigrationContext;
    await moveLocalSettingsToChurchTools.up(context);

    expect(mockProvider.saveScannerModels).toHaveBeenCalledWith(models);
    expect(localStorage.getItem('scannerModels_migrated')).toBe(JSON.stringify(models));
  });

  it('should handle empty or invalid scanner models', async () => {
    localStorage.setItem('scannerModels', 'invalid-json');
    
    const context = { log: vi.fn() } as unknown as MigrationContext;
    await moveLocalSettingsToChurchTools.up(context);

    expect(mockProvider.saveScannerModels).not.toHaveBeenCalled();
  });

  it('should do nothing if no local settings found', async () => {
    const context = { log: vi.fn() } as unknown as MigrationContext;
    await moveLocalSettingsToChurchTools.up(context);

    expect(mockProvider.setGlobalSetting).not.toHaveBeenCalled();
    expect(mockProvider.saveScannerModels).not.toHaveBeenCalled();
  });
});
