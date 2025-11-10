import type { ChurchToolsAPIClient } from '../../api/ChurchToolsAPIClient';
import type {
  Asset,
  AssetType,
  AssetCreate,
  AssetGroup,
  AssetGroupCreate,
  AssetGroupFilters,
  AssetGroupUpdate,
  AssetUpdate,
  BarcodeHistoryEntry,
  ChangeHistoryEntry,
  CustomFieldValue,
} from '../../../types/entities';
import { CURRENT_SCHEMA_VERSION } from '../../migrations/constants';
import { CUSTOM_FIELD_SOURCE_PREFIX } from '../../asset-groups/constants';
import { computeFieldSourcesForGroup, resolveFieldValueFromGroup } from '../../asset-groups/inheritance';
import { ensureAssetMatchesGroupAssetType, ensurePositiveMemberCount } from '../../asset-groups/validators';

export interface AssetGroupDependencies {
  moduleId: string;
  apiClient: ChurchToolsAPIClient;
  getAllAssetTypesIncludingHistory(): Promise<AssetType[]>;
  mapToAssetType(data: unknown): AssetType;
  recordChange(entry: Omit<ChangeHistoryEntry, 'id' | 'changedAt'>): Promise<void>;
  valuesAreEqual(a: unknown, b: unknown): boolean;
  formatFieldValue(value: unknown): string;
  formatGroupIdentifier(group: AssetGroup): string;
  getAsset(id: string): Promise<Asset>;
  createAsset(data: AssetCreate): Promise<Asset>;
  updateAsset(id: string, data: AssetUpdate): Promise<Asset>;
}

type DeleteAssetGroupOptions = { reassignAssets?: boolean };

async function getAssetGroupsDataCategory(deps: AssetGroupDependencies): Promise<AssetType> {
  const assetTypes = await deps.getAllAssetTypesIncludingHistory();
  let groupAssetType = assetTypes.find((assetType) => assetType.name === '__AssetGroups__');

  if (!groupAssetType) {
    const user = await deps.apiClient.getCurrentUser();
    const shorty = `assetgroups_${Date.now().toString().slice(-4)}`;

    const categoryData = {
      customModuleId: Number(deps.moduleId),
      name: '__AssetGroups__',
      shorty,
      description: 'System category for asset group metadata',
      data: null,
    };

    const created = await deps.apiClient.createDataCategory(deps.moduleId, categoryData);
    groupAssetType = deps.mapToAssetType(created);

    await deps.recordChange({
      entityType: 'category',
      entityId: groupAssetType.id,
      action: 'created',
      changedBy: user.id,
      changedByName: `${user.firstName} ${user.lastName}`,
    });
  }

  return groupAssetType;
}

