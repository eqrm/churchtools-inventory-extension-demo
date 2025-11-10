import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AssetGroup,
  AssetGroupCreate,
  AssetGroupFilters,
  AssetGroupUpdate,
  AssetUpdate,
} from '../types/entities';
import { useStorageProvider } from './useStorageProvider';
import { convertAssetToGroup, type ConvertAssetToGroupOptions, type ConvertAssetToGroupResult } from '../services/asset-groups/operations';
import { assetKeys } from './useAssets';
import { bookingKeys } from './useBookings';
import type { GroupBookingCreate } from '../types/storage';

export const assetGroupKeys = {
  all: ['asset-groups'] as const,
  lists: () => [...assetGroupKeys.all, 'list'] as const,
  list: (filters?: AssetGroupFilters) => [...assetGroupKeys.lists(), filters ?? {}] as const,
  details: () => [...assetGroupKeys.all, 'detail'] as const,
  detail: (groupId: string) => [...assetGroupKeys.details(), groupId] as const,
  members: (groupId: string) => [...assetGroupKeys.detail(groupId), 'members'] as const,
};

export function useAssetGroups(filters?: AssetGroupFilters) {
  const provider = useStorageProvider();

  return useQuery({
    queryKey: assetGroupKeys.list(filters),
    queryFn: async () => {
      if (!provider) throw new Error('Storage provider not initialized');
      return await provider.getAssetGroups(filters);
    },
    enabled: !!provider,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAssetGroup(groupId: string | undefined) {
  const provider = useStorageProvider();

  return useQuery({
    queryKey: assetGroupKeys.detail(groupId ?? ''),
    queryFn: async () => {
      if (!provider) throw new Error('Storage provider not initialized');
      if (!groupId) throw new Error('Asset group ID is required');
      return await provider.getAssetGroup(groupId);
    },
    enabled: !!provider && !!groupId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useGroupMembers(groupId: string | undefined) {
  const provider = useStorageProvider();

  return useQuery({
    queryKey: assetGroupKeys.members(groupId ?? ''),
    queryFn: async () => {
      if (!provider) throw new Error('Storage provider not initialized');
      if (!groupId) throw new Error('Asset group ID is required');
      return await provider.getGroupMembers(groupId);
    },
    enabled: !!provider && !!groupId,
    staleTime: 60 * 1000,
  });
}

export function useCreateAssetGroup() {
  const provider = useStorageProvider();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AssetGroupCreate) => {
      if (!provider) throw new Error('Storage provider not initialized');
      return await provider.createAssetGroup(data);
    },
    onSuccess: (group) => {
      void queryClient.invalidateQueries({ queryKey: assetGroupKeys.lists() });
      queryClient.setQueryData(assetGroupKeys.detail(group.id), group);
    },
  });
}

export function useUpdateAssetGroup() {
  const provider = useStorageProvider();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: AssetGroupUpdate }) => {
      if (!provider) throw new Error('Storage provider not initialized');
      return await provider.updateAssetGroup(id, data);
    },
    onSuccess: (group) => {
      queryClient.setQueryData(assetGroupKeys.detail(group.id), group);
      void queryClient.invalidateQueries({ queryKey: assetGroupKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: assetGroupKeys.members(group.id) });
    },
  });
}

export function useDeleteAssetGroup() {
  const provider = useStorageProvider();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (groupId: string) => {
      if (!provider) throw new Error('Storage provider not initialized');
      await provider.deleteAssetGroup(groupId);
      return groupId;
    },
    onSuccess: (groupId) => {
      queryClient.removeQueries({ queryKey: assetGroupKeys.detail(groupId) });
      void queryClient.invalidateQueries({ queryKey: assetGroupKeys.lists() });
    },
  });
}

export function useAddAssetToGroup() {
  const provider = useStorageProvider();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ assetId, groupId }: { assetId: string; groupId: string }) => {
      if (!provider) throw new Error('Storage provider not initialized');
      return await provider.addAssetToGroup(assetId, groupId);
    },
    onSuccess: (asset) => {
      if (asset.assetGroup?.id) {
        void queryClient.invalidateQueries({ queryKey: assetGroupKeys.members(asset.assetGroup.id) });
        void queryClient.invalidateQueries({ queryKey: assetGroupKeys.detail(asset.assetGroup.id) });
      }
    },
  });
}

export function useRemoveAssetFromGroup() {
  const provider = useStorageProvider();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assetId: string) => {
      if (!provider) throw new Error('Storage provider not initialized');
      return await provider.removeAssetFromGroup(assetId);
    },
    onSuccess: (asset) => {
      const groupId = asset.assetGroup?.id;
      if (groupId) {
        void queryClient.invalidateQueries({ queryKey: assetGroupKeys.members(groupId) });
        void queryClient.invalidateQueries({ queryKey: assetGroupKeys.detail(groupId) });
      }
    },
  });
}

