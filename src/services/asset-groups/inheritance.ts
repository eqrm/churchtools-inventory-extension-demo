import type {
  Asset,
  AssetGroup,
  AssetGroupFieldSource,
  AssetGroupInheritanceRule,
  CustomFieldValue,
} from '../../types/entities'
import { CUSTOM_FIELD_SOURCE_PREFIX } from './constants'

function isCustomFieldSourceKey(fieldKey: string): boolean {
  return fieldKey.startsWith(CUSTOM_FIELD_SOURCE_PREFIX)
}

function toCustomFieldSourceKey(customFieldId: string): string {
  return `${CUSTOM_FIELD_SOURCE_PREFIX}${customFieldId}`
}

function extractCustomFieldId(fieldKey: string): string | null {
  if (!isCustomFieldSourceKey(fieldKey)) {
    return null
  }

  const identifier = fieldKey.substring(CUSTOM_FIELD_SOURCE_PREFIX.length)
  return identifier.length > 0 ? identifier : null
}

export function getInheritanceRuleForField(
  fieldKey: string,
  group?: AssetGroup | null,
): AssetGroupInheritanceRule | undefined {
  if (!group) {
    return undefined
  }

  if (isCustomFieldSourceKey(fieldKey)) {
    const fieldId = extractCustomFieldId(fieldKey)
    if (!fieldId) {
      return undefined
    }
    return group.customFieldRules?.[fieldId]
  }

  return group.inheritanceRules?.[fieldKey]
}

export function computeFieldSourcesFromRules(
  inheritanceRules: Record<string, AssetGroupInheritanceRule>,
  customFieldRules?: Record<string, AssetGroupInheritanceRule>,
  existingSources?: Record<string, AssetGroupFieldSource>,
): Record<string, AssetGroupFieldSource> {
  const sources: Record<string, AssetGroupFieldSource> = {}

  if (existingSources) {
    for (const [key, value] of Object.entries(existingSources)) {
      if (value === 'override') {
        sources[key] = value
      }
    }
  }

  for (const [field, rule] of Object.entries(inheritanceRules ?? {})) {
    if (!rule) {
      continue
    }

    if (rule.inherited) {
      if (sources[field] !== 'override') {
        sources[field] = 'group'
      }
      continue
    }

    if (sources[field] === 'group') {
      Reflect.deleteProperty(sources, field)
    }
  }

  for (const [fieldId, rule] of Object.entries(customFieldRules ?? {})) {
    const key = toCustomFieldSourceKey(fieldId)

    if (rule.inherited) {
      if (sources[key] !== 'override') {
        sources[key] = 'group'
      }
      continue
    }

    if (sources[key] === 'group') {
      Reflect.deleteProperty(sources, key)
    }
  }

  return sources
}

export function computeFieldSourcesForGroup(
  group: AssetGroup,
  existingSources?: Record<string, AssetGroupFieldSource>,
): Record<string, AssetGroupFieldSource> {
  return computeFieldSourcesFromRules(group.inheritanceRules ?? {}, group.customFieldRules, existingSources)
}

export function deriveSharedCustomFields(
  customFieldValues: Record<string, CustomFieldValue>,
  customFieldRules?: Record<string, AssetGroupInheritanceRule>,
): Record<string, CustomFieldValue> | undefined {
  if (!customFieldRules || Object.keys(customFieldRules).length === 0) {
    return undefined
  }

  const shared: Record<string, CustomFieldValue> = {}

  for (const [fieldId, rule] of Object.entries(customFieldRules)) {
    if (!rule?.inherited) {
      continue
    }

    if (Object.prototype.hasOwnProperty.call(customFieldValues, fieldId)) {
      const value = customFieldValues[fieldId]
      if (value !== undefined) {
        shared[fieldId] = value
      }
    }
  }

  return Object.keys(shared).length > 0 ? shared : undefined
}

export function resolveFieldValueFromGroup(
  asset: Asset,
  group: AssetGroup | null,
  fieldKey: string,
): { value: unknown; source: AssetGroupFieldSource; rule?: AssetGroupInheritanceRule } {
  const currentSources = asset.fieldSources ?? {}
  const rule = getInheritanceRuleForField(fieldKey, group)

  let source: AssetGroupFieldSource = currentSources[fieldKey] ?? 'local'
  if (rule?.inherited && source === 'local') {
    source = 'group'
  }

  let value: unknown

  if (isCustomFieldSourceKey(fieldKey)) {
    const customFieldId = extractCustomFieldId(fieldKey)
    if (source === 'group' && customFieldId && group) {
      value = group.sharedCustomFields?.[customFieldId]
    } else if (customFieldId) {
      value = asset.customFieldValues?.[customFieldId]
    }
  } else if (source === 'group' && group) {
    const groupRecord = group as unknown as Record<string, unknown>
    value = groupRecord[fieldKey]
  } else {
    const assetRecord = asset as unknown as Record<string, unknown>
    value = assetRecord[fieldKey]
  }

  return { value, source, rule }
}
