import type { ScannerModel, ScannerModelCreate } from '../../types/entities';
import { getChurchToolsStorageProvider } from '../churchTools/storageProvider';

const STORAGE_KEY = 'scannerModels';

const getSafeStorage = (): Storage | null => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

export function loadScannerModelsFromLocalStorage(): ScannerModel[] {
  const storage = getSafeStorage();
  if (!storage) {
    return [];
  }

  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ScannerModel[]) : [];
  } catch {
    return [];
  }
};

// Deprecated: Use loadScannerModelsAsync
export function loadScannerModels(): ScannerModel[] {
    return loadScannerModelsFromLocalStorage();
}

export async function loadScannerModelsAsync(): Promise<ScannerModel[]> {
    try {
        const provider = getChurchToolsStorageProvider();
        return await provider.getScannerModels();
    } catch (error) {
        console.warn('Failed to load scanner models from provider', error);
        return loadScannerModelsFromLocalStorage();
    }
}

const createScannerModelId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `scanner-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export function saveScannerModelsToLocalStorage(models: ScannerModel[]): void {
  const storage = getSafeStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(models));
  } catch (error) {
    console.warn('Failed to persist scanner models', error);
  }
}

// Deprecated: Use saveScannerModelsAsync
export function saveScannerModels(models: ScannerModel[]): void {
    saveScannerModelsToLocalStorage(models);
}

export async function saveScannerModelsAsync(models: ScannerModel[]): Promise<void> {
    try {
        const provider = getChurchToolsStorageProvider();
        await provider.saveScannerModels(models);
    } catch (error) {
        console.warn('Failed to save scanner models to provider', error);
        saveScannerModelsToLocalStorage(models);
    }
}

export function upsertScannerModel(models: ScannerModel[], data: ScannerModelCreate, existing?: ScannerModel): ScannerModel[] {
  const now = new Date().toISOString();
  if (existing) {
    return models.map((model) =>
      model.id === existing.id
        ? {
            ...existing,
            ...data,
            id: existing.id,
            createdAt: existing.createdAt,
            lastModifiedAt: now,
          }
        : model,
    );
  }

  const created: ScannerModel = {
    ...data,
    id: createScannerModelId(),
    createdAt: now,
    lastModifiedAt: now,
  };

  return [...models, created];
}
