import type { ChurchToolsAPIClient } from '../../api/ChurchToolsAPIClient';
import type { ChangeHistoryEntry, ScannerModel } from '../../../types/entities';

export interface ScannerModelDependencies {
  moduleId: string;
  apiClient: ChurchToolsAPIClient;
  recordChange(entry: Omit<ChangeHistoryEntry, 'id' | 'changedAt'>): Promise<void>;
}

const CATEGORY_NAME = '__ScannerModels__';
const CATEGORY_DESCRIPTION = 'System category for scanner configuration models';

async function resolveCategory(deps: ScannerModelDependencies): Promise<{ id: string; name: string }> {
  try {
    const categories = await deps.apiClient.getDataCategories(deps.moduleId);
    const match = (categories as Array<{ id: unknown; name?: unknown }>).find(
      (category) => String(category.name) === CATEGORY_NAME,
    );

    if (match && match.id !== undefined) {
      return { id: String(match.id), name: CATEGORY_NAME };
    }
  } catch {
    // ignore
  }

  const user = await deps.apiClient.getCurrentUser();
  const created = await deps.apiClient.createDataCategory(deps.moduleId, {
    customModuleId: Number(deps.moduleId),
    name: CATEGORY_NAME,
    shorty: `scanners_${Date.now().toString().slice(-4)}`,
    description: CATEGORY_DESCRIPTION,
    data: null,
  });

  await deps.recordChange({
    entityType: 'settings',
    entityId: String((created as { id?: unknown }).id ?? CATEGORY_NAME),
    entityName: CATEGORY_NAME,
    action: 'created',
    changedBy: user.id,
    changedByName: user.name,
  });

  return { id: String((created as { id?: unknown }).id ?? CATEGORY_NAME), name: CATEGORY_NAME };
}

function mapScannerModel(value: unknown): ScannerModel {
  const record = value as Record<string, unknown>;
  const dataStr = (record['value'] || record['data']) as string | null;
  const parsed = dataStr ? (JSON.parse(dataStr) as Record<string, unknown>) : {};

  return parsed as unknown as ScannerModel;
}

export async function getScannerModels(deps: ScannerModelDependencies): Promise<ScannerModel[]> {
  const category = await resolveCategory(deps);
  const values = await deps.apiClient.getDataValues(deps.moduleId, category.id);
  return values.map(mapScannerModel);
}

export async function saveScannerModels(deps: ScannerModelDependencies, models: ScannerModel[]): Promise<void> {
  const category = await resolveCategory(deps);
  const existingValues = await deps.apiClient.getDataValues(deps.moduleId, category.id);
  const user = await deps.apiClient.getCurrentUser();

  // We store each model as a separate entry
  // Strategy: Delete all existing and recreate? Or sync?
  // Sync is better.

  const existingMap = new Map(existingValues.map((v) => {
    const model = mapScannerModel(v);
    return [model.id, { valueId: String((v as { id: unknown }).id), model }];
  }));

  const currentIds = new Set(models.map(m => m.id));

  // Update or Create
  for (const model of models) {
    const existing = existingMap.get(model.id);
    const payload = JSON.stringify(model);

    if (existing) {
      if (JSON.stringify(existing.model) !== payload) {
        const value = {
          id: Number(existing.valueId),
          dataCategoryId: Number(category.id),
          value: payload,
        };
        await deps.apiClient.updateDataValue(deps.moduleId, category.id, existing.valueId, value);
        
        await deps.recordChange({
          entityType: 'settings',
          entityId: model.id,
          entityName: model.modelName,
          action: 'updated',
          changedBy: user.id,
          changedByName: user.name,
        });
      }
    } else {
      const value = {
        dataCategoryId: Number(category.id),
        value: payload,
      };
      await deps.apiClient.createDataValue(deps.moduleId, category.id, value);

      await deps.recordChange({
        entityType: 'settings',
        entityId: model.id,
        entityName: model.modelName,
        action: 'created',
        changedBy: user.id,
        changedByName: user.name,
      });
    }
  }

  // Delete removed
  for (const [id, { valueId, model }] of existingMap) {
    if (!currentIds.has(id)) {
      await deps.apiClient.deleteDataValue(deps.moduleId, category.id, valueId);
      
      await deps.recordChange({
        entityType: 'settings',
        entityId: id,
        entityName: model.modelName,
        action: 'deleted',
        changedBy: user.id,
        changedByName: user.name,
      });
    }
  }
}
