/**
 * TanStack Query hooks for maintenance management
 * 
 * Provides React hooks for:
 * - Old system: maintenance records and schedules (T167)
 * - New system: maintenance companies, rules, and work orders (T144)
 * 
 * With automatic caching, refetching, and optimistic updates.
 */

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useStorageProvider } from './useStorageProvider';
import type {
    MaintenanceRecord,
    MaintenanceRecordCreate,
    MaintenanceSchedule,
    MaintenanceScheduleCreate,
    UUID,
} from '../types/entities';
import type {MaintenanceCompany,
    MaintenanceRule,
    WorkOrder,
} from '../types/maintenance';
import type { InternalWorkOrderEvent } from '../services/machines/InternalWorkOrderMachine';
import type { ExternalWorkOrderEvent } from '../services/machines/ExternalWorkOrderMachine';
import { MaintenanceService } from '../services/MaintenanceService';
import { useMaintenanceStore } from '../stores/maintenanceStore';
import { useUndoStore } from '../state/undoStore';

/**
 * Query key factory for maintenance operations
 */
export const maintenanceKeys = {
    all: ['maintenance'] as const,
    // Old system (records/schedules)
    records: () => [...maintenanceKeys.all, 'records'] as const,
    recordsByAsset: (assetId: string) => [...maintenanceKeys.records(), { assetId }] as const,
    record: (id: string) => [...maintenanceKeys.all, 'record', id] as const,
    schedules: () => [...maintenanceKeys.all, 'schedules'] as const,
    schedulesByAsset: (assetId: string) => [...maintenanceKeys.schedules(), { assetId }] as const,
    schedule: (id: string) => [...maintenanceKeys.all, 'schedule', id] as const,
    overdue: () => [...maintenanceKeys.all, 'overdue'] as const,
    // New system (companies/rules/work orders)
    companies: () => [...maintenanceKeys.all, 'companies'] as const,
    company: (id: string) => [...maintenanceKeys.companies(), id] as const,
    rules: () => [...maintenanceKeys.all, 'rules'] as const,
    rule: (id: string) => [...maintenanceKeys.rules(), id] as const,
    ruleConflicts: () => [...maintenanceKeys.rules(), 'conflicts'] as const,
    workOrders: () => [...maintenanceKeys.all, 'workOrders'] as const,
    workOrder: (id: string) => [...maintenanceKeys.workOrders(), id] as const,
    workOrdersByState: (state: string) => [...maintenanceKeys.workOrders(), 'state', state] as const,
};

function useMaintenanceServiceInternal(): MaintenanceService | null {
  const storageProvider = useStorageProvider();
  return useMemo(() => {
    if (!storageProvider) {
      return null;
    }
    return new MaintenanceService({ storageProvider });
  }, [storageProvider]);
}

/**
 * Helper hook to access MaintenanceService instance
 */
export function useMaintenanceServiceInstance(): MaintenanceService | null {
  return useMaintenanceServiceInternal();
}

// ============================================================================
// Old System: Maintenance Records & Schedules (T167)
// ============================================================================

/**
 * Hook to fetch maintenance records
 * 
 * @param assetId - Optional asset ID to filter records
 * @returns Query result with array of maintenance records
 */
export function useMaintenanceRecords(assetId?: UUID) {
    const storage = useStorageProvider();

    return useQuery({
        queryKey: assetId ? maintenanceKeys.recordsByAsset(assetId) : maintenanceKeys.records(),
        queryFn: async () => {
            if (!storage) {
                throw new Error('Storage provider not available');
            }
            return await storage.getMaintenanceRecords(assetId);
        },
        enabled: !!storage,
    });
}

/**
 * Hook to fetch a single maintenance record
 */
export function useMaintenanceRecord(id: UUID | undefined) {
    const storage = useStorageProvider();

    return useQuery({
        queryKey: id ? maintenanceKeys.record(id) : ['maintenance', 'record', 'none'],
        queryFn: async () => {
            if (!storage || !id) {
                throw new Error('Storage provider or ID not available');
            }
            return await storage.getMaintenanceRecord(id);
        },
        enabled: !!storage && !!id,
    });
}

