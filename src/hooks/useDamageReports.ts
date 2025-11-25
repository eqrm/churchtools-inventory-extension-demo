import { useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useStorageProvider } from './useStorageProvider';
import { DamageService, type CreateDamageReportDTO, type RepairDamageReportDTO } from '../services/DamageService';
import type { DamageReport } from '../types/damage';
import { useDamageStore } from '../stores/damageStore';
import { assetKeys } from './useAssets';

export const damageKeys = {
  all: ['damage'] as const,
  lists: () => [...damageKeys.all, 'list'] as const,
  byAsset: (assetId: string) => [...damageKeys.lists(), assetId] as const,
};

interface UseDamageReportsResult {
  reports: DamageReport[];
  isLoading: boolean;
  isFetching: boolean;
  error?: string;
  createReport: (data: CreateDamageReportDTO) => Promise<DamageReport>;
  createDamageReport: (data: CreateDamageReportDTO) => Promise<DamageReport>;
  markReportAsRepaired: (reportId: string, data: RepairDamageReportDTO) => Promise<DamageReport>;
  isCreating: boolean;
  isCreatingReport: boolean;
  isRepairing: boolean;
  refetch: () => Promise<DamageReport[]>;
}

export function useDamageReports(assetId?: string): UseDamageReportsResult {
  const provider = useStorageProvider();
  const damageService = useMemo(() => {
    if (!provider) {
      return null;
    }
    return new DamageService({ storageProvider: provider });
  }, [provider]);

  const queryClient = useQueryClient();

  const reports = useDamageStore((state) => (assetId ? state.reportsByAsset[assetId] ?? [] : []));
  const setReports = useDamageStore((state) => state.setReports);
  const addReport = useDamageStore((state) => state.addReport);
  const updateReport = useDamageStore((state) => state.updateReport);

  const enabled = Boolean(damageService && assetId);

  const historyQuery = useQuery<DamageReport[], Error>({
    queryKey: damageKeys.byAsset(assetId ?? 'unknown'),
    queryFn: async () => {
      if (!damageService || !assetId) {
        throw new Error('Damage service not available');
      }
      return await damageService.getRepairHistory(assetId);
    },
    enabled,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (assetId && historyQuery.data) {
      setReports(assetId, historyQuery.data);
    }
  }, [assetId, historyQuery.data, setReports]);

  const createMutation = useMutation({
    mutationFn: async (data: CreateDamageReportDTO) => {
      if (!damageService || !assetId) {
        throw new Error('Damage service not available');
      }
      return await damageService.createDamageReport(assetId, data);
    },
    onSuccess: (report) => {
      if (assetId) {
        addReport(assetId, report);
        void queryClient.invalidateQueries({ queryKey: damageKeys.byAsset(assetId) });
      }
    },
  });

  const repairMutation = useMutation({
    mutationFn: async ({ reportId, data }: { reportId: string; data: RepairDamageReportDTO }) => {
      if (!damageService) {
        throw new Error('Damage service not available');
      }
      return await damageService.markAsRepaired(reportId, data);
    },
    onSuccess: (report) => {
      if (assetId) {
        updateReport(assetId, report);
        void queryClient.invalidateQueries({ queryKey: damageKeys.byAsset(assetId) });
        void queryClient.invalidateQueries({ queryKey: assetKeys.detail(assetId) });
        void queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
      }
    },
  });

  return {
    reports,
    isLoading: historyQuery.isLoading,
    isFetching: historyQuery.isFetching,
    error: historyQuery.error ? (historyQuery.error instanceof Error ? historyQuery.error.message : 'Failed to load damage reports.') : undefined,
    createReport: async (data: CreateDamageReportDTO) => await createMutation.mutateAsync(data),
    createDamageReport: async (data: CreateDamageReportDTO) => await createMutation.mutateAsync(data),
    markReportAsRepaired: async (reportId: string, data: RepairDamageReportDTO) =>
      await repairMutation.mutateAsync({ reportId, data }),
    isCreating: createMutation.isPending,
    isCreatingReport: createMutation.isPending,
    isRepairing: repairMutation.isPending,
    refetch: async (): Promise<DamageReport[]> => {
      const result = await historyQuery.refetch();
      return result.data ?? [];
    },
  };
}
