import type { ChurchToolsAPIClient } from '../../api/ChurchToolsAPIClient';
import type {
  AssetType,
  ChangeHistoryEntry,
  SavedView,
  SavedViewCreate,
} from '../../../types/entities';

export interface SavedViewDependencies {
  moduleId: string;
  apiClient: ChurchToolsAPIClient;
  getAllCategoriesIncludingHistory(): Promise<AssetType[]>;
  mapToAssetType(data: unknown): AssetType;
  recordChange(entry: Omit<ChangeHistoryEntry, 'id' | 'changedAt'>): Promise<void>;
}

export async function getSavedViews(
  deps: SavedViewDependencies,
  userId: string,
): Promise<SavedView[]> {
  const category = await getSavedViewsCategory(deps);
  const dataValues = await deps.apiClient.getDataValues(deps.moduleId, category.id);
  const allViews = dataValues.map((value) => mapToSavedView(value));
  return allViews.filter((view) => view.ownerId === userId || view.isPublic);
}

export async function createSavedView(
  deps: SavedViewDependencies,
  data: SavedViewCreate,
): Promise<SavedView> {
  const user = await deps.apiClient.getCurrentUser();
  const category = await getSavedViewsCategory(deps);

  const now = new Date().toISOString();
  const payload: SavedView = {
    id: '',
    ...data,
    createdAt: now,
    lastModifiedAt: now,
  };

  const result = await deps.apiClient.createDataValue(deps.moduleId, category.id, {
    dataCategoryId: Number(category.id),
    value: JSON.stringify(payload),
  });

  const created = mapToSavedView(result);

  await deps.recordChange({
    entityType: 'asset',
    entityId: created.id,
    action: 'created',
    newValue: `Saved view: ${data.name}`,
    changedBy: user.id,
    changedByName: `${user.firstName} ${user.lastName}`,
  });

  return created;
}

export async function updateSavedView(
  deps: SavedViewDependencies,
  id: string,
  updates: Partial<SavedView>,
): Promise<SavedView> {
  const user = await deps.apiClient.getCurrentUser();
  const category = await getSavedViewsCategory(deps);

  const current = await loadSavedView(deps, category.id, id);
  if (current.ownerId !== user.id) {
    throw new Error('Only the view owner can update this view');
  }

  const updated: SavedView = {
    ...current,
    ...updates,
    id,
    lastModifiedAt: new Date().toISOString(),
  };

  await deps.apiClient.updateDataValue(deps.moduleId, category.id, id, {
    id: Number(id),
    dataCategoryId: Number(category.id),
    value: JSON.stringify(updated),
  });

  await deps.recordChange({
    entityType: 'asset',
    entityId: id,
    action: 'updated',
    newValue: `Saved view: ${updated.name}`,
    changedBy: user.id,
    changedByName: `${user.firstName} ${user.lastName}`,
  });

  return updated;
}

export async function deleteSavedView(
  deps: SavedViewDependencies,
  id: string,
): Promise<void> {
  const user = await deps.apiClient.getCurrentUser();
  const category = await getSavedViewsCategory(deps);
  const current = await loadSavedView(deps, category.id, id);

  if (current.ownerId !== user.id) {
    throw new Error('Only the view owner can delete this view');
  }

  await deps.apiClient.deleteDataValue(deps.moduleId, category.id, id);

  await deps.recordChange({
    entityType: 'asset',
    entityId: id,
    action: 'deleted',
    oldValue: `Saved view: ${current.name}`,
    changedBy: user.id,
    changedByName: `${user.firstName} ${user.lastName}`,
  });
}

async function getSavedViewsCategory(deps: SavedViewDependencies): Promise<AssetType> {
  const categories = await deps.getAllCategoriesIncludingHistory();
  let category = categories.find((cat) => cat.name === '__SavedViews__');

  if (!category) {
    const payload = {
      customModuleId: Number(deps.moduleId),
      name: '__SavedViews__',
      shorty: `savedviews_${Date.now().toString().slice(-4)}`,
      description: 'Internal: User saved view configurations',
      data: null,
    };

    const created = await deps.apiClient.createDataCategory(deps.moduleId, payload);
    category = deps.mapToAssetType(created);
  }

  return category;
}

function mapToSavedView(value: unknown): SavedView {
  const record = value as { id: string; value: string };
  const parsed = JSON.parse(record.value) as SavedView;
  return {
    ...parsed,
    id: record.id,
  };
}

async function loadSavedView(
  deps: SavedViewDependencies,
  categoryId: string,
  id: string,
): Promise<SavedView> {
  const dataValues = await deps.apiClient.getDataValues(deps.moduleId, categoryId);
  const current = dataValues.find((entry) => (entry as { id: string }).id === id);
  if (!current) {
    throw new Error(`Saved view with ID ${id} not found`);
  }
  return mapToSavedView(current);
}