function mapToAssetGroup(dataValue: unknown): AssetGroup {
  const raw = dataValue as Record<string, unknown>;
  const dataStr = (raw['value'] || raw['data']) as string | null;
  const parsed = dataStr ? (JSON.parse(dataStr) as Record<string, unknown>) : raw;

  const memberAssetIds = Array.isArray(parsed['memberAssetIds'])
    ? (parsed['memberAssetIds'] as unknown[]).map((id) => String(id))
    : [];

  const assetTypeRaw = parsed['assetType'] as { id?: string; name?: string } | undefined;
  const legacyCategoryRaw = parsed['category'] as { id?: string; name?: string } | undefined;
  const groupNumberRaw = parsed['groupNumber'];
  const normalizedGroupNumber =
    typeof groupNumberRaw === 'string' && groupNumberRaw.trim().length > 0
      ? groupNumberRaw.trim()
      : undefined;
  const barcodeHistory = Array.isArray(parsed['barcodeHistory'])
    ? (parsed['barcodeHistory'] as BarcodeHistoryEntry[])
    : undefined;

  const assetTypeIdRaw = assetTypeRaw?.id ?? legacyCategoryRaw?.id ?? parsed['assetTypeId'] ?? parsed['categoryId'];
  const assetTypeNameRaw = assetTypeRaw?.name ?? legacyCategoryRaw?.name ?? parsed['assetTypeName'] ?? parsed['categoryName'];
  const assetType = {
    id: assetTypeIdRaw ? String(assetTypeIdRaw) : '',
    name: assetTypeNameRaw ? String(assetTypeNameRaw) : '',
  };

  return {
    id: String(raw['id'] ?? parsed['id']),
    groupNumber: normalizedGroupNumber,
    name: String(parsed['name'] ?? ''),
    barcode: parsed['barcode'] ? String(parsed['barcode']) : undefined,
    assetType,
    manufacturer: parsed['manufacturer'] ? String(parsed['manufacturer']) : undefined,
    model: parsed['model'] ? String(parsed['model']) : undefined,
    modelNumber: parsed['modelNumber'] ? String(parsed['modelNumber']) : undefined,
    description: parsed['description'] ? String(parsed['description']) : undefined,
    inheritanceRules: (parsed['inheritanceRules'] as AssetGroup['inheritanceRules']) ?? {},
    sharedCustomFields: parsed['sharedCustomFields'] as Record<string, unknown> | undefined,
    customFieldRules: (parsed['customFieldRules'] as AssetGroup['customFieldRules']) ?? {},
    memberAssetIds,
    memberCount: parsed['memberCount'] !== undefined ? Number(parsed['memberCount']) : memberAssetIds.length,
    barcodeHistory,
    createdBy: parsed['createdBy'] ? String(parsed['createdBy']) : 'system',
    createdByName: parsed['createdByName'] ? String(parsed['createdByName']) : 'System',
    createdAt: parsed['createdAt'] ? String(parsed['createdAt']) : new Date().toISOString(),
    lastModifiedBy: parsed['lastModifiedBy'] ? String(parsed['lastModifiedBy']) : 'system',
    lastModifiedByName: parsed['lastModifiedByName'] ? String(parsed['lastModifiedByName']) : 'System',
    lastModifiedAt: parsed['lastModifiedAt'] ? String(parsed['lastModifiedAt']) : new Date().toISOString(),
    schemaVersion: parsed['schemaVersion'] ? String(parsed['schemaVersion']) : undefined,
  };
}

function applyAssetGroupFilters(groups: AssetGroup[], filters: AssetGroupFilters): AssetGroup[] {
  let filtered = groups;

  if (filters.assetTypeId) {
    filtered = filtered.filter((group) => group.assetType.id === filters.assetTypeId);
  }

  if (filters.memberAssetId) {
    filtered = filtered.filter((group) => group.memberAssetIds.includes(filters.memberAssetId as string));
  }

  if (filters.search) {
    const query = filters.search.toLowerCase();
    filtered = filtered.filter(
      (group) =>
        group.name.toLowerCase().includes(query) ||
        (group.groupNumber?.toLowerCase().includes(query) ?? false),
    );
  }

  return filtered;
}

export async function getAssetGroups(
  deps: AssetGroupDependencies,
  filters?: AssetGroupFilters,
): Promise<AssetGroup[]> {
  const groupDataCategory = await getAssetGroupsDataCategory(deps);
  const values = await deps.apiClient.getDataValues(deps.moduleId, groupDataCategory.id);
  let groups = values.map((value) => mapToAssetGroup(value));

  if (filters) {
    groups = applyAssetGroupFilters(groups, filters);
  }

  return groups;
}

export async function getAssetGroup(
  deps: AssetGroupDependencies,
  id: string,
): Promise<AssetGroup | null> {
  const groupDataCategory = await getAssetGroupsDataCategory(deps);
  const values = await deps.apiClient.getDataValues(deps.moduleId, groupDataCategory.id);
  const raw = values.find((value) => String((value as Record<string, unknown>)['id']) === id);
  return raw ? mapToAssetGroup(raw) : null;
}

