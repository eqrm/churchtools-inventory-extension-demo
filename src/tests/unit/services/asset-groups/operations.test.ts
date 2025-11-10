import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Asset, AssetCreate, AssetGroup, AssetGroupCreate } from '../../../../types/entities'
import type { IStorageProvider } from '../../../../types/storage'
import {
  convertAssetToGroup,
  createGroupMembers,
  addAssetToGroup,
} from '../../../../services/asset-groups/operations'
import { DEFAULT_ASSET_GROUP_INHERITANCE_RULES } from '../../../../services/asset-groups/constants'

const BASE_TIMESTAMP = '2024-01-01T00:00:00Z'
const BASE_ASSET_TYPE = { id: 'assetType-1', name: 'Audio' as const }

function createTestAsset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: 'asset-1',
    assetNumber: 'A-001',
    name: 'Wireless Pack',
    manufacturer: 'Shure',
    model: 'QLXD',
    description: 'Wireless receiver pack',
    assetType: BASE_ASSET_TYPE,
    status: 'available',
    location: 'Warehouse',
    bookable: true,
    isParent: false,
    barcode: '123456',
    qrCode: 'QR-123456',
    customFieldValues: {},
    createdBy: 'user-1',
    createdByName: 'Test User',
    createdAt: BASE_TIMESTAMP,
    lastModifiedBy: 'user-1',
    lastModifiedByName: 'Test User',
    lastModifiedAt: BASE_TIMESTAMP,
    childAssetIds: [],
    ...overrides,
  }
}

function createTestGroup(overrides: Partial<AssetGroup> = {}): AssetGroup {
  return {
    id: 'group-1',
    groupNumber: 'AG-001',
    name: 'Wireless Pack Group',
    assetType: BASE_ASSET_TYPE,
    inheritanceRules: { ...DEFAULT_ASSET_GROUP_INHERITANCE_RULES },
    customFieldRules: {},
    memberAssetIds: [],
    memberCount: 0,
    createdBy: 'user-1',
    createdByName: 'Test User',
    createdAt: BASE_TIMESTAMP,
    lastModifiedBy: 'user-1',
    lastModifiedByName: 'Test User',
    lastModifiedAt: BASE_TIMESTAMP,
    ...overrides,
  }
}

describe('asset group operations', () => {
  let provider: Partial<IStorageProvider>

  beforeEach(() => {
    provider = {
      getAssetGroups: vi.fn().mockResolvedValue([]),
    }
  })

  it('converts an asset into a new group and updates field sources', async () => {
    const asset = createTestAsset({ fieldSources: {} })
    const createdGroup = createTestGroup({
      memberAssetIds: [asset.id],
      memberCount: 1,
    })

    const updateAsset = vi
      .fn()
      .mockImplementation(async (_id: string, data: Partial<Asset>): Promise<Asset> => ({
        ...asset,
        assetGroup: data.assetGroup ?? undefined,
        fieldSources: data.fieldSources ?? {},
      }))

    Object.assign(provider, {
      getAsset: vi.fn().mockResolvedValue(asset),
      createAssetGroup: vi
        .fn()
        .mockImplementation(async (payload: AssetGroupCreate): Promise<AssetGroup> => ({
          ...createdGroup,
          ...payload,
          id: createdGroup.id,
          memberAssetIds: payload.memberAssetIds ?? [],
          memberCount: payload.memberCount ?? 0,
        })),
      updateAsset,
    })

    const result = await convertAssetToGroup(asset.id, { provider: provider as IStorageProvider })

    expect(provider.getAssetGroups).toHaveBeenCalled()
    expect(provider.createAssetGroup).toHaveBeenCalledWith(
      expect.objectContaining({
        groupNumber: asset.assetNumber,
        assetType: asset.assetType,
        memberAssetIds: [asset.id],
        manufacturer: asset.manufacturer,
      }),
    )

    expect(updateAsset).toHaveBeenCalledWith(
      asset.id,
      expect.objectContaining({
        fieldSources: expect.objectContaining({
          manufacturer: 'group',
          model: 'group',
          description: 'group',
          assetType: 'group',
        }),
      }),
    )

    expect(result.group.memberAssetIds).toContain(asset.id)
    expect(result.asset.assetGroup?.id).toBe(createdGroup.id)
  })

  it('creates bulk members with shared custom fields and inheritance defaults', async () => {
    const group = createTestGroup({
      manufacturer: 'Shure',
      model: 'QLXD',
      description: 'Wireless pack set',
      sharedCustomFields: { cf1: 'Shared' },
    })

    const assets = [createTestAsset({ id: 'asset-2', assetNumber: 'A-002' })]
    const bulkCreate = vi.fn().mockResolvedValue(assets)

    Object.assign(provider, {
      getAssetGroup: vi.fn().mockResolvedValue(group),
      bulkCreateAssetsForGroup: bulkCreate,
    })

    const result = await createGroupMembers(group.id, 1, {
      provider: provider as IStorageProvider,
      baseData: {
        customFieldValues: { cf2: 'Local' },
      } satisfies Partial<AssetCreate>,
    })

    expect(provider.getAssetGroup).toHaveBeenCalledWith(group.id)
    expect(bulkCreate).toHaveBeenCalledWith(
      group.id,
      1,
      expect.objectContaining({
        assetType: group.assetType,
        manufacturer: group.manufacturer,
        customFieldValues: {
          cf1: 'Shared',
          cf2: 'Local',
        },
        fieldSources: expect.objectContaining({
          manufacturer: 'group',
          model: 'group',
          description: 'group',
          assetType: 'group',
        }),
      }),
    )

    expect(result).toEqual(assets)
  })

  it('adds an asset to an existing group and updates membership', async () => {
    const asset = createTestAsset()
    const group = createTestGroup()

    const updatedAsset = {
      ...asset,
      assetGroup: {
        id: group.id,
        groupNumber: group.groupNumber,
        name: group.name,
      },
      fieldSources: {
        manufacturer: 'group',
      },
    }

    Object.assign(provider, {
      getAsset: vi.fn().mockResolvedValue(asset),
      getAssetGroup: vi.fn().mockResolvedValue(group),
      updateAsset: vi.fn().mockResolvedValue(updatedAsset),
      updateAssetGroup: vi.fn().mockResolvedValue({ ...group, memberAssetIds: [asset.id], memberCount: 1 }),
    })

    const result = await addAssetToGroup(asset.id, group.id, { provider: provider as IStorageProvider })

    expect(provider.updateAsset).toHaveBeenCalledWith(
      asset.id,
      expect.objectContaining({
        assetGroup: {
          id: group.id,
          groupNumber: group.groupNumber,
          name: group.name,
        },
      }),
    )

    expect(provider.updateAssetGroup).toHaveBeenCalledWith(
      group.id,
      expect.objectContaining({
        memberAssetIds: [asset.id],
        memberCount: 1,
      }),
    )

    expect(result.assetGroup?.id).toBe(group.id)
  })
})