/**
 * Hook to fetch maintenance schedules
 * 
 * @param assetId - Optional asset ID to filter schedules
 * @returns Query result with array of maintenance schedules
 */
export function useMaintenanceSchedules(assetId?: UUID) {
    const storage = useStorageProvider();

    return useQuery({
        queryKey: assetId ? maintenanceKeys.schedulesByAsset(assetId) : maintenanceKeys.schedules(),
        queryFn: async () => {
            if (!storage) {
                throw new Error('Storage provider not available');
            }
            return await storage.getMaintenanceSchedules(assetId);
        },
        enabled: !!storage,
    });
}

/**
 * Hook to fetch a single maintenance schedule
 */
export function useMaintenanceSchedule(id: UUID | undefined) {
    const storage = useStorageProvider();

    return useQuery({
        queryKey: id ? maintenanceKeys.schedule(id) : ['maintenance', 'schedule', 'none'],
        queryFn: async () => {
            if (!storage || !id) {
                throw new Error('Storage provider or ID not available');
            }
            return await storage.getMaintenanceSchedule(id);
        },
        enabled: !!storage && !!id,
    });
}

/**
 * Hook to create a maintenance record
 */
export function useCreateMaintenanceRecord() {
    const storage = useStorageProvider();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: MaintenanceRecordCreate) => {
            if (!storage) {
                throw new Error('Storage provider not available');
            }
            return await storage.createMaintenanceRecord(data);
        },
        onSuccess: (record: MaintenanceRecord) => {
            void queryClient.invalidateQueries({ queryKey: maintenanceKeys.records() });
            void queryClient.invalidateQueries({
                queryKey: maintenanceKeys.recordsByAsset(record.asset.id),
            });
        },
    });
}

/**
 * Hook to update a maintenance record
 */
export function useUpdateMaintenanceRecord() {
    const storage = useStorageProvider();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (params: { id: UUID; data: Partial<MaintenanceRecord> }) => {
            if (!storage) {
                throw new Error('Storage provider not available');
            }
            return await storage.updateMaintenanceRecord(params.id, params.data);
        },
        onSuccess: (record: MaintenanceRecord) => {
            void queryClient.invalidateQueries({ queryKey: maintenanceKeys.records() });
            void queryClient.invalidateQueries({ queryKey: maintenanceKeys.record(record.id) });
        },
    });
}

/**
 * Hook to create a maintenance schedule
 */
export function useCreateMaintenanceSchedule() {
    const storage = useStorageProvider();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: MaintenanceScheduleCreate) => {
            if (!storage) {
                throw new Error('Storage provider not available');
            }
            return await storage.createMaintenanceSchedule(data);
        },
        onSuccess: (schedule: MaintenanceSchedule) => {
            void queryClient.invalidateQueries({ queryKey: maintenanceKeys.schedules() });
            void queryClient.invalidateQueries({
                queryKey: maintenanceKeys.schedulesByAsset(schedule.assetId),
            });
        },
    });
}

/**
 * Hook to update a maintenance schedule
 */
export function useUpdateMaintenanceSchedule() {
    const storage = useStorageProvider();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (params: { id: UUID; data: Partial<MaintenanceSchedule> }) => {
            if (!storage) {
                throw new Error('Storage provider not available');
            }
            return await storage.updateMaintenanceSchedule(params.id, params.data);
        },
        onSuccess: (schedule: MaintenanceSchedule) => {
            void queryClient.invalidateQueries({ queryKey: maintenanceKeys.schedules() });
            void queryClient.invalidateQueries({ queryKey: maintenanceKeys.schedule(schedule.id) });
        },
    });
}

/**
 * Hook to delete a maintenance schedule
 */
export function useDeleteMaintenanceSchedule() {
    const storage = useStorageProvider();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: UUID) => {
            if (!storage) {
                throw new Error('Storage provider not available');
            }
            await storage.deleteMaintenanceSchedule(id);
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: maintenanceKeys.schedules() });
        },
    });
}

