import type { ChurchToolsAPIClient } from '../../api/ChurchToolsAPIClient'
import type {
  Asset,
  AssetType,
  AssetGroup,
  ChangeHistoryEntry,
  CustomFieldDefinition,
} from '../../../types/entities'
import { normalizeCategoryIconValue } from '../../../utils/iconMigrationMap'

interface AssetTypeStoragePayload {
  customFields: CustomFieldDefinition[]
  assetNameTemplate?: string
  mainImage?: string | null
}

function parseAssetTypeData(data: unknown): AssetTypeStoragePayload {
  if (typeof data !== 'string' || data.trim().length === 0) {
    return { customFields: [] }
  }

  try {
    const parsed = JSON.parse(data) as unknown

    if (Array.isArray(parsed)) {
      return {
        customFields: parsed as CustomFieldDefinition[],
      }
    }

    if (parsed && typeof parsed === 'object') {
      const payload = parsed as Partial<AssetTypeStoragePayload>
      const customFields = Array.isArray(payload.customFields)
        ? (payload.customFields as CustomFieldDefinition[])
        : []
      const assetNameTemplate = typeof payload.assetNameTemplate === 'string' ? payload.assetNameTemplate : undefined
      const mainImage = typeof payload.mainImage === 'string' ? payload.mainImage : undefined

      return {
        customFields,
        assetNameTemplate,
        mainImage,
      }
    }
  } catch (error) {
    console.error('Error parsing category data:', error)
  }

  return { customFields: [] }
}

export class ChurchToolsStorageProvider {
  public readonly moduleId: string
  public readonly apiClient: ChurchToolsAPIClient
  public readonly globalPrefix = 'CHT'

  constructor(moduleId: string, apiClient: ChurchToolsAPIClient) {
    this.moduleId = moduleId
    this.apiClient = apiClient
  }

  public async getAllAssetTypesIncludingHistory(): Promise<AssetType[]> {
    const assetTypes = await this.apiClient.getDataCategories(this.moduleId)
    return assetTypes.map((category: unknown) => this.mapToAssetType(category))
  }

  public async getAllCategoriesIncludingHistory(): Promise<AssetType[]> {
    return this.getAllAssetTypesIncludingHistory()
  }

  public mapToAssetType(data: unknown): AssetType {
    const raw = data as Record<string, unknown>
  const parsedData = parseAssetTypeData(raw['data'])
    const customFields = parsedData.customFields ?? []
    const assetNameTemplate = parsedData.assetNameTemplate
    const mainImage = parsedData.mainImage ?? undefined

    const rawIcon = typeof raw['description'] === 'string' ? (raw['description'] as string).trim() : undefined
    const normalizedIcon = rawIcon ? normalizeCategoryIconValue(rawIcon) ?? rawIcon : undefined

    return {
      id: String(raw['id']),
      name: raw['name'] as string,
      icon: normalizedIcon ?? rawIcon,
      customFields,
      assetNameTemplate,
      mainImage,
      createdBy: (raw['createdBy'] || 'system') as string,
      createdByName: (raw['createdByName'] || 'System') as string,
      createdAt: (raw['createdAt'] || new Date().toISOString()) as string,
      lastModifiedBy: (raw['lastModifiedBy'] || 'system') as string,
      lastModifiedByName: (raw['lastModifiedByName'] || 'System') as string,
      lastModifiedAt: (raw['lastModifiedAt'] || new Date().toISOString()) as string,
    }
  }

  public mapToAsset(data: unknown, assetType: AssetType): Asset {
    const raw = data as Record<string, unknown>
    let asset: Record<string, unknown>

    if (raw['value'] && typeof raw['value'] === 'string') {
      try {
        asset = JSON.parse(raw['value']) as Record<string, unknown>
        asset['id'] = String(raw['id'])
      } catch {
        asset = raw
      }
    } else {
      asset = raw
    }

    const childAssetIdsValue = asset['childAssetIds']
    const childAssetIds = Array.isArray(childAssetIdsValue)
      ? (childAssetIdsValue as unknown[]).map((id) => String(id))
      : undefined

    const assetGroupDirect = asset['assetGroup'] as Asset['assetGroup'] | undefined
    const assetGroupFromFields = asset['assetGroupId']
      ? {
          id: String(asset['assetGroupId']),
          groupNumber: asset['assetGroupNumber'] ? String(asset['assetGroupNumber']) : undefined,
          name: asset['assetGroupName'] ? String(asset['assetGroupName']) : '',
        }
      : undefined
    const assetGroup = assetGroupDirect ?? assetGroupFromFields

    const fieldSources = asset['fieldSources'] as Asset['fieldSources']

    return {
      id: String(asset['id']),
      assetNumber: asset['assetNumber'] as string,
      name: asset['name'] as string,
      description: asset['description'] as string | undefined,
      mainImage: typeof asset['mainImage'] === 'string' ? (asset['mainImage'] as string) : undefined,
      assetType: {
        id: assetType.id,
        name: assetType.name,
        icon: assetType.icon,
      },
      manufacturer: asset['manufacturer'] as string | undefined,
      model: asset['model'] as string | undefined,
      status: (asset['status'] as Asset['status']) || 'available',
      location: asset['location'] as string | undefined,
  currentAssignmentId: asset['currentAssignmentId'] ? String(asset['currentAssignmentId']) : undefined,
      inUseBy:
        asset['inUseBy'] && typeof asset['inUseBy'] === 'object'
          ? (asset['inUseBy'] as Asset['inUseBy'])
          : undefined,
      barcode: asset['barcode'] as string,
      qrCode: asset['qrCode'] as string,
      barcodeHistory: asset['barcodeHistory'] as Asset['barcodeHistory'],
      customFieldValues: (asset['customFieldValues'] || {}) as Record<string, string | number | boolean | string[]>,
      parentAssetId: asset['parentAssetId'] ? String(asset['parentAssetId']) : undefined,
      childAssetIds,
      assetGroup,
      fieldSources,
      isParent: ((asset['isParent'] as boolean | undefined) !== undefined ? (asset['isParent'] as boolean) : false),
      bookable: ((asset['bookable'] as boolean | undefined) !== undefined ? (asset['bookable'] as boolean) : true),
      createdBy: asset['createdBy'] as string,
      createdByName: asset['createdByName'] as string,
      createdAt: asset['createdAt'] as string,
      lastModifiedBy: asset['lastModifiedBy'] as string,
      lastModifiedByName: asset['lastModifiedByName'] as string,
      lastModifiedAt: asset['lastModifiedAt'] as string,
      schemaVersion: asset['schemaVersion'] as string | undefined,
    }
  }

