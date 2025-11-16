import type { AssetModel, AssetModelCreate, AssetModelUpdate } from '../types/model';
import type { Asset } from '../types/entities';
import { getChurchToolsStorageProvider } from './churchTools/storageProvider';
import { recordUndoAction, registerUndoHandler } from './undo';
import type { UndoAction } from '../types/undo';

/**
 * Asset Model Service
 * 
 * Manages asset model templates that can be used to create assets with
 * pre-filled default values.
 */
export class AssetModelService {
  /**
   * Get all asset models
   */
  async getModels(): Promise<AssetModel[]> {
    const provider = getChurchToolsStorageProvider();
    return await provider.getAssetModels();
  }

  /**
   * Get a single asset model by ID
   */
  async getModel(id: string): Promise<AssetModel | null> {
    const provider = getChurchToolsStorageProvider();
    return await provider.getAssetModel(id);
  }

  /**
   * Create a new asset model
   */
  async createModel(data: AssetModelCreate): Promise<AssetModel> {
    // Validation
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('Model name is required');
    }

    if (!data.assetTypeId) {
      throw new Error('Asset type is required');
    }

    const provider = getChurchToolsStorageProvider();
    const created = await provider.createAssetModel(data);

    // T120: Record undo action for model creation
    await recordUndoAction({
      entityType: 'asset-model',
      entityId: created.id,
      actionType: 'create',
      beforeState: null,
      afterState: { ...created } as Record<string, unknown>,
    });

    return created;
  }

  /**
   * Update an existing asset model
   */
  async updateModel(id: string, data: AssetModelUpdate): Promise<AssetModel> {
    const existing = await this.getModel(id);
    if (!existing) {
      throw new Error(`Asset model ${id} not found`);
    }

    // Validate name if being updated
    if (data.name !== undefined && data.name.trim().length === 0) {
      throw new Error('Model name cannot be empty');
    }

    const provider = getChurchToolsStorageProvider();
    const updated = await provider.updateAssetModel(id, data);

    // T120: Record undo action for model update
    await recordUndoAction({
      entityType: 'asset-model',
      entityId: id,
      actionType: 'update',
      beforeState: { ...existing } as Record<string, unknown>,
      afterState: { ...updated } as Record<string, unknown>,
    });

    return updated;
  }

  /**
   * Delete an asset model
   */
  async deleteModel(id: string): Promise<void> {
    const existing = await this.getModel(id);
    if (!existing) {
      throw new Error(`Asset model ${id} not found`);
    }

    const provider = getChurchToolsStorageProvider();
    await provider.deleteAssetModel(id);

    // T120: Record undo action for model deletion
    await recordUndoAction({
      entityType: 'asset-model',
      entityId: id,
      actionType: 'delete',
      beforeState: { ...existing } as Record<string, unknown>,
      afterState: null,
    });
  }

  /**
   * Create an asset from a model template
   * 
   * Applies the model's default values to the asset, but allows overrides.
   */
  async createAssetFromModel(
    modelId: string,
    assetData: Partial<Omit<Asset, 'id' | 'createdAt' | 'createdBy' | 'lastModifiedAt' | 'lastModifiedBy'>>,
  ): Promise<Asset> {
    const model = await this.getModel(modelId);
    if (!model) {
      throw new Error(`Asset model ${modelId} not found`);
    }

    // Merge model defaults with provided asset data
    const customFieldValues: Record<string, string | number | boolean | string[]> = {
      ...(model.defaultValues as Record<string, string | number | boolean | string[]>),
      ...(assetData.customFieldValues || {}),
    };

    // Add warranty if model defines it
    if (model.defaultWarrantyMonths && !assetData.customFieldValues?.['warrantyMonths']) {
      customFieldValues['warrantyMonths'] = model.defaultWarrantyMonths;
    }

    const assetPayload = {
      ...assetData,
      modelId,
      assetType: assetData.assetType || { id: model.assetTypeId, name: '', icon: undefined },
      manufacturer: assetData.manufacturer ?? model.manufacturer,
      customFieldValues,
      tagIds: assetData.tagIds ?? model.tagIds,
    };

    const provider = getChurchToolsStorageProvider();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await provider.createAsset(assetPayload as any);
  }

  /**
   * Get all assets created from a specific model
   */
  async getAssetsFromModel(modelId: string): Promise<Asset[]> {
    const provider = getChurchToolsStorageProvider();
    const allAssets = await provider.getAssets();
    return allAssets.filter((asset: Asset) => asset.modelId === modelId);
  }
}

export const assetModelService = new AssetModelService();

// T120: Register undo handlers for asset model operations
registerUndoHandler('create', async (action: UndoAction) => {
  if (action.entityType !== 'asset-model') {
    return;
  }
  // Undo create by deleting the model
  await assetModelService.deleteModel(action.entityId);
});

registerUndoHandler('update', async (action: UndoAction) => {
  if (action.entityType !== 'asset-model') {
    return;
  }
  // Undo update by restoring previous state
  if (action.beforeState) {
    const provider = getChurchToolsStorageProvider();
    await provider.updateAssetModel(action.entityId, action.beforeState as AssetModelUpdate);
  }
});

registerUndoHandler('delete', async (action: UndoAction) => {
  if (action.entityType !== 'asset-model') {
    return;
  }
  // Undo delete by recreating the model
  if (action.beforeState) {
    const provider = getChurchToolsStorageProvider();
    await provider.createAssetModel(action.beforeState as AssetModelCreate);
  }
});
