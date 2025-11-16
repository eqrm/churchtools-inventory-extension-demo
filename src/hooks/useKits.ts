/**
 * TanStack Query hooks for Equipment Kits
 * Provides data fetching and mutation hooks backed by KitService + Zustand store
 *
 * @module hooks/useKits
 */

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useStorageProvider } from './useStorageProvider';
import type { Asset, KitCreate, KitUpdate } from '../types/entities';
import { KitService } from '../services/KitService';
import { useKitStore } from '../stores/kitStore';

/**
 * Query key factory for kits
 */
export const kitKeys = {
  all: ['kits'] as const,
  lists: () => [...kitKeys.all, 'list'] as const,
  list: (filters?: unknown) => [...kitKeys.lists(), filters] as const,
  details: () => [...kitKeys.all, 'detail'] as const,
  detail: (id: string) => [...kitKeys.details(), id] as const,
  availability: (id: string, startDate: string, endDate: string) =>
    [...kitKeys.detail(id), 'availability', startDate, endDate] as const,
  subAssets: (id: string) => [...kitKeys.detail(id), 'sub-assets'] as const,
};

function useKitServiceInternal(): KitService | null {
  const storageProvider = useStorageProvider();
  return useMemo(() => {
    if (!storageProvider) {
      return null;
    }
    return new KitService({ storageProvider });
  }, [storageProvider]);
}

/**
 * Helper hook to access KitService instance
 */
export function useKitServiceInstance(): KitService | null {
  return useKitServiceInternal();
}

/**
 * Hook to fetch all kits
 * @returns Query result with array of kits
 */
export function useKits() {
  const kitService = useKitServiceInternal();
  const upsertKits = useKitStore((state) => state.upsertKits);

  return useQuery({
    queryKey: kitKeys.lists(),
    queryFn: async () => {
      if (!kitService) {
        throw new Error('Kit service unavailable');
      }
      return await kitService.getKits();
    },
    enabled: Boolean(kitService),
    onSuccess: (kits) => {
      upsertKits(kits);
    },
  });
}

/**
 * Hook to fetch a single kit by ID
 * @param id - Kit ID
 * @returns Query result with kit or null
 */
export function useKit(id: string | undefined) {
  const kitService = useKitServiceInternal();
  const cachedKit = useKitStore((state) => (id ? state.kitsById[id] : undefined));
  const upsertKit = useKitStore((state) => state.upsertKit);

  return useQuery({
    queryKey: kitKeys.detail(id ?? 'unknown'),
    queryFn: async () => {
      if (!kitService || !id) {
        throw new Error('Kit service unavailable');
      }
      const kit = await kitService.getKit(id);
      if (kit) {
        upsertKit(kit);
      }
      return kit;
    },
    enabled: Boolean(id && kitService),
    initialData: cachedKit,
  });
}

/**
 * Hook to check kit availability for a date range
 * @param kitId - Kit ID
 * @param startDate - Start date (ISO 8601)
 * @param endDate - End date (ISO 8601)
 * @returns Query result with availability information
 */
export function useKitAvailability(
  kitId: string,
  startDate: string,
  endDate: string
) {
  const storage = useStorageProvider();

  return useQuery({
    queryKey: kitKeys.availability(kitId, startDate, endDate),
    queryFn: () => {
      if (!storage) throw new Error('Storage provider not available');
      return storage.isKitAvailable(kitId, startDate, endDate);
    },
    enabled: Boolean(kitId && startDate && endDate),
  });
}

/**
 * Hook to fetch sub-assets for a kit
 */
export function useKitSubAssets(kitId: string | undefined) {
  const kitService = useKitServiceInternal();
  const cached = useKitStore((state) => (kitId ? state.subAssetsByKit[kitId] : undefined));
  const setKitSubAssets = useKitStore((state) => state.setKitSubAssets);

  return useQuery<Asset[]>({
    queryKey: kitKeys.subAssets(kitId ?? 'unknown'),
    queryFn: async () => {
      if (!kitService || !kitId) {
        throw new Error('Kit service unavailable');
      }
      const assets = await kitService.getKitSubAssets(kitId);
      setKitSubAssets(kitId, assets);
      return assets;
    },
    enabled: Boolean(kitId && kitService),
    initialData: cached,
  });
}

/**
 * Hook to create a new kit
 * Invalidates kit list cache on success
 * @returns Mutation object for creating kits
 */
export function useCreateKit() {
  const kitService = useKitServiceInternal();
  const queryClient = useQueryClient();
  const upsertKit = useKitStore((state) => state.upsertKit);

  return useMutation({
    mutationFn: (data: KitCreate) => {
      if (!kitService) {
        throw new Error('Kit service unavailable');
      }
      return kitService.createKit(data);
    },
    onSuccess: (newKit) => {
      upsertKit(newKit);
      queryClient.setQueryData(kitKeys.detail(newKit.id), newKit);
      void queryClient.invalidateQueries({ queryKey: kitKeys.lists() });
    },
  });
}

/**
 * Hook to update an existing kit
 * Invalidates kit cache on success
 * @returns Mutation object for updating kits
 */
export function useUpdateKit() {
  const kitService = useKitServiceInternal();
  const queryClient = useQueryClient();
  const upsertKit = useKitStore((state) => state.upsertKit);

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: KitUpdate }) => {
      if (!kitService) {
        throw new Error('Kit service unavailable');
      }
      return kitService.updateKit(id, data);
    },
    onSuccess: (updatedKit) => {
      upsertKit(updatedKit);
      queryClient.setQueryData(kitKeys.detail(updatedKit.id), updatedKit);
      void queryClient.invalidateQueries({ queryKey: kitKeys.lists() });
    },
  });
}

/**
 * Hook to delete a kit
 * Invalidates kit cache on success
 * @returns Mutation object for deleting kits
 */
export function useDeleteKit() {
  const kitService = useKitServiceInternal();
  const queryClient = useQueryClient();
  const removeKit = useKitStore((state) => state.removeKit);

  return useMutation({
    mutationFn: (id: string) => {
      if (!kitService) {
        throw new Error('Kit service unavailable');
      }
      return kitService.deleteKit(id);
    },
    onSuccess: (_, id) => {
      removeKit(id);
      queryClient.removeQueries({ queryKey: kitKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: kitKeys.lists() });
    },
  });
}

export function useDisassembleKit() {
  const kitService = useKitServiceInternal();
  const queryClient = useQueryClient();
  const upsertKit = useKitStore((state) => state.upsertKit);

  return useMutation({
    mutationFn: (id: string) => {
      if (!kitService) {
        throw new Error('Kit service unavailable');
      }
      return kitService.disassembleKit(id);
    },
    onSuccess: (kit) => {
      upsertKit(kit);
      queryClient.setQueryData(kitKeys.detail(kit.id), kit);
      void queryClient.invalidateQueries({ queryKey: kitKeys.lists() });
    },
  });
}