export async function createAssetGroup(
  deps: AssetGroupDependencies,
  data: AssetGroupCreate,
): Promise<AssetGroup> {
  const groupDataCategory = await getAssetGroupsDataCategory(deps);
  const user = await deps.apiClient.getCurrentUser();

  const now = new Date().toISOString();
  const memberAssetIds = Array.from(new Set((data.memberAssetIds ?? []).map((id) => String(id))));
  const normalizedGroupNumber = data.groupNumber?.toString().trim();
  const initialBarcodeHistory = Array.isArray(data.barcodeHistory) ? data.barcodeHistory : [];
  const assetType = {
    id: data.assetType.id,
    name: data.assetType.name,
  };

  const groupPayload: AssetGroup = {
    id: '',
    groupNumber: normalizedGroupNumber && normalizedGroupNumber.length > 0 ? normalizedGroupNumber : undefined,
    name: data.name,
    barcode: data.barcode,
    assetType,
    manufacturer: data.manufacturer,
    model: data.model,
    modelNumber: data.modelNumber,
    description: data.description,
    inheritanceRules: data.inheritanceRules ?? {},
    sharedCustomFields: data.sharedCustomFields,
    customFieldRules: data.customFieldRules ?? {},
    memberAssetIds,
    memberCount: data.memberCount ?? memberAssetIds.length,
    barcodeHistory: initialBarcodeHistory,
    createdBy: user.id,
    createdByName: `${user.firstName} ${user.lastName}`,
    createdAt: now,
    lastModifiedBy: user.id,
    lastModifiedByName: `${user.firstName} ${user.lastName}`,
    lastModifiedAt: now,
    schemaVersion: data.schemaVersion ?? CURRENT_SCHEMA_VERSION,
  };

  const serializedGroup = {
    ...groupPayload,
    category: assetType,
    categoryId: assetType.id,
    categoryName: assetType.name,
  } satisfies Record<string, unknown>;

  const payload = {
    dataCategoryId: Number(groupDataCategory.id),
    value: JSON.stringify(serializedGroup),
  };

  const created = await deps.apiClient.createDataValue(deps.moduleId, groupDataCategory.id, payload);
  const group = mapToAssetGroup(created);

  await deps.recordChange({
    entityType: 'asset-group',
    entityId: group.id,
    entityName: group.name,
    action: 'created',
    changedBy: user.id,
    changedByName: `${user.firstName} ${user.lastName}`,
  });

  if (memberAssetIds.length > 0) {
    await Promise.all(
      memberAssetIds.map(async (assetId) => {
        try {
          await deps.updateAsset(assetId, {
            assetGroup: {
              id: group.id,
              groupNumber: group.groupNumber,
              name: group.name,
            },
          });
        } catch (error) {
          console.error(
            `[ChurchToolsProvider] Failed to assign asset ${assetId} to new group ${group.id}:`,
            error,
          );
        }
      }),
    );
  }

  return group;
}