export function useConvertAssetToGroup() {
  const provider = useStorageProvider();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ assetId, options }: { assetId: string; options?: Omit<ConvertAssetToGroupOptions, 'provider'>; }) => {
      if (!provider) throw new Error('Storage provider not initialized');
      return await convertAssetToGroup(assetId, {
        ...options,
        provider,
      });
    },
    onSuccess: ({ group, asset }: ConvertAssetToGroupResult) => {
      // Update asset caches
      queryClient.setQueryData(assetKeys.detail(asset.id), asset);
      queryClient.setQueryData(assetKeys.byNumber(asset.assetNumber), asset);

      // Invalidate asset lists to ensure membership counts refresh
      void queryClient.invalidateQueries({ queryKey: assetKeys.lists() });

      // Update group caches
      queryClient.setQueryData(assetGroupKeys.detail(group.id), group);
      void queryClient.invalidateQueries({ queryKey: assetGroupKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: assetGroupKeys.members(group.id) });
    },
  });
}

export function useRegenerateAssetGroupBarcode() {
  const provider = useStorageProvider();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason, newBarcode }: { id: string; reason?: string; newBarcode?: string }) => {
      if (!provider) throw new Error('Storage provider not initialized');
      return await provider.regenerateAssetGroupBarcode(id, reason, newBarcode);
    },
    onSuccess: (group) => {
      queryClient.setQueryData(assetGroupKeys.detail(group.id), group);
      queryClient.setQueriesData<AssetGroup[]>(
        { queryKey: assetGroupKeys.lists() },
        (old) => (old ? old.map((entry) => (entry.id === group.id ? group : entry)) : old),
      );
      void queryClient.invalidateQueries({ queryKey: assetGroupKeys.members(group.id) });
    },
  });
}

export function useDissolveAssetGroup() {
  const provider = useStorageProvider();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (groupId: string) => {
      if (!provider) throw new Error('Storage provider not initialized');
      return await provider.dissolveAssetGroup(groupId);
    },
    onSuccess: (group) => {
      queryClient.setQueryData(assetGroupKeys.detail(group.id), group);
      void queryClient.invalidateQueries({ queryKey: assetGroupKeys.members(group.id) });
      void queryClient.invalidateQueries({ queryKey: assetGroupKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
    },
  });
}

export function useReassignAssetToGroup() {
  const provider = useStorageProvider();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ assetId, targetGroupId }: { assetId: string; targetGroupId: string; currentGroupId?: string | null }) => {
      if (!provider) throw new Error('Storage provider not initialized');
      return await provider.reassignAssetToGroup(assetId, targetGroupId);
    },
    onSuccess: (asset, variables) => {
      void queryClient.invalidateQueries({ queryKey: assetKeys.detail(asset.id) });
      const { currentGroupId, targetGroupId } = variables;
      if (currentGroupId && currentGroupId !== targetGroupId) {
        void queryClient.invalidateQueries({ queryKey: assetGroupKeys.detail(currentGroupId) });
        void queryClient.invalidateQueries({ queryKey: assetGroupKeys.members(currentGroupId) });
      }

      const assignedGroupId = asset.assetGroup?.id ?? targetGroupId;
      void queryClient.invalidateQueries({ queryKey: assetGroupKeys.detail(assignedGroupId) });
      void queryClient.invalidateQueries({ queryKey: assetGroupKeys.members(assignedGroupId) });

      void queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
    },
  });
}

export function useBulkUpdateGroupMembers() {
  const provider = useStorageProvider();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId, updates, options }: { groupId: string; updates: AssetUpdate; options?: { clearOverrides?: boolean } }) => {
      if (!provider) throw new Error('Storage provider not initialized');
      return await provider.bulkUpdateGroupMembers(groupId, updates, options);
    },
    onSuccess: (_assets, variables) => {
      void queryClient.invalidateQueries({ queryKey: assetGroupKeys.members(variables.groupId) });
      void queryClient.invalidateQueries({ queryKey: assetGroupKeys.detail(variables.groupId) });
      void queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
    },
  });
}

export function useCreateGroupBooking() {
  const provider = useStorageProvider();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: GroupBookingCreate) => {
      if (!provider) throw new Error('Storage provider not initialized');
      return await provider.createGroupBooking(request);
    },
    onSuccess: (_result, variables) => {
      void queryClient.invalidateQueries({ queryKey: assetGroupKeys.members(variables.groupId) });
      void queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
    },
  });
}

