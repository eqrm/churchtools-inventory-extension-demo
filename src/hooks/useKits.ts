/**
 * TanStack Query hooks for Equipment Kits
 * Provides data fetching and mutation hooks backed by KitService + Zustand store
 *
 * @module hooks/useKits
 */

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useStorageProvider } from './useStorageProvider';
import type { Asset, Kit, KitCreate, KitUpdate } from '../types/entities';
import { KitService } from '../services/KitService';
import { useKitStore } from '../stores/kitStore';
import { useUndoStore } from '../state/undoStore';

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

type UseKitsOptions = {
  enabled?: boolean;
};

/**
 * Hook to fetch all kits
 * @returns Query result with array of kits
 */
export function useKits(options?: UseKitsOptions) {
  const kitService = useKitServiceInternal();
  const upsertKits = useKitStore((state) => state.upsertKits);
  const enabled = options?.enabled ?? true;

  return useQuery({
    queryKey: kitKeys.lists(),
    queryFn: async () => {
      if (!kitService) {
        throw new Error('Kit service unavailable');
      }
      return await kitService.getKits();
    },
    enabled: Boolean(kitService && enabled),
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
  const removeKit = useKitStore((state) => state.removeKit);
  const { t } = useTranslation();
  const { push } = useUndoStore();

  return useMutation({
    mutationFn: (data: KitCreate) => {
      if (!kitService) {
        throw new Error('Kit service unavailable');
      }
      return kitService.createKit(data);
    },
    onSuccess: (newKit, variables) => {
      upsertKit(newKit);
      queryClient.setQueryData(kitKeys.detail(newKit.id), newKit);
      void queryClient.invalidateQueries({ queryKey: kitKeys.lists() });

      push({
        label: t('undo.createKit', { name: newKit.name }),
        undo: async () => {
          if (!kitService) return;
          await kitService.deleteKit(newKit.id);
          removeKit(newKit.id);
          queryClient.removeQueries({ queryKey: kitKeys.detail(newKit.id) });
          void queryClient.invalidateQueries({ queryKey: kitKeys.lists() });
        },
        redo: async () => {
          if (!kitService) return;
          const recreated = await kitService.createKit(variables);
          upsertKit(recreated);
          queryClient.setQueryData(kitKeys.detail(recreated.id), recreated);
          void queryClient.invalidateQueries({ queryKey: kitKeys.lists() });
        },
      });
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
  const { t } = useTranslation();
  const { push } = useUndoStore();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: KitUpdate }) => {
      if (!kitService) {
        throw new Error('Kit service unavailable');
      }
      return kitService.updateKit(id, data);
    },
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: kitKeys.detail(id) });
      const previousKit = queryClient.getQueryData<Kit>(kitKeys.detail(id));
      return { previousKit };
    },
    onSuccess: (updatedKit, variables, context) => {
      upsertKit(updatedKit);
      queryClient.setQueryData(kitKeys.detail(updatedKit.id), updatedKit);
      void queryClient.invalidateQueries({ queryKey: kitKeys.lists() });

      if (context?.previousKit) {
        const { previousKit } = context;
        push({
          label: t('undo.updateKit', { name: updatedKit.name }),
          undo: async () => {
            if (!kitService) return;
            const restoreUpdate: KitUpdate = {
              name: previousKit.name,
              description: previousKit.description,
              type: previousKit.type,
              location: previousKit.location,
              status: previousKit.status,
              tags: previousKit.tags,
              inheritedProperties: previousKit.inheritedProperties,
              completenessStatus: previousKit.completenessStatus,
              assemblyDate: previousKit.assemblyDate,
              disassemblyDate: previousKit.disassemblyDate,
              boundAssets: previousKit.boundAssets,
              poolRequirements: previousKit.poolRequirements,
            };
            const restored = await kitService.updateKit(previousKit.id, restoreUpdate);
            upsertKit(restored);
            queryClient.setQueryData(kitKeys.detail(restored.id), restored);
            void queryClient.invalidateQueries({ queryKey: kitKeys.lists() });
          },
          redo: async () => {
            if (!kitService) return;
            const reUpdated = await kitService.updateKit(variables.id, variables.data);
            upsertKit(reUpdated);
            queryClient.setQueryData(kitKeys.detail(reUpdated.id), reUpdated);
            void queryClient.invalidateQueries({ queryKey: kitKeys.lists() });
          },
        });
      }
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
  const upsertKit = useKitStore((state) => state.upsertKit);
  const { t } = useTranslation();
  const { push } = useUndoStore();

  return useMutation({
    mutationFn: (id: string) => {
      if (!kitService) {
        throw new Error('Kit service unavailable');
      }
      return kitService.deleteKit(id);
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: kitKeys.detail(id) });
      const previousKit = queryClient.getQueryData<Kit>(kitKeys.detail(id));
      return { previousKit };
    },
    onSuccess: (_, id, context) => {
      removeKit(id);
      queryClient.removeQueries({ queryKey: kitKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: kitKeys.lists() });

      if (context?.previousKit) {
        const { previousKit } = context;
        let restoredId: string | null = null;

        push({
          label: t('undo.deleteKit', { name: previousKit.name }),
          undo: async () => {
            if (!kitService) return;
            const createData: KitCreate = {
              name: previousKit.name,
              description: previousKit.description,
              type: previousKit.type,
              location: previousKit.location,
              status: previousKit.status,
              tags: previousKit.tags,
              inheritedProperties: previousKit.inheritedProperties,
              completenessStatus: previousKit.completenessStatus,
              assemblyDate: previousKit.assemblyDate,
              disassemblyDate: previousKit.disassemblyDate,
              boundAssets: previousKit.boundAssets,
              poolRequirements: previousKit.poolRequirements,
            };
            const restored = await kitService.createKit(createData);
            restoredId = restored.id;
            upsertKit(restored);
            queryClient.setQueryData(kitKeys.detail(restored.id), restored);
            void queryClient.invalidateQueries({ queryKey: kitKeys.lists() });
          },
          redo: async () => {
            if (!kitService) return;
            const idToDelete = restoredId || id;
            await kitService.deleteKit(idToDelete);
            removeKit(idToDelete);
            queryClient.removeQueries({ queryKey: kitKeys.detail(idToDelete) });
            void queryClient.invalidateQueries({ queryKey: kitKeys.lists() });
            restoredId = null;
          },
        });
      }
    },
  });
}

