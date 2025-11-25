import type { ISOTimestamp, UUID } from './entities';

export interface AssetModel {
  id: UUID;
  name: string;
  assetTypeId: UUID;
  manufacturer?: string;
  modelNumber?: string;
  defaultWarrantyMonths?: number;
  /**
   * Default value for the bookable field when creating new assets from this model.
   * If not specified, defaults to true.
   */
  defaultBookable?: boolean;
  defaultValues: Record<string, unknown>;
  tagIds: UUID[];
  createdBy: UUID;
  createdByName?: string;
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
}

export interface AssetModelSummary {
  id: UUID;
  name: string;
  assetTypeId: UUID;
  tagIds: UUID[];
}

export type AssetModelCreate = Omit<
  AssetModel,
  'id' | 'createdAt' | 'updatedAt' | 'createdByName'
> & {
  defaultValues?: Record<string, unknown>;
  tagIds?: UUID[];
  createdByName?: string;
};

export type AssetModelUpdate = Partial<
  Omit<AssetModel, 'id' | 'createdBy' | 'createdByName' | 'createdAt' | 'updatedAt'>
> & {
  defaultValues?: Record<string, unknown>;
  tagIds?: UUID[];
};
