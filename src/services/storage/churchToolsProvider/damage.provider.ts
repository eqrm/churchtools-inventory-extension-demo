import type { AssetType, ChangeHistoryEntry } from '../../../types/entities';
import type {
  DamageReportCreateInput,
  DamageReportRecord,
  DamageRepairInput,
} from '../../../types/damage';
import { ChurchToolsStorageProvider } from './core';
import type { DamageDependencies } from './damage';
import {
  createDamageReport as createDamageReportHandler,
  deleteDamageReport as deleteDamageReportHandler,
  getDamageReport as getDamageReportHandler,
  getDamageReports as getDamageReportsHandler,
  markDamageReportAsRepaired as markDamageReportAsRepairedHandler,
  updateDamageReport as updateDamageReportHandler,
} from './damage';

declare module './core' {
  interface ChurchToolsStorageProvider {
    getDamageReports(assetId: string): Promise<DamageReportRecord[]>;
    getDamageReport(reportId: string): Promise<DamageReportRecord | null>;
    createDamageReport(assetId: string, data: DamageReportCreateInput): Promise<DamageReportRecord>;
    markDamageReportAsRepaired(reportId: string, repair: DamageRepairInput): Promise<DamageReportRecord>;
    updateDamageReport(reportId: string, updates: Partial<DamageReportRecord>): Promise<DamageReportRecord>;
    deleteDamageReport(reportId: string): Promise<void>;
  }
}

type ProviderWithDamageSupport = ChurchToolsStorageProvider & {
  getAllCategoriesIncludingHistory(): Promise<AssetType[]>;
  mapToAssetType(data: unknown): AssetType;
  recordChange(entry: Omit<ChangeHistoryEntry, 'id' | 'changedAt'>): Promise<void>;
};

function getDamageDependencies(provider: ProviderWithDamageSupport): DamageDependencies {
  return {
    moduleId: provider.moduleId,
    apiClient: provider.apiClient,
    getAllCategoriesIncludingHistory: provider.getAllCategoriesIncludingHistory.bind(provider),
    mapToAssetType: provider.mapToAssetType.bind(provider),
    recordChange: provider.recordChange.bind(provider),
  };
}

ChurchToolsStorageProvider.prototype.getDamageReports = async function getDamageReports(
  this: ProviderWithDamageSupport,
  assetId: string,
): Promise<DamageReportRecord[]> {
  return getDamageReportsHandler(getDamageDependencies(this), assetId);
};

ChurchToolsStorageProvider.prototype.getDamageReport = async function getDamageReport(
  this: ProviderWithDamageSupport,
  reportId: string,
): Promise<DamageReportRecord | null> {
  return getDamageReportHandler(getDamageDependencies(this), reportId);
};

ChurchToolsStorageProvider.prototype.createDamageReport = async function createDamageReport(
  this: ProviderWithDamageSupport,
  assetId: string,
  data: DamageReportCreateInput,
): Promise<DamageReportRecord> {
  return createDamageReportHandler(getDamageDependencies(this), assetId, data);
};

ChurchToolsStorageProvider.prototype.markDamageReportAsRepaired = async function markDamageReportAsRepaired(
  this: ProviderWithDamageSupport,
  reportId: string,
  repair: DamageRepairInput,
): Promise<DamageReportRecord> {
  return markDamageReportAsRepairedHandler(getDamageDependencies(this), reportId, repair);
};

ChurchToolsStorageProvider.prototype.updateDamageReport = async function updateDamageReport(
  this: ProviderWithDamageSupport,
  reportId: string,
  updates: Partial<DamageReportRecord>,
): Promise<DamageReportRecord> {
  return updateDamageReportHandler(getDamageDependencies(this), reportId, updates);
};

ChurchToolsStorageProvider.prototype.deleteDamageReport = async function deleteDamageReport(
  this: ProviderWithDamageSupport,
  reportId: string,
): Promise<void> {
  await deleteDamageReportHandler(getDamageDependencies(this), reportId);
};