export async function updateAssetGroup(
  deps: AssetGroupDependencies,
  id: string,
  data: AssetGroupUpdate,
  options?: { skipMemberSync?: boolean },
): Promise<AssetGroup> {
  const groupDataCategory = await getAssetGroupsDataCategory(deps);
  const existing = await getAssetGroup(deps, id);

  if (!existing) {
    throw new Error(`Asset group ${id} not found`);
  }

  const user = await deps.apiClient.getCurrentUser();
  const memberAssetIds = Array.from(
    new Set((data.memberAssetIds ?? existing.memberAssetIds).map((assetId) => String(assetId))),
  );
  const memberCount = data.memberCount ?? memberAssetIds.length;

  const updatedGroup: AssetGroup = {
    ...existing,
    ...data,
    memberAssetIds,
    memberCount,
    lastModifiedBy: user.id,
    lastModifiedByName: `${user.firstName} ${user.lastName}`,
    lastModifiedAt: new Date().toISOString(),
    schemaVersion: data.schemaVersion ?? existing.schemaVersion ?? CURRENT_SCHEMA_VERSION,
  };

  if (data.groupNumber !== undefined) {
    const trimmed = data.groupNumber?.trim();
    if (trimmed && trimmed.length > 0) {
      updatedGroup.groupNumber = trimmed;
    } else {
      delete updatedGroup.groupNumber;
    }
  }

  if (!updatedGroup.barcodeHistory && existing.barcodeHistory) {
    updatedGroup.barcodeHistory = existing.barcodeHistory;
  }

  const serializedGroup = {
    ...updatedGroup,
    category: updatedGroup.assetType,
    categoryId: updatedGroup.assetType.id,
    categoryName: updatedGroup.assetType.name,
  } satisfies Record<string, unknown>;

  const payload = {
    id: Number(id),
    dataCategoryId: Number(groupDataCategory.id),
    value: JSON.stringify(serializedGroup),
  };

  await deps.apiClient.updateDataValue(deps.moduleId, groupDataCategory.id, id, payload);

  const changes: ChangeHistoryEntry['changes'] = [];
  for (const [field, newValue] of Object.entries(data)) {
    const oldValue = existing[field as keyof AssetGroup];
    if (!deps.valuesAreEqual(oldValue, newValue)) {
      const formattedOld = deps.formatFieldValue(oldValue);
      const formattedNew = deps.formatFieldValue(newValue);
      if (formattedOld !== formattedNew) {
        changes.push({
          field,
          oldValue: formattedOld,
          newValue: formattedNew,
        });
      }
    }
  }

  if (changes.length > 0) {
    await deps.recordChange({
      entityType: 'asset-group',
      entityId: id,
      entityName: updatedGroup.name,
      action: 'updated',
      changes,
      changedBy: user.id,
      changedByName: `${user.firstName} ${user.lastName}`,
    });
  }

  const previousMembers = new Set(existing.memberAssetIds);
  const nextMembers = new Set(updatedGroup.memberAssetIds);

  const newlyAdded = [...nextMembers].filter((memberId) => !previousMembers.has(memberId));
  const removedMembers = [...previousMembers].filter((memberId) => !nextMembers.has(memberId));

  if (!options?.skipMemberSync && newlyAdded.length > 0) {
    await Promise.all(
      newlyAdded.map(async (assetId) => {
        try {
          await deps.updateAsset(assetId, {
            assetGroup: {
              id: updatedGroup.id,
              groupNumber: updatedGroup.groupNumber,
              name: updatedGroup.name,
            },
          });
        } catch (error) {
          console.error(
            `[ChurchToolsProvider] Failed to assign asset ${assetId} to group ${updatedGroup.id}:`,
            error,
          );
        }
      }),
    );
  }

  if (!options?.skipMemberSync && removedMembers.length > 0) {
    await Promise.all(
      removedMembers.map(async (assetId) => {
        try {
          await deps.updateAsset(assetId, {
            assetGroup: undefined,
            fieldSources: undefined,
          });
        } catch (error) {
          console.error(
            `[ChurchToolsProvider] Failed to remove asset ${assetId} from group ${updatedGroup.id}:`,
            error,
          );
        }
      }),
    );
  }

  return updatedGroup;
}

export async function deleteAssetGroup(
  deps: AssetGroupDependencies,
  id: string,
  options?: DeleteAssetGroupOptions,
): Promise<void> {
  const group = await getAssetGroup(deps, id);
  if (!group) {
    return;
  }

  const user = await deps.apiClient.getCurrentUser();
  const groupDataCategory = await getAssetGroupsDataCategory(deps);

  if (group.memberAssetIds.length > 0) {
    if (!options?.reassignAssets) {
      throw new Error(
        `Cannot delete asset group ${deps.formatGroupIdentifier(group)}: ${group.memberAssetIds.length.toString()} member asset(s) still assigned`,
      );
    }

    await Promise.all(
      group.memberAssetIds.map(async (assetId) => {
        try {
          await deps.updateAsset(assetId, {
            assetGroup: undefined,
            fieldSources: undefined,
          });
        } catch (error) {
          console.error(
            `[ChurchToolsProvider] Failed to remove asset ${assetId} while deleting group ${group.id}:`,
            error,
          );
        }
      }),
    );
  }

  await deps.apiClient.deleteDataValue(deps.moduleId, groupDataCategory.id, id);

  await deps.recordChange({
    entityType: 'asset-group',
    entityId: id,
    entityName: group.name,
    action: 'deleted',
    oldValue: deps.formatGroupIdentifier(group),
    changedBy: user.id,
    changedByName: `${user.firstName} ${user.lastName}`,
  });
}

