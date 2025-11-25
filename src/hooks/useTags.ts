import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tagService, type TagCreate, type TagUpdate } from '../services/TagService';
import { useTagStore } from '../stores/tagStore';
import type { UUID } from '../types/entities';

/**
 * React Query hook for tags
 * 
 * Provides CRUD operations for tags with caching and optimistic updates
 */
export function useTags() {
  const queryClient = useQueryClient();
  const { setTags, addTag, updateTag: updateTagInStore, removeTag } = useTagStore();

  // Fetch all tags
  const {
    data: tags = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const result = await tagService.getTags();
      setTags(result);
      return result;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Create tag mutation
  const createTagMutation = useMutation({
    mutationFn: (data: TagCreate) => tagService.createTag(data),
    onSuccess: (newTag) => {
      addTag(newTag);
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });

  // Update tag mutation
  const updateTagMutation = useMutation({
    mutationFn: ({ id, data }: { id: UUID; data: TagUpdate }) =>
      tagService.updateTag(id, data),
    onSuccess: (updatedTag) => {
      updateTagInStore(updatedTag.id, updatedTag);
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      queryClient.invalidateQueries({ queryKey: ['tag', updatedTag.id] });
    },
  });

  // Delete tag mutation
  const deleteTagMutation = useMutation({
    mutationFn: (id: UUID) => tagService.deleteTag(id),
    onSuccess: (_, id) => {
      removeTag(id);
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });

  return {
    tags,
    isLoading,
    error,
    refetch,
    createTag: createTagMutation.mutateAsync,
    updateTag: (id: UUID, data: TagUpdate) => updateTagMutation.mutateAsync({ id, data }),
    deleteTag: deleteTagMutation.mutateAsync,
    isCreating: createTagMutation.isPending,
    isUpdating: updateTagMutation.isPending,
    isDeleting: deleteTagMutation.isPending,
  };
}

/**
 * Hook to fetch a single tag by ID
 */
export function useTag(id: UUID | null) {
  return useQuery({
    queryKey: ['tag', id],
    queryFn: () => (id ? tagService.getTag(id) : Promise.resolve(null)),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to manage entity tags (assets, kits, models)
 */
export function useEntityTags(
  entityType: 'asset' | 'kit' | 'model',
  entityId: UUID | null,
) {
  const queryClient = useQueryClient();

  const {
    data: entityTags = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['entityTags', entityType, entityId],
    queryFn: () => (entityId ? tagService.getEntityTags(entityType, entityId) : Promise.resolve([])),
    enabled: !!entityId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Apply tag to entity mutation
  const applyTagMutation = useMutation({
    mutationFn: (tagId: UUID) => {
      if (!entityId) throw new Error('Entity ID is required');
      return tagService.applyTagToEntity(entityType, entityId, tagId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entityTags', entityType, entityId] });
    },
  });

  // Remove tag from entity mutation
  const removeTagMutation = useMutation({
    mutationFn: (tagId: UUID) => {
      if (!entityId) throw new Error('Entity ID is required');
      return tagService.removeTagFromEntity(entityType, entityId, tagId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entityTags', entityType, entityId] });
    },
  });

  return {
    tags: entityTags,
    isLoading,
    error,
    applyTag: applyTagMutation.mutateAsync,
    removeTag: removeTagMutation.mutateAsync,
    isApplying: applyTagMutation.isPending,
    isRemoving: removeTagMutation.isPending,
  };
}

/**
 * Hook for propagating tags from models to assets
 */
export function useModelTagPropagation(modelId: UUID | null) {
  const queryClient = useQueryClient();

  const propagateTagsMutation = useMutation({
    mutationFn: (tagIds: UUID[]) => {
      if (!modelId) throw new Error('Model ID is required');
      return tagService.propagateModelTags(modelId, tagIds);
    },
    onSuccess: () => {
      // Invalidate all entity tags queries since we updated multiple assets
      queryClient.invalidateQueries({ queryKey: ['entityTags'] });
    },
  });

  return {
    propagateTags: propagateTagsMutation.mutateAsync,
    isPropagating: propagateTagsMutation.isPending,
  };
}

/**
 * Hook for propagating tags from kits to sub-assets
 */
export function useKitTagPropagation(kitId: UUID | null) {
  const queryClient = useQueryClient();

  const propagateTagsMutation = useMutation({
    mutationFn: (tagIds: UUID[]) => {
      if (!kitId) throw new Error('Kit ID is required');
      return tagService.propagateKitTags(kitId, tagIds);
    },
    onSuccess: () => {
      // Invalidate all entity tags queries since we updated multiple assets
      queryClient.invalidateQueries({ queryKey: ['entityTags'] });
    },
  });

  return {
    propagateTags: propagateTagsMutation.mutateAsync,
    isPropagating: propagateTagsMutation.isPending,
  };
}
