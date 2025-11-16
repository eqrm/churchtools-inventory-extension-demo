import type { Tag } from '../types/tag';
import type { UUID } from '../types/entities';
import { recordUndoAction, registerUndoHandler } from './undo';
import type { UndoAction } from '../types/undo';

export interface TagCreate {
  name: string;
  color: string;
  description?: string;
  createdBy: UUID;
}

export interface TagUpdate {
  name?: string;
  color?: string;
  description?: string;
}

// Temporary in-memory storage until storage provider implements tag methods
const tagsStore = new Map<UUID, Tag>();
const entityTagsStore = new Map<string, Set<UUID>>(); // key: ${entityType}:${entityId}

/**
 * Tag Service
 * 
 * Manages tags that can be applied to assets, kits, and models.
 * Supports tag inheritance from kits to sub-assets and models to created assets.
 * 
 * NOTE: Currently uses in-memory storage. Will be migrated to storage provider
 * when tag methods are added to IStorageProvider interface.
 */
export class TagService {
  /**
   * Get all tags
   */
  async getTags(): Promise<Tag[]> {
    return Array.from(tagsStore.values());
  }

  /**
   * Get a single tag by ID
   */
  async getTag(id: UUID): Promise<Tag | null> {
    return tagsStore.get(id) ?? null;
  }

  /**
   * Create a new tag
   */
  async createTag(data: TagCreate): Promise<Tag> {
    // Validation
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('Tag name is required');
    }

    if (!data.color || data.color.trim().length === 0) {
      throw new Error('Tag color is required');
    }

    const created: Tag = {
      id: crypto.randomUUID(),
      name: data.name,
      color: data.color,
      description: data.description,
      createdBy: data.createdBy,
      createdAt: new Date().toISOString(),
    };

    tagsStore.set(created.id, created);

    // Record undo action for tag creation
    await recordUndoAction({
      entityType: 'tag',
      entityId: created.id,
      actionType: 'create',
      beforeState: null,
      afterState: { ...created } as Record<string, unknown>,
    });

