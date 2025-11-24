import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useStorageProvider } from './useStorageProvider';
import type { Asset, AssetCreate, AssetUpdate, AssetFilters } from '../types/entities';
import { useKitAssets } from './useKitAssets';
import { useKitServiceInstance } from './useKits';
import { resolveAssetById } from '../utils/assetResolution';
import { isKitAssetId } from '../utils/kitAssets';
import { useUndoStore } from '../state/undoStore';

function normalizeAssetUpdate(update: AssetUpdate): Partial<Asset> {
  const {
    mainImage,
    assetGroup,
    fieldSources,
    childAssetIds,
    kitId,
    modelId,
    tagIds,
    inheritedTagIds,
    ...rest
  } = update;

  const normalized: Partial<Asset> = { ...(rest as Partial<Asset>) };

  if (Object.prototype.hasOwnProperty.call(update, 'mainImage')) {
    normalized.mainImage = mainImage ?? undefined;
  }
  if (Object.prototype.hasOwnProperty.call(update, 'assetGroup')) {
    normalized.assetGroup = assetGroup ?? undefined;
  }
  if (Object.prototype.hasOwnProperty.call(update, 'fieldSources')) {
    normalized.fieldSources = fieldSources ?? undefined;
  }
  if (Object.prototype.hasOwnProperty.call(update, 'childAssetIds')) {
    normalized.childAssetIds = childAssetIds ?? undefined;
  }
  if (Object.prototype.hasOwnProperty.call(update, 'kitId')) {
    normalized.kitId = kitId ?? undefined;
  }
  if (Object.prototype.hasOwnProperty.call(update, 'modelId')) {
    normalized.modelId = modelId ?? undefined;
  }
  if (Object.prototype.hasOwnProperty.call(update, 'tagIds')) {
    normalized.tagIds = tagIds ?? undefined;
  }
  if (Object.prototype.hasOwnProperty.call(update, 'inheritedTagIds')) {
    normalized.inheritedTagIds = inheritedTagIds ?? undefined;
  }

  return normalized;
}

/**
 * Query key factory for assets
 */
export const assetKeys = {
  all: ['assets'] as const,
  lists: () => [...assetKeys.all, 'list'] as const,
  list: (filters?: AssetFilters) => [...assetKeys.lists(), { filters }] as const,
  details: () => [...assetKeys.all, 'detail'] as const,
  detail: (id: string) => [...assetKeys.details(), id] as const,
  byNumber: (assetNumber: string) => [...assetKeys.all, 'byNumber', assetNumber] as const,
};

export function combineAssetsWithKitAssets(
  baseAssets: Asset[] | undefined,
  kitAssets: Asset[],
): Asset[] | undefined {
  if (!kitAssets.length) {
    return baseAssets;
  }

  if (!baseAssets || baseAssets.length === 0) {
    return [...kitAssets];
  }

  return [...baseAssets, ...kitAssets];
}

/**
 * Hook to fetch assets with optional filtering
 */
export function useAssets(filters?: AssetFilters) {
  const provider = useStorageProvider();
  const {
    kitAssets,
    isLoading: kitLoading,
    isFetching: kitFetching,
    error: kitError,
  } = useKitAssets(filters, { force: true });

  const queryResult = useQuery({
    queryKey: assetKeys.list(filters),
    queryFn: async () => {
      if (!provider) throw new Error('Storage provider not initialized');
      return await provider.getAssets(filters);
    },
    enabled: !!provider,
    staleTime: 2 * 60 * 1000, // 2 minutes (assets change more frequently than categories)
  });

  const combinedData = useMemo<Asset[] | undefined>(() => {
    return combineAssetsWithKitAssets(queryResult.data, kitAssets);
  }, [queryResult.data, kitAssets]);

  return {
    ...queryResult,
    data: combinedData,
    isLoading: queryResult.isLoading || kitLoading,
    isFetching: queryResult.isFetching || kitFetching,
    error: queryResult.error ?? kitError ?? undefined,
  };
}

/**
 * Hook to fetch a single asset by ID
 */
