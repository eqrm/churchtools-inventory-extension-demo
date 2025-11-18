/**
 * TanStack Query hooks for saved views
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useStorageProvider } from './useStorageProvider';
import { useCurrentUser } from './useCurrentUser';
import type { SavedView, SavedViewCreate } from '../types/entities';
import { notifications } from '@mantine/notifications';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation('views');
  
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
        title: t('notifications.createSuccessTitle'),
        message: t('notifications.createSuccessMessage'),
        color: 'green',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: t('notifications.createErrorTitle'),
        message: t('notifications.createErrorMessage', { message: error.message }),
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
  const { t } = useTranslation('views');
  
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
        title: t('notifications.updateSuccessTitle'),
        message: t('notifications.updateSuccessMessage'),
        color: 'green',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: t('notifications.updateErrorTitle'),
        message: t('notifications.updateErrorMessage', { message: error.message }),
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
  const { t } = useTranslation('views');
  
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
        title: t('notifications.deleteSuccessTitle'),
        message: t('notifications.deleteSuccessMessage'),
        color: 'green',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: t('notifications.deleteErrorTitle'),
        message: t('notifications.deleteErrorMessage', { message: error.message }),
        color: 'red',
      });
    },
  });
}
