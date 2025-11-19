import type { MasterDataEntity, MasterDataItem } from '../../../types/masterData';
import type { MasterDataDependencies, SupportedMasterDataEntity } from './masterData';
import { masterDataHandlers } from './masterData';
import type { MaintenanceCompany } from '../../../types/maintenance';
import { ChurchToolsStorageProvider } from './core';

declare module './core' {
  interface ChurchToolsStorageProvider {
    getMasterDataItems(entity: MasterDataEntity): Promise<MasterDataItem[]>;
    createMasterDataItem(entity: MasterDataEntity, name: string): Promise<MasterDataItem>;
    updateMasterDataItem(entity: MasterDataEntity, id: string, name: string): Promise<MasterDataItem>;
    deleteMasterDataItem(entity: MasterDataEntity, id: string): Promise<void>;
  }
}

function getDependencies(provider: ChurchToolsStorageProvider): MasterDataDependencies {
  return {
    moduleId: provider.moduleId,
    apiClient: provider.apiClient,
    recordChange: provider.recordChange.bind(provider),
  };
}


function assertSupportedEntity(entity: MasterDataEntity): asserts entity is SupportedMasterDataEntity {
  if (!masterDataHandlers.isSupportedEntity(entity)) {
    throw new Error(`Entity ${entity} is not supported by the generic master data handler`);
  }
}

function mapCompanyToMasterData(company: MaintenanceCompany): MasterDataItem {
  return { id: company.id, name: company.name };
}

ChurchToolsStorageProvider.prototype.getMasterDataItems = async function getMasterDataItems(
  this: ChurchToolsStorageProvider,
  entity: MasterDataEntity,
): Promise<MasterDataItem[]> {
  if (entity === 'maintenanceCompanies') {
    const companies = await this.getMaintenanceCompanies();
    return companies.map(mapCompanyToMasterData);
  }

  assertSupportedEntity(entity);
  const deps = getDependencies(this);
  return masterDataHandlers.getAllMasterDataItems(deps, entity);
};

ChurchToolsStorageProvider.prototype.createMasterDataItem = async function createMasterDataItem(
  this: ChurchToolsStorageProvider,
  entity: MasterDataEntity,
  name: string,
): Promise<MasterDataItem> {
  if (entity === 'maintenanceCompanies') {
    const now = new Date().toISOString();
    const created = await this.createMaintenanceCompany({
      id: '',
      name,
      contactPerson: '',
      address: '',
      serviceLevelAgreement: '',
      hourlyRate: undefined,
      contractNotes: '',
      createdBy: '',
      createdByName: '',
      createdAt: now,
      updatedAt: now,
    });
    return mapCompanyToMasterData(created);
  }

  assertSupportedEntity(entity);
  const deps = getDependencies(this);
  return masterDataHandlers.createMasterDataItem(deps, entity, name);
};

ChurchToolsStorageProvider.prototype.updateMasterDataItem = async function updateMasterDataItem(
  this: ChurchToolsStorageProvider,
  entity: MasterDataEntity,
  id: string,
  name: string,
): Promise<MasterDataItem> {
  if (entity === 'maintenanceCompanies') {
    const existing = await this.getMaintenanceCompany(id);
    if (!existing) {
      throw new Error(`Maintenance company ${id} not found`);
    }

    const updated = await this.updateMaintenanceCompany(id, {
      ...existing,
      name,
    });
    return mapCompanyToMasterData(updated);
  }

  assertSupportedEntity(entity);
  const deps = getDependencies(this);
  return masterDataHandlers.updateMasterDataItem(deps, entity, id, name);
};

ChurchToolsStorageProvider.prototype.deleteMasterDataItem = async function deleteMasterDataItem(
  this: ChurchToolsStorageProvider,
  entity: MasterDataEntity,
  id: string,
): Promise<void> {
  if (entity === 'maintenanceCompanies') {
    await this.deleteMaintenanceCompany(id);
    return;
  }

  assertSupportedEntity(entity);
  const deps = getDependencies(this);
  await masterDataHandlers.deleteMasterDataItem(deps, entity, id);
};
