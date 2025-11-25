import type { Asset, AssetStatus, Kit, KitInheritanceProperty } from '../types/entities';
import type { InheritedTag } from '../types/tag';
import type { CompoundActionInput, UndoHandler } from './UndoService';

const INHERITABLE_PROPERTIES: readonly KitInheritanceProperty[] = ['location', 'status', 'tags'];

export type InheritedProperties = {
  location?: string;
  status?: AssetStatus;
  tags?: string[];
};

type KitBoundAsset = NonNullable<Kit['boundAssets']>[number];

interface PropertyInheritanceStorage {
  getKit(id: string): Promise<Kit | null>;
  getAsset(id: string): Promise<Asset | null>;
  updateAsset(id: string, update: Partial<Asset>): Promise<Asset>;
}

export interface PropertyInheritanceServiceOptions {
  storageProvider: PropertyInheritanceStorage;
  recordCompoundUndoAction: (action: CompoundActionInput) => Promise<string>;
  registerUndoHandler?: (actionType: string, handler: UndoHandler) => void;
  now?: () => Date;
}

interface AssetSnapshot {
  assetId: string;
  previousValue: unknown;
}

type PropertyValueMap = {
  location: string;
  status: AssetStatus;
  tags: string[];
};

export class PropertyInheritanceService {
  private readonly options: PropertyInheritanceServiceOptions;

  constructor(options: PropertyInheritanceServiceOptions) {
    this.options = options;
  }

  async getInheritedProperties(assetId: string, kitId: string): Promise<InheritedProperties> {
    const kit = await this.ensureKit(kitId);
    this.ensureAssetBinding(kit, assetId);

    const result: InheritedProperties = {};

    if (this.doesAssetInherit(kit, assetId, 'location') && kit.location) {
      result.location = kit.location;
    }
    if (this.doesAssetInherit(kit, assetId, 'status') && kit.status) {
      result.status = kit.status;
    }
    if (this.doesAssetInherit(kit, assetId, 'tags') && kit.tags?.length) {
      result.tags = [...kit.tags];
    }

    return result;
  }

  async isPropertyInherited(assetId: string, propertyName: string): Promise<{ inherited: boolean; source?: string }> {
    if (!this.isSupportedProperty(propertyName)) {
      return { inherited: false };
    }

    const asset = await this.ensureAsset(assetId);
    if (!asset.kitId) {
      return { inherited: false };
    }

    const kit = await this.ensureKit(asset.kitId);
    const property = propertyName as KitInheritanceProperty;
    const inherited = this.doesAssetInherit(kit, asset.id, property);

    return inherited
      ? { inherited: true, source: kit.name }
      : { inherited: false };
  }

  async propagateKitChange(kitId: string, propertyName: string, newValue: unknown): Promise<string[]> {
    const property = this.ensureProperty(propertyName);
    const kit = await this.ensureKit(kitId);

    if (!this.kitAllowsProperty(kit, property)) {
      throw new Error(`Property ${property} is not configured for inheritance on kit ${kit.name}`);
    }

    const inheritingAssets = (kit.boundAssets ?? []).filter((bound) => this.boundAssetInherits(bound, property));
    if (inheritingAssets.length === 0) {
      return [];
    }

    const value = this.normalizePropertyValue(property, newValue);
    const snapshots: AssetSnapshot[] = [];
    const updatedIds: string[] = [];

    for (const bound of inheritingAssets) {
      const asset = await this.ensureAsset(bound.assetId);
      snapshots.push({ assetId: asset.id, previousValue: this.capturePreviousValue(asset, kit, property) });

      const update = this.buildAssetUpdate(asset, kit, property, value);
      await this.options.storageProvider.updateAsset(asset.id, update);
      updatedIds.push(asset.id);
    }

    if (updatedIds.length > 0) {
      await this.options.recordCompoundUndoAction({
        entityType: 'kit',
        entityId: kit.id,
        actionType: 'compound',
        description: `Propagated ${property} from kit ${kit.name}`,
        beforeState: {
          kitId: kit.id,
          kitName: kit.name,
          propertyName: property,
          assetSnapshots: snapshots,
        },
        afterState: {
          kitId: kit.id,
          propertyName: property,
          newValue: value,
        },
        metadata: {
          kind: 'kit-property-propagation',
          kitId: kit.id,
          kitName: kit.name,
          propertyName: property,
        },
        createdEntityIds: updatedIds,
      });
    }

    return updatedIds;
  }

