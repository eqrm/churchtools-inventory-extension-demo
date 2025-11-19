export type MasterDataEntity = 'locations' | 'manufacturers' | 'models' | 'maintenanceCompanies';

export interface MasterDataItem {
  id: string;
  name: string;
  assetCount?: number;
  createdBy?: string;
  createdByName?: string;
  createdAt?: string;
  updatedAt?: string;
}
