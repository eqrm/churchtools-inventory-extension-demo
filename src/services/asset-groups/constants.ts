import type { AssetGroupInheritanceRule } from '../../types/entities'

export const ASSET_GROUP_BARCODE_MIN = 7_000_000
export const ASSET_GROUP_BARCODE_PADDING = 7

export const CUSTOM_FIELD_SOURCE_PREFIX = 'customFieldValues.'

export const DEFAULT_ASSET_GROUP_INHERITANCE_RULES: Readonly<Record<string, AssetGroupInheritanceRule>> = Object.freeze({
  category: { inherited: true, overridable: false },
  manufacturer: { inherited: true, overridable: false },
  model: { inherited: true, overridable: false },
  description: { inherited: true, overridable: true },
})

export const DEFAULT_CUSTOM_FIELD_RULES: Readonly<Record<string, AssetGroupInheritanceRule>> = Object.freeze({})
