import { describe, it, expect, beforeEach } from 'vitest'
import { ChurchToolsStorageProvider } from '../../../services/storage/ChurchToolsProvider'
import type { ChurchToolsAPIClient } from '../../../services/api/ChurchToolsAPIClient'
import type { AssetCreate, AssetGroupCreate } from '../../../types/entities'
import { CURRENT_SCHEMA_VERSION } from '../../../services/migrations/constants'

class MockChurchToolsAPIClient implements Partial<ChurchToolsAPIClient> {
  private categories = new Map<string, Record<string, unknown>>()
  private dataValues = new Map<string, Map<string, { id: string; dataCategoryId: number; value: string }>>()
  private categoryCounter = 0

  async getCurrentUser() {
    return {
      id: 'user-1',
      firstName: 'Test',
      lastName: 'User',
      name: 'Test User',
      email: 'user@example.com',
      phoneNumber: undefined,
    }
  }

  addCategory(category: Record<string, unknown>) {
    const id = String(category.id ?? ++this.categoryCounter)
    const payload = {
      id,
      name: 'Unnamed',
      shorty: 'category',
      description: '',
      data: null,
      customModuleId: 1,
      ...category,
    }
    this.categories.set(id, payload)
    if (!this.dataValues.has(id)) {
      this.dataValues.set(id, new Map())
    }
    return payload
  }

  async getDataCategories(): Promise<unknown[]> {
    return Array.from(this.categories.values()).map(category => ({ ...category }))
  }

  async createDataCategory(_: string, data: Record<string, unknown>): Promise<unknown> {
    const created = this.addCategory({ ...data, id: ++this.categoryCounter })
    return { ...created }
  }

  async createDataValue(_: string, categoryId: string, data: { value: string }): Promise<unknown> {
    const valuesForCategory = this.ensureCategoryValues(categoryId)
    const id = String(valuesForCategory.size + 1)
    const stored = { id, dataCategoryId: Number(categoryId), value: data.value }
    valuesForCategory.set(id, stored)
    return { ...stored }
  }

  async updateDataValue(_: string, categoryId: string, valueId: string, data: { value: string }): Promise<unknown> {
    const valuesForCategory = this.ensureCategoryValues(categoryId)
    const existing = valuesForCategory.get(valueId)
    if (!existing) {
      throw new Error(`Value ${valueId} not found in category ${categoryId}`)
    }
    const updated = { ...existing, value: data.value }
    valuesForCategory.set(valueId, updated)
    return { ...updated }
  }

  async getDataValues(_: string, categoryId: string): Promise<unknown[]> {
    const values = this.ensureCategoryValues(categoryId)
    return Array.from(values.values()).map(value => ({ ...value }))
  }

  async deleteDataValue(_: string, categoryId: string, valueId: string): Promise<void> {
    const values = this.ensureCategoryValues(categoryId)
    values.delete(valueId)
  }

  private ensureCategoryValues(categoryId: string) {
    if (!this.dataValues.has(categoryId)) {
      this.dataValues.set(categoryId, new Map())
    }
    return this.dataValues.get(categoryId) as Map<string, { id: string; dataCategoryId: number; value: string }>
  }
}

const MODULE_ID = '1'
const ASSET_CATEGORY_ID = 'asset-cat-1'