export function useAsset(id: string | undefined) {
  const provider = useStorageProvider();
  const kitService = useKitServiceInstance();
  const isKitId = id ? isKitAssetId(id) : false;

  return useQuery({
    queryKey: assetKeys.detail(id ?? ''),
    queryFn: async () => {
      if (!id) throw new Error('Asset ID is required');
      return await resolveAssetById(id, {
        storageProvider: provider,
        kitService,
      });
    },
    enabled: Boolean(id && (isKitId ? kitService : provider)),
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook to fetch an asset by its asset number
 */
export function useAssetByNumber(assetNumber: string | undefined) {
  const provider = useStorageProvider();

  return useQuery({
    queryKey: assetKeys.byNumber(assetNumber ?? ''),
    queryFn: async () => {
      if (!provider) throw new Error('Storage provider not initialized');
      if (!assetNumber) throw new Error('Asset number is required');
      return await provider.getAssetByNumber(assetNumber);
    },
    enabled: !!provider && !!assetNumber,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook to create a new asset
 */
export function useCreateAsset() {
  const queryClient = useQueryClient();
  const provider = useStorageProvider();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (data: AssetCreate) => {
      if (!provider) throw new Error('Storage provider not initialized');
      return await provider.createAsset(data);
    },
    onMutate: async (newAsset) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: assetKeys.lists() });

      // Snapshot previous value
      const previousAssets = queryClient.getQueryData(assetKeys.lists());

      // Optimistically update to show the new asset immediately
      queryClient.setQueryData<Asset[]>(assetKeys.lists(), (old) => {
        if (!old) return old;
        // Create temporary asset with optimistic data
        const tempAsset: Asset = {
          ...newAsset,
          id: `temp-${Date.now().toString()}`,
          createdBy: 'current-user',
          createdByName: 'Current User',
          createdAt: new Date().toISOString(),
          lastModifiedBy: 'current-user',
          lastModifiedByName: 'Current User',
          lastModifiedAt: new Date().toISOString(),
        } as Asset;
        return [...old, tempAsset];
      });

      return { previousAssets };
    },
    onError: (_err, _newAsset, context) => {
      // Rollback on error
      if (context?.previousAssets) {
        queryClient.setQueryData(assetKeys.lists(), context.previousAssets);
      }
    },
    onSuccess: (newAsset, variables) => {
      // Invalidate all asset lists
      void queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
      
      // Add to detail cache
      queryClient.setQueryData(assetKeys.detail(newAsset.id), newAsset);
      queryClient.setQueryData(assetKeys.byNumber(newAsset.assetNumber), newAsset);
      
      // Invalidate change history for new asset (T262 - E3)
      void queryClient.invalidateQueries({ queryKey: ['changeHistory', 'asset', newAsset.id] });

      // Undo support
      let currentId = newAsset.id;
      useUndoStore.getState().push({
        label: t('undo.createAsset', { name: newAsset.name }),
        undo: async () => {
          if (!provider) return;
          await provider.deleteAsset(currentId);
          queryClient.removeQueries({ queryKey: assetKeys.detail(currentId) });
          void queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
        },
        redo: async () => {
          if (!provider) return;
          const reCreatedAsset = await provider.createAsset(variables);
          currentId = reCreatedAsset.id;
          void queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
        }
      });
    },
  });
}

/**
 * T094 - US4: Hook to create multiple assets (parent + children)
 */
export function useCreateMultiAsset() {
  const queryClient = useQueryClient();
  const provider = useStorageProvider();

  return useMutation({
    mutationFn: async ({data, quantity}: {data: AssetCreate; quantity: number}) => {
      if (!provider) throw new Error('Storage provider not initialized');
      return await provider.createMultiAsset(data, quantity);
    },
    onSuccess: (newAssets) => {
      // Invalidate all asset lists to refetch
      void queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
      
      // Add each asset to detail cache
      newAssets.forEach(asset => {
        queryClient.setQueryData(assetKeys.detail(asset.id), asset);
        queryClient.setQueryData(assetKeys.byNumber(asset.assetNumber), asset);
      });
    },
  });
}

/**
 * Hook to update an existing asset
 */
export function useUpdateAsset() {
  const queryClient = useQueryClient();
  const provider = useStorageProvider();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: AssetUpdate }) => {
      if (!provider) throw new Error('Storage provider not initialized');
      return await provider.updateAsset(id, data);
    },
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: assetKeys.detail(id) });

      // Snapshot previous value
      const previousAsset = queryClient.getQueryData<Asset>(assetKeys.detail(id));

      // Optimistically update
      if (previousAsset) {
        const normalizedData = normalizeAssetUpdate(data);
        queryClient.setQueryData<Asset>(assetKeys.detail(id), {
          ...previousAsset,
          ...normalizedData,
          lastModifiedAt: new Date().toISOString(),
        });
      }

      return { previousAsset };
    },
    onError: (_err, { id }, context) => {
      // Rollback on error
      if (context?.previousAsset) {
        queryClient.setQueryData(assetKeys.detail(id), context.previousAsset);
      }
    },
    onSuccess: (updatedAsset, variables, context) => {
      // Update caches with setQueryData to avoid refetches
      queryClient.setQueryData(assetKeys.detail(updatedAsset.id), updatedAsset);
      queryClient.setQueryData(assetKeys.byNumber(updatedAsset.assetNumber), updatedAsset);
      
      // Update asset lists by modifying the cached data directly
      queryClient.setQueriesData<Asset[]>(
        { queryKey: assetKeys.lists() },
        (old) => {
          if (!old) return old;
          return old.map((asset) => 
            asset.id === updatedAsset.id ? updatedAsset : asset
          );
        }
      );
      
      // Invalidate change history after update (T262 - E3)
      // Use a slight delay to avoid race conditions with the update
      setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: ['changeHistory', 'asset', updatedAsset.id] });
      }, 100);

      // Undo support
      if (context?.previousAsset) {
        const previousAsset = context.previousAsset;
        useUndoStore.getState().push({
          label: t('undo.updateAsset', { name: updatedAsset.name }),
          undo: async () => {
            if (!provider) return;
            // Best effort restore using updateAsset
            await provider.updateAsset(updatedAsset.id, previousAsset as unknown as AssetUpdate);
            queryClient.setQueryData(assetKeys.detail(updatedAsset.id), previousAsset);
            void queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
          },
          redo: async () => {
            if (!provider) return;
            await provider.updateAsset(updatedAsset.id, variables.data);
            queryClient.setQueryData(assetKeys.detail(updatedAsset.id), updatedAsset);
            void queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
          }
        });
      }
    },
  });
}

