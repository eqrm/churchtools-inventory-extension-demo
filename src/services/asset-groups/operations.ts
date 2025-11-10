import type {
  Asset,
  AssetCreate,
  AssetGroup,
  AssetGroupCreate,
  AssetGroupInheritanceRule,
  CustomFieldValue,
} from '../../types/entities'
import type { IStorageProvider } from '../../types/storage'
import { getChurchToolsStorageProvider } from '../churchTools/storageProvider'
import {
  DEFAULT_ASSET_GROUP_INHERITANCE_RULES,
  DEFAULT_CUSTOM_FIELD_RULES,
} from './constants'
import { computeFieldSourcesForGroup, deriveSharedCustomFields } from './inheritance'
import {
  ensureAssetCanJoinGroup,
  ensureAssetMatchesGroupAssetType,
  ensurePositiveMemberCount,
} from './validators'
import { resolveNextAssetGroupBarcode } from './numbering'

export interface ConvertAssetToGroupOptions {
  provider?: IStorageProvider
  groupName?: string
  groupNumber?: string
  barcode?: string
  inheritanceRules?: Record<string, AssetGroupInheritanceRule>
  customFieldRules?: Record<string, AssetGroupInheritanceRule>
  sharedCustomFields?: Record<string, CustomFieldValue>
}

export interface ConvertAssetToGroupResult {
  group: AssetGroup
  asset: Asset
}

function mergeRules(
  defaults: Readonly<Record<string, AssetGroupInheritanceRule>>,
  overrides?: Record<string, AssetGroupInheritanceRule>,
): Record<string, AssetGroupInheritanceRule> {
  return { ...defaults, ...(overrides ?? {}) }
}

function shouldInheritField(
  rules: Record<string, AssetGroupInheritanceRule>,
  field: string,
): boolean {
  return Boolean(rules[field]?.inherited)
}

function isCustomFieldValue(value: unknown): value is CustomFieldValue {
  if (value == null) {
    return false
  }

  if (Array.isArray(value)) {
    return value.every((entry) => typeof entry === 'string')
  }

  const valueType = typeof value
  return valueType === 'string' || valueType === 'number' || valueType === 'boolean'
}

function toCustomFieldValues(
  fields: Record<string, unknown> | undefined,
): Record<string, CustomFieldValue> | undefined {
  if (!fields) {
    return undefined
  }

  const entries = Object.entries(fields).filter(([, value]) => isCustomFieldValue(value))
  if (!entries.length) {
    return undefined
  }

  return Object.fromEntries(entries) as Record<string, CustomFieldValue>
}

function getInheritedFieldDefaults(group: AssetGroup): Partial<AssetCreate> {
  const defaults: Partial<AssetCreate> = {}
  const rules = group.inheritanceRules ?? {}

  if (shouldInheritField(rules, 'manufacturer') && group.manufacturer !== undefined) {
    defaults.manufacturer = group.manufacturer
  }

  if (shouldInheritField(rules, 'model') && group.model !== undefined) {
    defaults.model = group.model
  }

  if (shouldInheritField(rules, 'description') && group.description !== undefined) {
    defaults.description = group.description
  }

  return defaults
}