/**
 * Hook to fetch overdue maintenance items
 */
export function useOverdueMaintenance() {
    const storage = useStorageProvider();

    return useQuery({
        queryKey: maintenanceKeys.overdue(),
        queryFn: async () => {
            if (!storage) {
                throw new Error('Storage provider not available');
            }
            return await storage.getOverdueMaintenanceSchedules();
        },
        enabled: !!storage,
        refetchInterval: 60000, // Refresh every minute
    });
}

// ============================================================================
// New System: Maintenance Companies, Rules, Work Orders (T144)
// ============================================================================

/**
 * Hook to fetch all maintenance companies
 */
export function useMaintenanceCompanies() {
  const service = useMaintenanceServiceInternal();
  const upsertCompanies = useMaintenanceStore((state) => state.upsertCompanies);

  return useQuery({
    queryKey: maintenanceKeys.companies(),
    queryFn: async () => {
      if (!service) {
        throw new Error('Maintenance service unavailable');
      }
      return await service.getCompanies();
    },
    enabled: Boolean(service),
    onSuccess: (companies) => {
      upsertCompanies(companies);
    },
  });
}

/**
 * Hook to fetch a single maintenance company by ID
 */
export function useMaintenanceCompany(id: string | undefined) {
  const service = useMaintenanceServiceInternal();
  const cachedCompany = useMaintenanceStore((state) =>
    id ? state.companiesById[id] : undefined
  );
  const upsertCompany = useMaintenanceStore((state) => state.upsertCompany);

  return useQuery({
    queryKey: maintenanceKeys.company(id ?? 'unknown'),
    queryFn: async () => {
      if (!service || !id) {
        throw new Error('Maintenance service unavailable');
      }
      const company = await service.getCompany(id);
      if (company) {
        upsertCompany(company);
      }
      return company;
    },
    enabled: Boolean(id && service),
    initialData: cachedCompany,
  });
}

/**
 * Hook to create a new maintenance company
 */
export function useCreateMaintenanceCompany() {
  const service = useMaintenanceServiceInternal();
  const queryClient = useQueryClient();
  const upsertCompany = useMaintenanceStore((state) => state.upsertCompany);

  return useMutation({
    mutationFn: (data: Omit<MaintenanceCompany, 'id' | 'createdAt' | 'updatedAt'>) => {
      if (!service) {
        throw new Error('Maintenance service unavailable');
      }
      return service.createCompany(data);
    },
    onSuccess: (newCompany) => {
      upsertCompany(newCompany);
      queryClient.setQueryData(maintenanceKeys.company(newCompany.id), newCompany);
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.companies() });
    },
  });
}

/**
 * Hook to update an existing maintenance company
 */
export function useUpdateMaintenanceCompany() {
  const service = useMaintenanceServiceInternal();
  const queryClient = useQueryClient();
  const upsertCompany = useMaintenanceStore((state) => state.upsertCompany);

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: UUID;
      data: Partial<Omit<MaintenanceCompany, 'id' | 'createdAt' | 'createdBy'>>;
    }) => {
      if (!service) {
        throw new Error('Maintenance service unavailable');
      }
      return service.updateCompany(id, data);
    },
    onSuccess: (updatedCompany) => {
      upsertCompany(updatedCompany);
      queryClient.setQueryData(maintenanceKeys.company(updatedCompany.id), updatedCompany);
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.companies() });
    },
  });
}

/**
 * Hook to delete a maintenance company
 */
export function useDeleteMaintenanceCompany() {
  const service = useMaintenanceServiceInternal();
  const queryClient = useQueryClient();
  const removeCompany = useMaintenanceStore((state) => state.removeCompany);

  return useMutation({
    mutationFn: (id: UUID) => {
      if (!service) {
        throw new Error('Maintenance service unavailable');
      }
      return service.deleteCompany(id);
    },
    onSuccess: (_, id) => {
      removeCompany(id);
      queryClient.removeQueries({ queryKey: maintenanceKeys.company(id) });
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.companies() });
    },
  });
}

/**
 * Hook to fetch all maintenance rules
 */
