import type { ISOTimestamp, UUID } from './entities';

export interface AssetModel {
  id: UUID;
  name: string;
  assetTypeId: UUID;
  manufacturer?: string;
  modelNumber?: string;
  defaultWarrantyMonths?: number;
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
