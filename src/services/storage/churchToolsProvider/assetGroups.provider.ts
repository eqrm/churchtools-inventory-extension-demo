import type {
  Asset,
  AssetCreate,
  AssetGroup,
  AssetGroupCreate,
  AssetGroupFilters,
  AssetGroupUpdate,
  AssetUpdate,
  BarcodeHistoryEntry,
} from '../../../types/entities'
import type { AssetGroupDependencies } from './assetGroups'
import {
  bulkCreateAssetsForGroup as bulkCreateAssetsForGroupHandler,
  bulkUpdateGroupMembers as bulkUpdateGroupMembersHandler,
  createAssetGroup as createAssetGroupHandler,
  deleteAssetGroup as deleteAssetGroupHandler,
  dissolveAssetGroup as dissolveAssetGroupHandler,
  getAssetGroup as getAssetGroupHandler,
  getAssetGroups as getAssetGroupsHandler,
  reassignAssetToGroup as reassignAssetToGroupHandler,
  resolveAssetFieldValue as resolveAssetFieldValueHandler,
  updateAssetGroup as updateAssetGroupHandler,
} from './assetGroups'
import { ChurchToolsStorageProvider } from './core'

declare module './core' {
  interface ChurchToolsStorageProvider {
    getAssetGroups(filters?: AssetGroupFilters): Promise<AssetGroup[]>
    getAssetGroup(id: string): Promise<AssetGroup | null>
    createAssetGroup(data: AssetGroupCreate): Promise<AssetGroup>
    updateAssetGroup(id: string, data: AssetGroupUpdate): Promise<AssetGroup>
    deleteAssetGroup(id: string, options?: { reassignAssets?: boolean }): Promise<void>
    addAssetToGroup(assetId: string, groupId: string): Promise<Asset>
    removeAssetFromGroup(assetId: string): Promise<Asset>
    dissolveAssetGroup(id: string): Promise<AssetGroup>
    regenerateAssetGroupBarcode(id: string, reason?: string, customBarcode?: string): Promise<AssetGroup>
    reassignAssetToGroup(assetId: string, targetGroupId: string): Promise<Asset>
    bulkCreateAssetsForGroup(
      groupId: string,
      count: number,
      baseData?: Partial<AssetCreate>,
    ): Promise<Asset[]>
    bulkUpdateGroupMembers(
      groupId: string,
      update: AssetUpdate,
      options?: { clearOverrides?: boolean },
    ): Promise<Asset[]>
    getGroupMembers(groupId: string): Promise<Asset[]>
    resolveAssetFieldValue(
      assetId: string,
      fieldKey: string,
    ): Promise<{ value: unknown; source: 'group' | 'local' | 'override' }>
  }
}

type ProviderWithAssetGroupSupport = ChurchToolsStorageProvider & {
  getAsset: (id: string) => Promise<Asset>
  getAssets: () => Promise<Asset[]>
  createAsset: (data: AssetCreate) => Promise<Asset>
  updateAsset: (id: string, data: AssetUpdate) => Promise<Asset>
}

function getAssetGroupDependencies(provider: ProviderWithAssetGroupSupport): AssetGroupDependencies {
  return {
    moduleId: provider.moduleId,
    apiClient: provider.apiClient,
    getAllAssetTypesIncludingHistory: provider.getAllAssetTypesIncludingHistory.bind(provider),
    mapToAssetType: provider.mapToAssetType.bind(provider),
    recordChange: provider.recordChange.bind(provider),
    valuesAreEqual: provider.valuesAreEqual.bind(provider),
    formatFieldValue: provider.formatFieldValue.bind(provider),
    formatGroupIdentifier: provider.formatGroupIdentifier.bind(provider),
    getAsset: provider.getAsset.bind(provider),
    createAsset: provider.createAsset.bind(provider),
    updateAsset: provider.updateAsset.bind(provider),
  }
}

ChurchToolsStorageProvider.prototype.getAssetGroups = async function getAssetGroups(
  this: ProviderWithAssetGroupSupport,
  filters?: AssetGroupFilters,
): Promise<AssetGroup[]> {
  return getAssetGroupsHandler(getAssetGroupDependencies(this), filters)
}

ChurchToolsStorageProvider.prototype.getAssetGroup = async function getAssetGroup(
  this: ProviderWithAssetGroupSupport,
  id: string,
): Promise<AssetGroup | null> {
  return getAssetGroupHandler(getAssetGroupDependencies(this), id)
}

ChurchToolsStorageProvider.prototype.createAssetGroup = async function createAssetGroup(
  this: ProviderWithAssetGroupSupport,
  data: AssetGroupCreate,
): Promise<AssetGroup> {
  return createAssetGroupHandler(getAssetGroupDependencies(this), data)
}

ChurchToolsStorageProvider.prototype.updateAssetGroup = async function updateAssetGroup(
  this: ProviderWithAssetGroupSupport,
  id: string,
  data: AssetGroupUpdate,
): Promise<AssetGroup> {
  return updateAssetGroupHandler(getAssetGroupDependencies(this), id, data)
}