/**
 * Hook to delete an asset
 */
export function useDeleteAsset() {
  const queryClient = useQueryClient();
  const provider = useStorageProvider();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!provider) throw new Error('Storage provider not initialized');
      await provider.deleteAsset(id);
      return id;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: assetKeys.detail(id) });
      const previousAsset = queryClient.getQueryData<Asset>(assetKeys.detail(id));
      return { previousAsset };
    },
    onSuccess: (deletedId, _variables, context) => {
      // Remove from all caches
      queryClient.removeQueries({ queryKey: assetKeys.detail(deletedId) });
      void queryClient.invalidateQueries({ queryKey: assetKeys.lists() });

      // Undo support
      if (context?.previousAsset) {
        const previousAsset = context.previousAsset;
        let restoredId: string | null = null;

        useUndoStore.getState().push({
          label: t('undo.deleteAsset', { name: previousAsset.name }),
          undo: async () => {
            if (!provider) return;
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { id, ...assetData } = previousAsset;
            const newAsset = await provider.createAsset(assetData as unknown as AssetCreate);
            restoredId = newAsset.id;
            void queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
          },
          redo: async () => {
            if (!provider) return;
            if (restoredId) {
              await provider.deleteAsset(restoredId);
              restoredId = null;
            }
            void queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
          }
        });
      }
    },
  });
}

/**
 * T283 - E2: Hook to regenerate asset barcode
 * Archives old barcode and generates new one
 */
export function useRegenerateBarcode() {
  const queryClient = useQueryClient();
  const provider = useStorageProvider();

  return useMutation({
    mutationFn: async ({ id, reason, newBarcode }: { id: string; reason?: string; newBarcode?: string }) => {
      if (!provider) throw new Error('Storage provider not initialized');
      return await provider.regenerateAssetBarcode(id, reason, newBarcode);
    },
    onSuccess: (updatedAsset) => {
      // Update caches with new barcode
      queryClient.setQueryData(assetKeys.detail(updatedAsset.id), updatedAsset);
      queryClient.setQueryData(assetKeys.byNumber(updatedAsset.assetNumber), updatedAsset);
      
      // Update asset lists
      queryClient.setQueriesData<Asset[]>(
        { queryKey: assetKeys.lists() },
        (old) => {
          if (!old) return old;
          return old.map((asset) => 
            asset.id === updatedAsset.id ? updatedAsset : asset
          );
        }
      );
      
      // Invalidate change history
      setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: ['changeHistory', 'asset', updatedAsset.id] });
      }, 100);
    },
  });
}
