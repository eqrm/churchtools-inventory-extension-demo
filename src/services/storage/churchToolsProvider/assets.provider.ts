import type {
  Asset,
  AssetType,
  AssetCreate,
  AssetFilters,
  AssetUpdate,
  Booking,
} from '../../../types/entities'
import type { AssetDependencies } from './assets'
import {
  createAsset as createAssetHandler,
  deleteAsset as deleteAssetHandler,
  getAsset as getAssetHandler,
  getAssetByNumber as getAssetByNumberHandler,
  getAssets as getAssetsHandler,
  updateAsset as updateAssetHandler,
} from './assets'
import { generateNextAssetNumber } from '../../../utils/assetNumbers'
import { CURRENT_SCHEMA_VERSION } from '../../migrations/constants'
import { ChurchToolsStorageProvider } from './core'

declare module './core' {
  interface ChurchToolsStorageProvider {
    getAssets(filters?: AssetFilters): Promise<Asset[]>
    getAsset(id: string): Promise<Asset>
    getAssetByNumber(assetNumber: string): Promise<Asset>
    createAsset(data: AssetCreate): Promise<Asset>
    updateAsset(id: string, data: AssetUpdate): Promise<Asset>
    deleteAsset(id: string): Promise<void>
    createMultiAsset(parentData: AssetCreate, quantity: number): Promise<Asset[]>
    regenerateAssetBarcode(id: string, reason?: string, customBarcode?: string): Promise<Asset>
    searchAssets(query: string): Promise<Asset[]>
  }
}

type ProviderWithAssetSupport = ChurchToolsStorageProvider & {
  getAssetTypes: () => Promise<AssetType[]>
  getAssetType: (id: string) => Promise<AssetType>
  getAssetPrefix: (id: string) => Promise<import('../../../types/entities').AssetPrefix>
  incrementPrefixSequence: (id: string) => Promise<number>
  getBookingsForAsset: (
    assetId: string,
    dateRange?: { start: string; end: string },
  ) => Promise<Booking[]>
}

function getAssetDependencies(provider: ProviderWithAssetSupport): AssetDependencies {
  return {
    moduleId: provider.moduleId,
    globalPrefix: provider.globalPrefix,
    apiClient: provider.apiClient,
    getAssetTypes: provider.getAssetTypes.bind(provider),
    getAssetType: provider.getAssetType.bind(provider),
    getAssetPrefix: provider.getAssetPrefix.bind(provider),
    incrementPrefixSequence: provider.incrementPrefixSequence.bind(provider),
    recordChange: provider.recordChange.bind(provider),
    valuesAreEqual: provider.valuesAreEqual.bind(provider),
    formatFieldValue: provider.formatFieldValue.bind(provider),
    mapToAsset: provider.mapToAsset.bind(provider),
    getBookingsForAsset: provider.getBookingsForAsset.bind(provider),
  }
}

ChurchToolsStorageProvider.prototype.getAssets = async function getAssets(
  this: ProviderWithAssetSupport,
  filters?: AssetFilters,
): Promise<Asset[]> {
  return getAssetsHandler(getAssetDependencies(this), filters)
}

ChurchToolsStorageProvider.prototype.getAsset = async function getAsset(
  this: ProviderWithAssetSupport,
  id: string,
): Promise<Asset> {
  return getAssetHandler(getAssetDependencies(this), id)
}

ChurchToolsStorageProvider.prototype.getAssetByNumber = async function getAssetByNumber(
  this: ProviderWithAssetSupport,
  assetNumber: string,
): Promise<Asset> {
  return getAssetByNumberHandler(getAssetDependencies(this), assetNumber)
}

ChurchToolsStorageProvider.prototype.createAsset = async function createAsset(
  this: ProviderWithAssetSupport,
  data: AssetCreate,
): Promise<Asset> {
  return createAssetHandler(getAssetDependencies(this), data)
}

ChurchToolsStorageProvider.prototype.updateAsset = async function updateAsset(
  this: ProviderWithAssetSupport,
  id: string,
  data: AssetUpdate,
): Promise<Asset> {
  return updateAssetHandler(getAssetDependencies(this), id, data)
}

ChurchToolsStorageProvider.prototype.deleteAsset = async function deleteAsset(
  this: ProviderWithAssetSupport,
  id: string,
): Promise<void> {
  await deleteAssetHandler(getAssetDependencies(this), id)
}

ChurchToolsStorageProvider.prototype.createMultiAsset = async function createMultiAsset(
  this: ProviderWithAssetSupport,
  parentData: AssetCreate,
  quantity: number,
): Promise<Asset[]> {
  if (quantity < 2) {
    throw new Error('Quantity must be at least 2 for multi-asset creation')
  }
  if (quantity > 100) {
    throw new Error('Quantity must not exceed 100 assets')
  }

  const user = await this.apiClient.getCurrentUser()
  const assetType = await this.getAssetType(parentData.assetType.id)
  const userName = `${user.firstName} ${user.lastName}`

  const baseNumber = await generateBaseNumberForMultiAsset(this)
  const childIds = generateChildIds(quantity)

  const parent = await createParentAsset({
    provider: this,
    assetType,
    baseNumber,
    childIds,
    data: parentData,
    userId: user.id,
    userName,
  })

  const children = await createChildAssets({
    provider: this,
    assetType,
    baseNumber,
    parentId: parent.id,
    quantity,
    data: parentData,
    userId: user.id,
    userName,
  })

  return [parent, ...children]
}

