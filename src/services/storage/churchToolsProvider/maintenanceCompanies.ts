import type { ChurchToolsAPIClient } from '../../api/ChurchToolsAPIClient';
import type { MaintenanceCompany } from '../../../types/maintenance';
import type { AssetType, ChangeHistoryEntry } from '../../../types/entities';

export interface MaintenanceCompanyDependencies {
  moduleId: string;
  apiClient: ChurchToolsAPIClient;
  mapToAssetType(data: unknown): AssetType;
  recordChange(entry: Omit<ChangeHistoryEntry, 'id' | 'changedAt'>): Promise<void>;
}

type CompanyCategory = { id: string; name: string };

const CATEGORY_NAME = '__MaintenanceCompanies__';

async function getCompaniesCategory(deps: MaintenanceCompanyDependencies): Promise<CompanyCategory> {
  try {
    const categories = await deps.apiClient.getDataCategories(deps.moduleId);
    const match = (categories as Array<{ id: unknown; name?: unknown }>).find(
      (c) => String(c.name) === CATEGORY_NAME,
    );

    if (match && match.id !== undefined) {
      return { id: String(match.id), name: CATEGORY_NAME };
    }
  } catch {
    // fall through to creation path
  }

  const user = await deps.apiClient.getCurrentUser();
  const categoryData = {
    customModuleId: Number(deps.moduleId),
    name: CATEGORY_NAME,
    shorty: `maintenance_companies_${Date.now().toString().slice(-4)}`,
    description: 'System category for maintenance companies',
    data: null,
  };

  const created = await deps.apiClient.createDataCategory(deps.moduleId, categoryData);
  const mapped = deps.mapToAssetType(created);

  await deps.recordChange({
    entityType: 'category',
    entityId: mapped.id,
    action: 'created',
    changedBy: user.id,
    changedByName: `${user.firstName} ${user.lastName}`,
  });

  return { id: String(mapped.id), name: mapped.name };
}

function mapToCompany(raw: unknown): MaintenanceCompany {
  const rv = raw as Record<string, unknown>;
  const dataStr = (rv['value'] || rv['data']) as string | null;
  const parsed = dataStr ? (JSON.parse(dataStr) as Record<string, unknown>) : rv;

  return {
    id: String(rv['id'] ?? parsed['id']),
    name: String(parsed['name'] ?? ''),
    contactPerson: parsed['contactPerson'] ? String(parsed['contactPerson']) : undefined,
    contactEmail: parsed['contactEmail'] ? String(parsed['contactEmail']) : undefined,
    contactPhone: parsed['contactPhone'] ? String(parsed['contactPhone']) : undefined,
    address: String(parsed['address'] ?? ''),
    serviceLevelAgreement: String(parsed['serviceLevelAgreement'] ?? ''),
    hourlyRate: typeof parsed['hourlyRate'] === 'number' ? parsed['hourlyRate'] : parsed['hourlyRate'] ? Number(parsed['hourlyRate']) : undefined,
    contractNotes: String(parsed['contractNotes'] ?? ''),
    createdBy: String(parsed['createdBy'] ?? 'system'),
    createdByName: String(parsed['createdByName'] ?? 'System'),
    createdAt: String(parsed['createdAt'] ?? new Date().toISOString()),
    updatedAt: String(parsed['lastModifiedAt'] ?? new Date().toISOString()),
  } as MaintenanceCompany;
}

declare module './core' {
  interface ChurchToolsStorageProvider {
    getMaintenanceCompanies(): Promise<MaintenanceCompany[]>;
    getMaintenanceCompany(id: string): Promise<MaintenanceCompany | null>;
    createMaintenanceCompany(data: MaintenanceCompany): Promise<MaintenanceCompany>;
    updateMaintenanceCompany(id: string, data: MaintenanceCompany): Promise<MaintenanceCompany>;
    deleteMaintenanceCompany(id: string): Promise<void>;
  }
}

import { ChurchToolsStorageProvider } from './core';

const getDeps = (provider: ChurchToolsStorageProvider) => ({
  moduleId: provider.moduleId,
  apiClient: provider.apiClient,
  mapToAssetType: provider.mapToAssetType.bind(provider),
  recordChange: provider.recordChange.bind(provider),
});

ChurchToolsStorageProvider.prototype.getMaintenanceCompanies = async function getMaintenanceCompanies(this: ChurchToolsStorageProvider) {
  const deps = getDeps(this);
  const category = await getCompaniesCategory(deps);
  const values = await deps.apiClient.getDataValues(deps.moduleId, category.id);
  return values.map((v) => mapToCompany(v));
}

ChurchToolsStorageProvider.prototype.getMaintenanceCompany = async function getMaintenanceCompany(this: ChurchToolsStorageProvider, id: string) {
  const companies = await this.getMaintenanceCompanies();
  return companies.find((c) => c.id === id) ?? null;
}

ChurchToolsStorageProvider.prototype.createMaintenanceCompany = async function createMaintenanceCompany(this: ChurchToolsStorageProvider, data: MaintenanceCompany) {
  const deps = getDeps(this);
  const category = await getCompaniesCategory(deps);
  const user = await deps.apiClient.getCurrentUser();

  const payload = {
    ...data,
    createdBy: user.id,
    createdByName: `${user.firstName} ${user.lastName}`,
    createdAt: new Date().toISOString(),
    lastModifiedAt: new Date().toISOString(),
  };

  const valueData = { dataCategoryId: Number(category.id), value: JSON.stringify(payload) };
  const created = await deps.apiClient.createDataValue(deps.moduleId, category.id, valueData);
  const company = mapToCompany(created);

  await deps.recordChange({ entityType: 'maintenanceCompany', entityId: company.id, action: 'created', changedBy: user.id, changedByName: `${user.firstName} ${user.lastName}` });

  return company;
}

ChurchToolsStorageProvider.prototype.updateMaintenanceCompany = async function updateMaintenanceCompany(this: ChurchToolsStorageProvider, id: string, updates: MaintenanceCompany) {
  const deps = getDeps(this);
  const category = await getCompaniesCategory(deps);
  const existing = await this.getMaintenanceCompany(id);
  if (!existing) throw new Error(`MaintenanceCompany not found: ${id}`);

  const user = await deps.apiClient.getCurrentUser();
  const updatedPayload = { ...existing, ...updates, lastModifiedAt: new Date().toISOString() };
  const valueData = { id: Number(id), dataCategoryId: Number(category.id), value: JSON.stringify(updatedPayload) };
  const updated = await deps.apiClient.updateDataValue(deps.moduleId, category.id, id, valueData);
  const company = mapToCompany(updated);

  await deps.recordChange({ entityType: 'maintenanceCompany', entityId: id, action: 'updated', changedBy: user.id, changedByName: `${user.firstName} ${user.lastName}` });

  return company;
}

ChurchToolsStorageProvider.prototype.deleteMaintenanceCompany = async function deleteMaintenanceCompany(this: ChurchToolsStorageProvider, id: string) {
  const deps = getDeps(this);
  const category = await getCompaniesCategory(deps);
  const user = await deps.apiClient.getCurrentUser();

  await deps.apiClient.deleteDataValue(deps.moduleId, category.id, id);

  await deps.recordChange({ entityType: 'maintenanceCompany', entityId: id, action: 'deleted', changedBy: user.id, changedByName: `${user.firstName} ${user.lastName}` });
}