export function useDisassembleKit() {
  const kitService = useKitServiceInternal();
  const queryClient = useQueryClient();
  const upsertKit = useKitStore((state) => state.upsertKit);
  const { t } = useTranslation();
  const { push } = useUndoStore();

  return useMutation({
    mutationFn: (id: string) => {
      if (!kitService) {
        throw new Error('Kit service unavailable');
      }
      return kitService.disassembleKit(id);
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: kitKeys.detail(id) });
      const previousKit = queryClient.getQueryData<Kit>(kitKeys.detail(id));
      return { previousKit };
    },
    onSuccess: (kit, id, context) => {
      upsertKit(kit);
      queryClient.setQueryData(kitKeys.detail(kit.id), kit);
      void queryClient.invalidateQueries({ queryKey: kitKeys.lists() });

      if (context?.previousKit) {
        const { previousKit } = context;
        push({
          label: t('undo.disassembleKit', { name: kit.name }),
          undo: async () => {
            if (!kitService) return;
            const assembleData = {
              boundAssets: previousKit.boundAssets,
              inheritedProperties: previousKit.inheritedProperties,
            };
            const reassembled = await kitService.assembleKit(id, assembleData);
            upsertKit(reassembled);
            queryClient.setQueryData(kitKeys.detail(reassembled.id), reassembled);
            void queryClient.invalidateQueries({ queryKey: kitKeys.lists() });
          },
          redo: async () => {
            if (!kitService) return;
            const disassembled = await kitService.disassembleKit(id);
            upsertKit(disassembled);
            queryClient.setQueryData(kitKeys.detail(disassembled.id), disassembled);
            void queryClient.invalidateQueries({ queryKey: kitKeys.lists() });
          },
        });
      }
    },
  });
}
