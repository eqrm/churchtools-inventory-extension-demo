import type { Asset, AssetFilters, AssetStatus, Kit } from '../types/entities'

const DEFAULT_KIT_STATUS: AssetStatus = 'available'
export const KIT_ASSET_TYPE_ID = '__kits__'
export const KIT_ID_PREFIX = 'kit-'

export function isKitAssetId(id: string): boolean {
  return id.startsWith(KIT_ID_PREFIX)
}

export function stripKitIdPrefix(id: string): string {
  return isKitAssetId(id) ? id.slice(KIT_ID_PREFIX.length) : id
}

function buildKitAssetNumber(kit: Kit): string {
  if (kit.boundAssets && kit.boundAssets.length > 0) {
    const firstBoundAsset = kit.boundAssets[0]
    if (firstBoundAsset) {
      return firstBoundAsset.assetNumber
    }
  }
  const suffix = kit.id.slice(-6).toUpperCase()
  return `KIT-${suffix}`
}

function buildKitBarcode(kit: Kit): string {
  return `KIT-${kit.id}`
}

export function mapKitToAsset(kit: Kit): Asset {
  const assetNumber = buildKitAssetNumber(kit)
  const barcode = buildKitBarcode(kit)
  const boundAssets = kit.boundAssets ?? []
  const poolRequirements = kit.poolRequirements ?? []

  return {
    id: `${KIT_ID_PREFIX}${kit.id}`,
    assetNumber,
    name: kit.name,
    manufacturer: undefined,
    model: undefined,
    description: kit.description,
    mainImage: undefined,
    assetType: {
      id: KIT_ASSET_TYPE_ID,
      name: 'Kit',
      icon: 'IconPackage',
    },
    status: kit.status ?? DEFAULT_KIT_STATUS,
    location: kit.location,
    kitId: kit.id,
    modelId: undefined,
    tagIds: kit.tags,
    inheritedTagIds: undefined,
    inheritedTags: undefined,
    currentAssignmentId: undefined,
    inUseBy: undefined,
    bookable: true,
    isKit: true,
    kitType: kit.type,
    kitInheritedProperties: kit.inheritedProperties ?? [],
    kitCompletenessStatus: kit.completenessStatus ?? 'complete',
    kitAssemblyDate: kit.assemblyDate,
    kitDisassemblyDate: kit.disassemblyDate ?? null,
    kitBoundAssets: boundAssets.map((asset) => ({
      assetId: asset.assetId,
      assetNumber: asset.assetNumber,
      name: asset.name,
      inherits: asset.inherits,
    })),
    kitPoolRequirements: poolRequirements.map((requirement) => ({
      assetTypeId: requirement.assetTypeId,
      assetTypeName: requirement.assetTypeName,
      quantity: requirement.quantity,
      filters: requirement.filters,
    })),
    photos: [],
    isParent: boundAssets.length > 0,
    parentAssetId: undefined,
    childAssetIds: boundAssets.map((asset) => asset.assetId),
    barcode,
    qrCode: barcode,
    barcodeHistory: [],
    assetGroup: undefined,
    fieldSources: undefined,
    customFieldValues: {},
    createdBy: kit.createdBy,
    createdByName: kit.createdByName,
    createdAt: kit.createdAt,
    lastModifiedBy: kit.lastModifiedBy,
    lastModifiedByName: kit.lastModifiedByName,
    lastModifiedAt: kit.lastModifiedAt,
    schemaVersion: kit.schemaVersion,
    isAvailable: kit.status === 'available',
    currentBooking: undefined,
    nextMaintenance: undefined,
  }
}

export function kitMatchesAssetFilters(kit: Kit, filters?: AssetFilters): boolean {
  if (!filters) {
    return true
  }

  if (filters.assetTypeId && filters.assetTypeId !== KIT_ASSET_TYPE_ID) {
    return false
  }

  if (filters.status) {
    const statusList = Array.isArray(filters.status) ? filters.status : [filters.status]
    const kitStatus = kit.status ?? DEFAULT_KIT_STATUS
    if (!statusList.includes(kitStatus)) {
      return false
    }
  }

  if (filters.location) {
    const kitLocation = kit.location ?? ''
    if (kitLocation !== filters.location) {
      return false
    }
  }

  if (filters.parentAssetId) {
    return false
  }

  if (filters.isParent !== undefined) {
    const kitIsParent = (kit.boundAssets?.length ?? 0) > 0
    if (filters.isParent !== kitIsParent) {
      return false
    }
  }

  if (filters.assetGroupId || filters.hasAssetGroup !== undefined) {
    return false
  }

  if (filters.customFields && Object.keys(filters.customFields).length > 0) {
    return false
  }

  if (filters.search) {
    const query = filters.search.toLowerCase()
    const assetNumber = buildKitAssetNumber(kit)
    const barcode = buildKitBarcode(kit)
    const haystack: Array<string | undefined> = [
      kit.name,
      kit.description,
      assetNumber,
      barcode,
      kit.location,
      kit.boundAssets?.map((asset) => `${asset.assetNumber} ${asset.name}`).join(' '),
    ]

    const matchesSearch = haystack
      .filter((value): value is string => Boolean(value))
      .some((value) => value.toLowerCase().includes(query))

    if (!matchesSearch) {
      return false
    }
  }

  return true
}

export function buildSelectableKitAssets(assets: Asset[] | undefined, kitId?: string): Asset[] {
  if (!Array.isArray(assets)) {
    return [];
  }

  return assets.filter((asset) => {
    if (asset.status === 'deleted') {
      return false;
    }
    if (asset.isKit) {
      return false;
    }
    if (asset.kitId && asset.kitId !== kitId) {
      return false;
    }
    return true;
  });
}