  async unlockInheritedProperties(kitId: string): Promise<void> {
    const kit = await this.ensureKit(kitId);
    const boundAssets = kit.boundAssets ?? [];

    for (const bound of boundAssets) {
      const asset = await this.ensureAsset(bound.assetId);
      const retainedTags = (asset.inheritedTags ?? []).filter((tag) => !(tag.sourceType === 'kit' && tag.sourceId === kit.id));
      const retainedTagIds = retainedTags.map((tag) => tag.tagId);

      await this.options.storageProvider.updateAsset(asset.id, {
        kitId: undefined,
        inheritedTags: retainedTags,
        inheritedTagIds: retainedTagIds,
      });
    }
  }

  private isSupportedProperty(propertyName: string): boolean {
    return INHERITABLE_PROPERTIES.includes(propertyName as KitInheritanceProperty);
  }

  private ensureProperty(propertyName: string): KitInheritanceProperty {
    if (!this.isSupportedProperty(propertyName)) {
      throw new Error(`Property ${propertyName} is not supported for inheritance`);
    }
    return propertyName as KitInheritanceProperty;
  }

  private async ensureKit(kitId: string): Promise<Kit> {
    const kit = await this.options.storageProvider.getKit(kitId);
    if (!kit) {
      throw new Error(`Kit ${kitId} not found`);
    }
    return kit;
  }

  private async ensureAsset(assetId: string): Promise<Asset> {
    const asset = await this.options.storageProvider.getAsset(assetId);
    if (!asset) {
      throw new Error(`Asset ${assetId} not found`);
    }
    return asset;
  }

  private ensureAssetBinding(kit: Kit, assetId: string): KitBoundAsset {
    const bound = (kit.boundAssets ?? []).find((candidate) => candidate.assetId === assetId);
    if (!bound) {
      throw new Error(`Asset ${assetId} is not bound to kit ${kit.id}`);
    }
    return bound;
  }

  private kitAllowsProperty(kit: Kit, property: KitInheritanceProperty): boolean {
    return Boolean(kit.inheritedProperties?.includes(property));
  }

  private doesAssetInherit(kit: Kit, assetId: string, property: KitInheritanceProperty): boolean {
    if (!this.kitAllowsProperty(kit, property)) {
      return false;
    }

    const bound = this.ensureAssetBinding(kit, assetId);
    const inheritsFlag = bound.inherits?.[property];
    if (inheritsFlag === false) {
      return false;
    }

    return inheritsFlag === true || inheritsFlag === undefined;
  }

  private boundAssetInherits(bound: KitBoundAsset, property: KitInheritanceProperty): boolean {
    const inheritsFlag = bound.inherits?.[property];
    return inheritsFlag !== false; // default to true when undefined
  }

  private normalizePropertyValue<T extends KitInheritanceProperty>(property: T, value: unknown): PropertyValueMap[T] {
    if (property === 'tags') {
      if (value === undefined) {
        return [] as PropertyValueMap[T];
      }
      if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
        throw new Error('Tags inheritance requires an array of tag ids');
      }
      return [...value] as PropertyValueMap[T];
    }

    if (typeof value !== 'string') {
      throw new Error(`Value for property ${property} must be a string`);
    }

    return value as PropertyValueMap[T];
  }

  private buildAssetUpdate(
    asset: Asset,
    kit: Kit,
    property: KitInheritanceProperty,
    value: PropertyValueMap[KitInheritanceProperty],
  ): Partial<Asset> {
    if (property === 'location') {
      return { location: value as PropertyValueMap['location'] };
    }

    if (property === 'status') {
      return { status: value as PropertyValueMap['status'] };
    }

    const tagIds = value as PropertyValueMap['tags'];
    const existing = asset.inheritedTags ?? [];
    const preserved = existing.filter((tag) => !(tag.sourceType === 'kit' && tag.sourceId === kit.id));
    const kitTags: InheritedTag[] = tagIds.map((tagId) => ({
      tagId,
      sourceType: 'kit',
      sourceId: kit.id,
      sourceName: kit.name,
    }));
    const merged = [...preserved, ...kitTags];
    const mergedIds = Array.from(new Set(merged.map((tag) => tag.tagId)));

    return {
      inheritedTags: merged,
      inheritedTagIds: mergedIds,
    };
  }

  private capturePreviousValue(asset: Asset, kit: Kit, property: KitInheritanceProperty): unknown {
    if (property === 'location') {
      return asset.location;
    }
    if (property === 'status') {
      return asset.status;
    }
    return (asset.inheritedTags ?? []).filter((tag) => tag.sourceType === 'kit' && tag.sourceId === kit.id);
  }
}
