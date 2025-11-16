import type { Asset, Kit, KitCreate, KitInheritanceProperty, KitUpdate } from '../types/entities';
import type { IStorageProvider } from '../types/storage';
import type { InheritedTag } from '../types/tag';
import type { UndoActionType } from '../types/undo';
import { PropertyInheritanceService } from './PropertyInheritanceService';
import { recordUndoAction, registerUndoHandler, recordCompoundUndoAction } from './undo';

export interface KitServiceOptions {
  storageProvider: IStorageProvider;
  now?: () => Date;
  inheritanceService?: PropertyInheritanceService;
}

type KitUndoState = { kit: Kit };

type KitUndoMetadata = {
  kitName: string;
};

const INHERITABLE_PROPERTIES: KitInheritanceProperty[] = ['location', 'status', 'tags'];

export class KitService {
  private readonly storageProvider: IStorageProvider;
  private readonly inheritanceService: PropertyInheritanceService;
  private readonly now: () => Date;

  constructor(options: KitServiceOptions) {
    this.storageProvider = options.storageProvider;
    this.now = options.now ?? (() => new Date());
    this.inheritanceService =
      options.inheritanceService ??
      new PropertyInheritanceService({
        storageProvider: {
          getKit: this.storageProvider.getKit.bind(this.storageProvider),
          getAsset: this.storageProvider.getAsset.bind(this.storageProvider),
          updateAsset: this.storageProvider.updateAsset.bind(this.storageProvider),
        },
        recordCompoundUndoAction,
        registerUndoHandler: (actionType, handler) =>
          registerUndoHandler(actionType as UndoActionType, handler),
      });
  }

  async getKits(): Promise<Kit[]> {
    return await this.storageProvider.getKits();
  }

  async getKit(id: string): Promise<Kit | null> {
    return await this.storageProvider.getKit(id);
  }

  async createKit(data: KitCreate): Promise<Kit> {
    this.assertFixedKitDefinition(data);

    const payload: KitCreate = {
      ...data,
      assemblyDate: data.assemblyDate ?? this.timestamp(),
      disassemblyDate: data.disassemblyDate ?? null,
      completenessStatus: data.completenessStatus ?? 'complete',
    };

    const created = await this.storageProvider.createKit(payload);

    await this.syncAssetBindings(created, undefined);
    await this.propagateInheritedProperties(created);
    const finalKit = await this.syncCompletenessStatus(created);

    await recordUndoAction({
      entityType: 'kit',
      entityId: finalKit.id,
      actionType: 'create',
      beforeState: null,
      afterState: { kit: finalKit } satisfies KitUndoState,
      metadata: this.buildUndoMetadata(finalKit),
    });

    return finalKit;
  }

  async updateKit(id: string, data: KitUpdate): Promise<Kit> {
    const existing = await this.requireKit(id);
    const updated = await this.storageProvider.updateKit(id, data);

    await this.syncAssetBindings(updated, existing);
    await this.propagateInheritedProperties(updated, existing);
    const finalKit = await this.syncCompletenessStatus(updated);

    await recordUndoAction({
      entityType: 'kit',
      entityId: finalKit.id,
      actionType: 'update',
      beforeState: { kit: existing } satisfies KitUndoState,
      afterState: { kit: finalKit } satisfies KitUndoState,
      metadata: this.buildUndoMetadata(finalKit),
    });

    return finalKit;
  }

  async deleteKit(id: string): Promise<void> {
    const kit = await this.requireKit(id);

    await this.inheritanceService.unlockInheritedProperties(kit.id);
    await this.detachAssets(kit, this.getBoundAssetIds(kit));
    await this.storageProvider.deleteKit(kit.id);

    await recordUndoAction({
      entityType: 'kit',
      entityId: kit.id,
      actionType: 'delete',
      beforeState: { kit } satisfies KitUndoState,
      afterState: null,
      metadata: this.buildUndoMetadata(kit),
    });
  }

  async assembleKit(id: string, data?: Pick<KitUpdate, 'boundAssets' | 'inheritedProperties'>): Promise<Kit> {
    const kit = await this.requireKit(id);
    if (kit.disassemblyDate) {
      throw new Error('Disassembled kits cannot be reassembled.');
    }

    const update: KitUpdate = {
      ...data,
      assemblyDate: kit.assemblyDate ?? this.timestamp(),
      disassemblyDate: null,
    };

    const updated = await this.storageProvider.updateKit(id, update);
    await this.syncAssetBindings(updated, kit);
    await this.propagateInheritedProperties(updated, kit);
    const finalKit = await this.syncCompletenessStatus(updated);

    await recordUndoAction({
      entityType: 'kit',
      entityId: finalKit.id,
      actionType: 'status-change',
      beforeState: { kit } satisfies KitUndoState,
      afterState: { kit: finalKit } satisfies KitUndoState,
      metadata: this.buildUndoMetadata(finalKit),
    });

    return finalKit;
  }

  async disassembleKit(id: string): Promise<Kit> {
    const kit = await this.requireKit(id);
    if (kit.disassemblyDate) {
      return kit;
    }

    await this.inheritanceService.unlockInheritedProperties(kit.id);
    await this.detachAssets(kit, this.getBoundAssetIds(kit));

    const update: KitUpdate = {
      boundAssets: [],
      inheritedProperties: [],
      disassemblyDate: this.timestamp(),
    };

    const updated = await this.storageProvider.updateKit(id, update);

    await recordUndoAction({
      entityType: 'kit',
      entityId: updated.id,
      actionType: 'status-change',
      beforeState: { kit } satisfies KitUndoState,
      afterState: { kit: updated } satisfies KitUndoState,
      metadata: this.buildUndoMetadata(updated),
    });

    return updated;
  }

