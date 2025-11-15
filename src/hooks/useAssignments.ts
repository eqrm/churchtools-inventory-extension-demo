import { useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useStorageProvider } from './useStorageProvider';
import { AssignmentService, type AssignAssetOptions } from '../services/AssignmentService';
import type { Assignment, AssignmentHistoryEntry, AssignmentTarget } from '../types/assignment';
import { useAssignmentStore } from '../stores/assignmentStore';
import { assetKeys } from './useAssets';

export const assignmentKeys = {
  all: ['assignments'] as const,
  asset: (assetId: string) => [...assignmentKeys.all, 'asset', assetId] as const,
  history: (assetId: string) => [...assignmentKeys.asset(assetId), 'history'] as const,
  current: (assetId: string) => [...assignmentKeys.asset(assetId), 'current'] as const,
};

function assignmentToHistoryEntry(assignment: Assignment): AssignmentHistoryEntry {
  return {
    id: assignment.id,
    assetId: assignment.assetId,
    target: assignment.target,
    assignedBy: assignment.assignedBy,
    assignedByName: assignment.assignedByName,
    assignedAt: assignment.assignedAt,
    status: assignment.status,
    dueAt: assignment.dueAt,
    notes: assignment.notes,
    checkedInAt: assignment.checkedInAt,
    checkedInBy: assignment.checkedInBy,
    checkedInByName: assignment.checkedInByName,
  };
}

interface UseAssignmentsResult {
  currentAssignment: Assignment | null;
  history: AssignmentHistoryEntry[];
  isLoading: boolean;
  isFetching: boolean;
  error?: string;
  assignToTarget: (target: AssignmentTarget, options?: Omit<AssignAssetOptions, 'target'>) => Promise<Assignment>;
  checkIn: () => Promise<Assignment>;
  isAssigning: boolean;
  isCheckingIn: boolean;
  refetchHistory: () => Promise<AssignmentHistoryEntry[]>;
}

export function useAssignments(assetId?: string): UseAssignmentsResult {
  const provider = useStorageProvider();
  const assignmentService = useMemo(() => {
    if (!provider) {
      return null;
    }
    return new AssignmentService({ storageProvider: provider });
  }, [provider]);

  const queryClient = useQueryClient();

  const currentAssignment = useAssignmentStore((state) => (assetId ? state.currentByAsset[assetId] ?? null : null));
  const history = useAssignmentStore((state) => (assetId ? state.historyByAsset[assetId] ?? [] : []));
  const setCurrent = useAssignmentStore((state) => state.setCurrent);
  const setHistory = useAssignmentStore((state) => state.setHistory);
  const upsertHistoryEntry = useAssignmentStore((state) => state.upsertHistoryEntry);

  const enabled = Boolean(assignmentService && assetId);

  const historyQuery = useQuery<AssignmentHistoryEntry[], Error>({
    queryKey: assignmentKeys.history(assetId ?? 'unknown'),
    queryFn: async () => {
      if (!assignmentService || !assetId) {
        throw new Error('Assignment service unavailable.');
      }
      return await assignmentService.getAssignmentHistory(assetId);
    },
    enabled,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (assetId && historyQuery.data) {
      setHistory(assetId, historyQuery.data);
    }
  }, [assetId, historyQuery.data, setHistory]);

  const currentQuery = useQuery<Assignment | null, Error>({
    queryKey: assignmentKeys.current(assetId ?? 'unknown'),
    queryFn: async () => {
      if (!assignmentService || !assetId) {
        throw new Error('Assignment service unavailable.');
      }
      return await assignmentService.getCurrentAssignment(assetId);
    },
    enabled,
    staleTime: 5 * 1000,
  });

  useEffect(() => {
    if (assetId && currentQuery.data !== undefined) {
      setCurrent(assetId, currentQuery.data ?? null);
    }
  }, [assetId, currentQuery.data, setCurrent]);

  const assignMutation = useMutation({
    mutationFn: async ({ target, options }: { target: AssignmentTarget; options?: Omit<AssignAssetOptions, 'target'> }) => {
      if (!assignmentService || !assetId) {
        throw new Error('Assignment service unavailable.');
      }
      return await assignmentService.assignAsset(assetId, { target, ...options });
    },
    onSuccess: (assignment) => {
      if (!assetId) {
        return;
      }
      setCurrent(assetId, assignment);
      upsertHistoryEntry(assetId, assignmentToHistoryEntry(assignment));
      void queryClient.invalidateQueries({ queryKey: assignmentKeys.history(assetId) });
      void queryClient.invalidateQueries({ queryKey: assetKeys.detail(assetId) });
      void queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
    },
  });

  const checkInMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      if (!assignmentService) {
        throw new Error('Assignment service unavailable.');
      }
      return await assignmentService.checkInAsset(assignmentId);
    },
    onSuccess: (assignment) => {
      const assetIdForUpdate = assignment.assetId;
      setCurrent(assetIdForUpdate, null);
      upsertHistoryEntry(assetIdForUpdate, assignmentToHistoryEntry(assignment));
      void queryClient.invalidateQueries({ queryKey: assignmentKeys.history(assetIdForUpdate) });
      void queryClient.invalidateQueries({ queryKey: assetKeys.detail(assetIdForUpdate) });
      void queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
    },
  });

  return {
    currentAssignment,
    history,
    isLoading: historyQuery.isLoading || currentQuery.isLoading,
    isFetching: historyQuery.isFetching || currentQuery.isFetching,
    error: historyQuery.error?.message ?? currentQuery.error?.message,
    assignToTarget: async (target, options) => await assignMutation.mutateAsync({ target, options }),
    checkIn: async () => {
      if (!currentAssignment) {
        throw new Error('No active assignment to check in.');
      }
      return await checkInMutation.mutateAsync(currentAssignment.id);
    },
    isAssigning: assignMutation.isPending,
    isCheckingIn: checkInMutation.isPending,
    refetchHistory: async () => {
      const result = await historyQuery.refetch();
      return result.data ?? [];
    },
  };
}
