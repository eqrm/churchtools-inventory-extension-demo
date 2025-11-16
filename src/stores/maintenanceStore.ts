import { create } from 'zustand';
import type { MaintenanceCompany, MaintenanceRule, WorkOrder } from '../types/maintenance';

interface MaintenanceStoreState {
  // Companies
  companiesById: Record<string, MaintenanceCompany>;
  companyIds: string[];
  
  // Rules
  rulesById: Record<string, MaintenanceRule>;
  ruleIds: string[];
  ruleConflicts: Array<{ rule1: MaintenanceRule; rule2: MaintenanceRule }>;
  
  // Work Orders
  workOrdersById: Record<string, WorkOrder>;
  workOrderIds: string[];
  workOrdersByState: Record<string, string[]>; // state -> workOrderIds
  
  // Companies
  upsertCompanies: (companies: MaintenanceCompany[]) => void;
  upsertCompany: (company: MaintenanceCompany) => void;
  removeCompany: (companyId: string) => void;
  
  // Rules
  upsertRules: (rules: MaintenanceRule[]) => void;
  upsertRule: (rule: MaintenanceRule) => void;
  removeRule: (ruleId: string) => void;
  setRuleConflicts: (conflicts: Array<{ rule1: MaintenanceRule; rule2: MaintenanceRule }>) => void;
  
  // Work Orders
  upsertWorkOrders: (workOrders: WorkOrder[]) => void;
  upsertWorkOrder: (workOrder: WorkOrder) => void;
  removeWorkOrder: (workOrderId: string) => void;
  
  // Clear all
  clear: () => void;
}

export const useMaintenanceStore = create<MaintenanceStoreState>((set) => ({
  // Initial state
  companiesById: {},
  companyIds: [],
  rulesById: {},
  ruleIds: [],
  ruleConflicts: [],
  workOrdersById: {},
  workOrderIds: [],
  workOrdersByState: {},

  // Companies
  upsertCompanies: (companies) => {
    set((state) => {
      if (!companies.length) {
        return state;
      }

      const companiesById = { ...state.companiesById };
      for (const company of companies) {
        companiesById[company.id] = company;
      }

      const companyIds = Array.from(
        new Set([...state.companyIds, ...companies.map((c) => c.id)])
      );

      return {
        ...state,
        companiesById,
        companyIds,
      };
    });
  },

  upsertCompany: (company) => {
    set((state) => ({
      companiesById: { ...state.companiesById, [company.id]: company },
      companyIds: state.companyIds.includes(company.id)
        ? state.companyIds
        : [...state.companyIds, company.id],
    }));
  },

  removeCompany: (companyId) => {
    set((state) => {
      const { [companyId]: _removed, ...remainingCompanies } = state.companiesById;
      return {
        ...state,
        companiesById: remainingCompanies,
        companyIds: state.companyIds.filter((id) => id !== companyId),
      };
    });
  },

  // Rules
  upsertRules: (rules) => {
    set((state) => {
      if (!rules.length) {
        return state;
      }

      const rulesById = { ...state.rulesById };
      for (const rule of rules) {
        rulesById[rule.id] = rule;
      }

      const ruleIds = Array.from(new Set([...state.ruleIds, ...rules.map((r) => r.id)]));

      return {
        ...state,
        rulesById,
        ruleIds,
      };
    });
  },

  upsertRule: (rule) => {
    set((state) => ({
      rulesById: { ...state.rulesById, [rule.id]: rule },
      ruleIds: state.ruleIds.includes(rule.id)
        ? state.ruleIds
        : [...state.ruleIds, rule.id],
    }));
  },

  removeRule: (ruleId) => {
    set((state) => {
      const { [ruleId]: _removed, ...remainingRules } = state.rulesById;
      return {
        ...state,
        rulesById: remainingRules,
        ruleIds: state.ruleIds.filter((id) => id !== ruleId),
      };
    });
  },

  setRuleConflicts: (conflicts) => {
    set({ ruleConflicts: conflicts });
  },

  // Work Orders
  upsertWorkOrders: (workOrders) => {
    set((state) => {
      if (!workOrders.length) {
        return state;
      }

      const workOrdersById = { ...state.workOrdersById };
      const workOrdersByState: Record<string, string[]> = { ...state.workOrdersByState };

      for (const workOrder of workOrders) {
        workOrdersById[workOrder.id] = workOrder;

        // Build state index
        const stateKey = workOrder.state;
        if (!workOrdersByState[stateKey]) {
          workOrdersByState[stateKey] = [];
        }
        const stateArray = workOrdersByState[stateKey];
        if (stateArray && !stateArray.includes(workOrder.id)) {
          stateArray.push(workOrder.id);
        }
      }

      const workOrderIds = Array.from(
        new Set([...state.workOrderIds, ...workOrders.map((wo) => wo.id)])
      );

      return {
        ...state,
        workOrdersById,
        workOrderIds,
        workOrdersByState,
      };
    });
  },

  upsertWorkOrder: (workOrder) => {
    set((state) => {
      const workOrdersById = { ...state.workOrdersById, [workOrder.id]: workOrder };
      const workOrderIds = state.workOrderIds.includes(workOrder.id)
        ? state.workOrderIds
        : [...state.workOrderIds, workOrder.id];

      // Update state index
      const workOrdersByState: Record<string, string[]> = {};
      for (const [stateKey, ids] of Object.entries(state.workOrdersByState)) {
        workOrdersByState[stateKey] = ids.filter((id) => id !== workOrder.id);
      }

      const stateKey = workOrder.state;
      if (!workOrdersByState[stateKey]) {
        workOrdersByState[stateKey] = [];
      }
      const stateArray = workOrdersByState[stateKey];
      if (stateArray) {
        stateArray.push(workOrder.id);
      }

      return {
        ...state,
        workOrdersById,
        workOrderIds,
        workOrdersByState,
      };
    });
  },

  removeWorkOrder: (workOrderId) => {
    set((state) => {
      const { [workOrderId]: _removed, ...remainingWorkOrders } = state.workOrdersById;

      // Remove from state index
      const workOrdersByState: Record<string, string[]> = {};
      for (const [stateKey, ids] of Object.entries(state.workOrdersByState)) {
        workOrdersByState[stateKey] = ids.filter((id) => id !== workOrderId);
      }

      return {
        ...state,
        workOrdersById: remainingWorkOrders,
        workOrderIds: state.workOrderIds.filter((id) => id !== workOrderId),
        workOrdersByState,
      };
    });
  },

  // Clear all
  clear: () => ({
    companiesById: {},
    companyIds: [],
    rulesById: {},
    ruleIds: [],
    ruleConflicts: [],
    workOrdersById: {},
    workOrderIds: [],
    workOrdersByState: {},
  }),
}));