export function useMaintenanceRules() {
  const service = useMaintenanceServiceInternal();
  const upsertRules = useMaintenanceStore((state) => state.upsertRules);

  return useQuery({
    queryKey: maintenanceKeys.rules(),
    queryFn: async () => {
      if (!service) {
        throw new Error('Maintenance service unavailable');
      }
      return await service.getRules();
    },
    enabled: Boolean(service),
    onSuccess: (rules) => {
      upsertRules(rules);
    },
  });
}

/**
 * Hook to fetch a single maintenance rule by ID
 */
export function useMaintenanceRule(id: string | undefined) {
  const service = useMaintenanceServiceInternal();
  const cachedRule = useMaintenanceStore((state) => (id ? state.rulesById[id] : undefined));
  const upsertRule = useMaintenanceStore((state) => state.upsertRule);

  return useQuery({
    queryKey: maintenanceKeys.rule(id ?? 'unknown'),
    queryFn: async () => {
      if (!service || !id) {
        throw new Error('Maintenance service unavailable');
      }
      const rule = await service.getRule(id);
      if (rule) {
        upsertRule(rule);
      }
      return rule;
    },
    enabled: Boolean(id && service),
    initialData: cachedRule,
  });
}

/**
 * Hook to detect rule conflicts
 */
export function useRuleConflicts() {
  const service = useMaintenanceServiceInternal();
  const setRuleConflicts = useMaintenanceStore((state) => state.setRuleConflicts);

  return useQuery({
    queryKey: maintenanceKeys.ruleConflicts(),
    queryFn: async () => {
      if (!service) {
        throw new Error('Maintenance service unavailable');
      }
      return await service.detectRuleConflicts();
    },
    enabled: Boolean(service),
    onSuccess: (conflicts) => {
      setRuleConflicts(conflicts);
    },
  });
}

/**
 * Hook to create a new maintenance rule
 */
export function useCreateMaintenanceRule() {
  const service = useMaintenanceServiceInternal();
  const queryClient = useQueryClient();
  const upsertRule = useMaintenanceStore((state) => state.upsertRule);
  const removeRule = useMaintenanceStore((state) => state.removeRule);
  const { t } = useTranslation();
  const { push } = useUndoStore();

  return useMutation({
    mutationFn: (data: Omit<MaintenanceRule, 'id' | 'createdAt' | 'updatedAt'>) => {
      if (!service) {
        throw new Error('Maintenance service unavailable');
      }
      return service.createRule(data);
    },
    onSuccess: (newRule, variables) => {
      upsertRule(newRule);
      queryClient.setQueryData(maintenanceKeys.rule(newRule.id), newRule);
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.rules() });
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.ruleConflicts() });

      push({
        label: t('undo.createMaintenanceRule', { name: newRule.name }),
        undo: async () => {
          if (!service) return;
          await service.deleteRule(newRule.id);
          removeRule(newRule.id);
          queryClient.removeQueries({ queryKey: maintenanceKeys.rule(newRule.id) });
          void queryClient.invalidateQueries({ queryKey: maintenanceKeys.rules() });
        },
        redo: async () => {
          if (!service) return;
          const recreated = await service.createRule(variables);
          upsertRule(recreated);
          queryClient.setQueryData(maintenanceKeys.rule(recreated.id), recreated);
          void queryClient.invalidateQueries({ queryKey: maintenanceKeys.rules() });
        },
      });
    },
  });
}

/**
 * Hook to update an existing maintenance rule
 */