ChurchToolsStorageProvider.prototype.regenerateAssetBarcode = async function regenerateAssetBarcode(
  this: ProviderWithAssetSupport,
  id: string,
  reason?: string,
  customBarcode?: string,
): Promise<Asset> {
  const user = await this.apiClient.getCurrentUser()
  const asset = await this.getAsset(id)

  const historyEntry = {
    barcode: asset.barcode,
    generatedAt: asset.lastModifiedAt,
    generatedBy: asset.lastModifiedBy,
    generatedByName: asset.lastModifiedByName,
    reason,
  }

  const barcodeHistory = [...(asset.barcodeHistory ?? []), historyEntry]

  let newBarcode: string
  if (customBarcode) {
    const allAssets = await this.getAssets()
    const duplicate = allAssets.find((existing) => existing.barcode === customBarcode && existing.id !== id)
    if (duplicate) {
      throw new Error(`Barcode "${customBarcode}" is already used by asset ${duplicate.assetNumber}`)
    }
    newBarcode = customBarcode
  } else {
    const timestamp = Date.now().toString()
    newBarcode = `${asset.assetNumber}-${timestamp.substring(timestamp.length - 6)}`
  }

  const updatedAsset = await this.updateAsset(id, {
    barcode: newBarcode,
    barcodeHistory,
  })

  await this.recordChange({
    entityType: 'asset',
    entityId: id,
    entityName: asset.name,
    action: 'updated',
    changes: [
      {
        field: 'barcode',
        oldValue: asset.barcode,
        newValue: newBarcode,
      },
    ],
    changedBy: user.id,
    changedByName: `${user.firstName} ${user.lastName}`,
  })

  return updatedAsset
}

ChurchToolsStorageProvider.prototype.searchAssets = async function searchAssets(): Promise<Asset[]> {
  throw new Error('Asset search not implemented - Phase 4 (US4)')
}

async function generateBaseNumberForMultiAsset(provider: ProviderWithAssetSupport): Promise<string> {
  const assets = await provider.getAssets()
  const existingNumbers = assets.map((asset) => asset.assetNumber.replace(`${provider.globalPrefix}-`, ''))
  return generateNextAssetNumber(existingNumbers)
}

function generateChildIds(quantity: number): string[] {
  const ids: string[] = []
  for (let index = 0; index < quantity; index += 1) {
    ids.push(crypto.randomUUID())
  }
  return ids
}

async function createParentAsset(params: {
  provider: ProviderWithAssetSupport
  assetType: AssetType
  baseNumber: string
  childIds: string[]
  data: AssetCreate
  userId: string
  userName: string
}): Promise<Asset> {
  const { provider, assetType, baseNumber, childIds, data, userId, userName } = params
  const assetNumber = `${provider.globalPrefix}-${baseNumber}`
  const now = new Date().toISOString()

  const includeMainImage = Object.prototype.hasOwnProperty.call(data, 'mainImage')

  const assetData = {
    assetNumber,
    name: data.name,
    description: data.description,
    manufacturer: data.manufacturer,
    model: data.model,
    status: data.status,
    location: data.location,
    inUseBy: data.inUseBy,
    barcode: assetNumber,
    qrCode: assetNumber,
    barcodeHistory: [],
    isParent: true,
    parentAssetId: undefined,
    childAssetIds: childIds,
    customFieldValues: data.customFieldValues,
  mainImage: includeMainImage ? data.mainImage ?? null : undefined,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    createdBy: userId,
    createdByName: userName,
    createdAt: now,
    lastModifiedBy: userId,
    lastModifiedByName: userName,
    lastModifiedAt: now,
  }

  const payload = {
    dataCategoryId: Number(assetType.id),
    value: JSON.stringify(assetData),
  }

  const created = await provider.apiClient.createDataValue(provider.moduleId, assetType.id, payload)
  return provider.mapToAsset(created, assetType)
}

async function createChildAssets(params: {
  provider: ProviderWithAssetSupport
  assetType: AssetType
  baseNumber: string
  parentId: string
  quantity: number
  data: AssetCreate
  userId: string
  userName: string
}): Promise<Asset[]> {
  const { provider, assetType, baseNumber, parentId, quantity, data, userId, userName } = params
  const children: Asset[] = []

  for (let index = 1; index <= quantity; index += 1) {
    const childNumber = String(parseInt(baseNumber, 10) + index).padStart(3, '0')
    const childAssetNumber = `${provider.globalPrefix}-${childNumber}`
    const now = new Date().toISOString()
    const includeMainImage = Object.prototype.hasOwnProperty.call(data, 'mainImage')

    const childData = {
      assetNumber: childAssetNumber,
      name: `${data.name} #${index}`,
      description: data.description,
      manufacturer: data.manufacturer,
      model: data.model,
      status: data.status,
      location: data.location,
      inUseBy: data.inUseBy,
      barcode: childAssetNumber,
      qrCode: childAssetNumber,
      barcodeHistory: [],
      isParent: false,
      parentAssetId: parentId,
      childAssetIds: [],
      customFieldValues: { ...(data.customFieldValues ?? {}) },
  mainImage: includeMainImage ? data.mainImage ?? null : undefined,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      createdBy: userId,
      createdByName: userName,
      createdAt: now,
      lastModifiedBy: userId,
      lastModifiedByName: userName,
      lastModifiedAt: now,
    }

    const payload = {
      dataCategoryId: Number(assetType.id),
      value: JSON.stringify(childData),
    }

    const created = await provider.apiClient.createDataValue(provider.moduleId, assetType.id, payload)
    const child = provider.mapToAsset(created, assetType)
    children.push(child)
  }

  return children
}
