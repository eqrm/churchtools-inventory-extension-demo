import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  canonicalMasterDataName,
  mapMasterDataItemsToNames,
  normalizeMasterDataName,
  sortMasterDataItems,
  sortMasterDataNames,
} from '../utils/masterData';
import type { MasterDataDefinition, MasterDataItem } from '../utils/masterData';
import { masterDataService } from '../services/MasterDataService';

const masterDataKeys = {
  entity: (entity: MasterDataDefinition['entity']) => ['master-data', entity] as const,
};

export interface UseMasterDataResult {
  items: MasterDataItem[];
  names: string[];
  isLoading: boolean;
  addItem: (name: string) => Promise<MasterDataItem | null>;
  updateItem: (id: string, name: string) => Promise<MasterDataItem>;
  deleteItem: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useMasterData(definition: MasterDataDefinition): UseMasterDataResult {
  const queryClient = useQueryClient();
  const entity = definition.entity;
  const queryKey = masterDataKeys.entity(entity);

  const query = useQuery({
    queryKey,
    queryFn: () => masterDataService.list(entity),
    staleTime: 5 * 60 * 1000,
  });

  const addMutation = useMutation({
    mutationFn: (name: string) => masterDataService.create(entity, name),
    onSuccess: (created) => {
      queryClient.setQueryData<MasterDataItem[]>(queryKey, (prev = []) =>
        sortMasterDataItems([...prev, created])
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => masterDataService.update(entity, id, name),
    onSuccess: (updated) => {
      queryClient.setQueryData<MasterDataItem[]>(queryKey, (prev = []) =>
        sortMasterDataItems(prev.map((item) => (item.id === updated.id ? updated : item)))
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => masterDataService.remove(entity, id),
    onSuccess: (_res, id) => {
      queryClient.setQueryData<MasterDataItem[]>(queryKey, (prev = []) => prev.filter((item) => item.id !== id));
    },
  });

  const addItem = useCallback(
    async (name: string) => {
      const normalized = normalizeMasterDataName(name ?? '');
      if (!normalized) {
        return null;
      }

      const canonical = canonicalMasterDataName(normalized);
      const existing = (query.data ?? []).find(
        (item) => canonicalMasterDataName(item.name) === canonical,
      );
      if (existing) {
        return existing;
      }

      return await addMutation.mutateAsync(normalized);
    },
    [addMutation, query.data]
  );

  const updateItem = useCallback(
    async (id: string, name: string) => {
      const normalized = normalizeMasterDataName(name ?? '');
      if (!normalized) {
        throw new Error('Name is required');
      }
      return await updateMutation.mutateAsync({ id, name: normalized });
    },
    [updateMutation]
  );

  const deleteItem = useCallback(
    async (id: string) => {
      await deleteMutation.mutateAsync(id);
    },
    [deleteMutation]
  );

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  const names = useMemo(
    () => sortMasterDataNames(mapMasterDataItemsToNames(query.data ?? [])),
    [query.data]
  );

  return {
    items: query.data ?? [],
    names,
    isLoading: query.isLoading,
    addItem,
    updateItem,
    deleteItem,
    refresh,
  };
}

export function useMasterDataNames(definition: MasterDataDefinition): string[] {
  return useMasterData(definition).names;
}