  async getKitSubAssets(kitId: string): Promise<Asset[]> {
    const kit = await this.requireKit(kitId);
    return await this.loadAssetsByIds(this.getBoundAssetIds(kit));
  }

  private buildUndoMetadata(kit: Kit): KitUndoMetadata {
    return { kitName: kit.name };
  }

  private timestamp(): string {
    return this.now().toISOString();
  }

  private async requireKit(id: string): Promise<Kit> {
    const kit = await this.storageProvider.getKit(id);
    if (!kit) {
      throw new Error(`Kit ${id} not found.`);
    }
    return kit;
  }

  private assertFixedKitDefinition(data: KitCreate): void {
    if (data.type === 'fixed' && (!data.boundAssets || data.boundAssets.length === 0)) {
      throw new Error('Fixed kits require at least one bound asset.');
    }
  }

  private getBoundAssetIds(kit: Pick<Kit, 'boundAssets'>): string[] {
    return (kit.boundAssets ?? []).map((asset) => asset.assetId);
  }

  private async syncCompletenessStatus(kit: Kit): Promise<Kit> {
    if (kit.type !== 'fixed') {
      return kit;
    }

    const assets = await this.loadAssetsByIds(this.getBoundAssetIds(kit));
    const hasBrokenAsset = assets.some((asset) => asset.status === 'broken');
    const completeness = hasBrokenAsset ? 'incomplete' : 'complete';

    if (kit.completenessStatus === completeness) {
      return kit;
    }

    return await this.storageProvider.updateKit(kit.id, { completenessStatus: completeness });
  }

  private async syncAssetBindings(next: Kit, previous?: Kit): Promise<void> {
    if (next.type !== 'fixed') {
      if (previous?.type === 'fixed' && previous.boundAssets?.length) {
        await this.detachAssets(previous, this.getBoundAssetIds(previous));
      }
      return;
    }

    const nextIds = new Set(this.getBoundAssetIds(next));
    const previousIds = new Set(this.getBoundAssetIds(previous ?? { boundAssets: [] }));

    const toAttach = Array.from(nextIds).filter((id) => !previousIds.has(id));
    const toDetach = Array.from(previousIds).filter((id) => !nextIds.has(id));

    if (toAttach.length > 0) {
      await this.attachAssets(next.id, toAttach);
    }
    if (previous && toDetach.length > 0) {
      await this.detachAssets(previous, toDetach);
    }
  }

  private async attachAssets(kitId: string, assetIds: string[]): Promise<void> {
    if (assetIds.length === 0) {
      return;
    }

    await Promise.all(
      assetIds.map(async (assetId) => {
        const asset = await this.storageProvider.getAsset(assetId);
        if (!asset) {
          throw new Error(`Asset ${assetId} not found.`);
        }

        if (asset.kitId && asset.kitId !== kitId) {
          throw new Error(`Asset ${asset.name} is already part of another kit.`);
        }

        await this.storageProvider.updateAsset(assetId, { kitId });
      }),
    );
  }

  private async detachAssets(kit: Kit, assetIds: string[]): Promise<void> {
    if (assetIds.length === 0) {
      return;
    }

    await Promise.all(
      assetIds.map(async (assetId) => {
        const asset = await this.storageProvider.getAsset(assetId);
        if (!asset) {
          return;
        }

        const retainedTags: InheritedTag[] = (asset.inheritedTags ?? []).filter(
          (tag) => !(tag.sourceType === 'kit' && tag.sourceId === kit.id),
        );

        await this.storageProvider.updateAsset(assetId, {
          kitId: undefined,
          inheritedTags: retainedTags,
          inheritedTagIds: retainedTags.map((tag) => tag.tagId),
        });
      }),
    );
  }

  private assetsChanged(previous: Kit | undefined, next: Kit): boolean {
    if (!previous) {
      return true;
    }

    const prevSignature = this.getBoundAssetIds(previous).sort().join('|');
    const nextSignature = this.getBoundAssetIds(next).sort().join('|');
    return prevSignature !== nextSignature;
  }

  private async propagateInheritedProperties(next: Kit, previous?: Kit): Promise<void> {
    if (next.type !== 'fixed') {
      return;
    }

    if (!next.inheritedProperties || next.inheritedProperties.length === 0) {
      return;
    }

    const shouldPropagateForAssets = this.assetsChanged(previous, next);

    for (const property of next.inheritedProperties) {
      if (!INHERITABLE_PROPERTIES.includes(property)) {
        continue;
      }

      if (property === 'location') {
        if (!next.location) {
          continue;
        }
        if (shouldPropagateForAssets || next.location !== previous?.location) {
          await this.inheritanceService.propagateKitChange(next.id, 'location', next.location);
        }
        continue;
      }

      if (property === 'status') {
        if (!next.status) {
          continue;
        }
        if (shouldPropagateForAssets || next.status !== previous?.status) {
          await this.inheritanceService.propagateKitChange(next.id, 'status', next.status);
        }
        continue;
      }

      if (property === 'tags') {
        const tags = next.tags ?? [];
        const previousTags = previous?.tags ?? [];
        const changed = shouldPropagateForAssets || tags.join('|') !== previousTags.join('|');
        if (changed) {
          await this.inheritanceService.propagateKitChange(next.id, 'tags', tags);
        }
      }
    }
  }

  private async loadAssetsByIds(assetIds: string[]): Promise<Asset[]> {
    if (!assetIds.length) {
      return [];
    }

    const assets = await Promise.all(assetIds.map((assetId) => this.storageProvider.getAsset(assetId)));
    return assets.filter((asset): asset is Asset => Boolean(asset));
  }
}
