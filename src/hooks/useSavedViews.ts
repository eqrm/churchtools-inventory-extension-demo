/**
 * TanStack Query hooks for saved views
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useStorageProvider } from './useStorageProvider';
import { useCurrentUser } from './useCurrentUser';
import type { SavedView, SavedViewCreate } from '../types/entities';
import { notifications } from '@mantine/notifications';

// Query keys factory
export const savedViewKeys = {
  all: ['savedViews'] as const,
  lists: () => [...savedViewKeys.all, 'list'] as const,
  list: (userId: string) => [...savedViewKeys.lists(), userId] as const,
  details: () => [...savedViewKeys.all, 'detail'] as const,
  detail: (id: string) => [...savedViewKeys.details(), id] as const,
};

/**
 * Fetch all saved views for current user
 */
export function useSavedViews() {
  const storage = useStorageProvider();
  const { data: currentUser } = useCurrentUser();
  
  return useQuery({
    queryKey: savedViewKeys.list(currentUser?.id ?? ''),
    queryFn: () => {
      if (!storage || !currentUser?.id) {
        throw new Error('Storage provider or user ID not available');
      }
      return storage.getSavedViews(currentUser.id);
    },
    enabled: !!storage && !!currentUser?.id,
  });
}

/**
 * Fetch single saved view by ID
 */
export function useSavedView(id: string | undefined) {
  const { data: views } = useSavedViews();
  
  return useQuery({
    queryKey: savedViewKeys.detail(id ?? ''),
    queryFn: () => {
      if (!id) throw new Error('View ID required');
      const view = views?.find((v: SavedView) => v.id === id);
      if (!view) throw new Error('View not found');
      return view;
    },
    enabled: !!id && !!views,
  });
}

/**
 * Create new saved view
 */
export function useCreateSavedView() {
  const storage = useStorageProvider();
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: SavedViewCreate) => {
      if (!storage) throw new Error('Storage provider not available');
      return storage.createSavedView(data);
    },
    onSuccess: () => {
      if (currentUser?.id) {
        queryClient.invalidateQueries({ queryKey: savedViewKeys.list(currentUser.id) });
      }
      notifications.show({
        title: 'View saved',
        message: 'The view was saved successfully',
        color: 'green',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Failed to save view',
        message: error.message,
        color: 'red',
      });
    },
  });
}

/**
 * Update existing saved view
 */
export function useUpdateSavedView() {
  const storage = useStorageProvider();
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<SavedView> }) => {
      if (!storage) throw new Error('Storage provider not available');
      return storage.updateSavedView(id, updates);
    },
    onSuccess: (_: SavedView, { id }: { id: string; updates: Partial<SavedView> }) => {
      if (currentUser?.id) {
        queryClient.invalidateQueries({ queryKey: savedViewKeys.list(currentUser.id) });
      }
      queryClient.invalidateQueries({ queryKey: savedViewKeys.detail(id) });
      notifications.show({
        title: 'View updated',
        message: 'The view was updated successfully',
        color: 'green',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Failed to update view',
        message: error.message,
        color: 'red',
      });
    },
  });
}

/**
 * Delete saved view
 */
export function useDeleteSavedView() {
  const storage = useStorageProvider();
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => {
      if (!storage) throw new Error('Storage provider not available');
      return storage.deleteSavedView(id);
    },
    onSuccess: () => {
      if (currentUser?.id) {
        queryClient.invalidateQueries({ queryKey: savedViewKeys.list(currentUser.id) });
      }
      notifications.show({
        title: 'View deleted',
        message: 'The view was deleted successfully',
        color: 'green',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Failed to delete view',
        message: error.message,
        color: 'red',
      });
    },
  });
}