export async function convertAssetToGroup(
  assetId: string,
  options: ConvertAssetToGroupOptions = {},
): Promise<ConvertAssetToGroupResult> {
  const provider = options.provider ?? getChurchToolsStorageProvider()
  const asset = await provider.getAsset(assetId)

  if (!asset) {
    throw new Error('Asset not found')
  }

  ensureAssetCanJoinGroup(asset)

  const inheritanceRules = mergeRules(DEFAULT_ASSET_GROUP_INHERITANCE_RULES, options.inheritanceRules)
  const customFieldRules = mergeRules(DEFAULT_CUSTOM_FIELD_RULES, options.customFieldRules)

  const [groupNumber, barcode] = await Promise.all([
    Promise.resolve(options.groupNumber ?? asset.assetNumber),
    options.barcode ? Promise.resolve(options.barcode) : resolveNextAssetGroupBarcode(provider),
  ])

  const sharedCustomFields = options.sharedCustomFields
    ?? deriveSharedCustomFields(asset.customFieldValues, customFieldRules)

  const groupCreatePayload: AssetGroupCreate = {
    groupNumber: groupNumber?.trim() ? groupNumber.trim() : undefined,
    name: options.groupName ?? asset.name,
    barcode,
    assetType: asset.assetType,
    manufacturer: shouldInheritField(inheritanceRules, 'manufacturer') ? asset.manufacturer : undefined,
    model: shouldInheritField(inheritanceRules, 'model') ? asset.model : undefined,
    description: shouldInheritField(inheritanceRules, 'description') ? asset.description : undefined,
    inheritanceRules,
    customFieldRules,
    sharedCustomFields,
    memberAssetIds: [asset.id],
    memberCount: 1,
  }

  const group = await provider.createAssetGroup(groupCreatePayload)

  const fieldSources = computeFieldSourcesForGroup(group, asset.fieldSources)
  const updatedAsset = await provider.updateAsset(asset.id, {
    assetGroup: {
      id: group.id,
      groupNumber: group.groupNumber,
      name: group.name,
    },
    fieldSources,
  })

  return { group, asset: updatedAsset }
}

export interface CreateGroupMembersOptions {
  provider?: IStorageProvider
  baseData?: Partial<AssetCreate>
  applySharedCustomFields?: boolean
}

export async function createGroupMembers(
  groupId: string,
  count: number,
  options: CreateGroupMembersOptions = {},
): Promise<Asset[]> {
  ensurePositiveMemberCount(count)

  const provider = options.provider ?? getChurchToolsStorageProvider()
  const group = await provider.getAssetGroup(groupId)

  if (!group) {
    throw new Error('Asset group not found')
  }

  const fieldSources = computeFieldSourcesForGroup(group)

  const shouldApplySharedCustomFields = options.applySharedCustomFields !== false
  let customFieldValues = options.baseData?.customFieldValues
  const inheritedDefaults = getInheritedFieldDefaults(group)

  if (shouldApplySharedCustomFields && group.sharedCustomFields) {
    const sharedValues = toCustomFieldValues(group.sharedCustomFields)
    if (sharedValues) {
      customFieldValues = {
        ...sharedValues,
        ...(customFieldValues ?? {}),
      }
    }
  }

  if (options.baseData?.assetType && options.baseData.assetType.id !== group.assetType.id) {
    throw new Error('Base asset data type does not match asset group type')
  }

  const baseData: Partial<AssetCreate> = {
    ...inheritedDefaults,
    ...options.baseData,
    assetType: options.baseData?.assetType ?? group.assetType,
    customFieldValues,
    fieldSources,
    assetGroup: {
      id: group.id,
      groupNumber: group.groupNumber,
      name: group.name,
    },
  }

  const assets = await provider.bulkCreateAssetsForGroup(groupId, count, baseData)
  return assets
}

export interface AddAssetToGroupOptions {
  provider?: IStorageProvider
}

export async function addAssetToGroup(
  assetId: string,
  groupId: string,
  options: AddAssetToGroupOptions = {},
): Promise<Asset> {
  const provider = options.provider ?? getChurchToolsStorageProvider()
  const [asset, group] = await Promise.all([
    provider.getAsset(assetId),
    provider.getAssetGroup(groupId),
  ])

  if (!asset) {
    throw new Error('Asset not found')
  }
  if (!group) {
    throw new Error('Asset group not found')
  }

  ensureAssetCanJoinGroup(asset)
  ensureAssetMatchesGroupAssetType(asset, group)

  const fieldSources = computeFieldSourcesForGroup(group, asset.fieldSources)

  const updatedAsset = await provider.updateAsset(asset.id, {
    assetGroup: {
      id: group.id,
      groupNumber: group.groupNumber,
      name: group.name,
    },
    fieldSources,
  })

  const alreadyMember = group.memberAssetIds.includes(asset.id)
  if (!alreadyMember) {
    const updatedMemberIds = [...group.memberAssetIds, asset.id]
    await provider.updateAssetGroup(group.id, {
      memberAssetIds: updatedMemberIds,
      memberCount: updatedMemberIds.length,
    })
  }

  return updatedAsset
}
