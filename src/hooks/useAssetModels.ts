import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assetModelService } from '../services/AssetModelService';
import { useModelStore } from '../stores/modelStore';
import type { AssetModelCreate, AssetModelUpdate } from '../types/model';

/**
 * React Query hook for asset models
 * 
 * Provides CRUD operations for asset models with caching and optimistic updates
 */
export function useAssetModels() {
  const queryClient = useQueryClient();
  const { setModels, addModel, updateModel: updateModelInStore, removeModel } = useModelStore();

  // Fetch all models
  const {
    data: models = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['assetModels'],
    queryFn: async () => {
      const result = await assetModelService.getModels();
      setModels(result);
      return result;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Create model mutation
  const createModelMutation = useMutation({
    mutationFn: (data: AssetModelCreate) => assetModelService.createModel(data),
    onSuccess: (newModel) => {
      addModel(newModel);
      queryClient.invalidateQueries({ queryKey: ['assetModels'] });
    },
  });

  // Update model mutation
  const updateModelMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: AssetModelUpdate }) =>
      assetModelService.updateModel(id, data),
    onSuccess: (updatedModel) => {
      updateModelInStore(updatedModel.id, updatedModel);
      queryClient.invalidateQueries({ queryKey: ['assetModels'] });
      queryClient.invalidateQueries({ queryKey: ['assetModel', updatedModel.id] });
    },
  });

  // Delete model mutation
  const deleteModelMutation = useMutation({
    mutationFn: (id: string) => assetModelService.deleteModel(id),
    onSuccess: (_, id) => {
      removeModel(id);
      queryClient.invalidateQueries({ queryKey: ['assetModels'] });
    },
  });

  return {
    models,
    isLoading,
    error,
    refetch,
    createModel: createModelMutation.mutateAsync,
    updateModel: (id: string, data: AssetModelUpdate) => updateModelMutation.mutateAsync({ id, data }),
    deleteModel: deleteModelMutation.mutateAsync,
    isCreating: createModelMutation.isPending,
    isUpdating: updateModelMutation.isPending,
    isDeleting: deleteModelMutation.isPending,
  };
}

/**
 * Hook to fetch a single asset model by ID
 */
export function useAssetModel(id: string | null) {
  return useQuery({
    queryKey: ['assetModel', id],
    queryFn: () => (id ? assetModelService.getModel(id) : Promise.resolve(null)),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to get assets created from a specific model
 */
export function useAssetsFromModel(modelId: string | null) {
  return useQuery({
    queryKey: ['assetsFromModel', modelId],
    queryFn: () => (modelId ? assetModelService.getAssetsFromModel(modelId) : Promise.resolve([])),
    enabled: !!modelId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