export async function dissolveAssetGroup(
  deps: AssetGroupDependencies,
  id: string,
): Promise<AssetGroup> {
  const group = await getAssetGroup(deps, id);
  if (!group) {
    throw new Error(`Asset group ${id} not found`);
  }

  if (group.memberAssetIds.length === 0) {
    return group;
  }

  return updateAssetGroup(
    deps,
    id,
    {
      memberAssetIds: [],
      memberCount: 0,
    },
  );
}

export async function bulkCreateAssetsForGroup(
  deps: AssetGroupDependencies,
  groupId: string,
  count: number,
  baseData: Partial<AssetCreate> = {},
): Promise<Asset[]> {
  ensurePositiveMemberCount(count);

  const group = await getAssetGroup(deps, groupId);
  if (!group) {
    throw new Error(`Asset group ${groupId} not found`);
  }

  const createdAssets: Asset[] = [];
  const memberIds = new Set(group.memberAssetIds);
  const startingIndex = memberIds.size;

  for (let index = 0; index < count; index += 1) {
    const sequence = startingIndex + index + 1;
    const baseName = baseData.name?.trim() ?? group.name?.trim() ?? 'Asset Group Member';
    const generatedName = count === 1 && baseData.name
      ? baseData.name.trim()
      : `${baseName}${count === 1 && !baseData.name ? '' : ` #${sequence}`} `
          .replace(/\s+/g, ' ')
          .trim();

    const fieldSources = baseData.fieldSources
      ? { ...baseData.fieldSources }
      : computeFieldSourcesForGroup(group);

    const assetType = baseData.assetType ?? group.assetType;

    const assetPayload: AssetCreate = {
      ...baseData,
      name: generatedName,
      assetType,
      status: baseData.status ?? 'available',
      bookable: baseData.bookable ?? true,
      isParent: baseData.isParent ?? false,
      childAssetIds: baseData.childAssetIds ?? [],
      customFieldValues: { ...(baseData.customFieldValues ?? {}) },
      assetGroup: baseData.assetGroup ?? {
        id: group.id,
        groupNumber: group.groupNumber,
        name: group.name,
      },
      fieldSources,
    };

    const asset = await deps.createAsset(assetPayload);
    createdAssets.push(asset);
    memberIds.add(asset.id);
  }

  await updateAssetGroup(
    deps,
    group.id,
    {
      memberAssetIds: Array.from(memberIds),
      memberCount: memberIds.size,
    },
    { skipMemberSync: true },
  );

  return createdAssets;
}

