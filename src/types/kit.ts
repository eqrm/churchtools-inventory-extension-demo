import type { ISOTimestamp, UUID } from './entities';

export type InheritedProperty = 'location' | 'status' | 'tags';

export interface PropertyInheritanceSettings {
  location: boolean;
  status: boolean;
  tags: boolean;
}

export type KitCompletenessStatus = 'complete' | 'incomplete';

export interface KitSubAsset {
  assetId: UUID;
  inheritedProperties: Partial<Record<InheritedProperty, boolean>>;
  isBroken?: boolean;
}

export interface FixedKit {
  id: UUID;
  name: string;
  kitNumber?: string;
  parentAssetId?: UUID;
  location?: string;
  status: KitCompletenessStatus;
  inheritance: PropertyInheritanceSettings;
  subAssets: KitSubAsset[];
  assemblyDate: ISOTimestamp;
  disassemblyDate?: ISOTimestamp;
  createdBy: UUID;
  createdByName?: string;
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
}