describe('ChurchToolsStorageProvider - Asset Groups', () => {
  let client: MockChurchToolsAPIClient
  let provider: ChurchToolsStorageProvider

  beforeEach(() => {
    client = new MockChurchToolsAPIClient()
    client.addCategory({
      id: ASSET_CATEGORY_ID,
      name: 'Audio Equipment',
      shorty: 'audio',
      description: '',
      data: JSON.stringify([]),
      customModuleId: Number(MODULE_ID),
    })

    provider = new ChurchToolsStorageProvider(MODULE_ID, client as unknown as ChurchToolsAPIClient)
  })

  async function createAsset(overrides: Partial<AssetCreate> = {}) {
    return provider.createAsset({
      name: overrides.name ?? 'Test Asset',
      manufacturer: overrides.manufacturer ?? 'Shure',
      model: overrides.model ?? 'SM58',
      description: overrides.description ?? 'Asset description',
      status: overrides.status ?? 'available',
      location: overrides.location ?? 'Warehouse',
      bookable: overrides.bookable ?? true,
      category: overrides.category ?? { id: ASSET_CATEGORY_ID, name: 'Audio Equipment' },
      customFieldValues: overrides.customFieldValues ?? {},
      isParent: overrides.isParent ?? false,
      childAssetIds: overrides.childAssetIds ?? [],
      assetGroup: overrides.assetGroup,
      fieldSources: overrides.fieldSources,
    })
  }

  async function createGroup(overrides: Partial<AssetGroupCreate> = {}) {
    return provider.createAssetGroup({
      groupNumber: overrides.groupNumber ?? 'AG-900',
      name: overrides.name ?? 'Test Group',
      category: overrides.category ?? { id: ASSET_CATEGORY_ID, name: 'Audio Equipment' },
      manufacturer: overrides.manufacturer,
      model: overrides.model,
      description: overrides.description,
      inheritanceRules: overrides.inheritanceRules ?? {},
      sharedCustomFields: overrides.sharedCustomFields,
      customFieldRules: overrides.customFieldRules ?? {},
      memberAssetIds: overrides.memberAssetIds,
      memberCount: overrides.memberCount,
      barcode: overrides.barcode,
      barcodeHistory: overrides.barcodeHistory,
      schemaVersion: overrides.schemaVersion,
    })
  }

  it('creates an asset group with default metadata', async () => {
    const group = await provider.createAssetGroup({
      groupNumber: 'AG-001',
      name: 'Wireless Microphones',
      category: { id: ASSET_CATEGORY_ID, name: 'Audio Equipment' },
      inheritanceRules: {},
      customFieldRules: {},
    })

    expect(group.id).toBeDefined()
    expect(group.memberCount).toBe(0)
    expect(group.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(group.category.id).toBe(ASSET_CATEGORY_ID)
  })

  it('adds an asset to a group and tracks membership', async () => {
    const asset = await provider.createAsset({
      name: 'Receiver Pack',
      manufacturer: 'Shure',
      model: 'QLXD',
      description: 'Wireless receiver',
      status: 'available',
      location: 'Rack A',
      bookable: true,
      category: { id: ASSET_CATEGORY_ID, name: 'Audio Equipment' },
      customFieldValues: {},
      isParent: false,
      childAssetIds: [],
    })

    const group = await provider.createAssetGroup({
      groupNumber: 'AG-100',
      name: 'Receiver Kits',
      category: { id: ASSET_CATEGORY_ID, name: 'Audio Equipment' },
      inheritanceRules: {},
      customFieldRules: {},
    })

    const updatedAsset = await provider.addAssetToGroup(asset.id, group.id)
    expect(updatedAsset.assetGroup?.id).toBe(group.id)

    const persistedGroup = await provider.getAssetGroup(group.id)
    expect(persistedGroup?.memberAssetIds).toContain(asset.id)
    expect(persistedGroup?.memberCount).toBe(1)
  })

  it('removes an asset from a group and clears relationship', async () => {
    const asset = await provider.createAsset({
      name: 'Handheld Mic',
      manufacturer: 'Shure',
      model: 'SM58',
      description: 'Vocal mic',
      status: 'available',
      location: 'Case B',
      bookable: true,
      category: { id: ASSET_CATEGORY_ID, name: 'Audio Equipment' },
      customFieldValues: {},
      isParent: false,
      childAssetIds: [],
    })

    const group = await provider.createAssetGroup({
      groupNumber: 'AG-200',
      name: 'Stage Mics',
      category: { id: ASSET_CATEGORY_ID, name: 'Audio Equipment' },
      inheritanceRules: {},
      customFieldRules: {},
      memberAssetIds: [asset.id],
    })

    await provider.addAssetToGroup(asset.id, group.id)
    const clearedAsset = await provider.removeAssetFromGroup(asset.id)

    expect(clearedAsset.assetGroup).toBeUndefined()

    const refreshedGroup = await provider.getAssetGroup(group.id)
    expect(refreshedGroup?.memberAssetIds).not.toContain(asset.id)
    expect(refreshedGroup?.memberCount).toBe(0)
  })

  it('dissolves an asset group and clears member relationships', async () => {
    const asset = await createAsset()
    const group = await createGroup({ groupNumber: 'AG-300', name: 'Portable Rigs' })
    await provider.addAssetToGroup(asset.id, group.id)

    const dissolved = await provider.dissolveAssetGroup(group.id)

    expect(dissolved.memberCount).toBe(0)
    expect(dissolved.memberAssetIds).toHaveLength(0)

    const refreshedAsset = await provider.getAsset(asset.id)
    const refreshedGroup = await provider.getAssetGroup(group.id)
    expect(refreshedAsset.assetGroup).toBeUndefined()
    expect(refreshedGroup?.memberAssetIds).toHaveLength(0)
  })

  it('bulk creates members for a group and updates membership counts', async () => {
    const group = await createGroup({
      groupNumber: 'AG-400',
      name: 'Stage Lights',
      manufacturer: 'Martin',
      inheritanceRules: {
        manufacturer: { inherited: true, overridable: false },
      },
    })

    const created = await provider.bulkCreateAssetsForGroup(group.id, 2, {
      status: 'available',
      bookable: true,
      customFieldValues: {},
    })

    expect(created).toHaveLength(2)
    for (const asset of created) {
      expect(asset.assetGroup?.id).toBe(group.id)
    }

    const refreshedGroup = await provider.getAssetGroup(group.id)
    expect(refreshedGroup?.memberCount).toBe(2)
    expect(refreshedGroup?.memberAssetIds).toHaveLength(2)
  })

  it('bulk updates member assets and clears inheritance overrides when requested', async () => {
    const group = await createGroup({
      groupNumber: 'AG-500',
      name: 'Camera Kits',
      manufacturer: 'Sony',
      inheritanceRules: {
        manufacturer: { inherited: true, overridable: true },
      },
    })

    const members = await provider.bulkCreateAssetsForGroup(group.id, 2, {
      status: 'available',
      bookable: true,
      customFieldValues: {},
    })

    await provider.updateAsset(members[0].id, {
      manufacturer: 'Panasonic',
      fieldSources: { manufacturer: 'override' },
    })

    await provider.bulkUpdateGroupMembers(group.id, { status: 'in-use', location: 'Main Stage' })

    const updatedMembers = await Promise.all(members.map((member) => provider.getAsset(member.id)))
    updatedMembers.forEach((asset) => {
      expect(asset.status).toBe('in-use')
      expect(asset.location).toBe('Main Stage')
    })

    await provider.bulkUpdateGroupMembers(group.id, {}, { clearOverrides: true })

    const clearedMember = await provider.getAsset(members[0].id)
    expect(clearedMember.fieldSources?.manufacturer).toBe('group')
    expect(clearedMember.manufacturer).toBe(group.manufacturer)
  })

  it('reassigns an asset to a different group', async () => {
    const sourceGroup = await createGroup({ groupNumber: 'AG-600', name: 'Audio Packs' })
    const targetGroup = await createGroup({ groupNumber: 'AG-601', name: 'Backup Packs' })
    const asset = await createAsset()

    await provider.addAssetToGroup(asset.id, sourceGroup.id)

    const reassigned = await provider.reassignAssetToGroup(asset.id, targetGroup.id)

    expect(reassigned.assetGroup?.id).toBe(targetGroup.id)

    const refreshedSource = await provider.getAssetGroup(sourceGroup.id)
    const refreshedTarget = await provider.getAssetGroup(targetGroup.id)
    expect(refreshedSource?.memberAssetIds).not.toContain(asset.id)
    expect(refreshedTarget?.memberAssetIds).toContain(asset.id)
  })

  it('resolves asset field values with inheritance awareness', async () => {
    const group = await createGroup({
      groupNumber: 'AG-700',
      name: 'Wireless Receivers',
      manufacturer: 'Sennheiser',
      inheritanceRules: {
        manufacturer: { inherited: true, overridable: false },
      },
    })

    const asset = await createAsset()
    await provider.addAssetToGroup(asset.id, group.id)

    const manufacturerResolution = await provider.resolveAssetFieldValue(asset.id, 'manufacturer')
    const statusResolution = await provider.resolveAssetFieldValue(asset.id, 'status')

    expect(manufacturerResolution.source).toBe('group')
    expect(manufacturerResolution.value).toBe('Sennheiser')
    expect(statusResolution.source).toBe('local')
    expect(statusResolution.value).toBe('available')
  })
})
