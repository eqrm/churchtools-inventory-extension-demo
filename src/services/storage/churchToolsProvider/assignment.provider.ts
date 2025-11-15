import type { AssetType, ChangeHistoryEntry } from '../../../types/entities';
import type {
  AssignmentCreateInput,
  AssignmentRecord,
  AssignmentTargetType,
  AssignmentUpdateInput,
} from '../../../types/assignment';
import { ChurchToolsStorageProvider } from './core';
import type { AssignmentDependencies } from './assignment';
import {
  createAssignment as createAssignmentHandler,
  deleteAssignment as deleteAssignmentHandler,
  getAssignment as getAssignmentHandler,
  getAssignments as getAssignmentsHandler,
  getAssignmentsForTarget as getAssignmentsForTargetHandler,
  updateAssignment as updateAssignmentHandler,
} from './assignment';

declare module './core' {
  interface ChurchToolsStorageProvider {
    getAssignments(assetId: string): Promise<AssignmentRecord[]>;
    getAssignment(assignmentId: string): Promise<AssignmentRecord | null>;
    createAssignment(assetId: string, data: AssignmentCreateInput): Promise<AssignmentRecord>;
    updateAssignment(assignmentId: string, updates: AssignmentUpdateInput): Promise<AssignmentRecord>;
    deleteAssignment(assignmentId: string): Promise<void>;
    getAssignmentsForTarget(
      targetId: string,
      targetType: AssignmentTargetType,
      options?: { includeReturned?: boolean }
    ): Promise<AssignmentRecord[]>;
  }
}

type ProviderWithAssignmentSupport = ChurchToolsStorageProvider & {
  getAllCategoriesIncludingHistory(): Promise<AssetType[]>;
  mapToAssetType(data: unknown): AssetType;
  recordChange(entry: Omit<ChangeHistoryEntry, 'id' | 'changedAt'>): Promise<void>;
};

function getAssignmentDependencies(provider: ProviderWithAssignmentSupport): AssignmentDependencies {
  return {
    moduleId: provider.moduleId,
    apiClient: provider.apiClient,
    getAllCategoriesIncludingHistory: provider.getAllCategoriesIncludingHistory.bind(provider),
    mapToAssetType: provider.mapToAssetType.bind(provider),
    recordChange: provider.recordChange.bind(provider),
  };
}

ChurchToolsStorageProvider.prototype.getAssignments = async function getAssignments(
  this: ProviderWithAssignmentSupport,
  assetId: string,
): Promise<AssignmentRecord[]> {
  return getAssignmentsHandler(getAssignmentDependencies(this), assetId);
};

ChurchToolsStorageProvider.prototype.getAssignment = async function getAssignment(
  this: ProviderWithAssignmentSupport,
  assignmentId: string,
): Promise<AssignmentRecord | null> {
  return getAssignmentHandler(getAssignmentDependencies(this), assignmentId);
};

ChurchToolsStorageProvider.prototype.createAssignment = async function createAssignment(
  this: ProviderWithAssignmentSupport,
  assetId: string,
  data: AssignmentCreateInput,
): Promise<AssignmentRecord> {
  return createAssignmentHandler(getAssignmentDependencies(this), assetId, data);
};

ChurchToolsStorageProvider.prototype.updateAssignment = async function updateAssignment(
  this: ProviderWithAssignmentSupport,
  assignmentId: string,
  updates: AssignmentUpdateInput,
): Promise<AssignmentRecord> {
  return updateAssignmentHandler(getAssignmentDependencies(this), assignmentId, updates);
};

ChurchToolsStorageProvider.prototype.deleteAssignment = async function deleteAssignment(
  this: ProviderWithAssignmentSupport,
  assignmentId: string,
): Promise<void> {
  await deleteAssignmentHandler(getAssignmentDependencies(this), assignmentId);
};

ChurchToolsStorageProvider.prototype.getAssignmentsForTarget = async function getAssignmentsForTarget(
  this: ProviderWithAssignmentSupport,
  targetId: string,
  targetType: AssignmentTargetType,
  options?: { includeReturned?: boolean },
): Promise<AssignmentRecord[]> {
  return getAssignmentsForTargetHandler(getAssignmentDependencies(this), targetId, targetType, options);
};