ChurchToolsStorageProvider.prototype.deleteAssetGroup = async function deleteAssetGroup(
  this: ProviderWithAssetGroupSupport,
  id: string,
  options?: { reassignAssets?: boolean },
): Promise<void> {
  await deleteAssetGroupHandler(getAssetGroupDependencies(this), id, options)
}

ChurchToolsStorageProvider.prototype.addAssetToGroup = async function addAssetToGroup(
  this: ProviderWithAssetGroupSupport,
  assetId: string,
  groupId: string,
): Promise<Asset> {
  const [asset, group] = await Promise.all([
    this.getAsset(assetId),
    this.getAssetGroup(groupId),
  ])

  if (!group) {
    throw new Error(`Asset group ${groupId} not found`)
  }

  const updatedAsset = await this.updateAsset(asset.id, {
    assetGroup: {
      id: group.id,
      groupNumber: group.groupNumber,
      name: group.name,
    },
  })

  const memberIds = new Set(group.memberAssetIds ?? [])
  memberIds.add(asset.id)

  await this.updateAssetGroup(group.id, {
    memberAssetIds: Array.from(memberIds),
    memberCount: memberIds.size,
  })

  return updatedAsset
}

ChurchToolsStorageProvider.prototype.removeAssetFromGroup = async function removeAssetFromGroup(
  this: ProviderWithAssetGroupSupport,
  assetId: string,
): Promise<Asset> {
  const asset = await this.getAsset(assetId)
  const groupId = asset.assetGroup?.id

  const updatedAsset = await this.updateAsset(asset.id, {
    assetGroup: undefined,
    fieldSources: undefined,
  })

  if (!groupId) {
    return updatedAsset
  }

  const group = await this.getAssetGroup(groupId)
  if (!group) {
    return updatedAsset
  }

  const memberIds = (group.memberAssetIds ?? []).filter((memberId) => memberId !== asset.id)
  await this.updateAssetGroup(group.id, {
    memberAssetIds: memberIds,
    memberCount: memberIds.length,
  })

  return updatedAsset
}

ChurchToolsStorageProvider.prototype.dissolveAssetGroup = async function dissolveAssetGroup(
  this: ProviderWithAssetGroupSupport,
  id: string,
): Promise<AssetGroup> {
  return dissolveAssetGroupHandler(getAssetGroupDependencies(this), id)
}

ChurchToolsStorageProvider.prototype.regenerateAssetGroupBarcode = async function regenerateAssetGroupBarcode(
  this: ProviderWithAssetGroupSupport,
  id: string,
  reason?: string,
  customBarcode?: string,
): Promise<AssetGroup> {
  const group = await this.getAssetGroup(id)
  if (!group) {
    throw new Error(`Asset group ${id} not found`)
  }

  const user = await this.apiClient.getCurrentUser()
  const history = group.barcodeHistory ?? []
  const newBarcode = customBarcode ?? `${group.groupNumber ?? group.name}-${Date.now().toString().slice(-6)}`

  const appendedHistory = group.barcode
    ? [
        ...history,
        {
          barcode: group.barcode,
          generatedAt: new Date().toISOString(),
          generatedBy: user.id,
          generatedByName: `${user.firstName} ${user.lastName}`,
          reason,
        } satisfies BarcodeHistoryEntry,
      ]
    : history

  return this.updateAssetGroup(id, {
    barcode: newBarcode,
    barcodeHistory: appendedHistory,
  })
}

ChurchToolsStorageProvider.prototype.reassignAssetToGroup = async function reassignAssetToGroup(
  this: ProviderWithAssetGroupSupport,
  assetId: string,
  targetGroupId: string,
): Promise<Asset> {
  return reassignAssetToGroupHandler(getAssetGroupDependencies(this), assetId, targetGroupId)
}

ChurchToolsStorageProvider.prototype.bulkCreateAssetsForGroup = async function bulkCreateAssetsForGroup(
  this: ProviderWithAssetGroupSupport,
  groupId: string,
  count: number,
  baseData?: Partial<AssetCreate>,
): Promise<Asset[]> {
  return bulkCreateAssetsForGroupHandler(getAssetGroupDependencies(this), groupId, count, baseData)
}

ChurchToolsStorageProvider.prototype.bulkUpdateGroupMembers = async function bulkUpdateGroupMembers(
  this: ProviderWithAssetGroupSupport,
  groupId: string,
  update: AssetUpdate,
  options?: { clearOverrides?: boolean },
): Promise<Asset[]> {
  return bulkUpdateGroupMembersHandler(getAssetGroupDependencies(this), groupId, update, options)
}

ChurchToolsStorageProvider.prototype.getGroupMembers = async function getGroupMembers(
  this: ProviderWithAssetGroupSupport,
  groupId: string,
): Promise<Asset[]> {
  const assets = await this.getAssets()
  return assets.filter((asset) => asset.assetGroup?.id === groupId)
}

ChurchToolsStorageProvider.prototype.resolveAssetFieldValue = async function resolveAssetFieldValue(
  this: ProviderWithAssetGroupSupport,
  assetId: string,
  fieldKey: string,
): Promise<{ value: unknown; source: 'group' | 'local' | 'override' }> {
  return resolveAssetFieldValueHandler(getAssetGroupDependencies(this), assetId, fieldKey)
}