    return created;
  }

  /**
   * Update an existing tag
   */
  async updateTag(id: UUID, data: TagUpdate): Promise<Tag> {
    const existing = await this.getTag(id);
    if (!existing) {
      throw new Error(`Tag ${id} not found`);
    }

    // Validate name if being updated
    if (data.name !== undefined && data.name.trim().length === 0) {
      throw new Error('Tag name cannot be empty');
    }

    // Validate color if being updated
    if (data.color !== undefined && data.color.trim().length === 0) {
      throw new Error('Tag color cannot be empty');
    }

    const updated: Tag = {
      ...existing,
      name: data.name ?? existing.name,
      color: data.color ?? existing.color,
      description: data.description ?? existing.description,
    };

    tagsStore.set(id, updated);

    // Record undo action for tag update
    await recordUndoAction({
      entityType: 'tag',
      entityId: id,
      actionType: 'update',
      beforeState: { ...existing } as Record<string, unknown>,
      afterState: { ...updated } as Record<string, unknown>,
    });

    return updated;
  }

  /**
   * Delete a tag
   */
  async deleteTag(id: UUID): Promise<void> {
    const existing = await this.getTag(id);
    if (!existing) {
      throw new Error(`Tag ${id} not found`);
    }

    tagsStore.delete(id);

    // Record undo action for tag deletion
    await recordUndoAction({
      entityType: 'tag',
      entityId: id,
      actionType: 'delete',
      beforeState: { ...existing } as Record<string, unknown>,
      afterState: null,
    });
  }

  /**
   * Apply a tag to an entity (asset, kit, or model)
   */
  async applyTagToEntity(
    entityType: 'asset' | 'kit' | 'model',
    entityId: UUID,
    tagId: UUID,
  ): Promise<void> {
    const tag = await this.getTag(tagId);
    if (!tag) {
      throw new Error(`Tag ${tagId} not found`);
    }

    const key = `${entityType}:${entityId}`;
    const entityTags = entityTagsStore.get(key) ?? new Set<UUID>();
    entityTags.add(tagId);
    entityTagsStore.set(key, entityTags);

    // Record undo action for tag application
    await recordUndoAction({
      entityType: `${entityType}-tag`,
      entityId: `${entityId}:${tagId}`,
      actionType: 'create',
      beforeState: null,
      afterState: { entityType, entityId, tagId } as Record<string, unknown>,
    });
  }

  /**
   * Remove a tag from an entity
   */
  async removeTagFromEntity(
    entityType: 'asset' | 'kit' | 'model',
    entityId: UUID,
    tagId: UUID,
  ): Promise<void> {
    // For assets, check if the tag is inherited (cannot be removed)
    if (entityType === 'asset') {
      const isInherited = await this.isTagInherited('asset', entityId, tagId);
      if (isInherited) {
        throw new Error('Cannot remove inherited tags. Update the parent kit or model to change this tag.');
      }
    }

    const key = `${entityType}:${entityId}`;
    const entityTags = entityTagsStore.get(key) ?? new Set<UUID>();
    
    if (!entityTags.has(tagId)) {
      return; // Tag not applied, nothing to remove
    }

    entityTags.delete(tagId);
    entityTagsStore.set(key, entityTags);

    // Record undo action
    await recordUndoAction({
      entityType: `${entityType}-tag` as 'asset-tag' | 'kit-tag' | 'model-tag',
      entityId: `${entityId}:${tagId}`,
      actionType: 'delete',
      beforeState: { entityType, entityId, tagId } as Record<string, unknown>,
      afterState: null,
    });
  }

  /**
   * Check if a tag is inherited on an asset
   * 
   * Checks if the tag comes from a parent kit or asset model
   */
  async isTagInherited(
    entityType: 'asset' | 'kit' | 'model',
    entityId: UUID,
    tagId: UUID,
  ): Promise<boolean> {
    if (entityType !== 'asset') {
      return false; // Only assets can inherit tags
    }

    try {
      // Dynamically import storage provider to get asset details
      const { getChurchToolsStorageProvider } = await import('./churchTools/storageProvider');
      const provider = getChurchToolsStorageProvider();
      const asset = await provider.getAsset(entityId);
      
      if (!asset) {
        return false;
      }

      // Check if tag is in inheritedTagIds
      if (asset.inheritedTagIds?.includes(tagId)) {
        return true;
      }

      // Check if tag is in inheritedTags array
      if (asset.inheritedTags?.some((it) => it.tagId === tagId)) {
        return true;
      }

      return false;
    } catch (error) {
      console.error('TagService.isTagInherited error:', error);
      return false; // If we can't determine, allow removal
    }
  }

  /**
   * Get tags applied to an entity
   */
  async getEntityTags(
    entityType: 'asset' | 'kit' | 'model',
    entityId: UUID,
  ): Promise<Tag[]> {
    const key = `${entityType}:${entityId}`;
    const entityTags = entityTagsStore.get(key) ?? new Set<UUID>();
    
    const tags: Tag[] = [];
    for (const tagId of entityTags) {
      const tag = await this.getTag(tagId);
      if (tag) {
        tags.push(tag);
      }
    }
    
    return tags;
  }

  /**
   * Propagate tags from a kit to all its sub-assets
   * 
   * Applies tags to all sub-assets of a kit. This is used when a kit's tags
   * are updated and the kit has tag inheritance enabled.
   */
  async propagateKitTags(kitId: UUID, tagIds: UUID[]): Promise<number> {
    try {
      // Dynamically import KitService and storageProvider
      const [{ KitService }, { getChurchToolsStorageProvider }] = await Promise.all([
        import('./KitService'),
        import('./churchTools/storageProvider'),
      ]);
      
      const storageProvider = getChurchToolsStorageProvider();
      const kitService = new KitService({ storageProvider });
      
      // Get all sub-assets of the kit
      const subAssets = await kitService.getKitSubAssets(kitId);
      
      if (subAssets.length === 0) {
        return 0;
      }

      // Apply tags to each sub-asset
      let appliedCount = 0;
      for (const asset of subAssets) {
        for (const tagId of tagIds) {
          // Check if asset already has this tag
          const existingTags = await this.getEntityTags('asset', asset.id);
          const hasTag = existingTags.some((t) => t.id === tagId);
          
          if (!hasTag) {
            await this.applyTagToEntity('asset', asset.id, tagId);
            appliedCount++;
          }
        }
      }

      return appliedCount;
    } catch (error) {
      console.error('TagService.propagateKitTags error:', error);
      throw error;
    }
  }

  /**
   * Propagate tags from a model to all assets created from that model
   * 
   * Applies tags to all assets that were created from this model.
   */
  async propagateModelTags(modelId: UUID, tagIds: UUID[]): Promise<number> {
    try {
      // Dynamically import AssetModelService
      const { AssetModelService } = await import('./AssetModelService');
      
      const assetModelService = new AssetModelService();
      
      // Get all assets created from this model
      const assets = await assetModelService.getAssetsFromModel(modelId);
      
      if (assets.length === 0) {
        return 0;
      }

      // Apply tags to each asset
      let appliedCount = 0;
      for (const asset of assets) {
        for (const tagId of tagIds) {
          // Check if asset already has this tag
          const existingTags = await this.getEntityTags('asset', asset.id);
          const hasTag = existingTags.some((t) => t.id === tagId);
          
          if (!hasTag) {
            await this.applyTagToEntity('asset', asset.id, tagId);
            appliedCount++;
          }
        }
      }

      return appliedCount;
    } catch (error) {
      console.error('TagService.propagateModelTags error:', error);
      throw error;
    }
  }
}

export const tagService = new TagService();

// Register undo handlers for tag operations
registerUndoHandler('create', async (action: UndoAction) => {
  if (action.entityType === 'tag') {
    // Undo tag creation by deleting it
    await tagService.deleteTag(action.entityId);
  } else if (action.entityType === 'asset-tag' || action.entityType === 'kit-tag' || action.entityType === 'model-tag') {
    // Undo tag application by removing it
    const [entityId, tagId] = action.entityId.split(':');
    if (entityId && tagId) {
      const entityType = action.entityType.replace('-tag', '') as 'asset' | 'kit' | 'model';
      await tagService.removeTagFromEntity(entityType, entityId, tagId);
    }
  }
});

registerUndoHandler('update', async (action: UndoAction) => {
  if (action.entityType !== 'tag') {
    return;
  }
  // Undo tag update by restoring previous state
  if (action.beforeState) {
    const before = action.beforeState as TagUpdate;
    await tagService.updateTag(action.entityId, before);
  }
});

registerUndoHandler('delete', async (action: UndoAction) => {
  if (action.entityType === 'tag') {
    // Undo tag deletion by recreating it
    if (action.beforeState) {
      const before = action.beforeState as unknown as Tag;
      await tagService.createTag({
        name: before.name,
        color: before.color,
        description: before.description,
        createdBy: before.createdBy,
      });
    }
  } else if (action.entityType === 'asset-tag' || action.entityType === 'kit-tag' || action.entityType === 'model-tag') {
    // Undo tag removal by reapplying it
    const [entityId, tagId] = action.entityId.split(':');
    if (entityId && tagId) {
      const entityType = action.entityType.replace('-tag', '') as 'asset' | 'kit' | 'model';
      await tagService.applyTagToEntity(entityType, entityId, tagId);
    }
  }
});