export async function bulkUpdateGroupMembers(
  deps: AssetGroupDependencies,
  groupId: string,
  updates: AssetUpdate,
  options?: { clearOverrides?: boolean },
): Promise<Asset[]> {
  const group = await getAssetGroup(deps, groupId);
  if (!group) {
    throw new Error(`Asset group ${groupId} not found`);
  }

  if (group.memberAssetIds.length === 0) {
    return [];
  }

  const clearedSources = options?.clearOverrides ? computeFieldSourcesForGroup(group) : undefined;

  const updatedAssets = await Promise.all(
    group.memberAssetIds.map(async (memberId) => {
      const updatePayload: AssetUpdate = {
        ...updates,
        customFieldValues: updates.customFieldValues ? { ...updates.customFieldValues } : undefined,
      };

      const mergedFieldSources = {
        ...(clearedSources ?? {}),
        ...(updates.fieldSources ?? {}),
      };

      if (Object.keys(mergedFieldSources).length > 0) {
        updatePayload.fieldSources = mergedFieldSources;
      }

      if (clearedSources) {
        for (const [fieldKey, source] of Object.entries(mergedFieldSources)) {
          if (source !== 'group') {
            continue;
          }

          if (fieldKey.startsWith(CUSTOM_FIELD_SOURCE_PREFIX)) {
            const customFieldId = fieldKey.substring(CUSTOM_FIELD_SOURCE_PREFIX.length);
            if (!customFieldId) {
              continue;
            }

            if (!updatePayload.customFieldValues) {
              updatePayload.customFieldValues = {};
            }

            if (group.sharedCustomFields && Object.prototype.hasOwnProperty.call(group.sharedCustomFields, customFieldId)) {
              updatePayload.customFieldValues[customFieldId] = group.sharedCustomFields[customFieldId] as CustomFieldValue;
            } else {
              Reflect.deleteProperty(updatePayload.customFieldValues, customFieldId);
            }
            continue;
          }

          const groupRecord = group as unknown as Record<string, unknown>;
          if (Object.prototype.hasOwnProperty.call(groupRecord, fieldKey)) {
            (updatePayload as Record<string, unknown>)[fieldKey] = groupRecord[fieldKey];
          } else {
            Reflect.deleteProperty(updatePayload as Record<string, unknown>, fieldKey);
          }
        }
      }

      return deps.updateAsset(memberId, updatePayload);
    }),
  );

  return updatedAssets;
}

export async function reassignAssetToGroup(
  deps: AssetGroupDependencies,
  assetId: string,
  targetGroupId: string,
): Promise<Asset> {
  const asset = await deps.getAsset(assetId);
  const previousGroupId = asset.assetGroup?.id;

  if (previousGroupId === targetGroupId) {
    return asset;
  }

  const targetGroup = await getAssetGroup(deps, targetGroupId);
  if (!targetGroup) {
    throw new Error(`Asset group ${targetGroupId} not found`);
  }

  ensureAssetMatchesGroupAssetType(asset, targetGroup);

  const fieldSources = computeFieldSourcesForGroup(targetGroup, asset.fieldSources);

  const updatedAsset = await deps.updateAsset(asset.id, {
    assetGroup: {
      id: targetGroup.id,
      groupNumber: targetGroup.groupNumber,
      name: targetGroup.name,
    },
    fieldSources,
  });

  const targetMemberIds = Array.from(new Set([...targetGroup.memberAssetIds, updatedAsset.id]));
  await updateAssetGroup(
    deps,
    targetGroup.id,
    {
      memberAssetIds: targetMemberIds,
      memberCount: targetMemberIds.length,
    },
    { skipMemberSync: true },
  );

  if (previousGroupId && previousGroupId !== targetGroup.id) {
    const previousGroup = await getAssetGroup(deps, previousGroupId);
    if (previousGroup) {
      const nextMembers = previousGroup.memberAssetIds.filter((memberId) => memberId !== updatedAsset.id);
      await updateAssetGroup(
        deps,
        previousGroup.id,
        {
          memberAssetIds: nextMembers,
          memberCount: nextMembers.length,
        },
        { skipMemberSync: true },
      );
    }
  }

  return updatedAsset;
}

export async function resolveAssetFieldValue(
  deps: AssetGroupDependencies,
  assetId: string,
  fieldKey: string,
): Promise<{ value: unknown; source: 'group' | 'local' | 'override' }> {
  const asset = await deps.getAsset(assetId);
  const group = asset.assetGroup ? await getAssetGroup(deps, asset.assetGroup.id) : null;
  const { value, source } = resolveFieldValueFromGroup(asset, group, fieldKey);
  return { value, source };
}
