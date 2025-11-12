import { useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UndoAction } from '../types/undo';
import type { CompoundActionInput, UndoableActionInput } from '../services/UndoService';
import { getUndoService } from '../services/undo';
import { useUndoStore } from '../stores/undoStore';
import { useCurrentUser } from './useCurrentUser';

const undoQueryKeys = {
  all: ['undo'] as const,
  history: (userId: string, limit: number) => [...undoQueryKeys.all, 'history', userId, limit] as const,
};

interface UseUndoResult {
  history: UndoAction[];
  isLoading: boolean;
  error?: string;
  undoAction: (actionId: string) => Promise<boolean>;
  undoingActionId?: string;
  recordAction: (action: UndoableActionInput) => Promise<string>;
  recordCompoundAction: (action: CompoundActionInput) => Promise<string>;
  isMutating: boolean;
  refetch: () => Promise<UndoAction[]>;
}

export function useUndo(limit = 50): UseUndoResult {
  const undoService = useMemo(() => getUndoService(), []);
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const userId = currentUser?.id ?? '';

  const actions = useUndoStore((state) => state.actions);
  const isLoading = useUndoStore((state) => state.isLoading);
  const storeError = useUndoStore((state) => state.error);
  const undoingActionId = useUndoStore((state) => state.undoingActionId);
  const setActions = useUndoStore((state) => state.setActions);
  const setLoading = useUndoStore((state) => state.setLoading);
  const setError = useUndoStore((state) => state.setError);
  const setUndoing = useUndoStore((state) => state.setUndoing);
  const markReverted = useUndoStore((state) => state.markReverted);
  const clearActions = useUndoStore((state) => state.clear);

  useEffect(() => {
    if (!userId) {
      clearActions();
      setError(undefined);
    }
  }, [userId, clearActions, setError]);

  const historyQuery = useQuery<UndoAction[], Error>({
    queryKey: undoQueryKeys.history(userId, limit),
    queryFn: async (): Promise<UndoAction[]> => {
      return await undoService.getUserUndoHistory(limit);
    },
    enabled: Boolean(userId),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (historyQuery.data) {
      setActions(historyQuery.data);
      setError(undefined);
    }
  }, [historyQuery.data, setActions, setError]);

  useEffect(() => {
    if (historyQuery.error) {
      const message = historyQuery.error instanceof Error ? historyQuery.error.message : 'Failed to load undo history.';
      setError(message);
    }
  }, [historyQuery.error, setError]);

  useEffect(() => {
    setLoading(historyQuery.isFetching);
  }, [historyQuery.isFetching, setLoading]);

  const undoMutation = useMutation<boolean, Error, string>({
    mutationFn: async (actionId: string) => await undoService.undoAction(actionId),
    onMutate: (actionId) => {
      setUndoing(actionId);
    },
    onSuccess: (_result, actionId) => {
      markReverted(actionId);
      if (userId) {
        void queryClient.invalidateQueries({ queryKey: undoQueryKeys.history(userId, limit) });
      }
      setError(undefined);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to undo action.';
      setError(message);
    },
    onSettled: () => {
      setUndoing(undefined);
    },
  });

  const recordActionMutation = useMutation<string, Error, UndoableActionInput>({
    mutationFn: async (action) => await undoService.recordAction(action),
    onSuccess: async () => {
      if (userId) {
        await queryClient.invalidateQueries({ queryKey: undoQueryKeys.history(userId, limit) });
      }
      setError(undefined);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to record undo action.';
      setError(message);
    },
  });

  const recordCompoundMutation = useMutation<string, Error, CompoundActionInput>({
    mutationFn: async (action) => await undoService.recordCompoundAction(action),
    onSuccess: async () => {
      if (userId) {
        await queryClient.invalidateQueries({ queryKey: undoQueryKeys.history(userId, limit) });
      }
      setError(undefined);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to record compound undo action.';
      setError(message);
    },
  });

  return {
    history: userId ? actions : [],
    isLoading,
    error: storeError,
    undoAction: async (actionId: string) => await undoMutation.mutateAsync(actionId),
    undoingActionId,
    recordAction: async (action: UndoableActionInput) => await recordActionMutation.mutateAsync(action),
    recordCompoundAction: async (action: CompoundActionInput) => await recordCompoundMutation.mutateAsync(action),
    isMutating: undoMutation.isPending || recordActionMutation.isPending || recordCompoundMutation.isPending,
    refetch: async () => {
      const result = await historyQuery.refetch();
      return result.data ?? [];
    },
  };
}

export const useUndoHistory = useUndo;