export function useUpdateMaintenanceRule() {
  const service = useMaintenanceServiceInternal();
  const queryClient = useQueryClient();
  const upsertRule = useMaintenanceStore((state) => state.upsertRule);
  const { t } = useTranslation();
  const { push } = useUndoStore();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: UUID;
      data: Partial<Omit<MaintenanceRule, 'id' | 'createdAt' | 'createdBy'>>;
    }) => {
      if (!service) {
        throw new Error('Maintenance service unavailable');
      }
      return service.updateRule(id, data);
    },
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: maintenanceKeys.rule(id) });
      const previousRule = queryClient.getQueryData<MaintenanceRule>(maintenanceKeys.rule(id));
      return { previousRule };
    },
    onSuccess: (updatedRule, variables, context) => {
      upsertRule(updatedRule);
      queryClient.setQueryData(maintenanceKeys.rule(updatedRule.id), updatedRule);
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.rules() });
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.ruleConflicts() });

      if (context?.previousRule) {
        const { previousRule } = context;
        push({
          label: t('undo.updateMaintenanceRule', { name: updatedRule.name }),
          undo: async () => {
            if (!service) return;
            const { id, createdAt, createdBy, ...rest } = previousRule;
            const restored = await service.updateRule(id, rest);
            upsertRule(restored);
            queryClient.setQueryData(maintenanceKeys.rule(restored.id), restored);
            void queryClient.invalidateQueries({ queryKey: maintenanceKeys.rules() });
          },
          redo: async () => {
            if (!service) return;
            const reUpdated = await service.updateRule(variables.id, variables.data);
            upsertRule(reUpdated);
            queryClient.setQueryData(maintenanceKeys.rule(reUpdated.id), reUpdated);
            void queryClient.invalidateQueries({ queryKey: maintenanceKeys.rules() });
          },
        });
      }
    },
  });
}

/**
 * Hook to delete a maintenance rule
 */
export function useDeleteMaintenanceRule() {
  const service = useMaintenanceServiceInternal();
  const queryClient = useQueryClient();
  const removeRule = useMaintenanceStore((state) => state.removeRule);
  const upsertRule = useMaintenanceStore((state) => state.upsertRule);
  const { t } = useTranslation();
  const { push } = useUndoStore();

  return useMutation({
    mutationFn: (id: UUID) => {
      if (!service) {
        throw new Error('Maintenance service unavailable');
      }
      return service.deleteRule(id);
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: maintenanceKeys.rule(id) });
      const previousRule = queryClient.getQueryData<MaintenanceRule>(maintenanceKeys.rule(id));
      return { previousRule };
    },
    onSuccess: (_, id, context) => {
      removeRule(id);
      queryClient.removeQueries({ queryKey: maintenanceKeys.rule(id) });
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.rules() });
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.ruleConflicts() });

      if (context?.previousRule) {
        const { previousRule } = context;
        let restoredId: string | null = null;

        push({
          label: t('undo.deleteMaintenanceRule', { name: previousRule.name }),
          undo: async () => {
            if (!service) return;
            const { id, createdAt, updatedAt, ...rest } = previousRule;
            const restored = await service.createRule(rest);
            restoredId = restored.id;
            upsertRule(restored);
            queryClient.setQueryData(maintenanceKeys.rule(restored.id), restored);
            void queryClient.invalidateQueries({ queryKey: maintenanceKeys.rules() });
          },
          redo: async () => {
            if (!service) return;
            const idToDelete = restoredId || id;
            await service.deleteRule(idToDelete);
            removeRule(idToDelete);
            queryClient.removeQueries({ queryKey: maintenanceKeys.rule(idToDelete) });
            void queryClient.invalidateQueries({ queryKey: maintenanceKeys.rules() });
            restoredId = null;
          },
        });
      }
    },
  });
}

/**
 * Hook to fetch all work orders
 */
export function useWorkOrders() {
  const service = useMaintenanceServiceInternal();
  const upsertWorkOrders = useMaintenanceStore((state) => state.upsertWorkOrders);

  return useQuery({
    queryKey: maintenanceKeys.workOrders(),
    queryFn: async () => {
      if (!service) {
        throw new Error('Maintenance service unavailable');
      }
      return await service.getWorkOrders();
    },
    enabled: Boolean(service),
    onSuccess: (workOrders) => {
      upsertWorkOrders(workOrders);
    },
  });
}

/**
 * Hook to fetch a single work order by ID
 */