  public cleanObjectForDisplay(obj: unknown): unknown {
    if (obj === null || obj === undefined) return undefined
    if (typeof obj !== 'object') return obj

    if (Array.isArray(obj)) {
      return obj.map((item) => this.cleanObjectForDisplay(item)).filter((item) => item !== undefined)
    }

    const cleaned: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (value !== null && value !== undefined) {
        const cleanedValue = this.cleanObjectForDisplay(value)
        if (cleanedValue !== undefined) {
          cleaned[key] = cleanedValue
        }
      }
    }
    return cleaned
  }

  public formatFieldValue(value: unknown): string {
    if (value === null || value === undefined) {
      return ''
    }
    if (typeof value === 'object') {
      if ('personName' in (value as Record<string, unknown>)) {
        return String((value as Record<string, unknown>)['personName'])
      }
      if ('name' in (value as Record<string, unknown>) && 'id' in (value as Record<string, unknown>)) {
        return String((value as Record<string, unknown>)['name'])
      }
      const cleaned = this.cleanObjectForDisplay(value)
      const json = JSON.stringify(cleaned)
      if (json === '{}' || json === '[]') {
        return ''
      }
      return json
    }
    return String(value)
  }

  public valuesAreEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true
    if (a === null || a === undefined || b === null || b === undefined) return false
    if (typeof a !== typeof b) return false
    if (typeof a !== 'object') return a === b

    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false
      return a.every((val, idx) => this.valuesAreEqual(val, b[idx]))
    }

    const aObj = a as Record<string, unknown>
    const bObj = b as Record<string, unknown>
    const aKeys = Object.keys(aObj).filter((key) => aObj[key] !== null && aObj[key] !== undefined)
    const bKeys = Object.keys(bObj).filter((key) => bObj[key] !== null && bObj[key] !== undefined)

    if (aKeys.length !== bKeys.length) return false

    for (const key of aKeys) {
      if (!bKeys.includes(key)) return false
      if (!this.valuesAreEqual(aObj[key], bObj[key])) return false
    }

    return true
  }

  public formatGroupIdentifier(group: AssetGroup): string {
    const identifierParts = [group.groupNumber?.trim(), group.name?.trim()].filter(
      (part): part is string => Boolean(part && part.length > 0),
    )

    const base = identifierParts.join(' - ')
    return base.length > 0 ? `${base} (#${group.id})` : `Group #${group.id}`
  }

  public async getOrCreateHistoryAssetType(): Promise<AssetType> {
  const assetTypes = await this.getAllAssetTypesIncludingHistory()
  let historyAssetType = assetTypes.find((category) => category.name === '__ChangeHistory__')

    if (!historyAssetType) {
      const shortSuffix = Date.now().toString().slice(-4)
      const categoryData = {
        customModuleId: Number(this.moduleId),
        name: '__ChangeHistory__',
        shorty: `__changehistory___${shortSuffix}`,
        description: 'history',
        data: null,
      }

      const created = await this.apiClient.createDataCategory(this.moduleId, categoryData)
      historyAssetType = this.mapToAssetType(created)
    }

    return historyAssetType
  }

  public async getChangeHistory(
    _entityType: ChangeHistoryEntry['entityType'],
    _entityId: string,
    _limit?: number,
  ): Promise<ChangeHistoryEntry[]> {
    throw new Error('getChangeHistory is not registered for ChurchToolsStorageProvider')
  }

  public async recordChange(_entry: Omit<ChangeHistoryEntry, 'id' | 'changedAt'>): Promise<void> {
    throw new Error('recordChange is not registered for ChurchToolsStorageProvider')
  }
}
