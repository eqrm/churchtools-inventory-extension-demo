import type { MasterDataEntity, MasterDataItem } from '../types/masterData';
import type { IStorageProvider } from '../types/storage';
import { getChurchToolsStorageProvider } from './churchTools/storageProvider';

type ProviderFactory = () => IStorageProvider;

export class MasterDataService {
  private readonly providerFactory: ProviderFactory;

  constructor(providerFactory: ProviderFactory = getChurchToolsStorageProvider) {
    this.providerFactory = providerFactory;
  }

  private get provider(): IStorageProvider {
    return this.providerFactory();
  }

  async list(entity: MasterDataEntity): Promise<MasterDataItem[]> {
    return await this.provider.getMasterDataItems(entity);
  }

  async create(entity: MasterDataEntity, name: string): Promise<MasterDataItem> {
    return await this.provider.createMasterDataItem(entity, name);
  }

  async update(entity: MasterDataEntity, id: string, name: string): Promise<MasterDataItem> {
    return await this.provider.updateMasterDataItem(entity, id, name);
  }

  async remove(entity: MasterDataEntity, id: string): Promise<void> {
    await this.provider.deleteMasterDataItem(entity, id);
  }
}

export const masterDataService = new MasterDataService();