export function useWorkOrder(id: string | undefined) {
  const service = useMaintenanceServiceInternal();
  const cachedWorkOrder = useMaintenanceStore((state) =>
    id ? state.workOrdersById[id] : undefined
  );
  const upsertWorkOrder = useMaintenanceStore((state) => state.upsertWorkOrder);

  return useQuery({
    queryKey: maintenanceKeys.workOrder(id ?? 'unknown'),
    queryFn: async () => {
      if (!service || !id) {
        throw new Error('Maintenance service unavailable');
      }
      const workOrder = await service.getWorkOrder(id);
      if (workOrder) {
        upsertWorkOrder(workOrder);
      }
      return workOrder;
    },
    enabled: Boolean(id && service),
    initialData: cachedWorkOrder,
  });
}

/**
 * Hook to create a work order from a maintenance rule
 */
export function useCreateWorkOrderFromRule() {
  const service = useMaintenanceServiceInternal();
  const queryClient = useQueryClient();
  const upsertWorkOrder = useMaintenanceStore((state) => state.upsertWorkOrder);
  const removeWorkOrder = useMaintenanceStore((state) => state.removeWorkOrder);
  const { t } = useTranslation();
  const { push } = useUndoStore();

  return useMutation({
    mutationFn: (ruleId: UUID) => {
      if (!service) {
        throw new Error('Maintenance service unavailable');
      }
      return service.createWorkOrderFromRule(ruleId);
    },
    onSuccess: (newWorkOrder, ruleId) => {
      upsertWorkOrder(newWorkOrder);
      queryClient.setQueryData(maintenanceKeys.workOrder(newWorkOrder.id), newWorkOrder);
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.workOrders() });

      push({
        label: t('undo.createWorkOrder', { number: newWorkOrder.workOrderNumber }),
        undo: async () => {
          if (!service) return;
          await service.deleteWorkOrder(newWorkOrder.id);
          removeWorkOrder(newWorkOrder.id);
          queryClient.removeQueries({ queryKey: maintenanceKeys.workOrder(newWorkOrder.id) });
          void queryClient.invalidateQueries({ queryKey: maintenanceKeys.workOrders() });
        },
        redo: async () => {
          if (!service) return;
          const recreated = await service.createWorkOrderFromRule(ruleId);
          upsertWorkOrder(recreated);
          queryClient.setQueryData(maintenanceKeys.workOrder(recreated.id), recreated);
          void queryClient.invalidateQueries({ queryKey: maintenanceKeys.workOrders() });
        },
      });
    },
  });
}

/**
 * Hook to create a work order manually
 */
export function useCreateWorkOrder() {
  const service = useMaintenanceServiceInternal();
  const queryClient = useQueryClient();
  const upsertWorkOrder = useMaintenanceStore((state) => state.upsertWorkOrder);
  const removeWorkOrder = useMaintenanceStore((state) => state.removeWorkOrder);
  const { t } = useTranslation();
  const { push } = useUndoStore();

  return useMutation({
    mutationFn: (data: Omit<WorkOrder, 'id' | 'createdAt' | 'updatedAt'>) => {
      if (!service) {
        throw new Error('Maintenance service unavailable');
      }
      return service.createWorkOrder(data);
    },
    onSuccess: (newWorkOrder, variables) => {
      upsertWorkOrder(newWorkOrder);
      queryClient.setQueryData(maintenanceKeys.workOrder(newWorkOrder.id), newWorkOrder);
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.workOrders() });

      push({
        label: t('undo.createWorkOrder', { number: newWorkOrder.workOrderNumber }),
        undo: async () => {
          if (!service) return;
          await service.deleteWorkOrder(newWorkOrder.id);
          removeWorkOrder(newWorkOrder.id);
          queryClient.removeQueries({ queryKey: maintenanceKeys.workOrder(newWorkOrder.id) });
          void queryClient.invalidateQueries({ queryKey: maintenanceKeys.workOrders() });
        },
        redo: async () => {
          if (!service) return;
          const recreated = await service.createWorkOrder(variables);
          upsertWorkOrder(recreated);
          queryClient.setQueryData(maintenanceKeys.workOrder(recreated.id), recreated);
          void queryClient.invalidateQueries({ queryKey: maintenanceKeys.workOrders() });
        },
      });
    },
  });
}

/**
 * Hook to delete a work order
 */
export function useDeleteWorkOrder() {
  const service = useMaintenanceServiceInternal();
  const queryClient = useQueryClient();
  const removeWorkOrder = useMaintenanceStore((state) => state.removeWorkOrder);
  const upsertWorkOrder = useMaintenanceStore((state) => state.upsertWorkOrder);
  const { t } = useTranslation();
  const { push } = useUndoStore();

  return useMutation({
    mutationFn: (id: UUID) => {
      if (!service) {
        throw new Error('Maintenance service unavailable');
      }
      return service.deleteWorkOrder(id);
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: maintenanceKeys.workOrder(id) });
      const previousWorkOrder = queryClient.getQueryData<WorkOrder>(maintenanceKeys.workOrder(id));
      return { previousWorkOrder };
    },
    onSuccess: (_, id, context) => {
      removeWorkOrder(id);
      queryClient.removeQueries({ queryKey: maintenanceKeys.workOrder(id) });
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.workOrders() });

      if (context?.previousWorkOrder) {
        const { previousWorkOrder } = context;
        let restoredId: string | null = null;

        push({
          label: t('undo.deleteWorkOrder', { number: previousWorkOrder.workOrderNumber }),
          undo: async () => {
            if (!service) return;
            const { id, createdAt, updatedAt, ...rest } = previousWorkOrder;
            const restored = await service.createWorkOrder(rest);
            restoredId = restored.id;
            upsertWorkOrder(restored);
            queryClient.setQueryData(maintenanceKeys.workOrder(restored.id), restored);
            void queryClient.invalidateQueries({ queryKey: maintenanceKeys.workOrders() });
          },
          redo: async () => {
            if (!service) return;
            const idToDelete = restoredId || id;
            await service.deleteWorkOrder(idToDelete);
            removeWorkOrder(idToDelete);
            queryClient.removeQueries({ queryKey: maintenanceKeys.workOrder(idToDelete) });
            void queryClient.invalidateQueries({ queryKey: maintenanceKeys.workOrders() });
            restoredId = null;
          },
        });
      }
    },
  });
}

/**
 * Hook to transition work order state using XState
 */
export function useTransitionWorkOrderState() {
  const service = useMaintenanceServiceInternal();
  const queryClient = useQueryClient();
  const upsertWorkOrder = useMaintenanceStore((state) => state.upsertWorkOrder);

  return useMutation({
    mutationFn: ({
      id,
      event,
      changedBy,
      changedByName,
    }: {
      id: UUID;
      event: InternalWorkOrderEvent | ExternalWorkOrderEvent;
      changedBy: UUID;
      changedByName?: string;
    }) => {
      if (!service) {
        throw new Error('Maintenance service unavailable');
      }
      return service.transitionWorkOrderState(id, event, changedBy, changedByName);
    },
    onSuccess: (updatedWorkOrder) => {
      upsertWorkOrder(updatedWorkOrder);
      queryClient.setQueryData(maintenanceKeys.workOrder(updatedWorkOrder.id), updatedWorkOrder);
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.workOrders() });
    },
  });
}

/**
 * Hook to mark individual asset as complete in work order
 */
export function useMarkAssetComplete() {
  const service = useMaintenanceServiceInternal();
  const queryClient = useQueryClient();
  const upsertWorkOrder = useMaintenanceStore((state) => state.upsertWorkOrder);

  return useMutation({
    mutationFn: ({
      workOrderId,
      assetId,
      completedBy,
    }: {
      workOrderId: UUID;
      assetId: UUID;
      completedBy: UUID;
    }) => {
      if (!service) {
        throw new Error('Maintenance service unavailable');
      }
      return service.markAssetComplete(workOrderId, assetId, completedBy);
    },
    onSuccess: (updatedWorkOrder) => {
      upsertWorkOrder(updatedWorkOrder);
      queryClient.setQueryData(maintenanceKeys.workOrder(updatedWorkOrder.id), updatedWorkOrder);
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.workOrders() });
    },
  });
}
