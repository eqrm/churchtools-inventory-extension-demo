import { describe, expect, it, vi, beforeEach, type Mock } from 'vitest';
import { MaintenanceService } from '../../../src/services/MaintenanceService';
import type { IStorageProvider } from '../../../src/types/storage';
import type { MaintenanceRule, WorkOrder } from '../../../src/types/maintenance';
import type { UUID } from '../../../src/types/entities';

vi.mock('../../../src/services/undo', () => ({
  recordUndoAction: vi.fn(),
  registerUndoHandler: vi.fn(),
}));

function createMockStorageProvider(overrides: Partial<IStorageProvider> = {}): IStorageProvider {
  const required: Partial<IStorageProvider> = {
    getWorkOrder: vi.fn(),
    updateWorkOrder: vi.fn(),
    getWorkOrders: vi.fn().mockResolvedValue([]),
    getMaintenanceRule: vi.fn(),
    updateMaintenanceRule: vi.fn(),
    getMaintenanceRules: vi.fn().mockResolvedValue([]),
    createMaintenanceRule: vi.fn(),
    deleteMaintenanceRule: vi.fn(),
    getMaintenanceCompanies: vi.fn().mockResolvedValue([]),
    getMaintenanceCompany: vi.fn(),
    createMaintenanceCompany: vi.fn(),
    updateMaintenanceCompany: vi.fn(),
    deleteMaintenanceCompany: vi.fn(),
    createWorkOrder: vi.fn(),
    deleteWorkOrder: vi.fn(),
    getCurrentUser: vi.fn(),
  };

  return { ...required, ...overrides } as IStorageProvider;
}

function createRule(overrides: Partial<MaintenanceRule> = {}): MaintenanceRule {
  return {
    id: 'rule-1' as UUID,
    name: 'Quarterly inspection',
    workType: 'inspection',
    isInternal: true,
    serviceProviderId: undefined,
    targets: [{ type: 'asset', ids: ['asset-1' as UUID] }],
    intervalType: 'months',
    intervalValue: 1,
    startDate: '2025-01-01',
    nextDueDate: '2025-02-01',
    leadTimeDays: 10,
    rescheduleMode: 'actual-completion',
    createdBy: 'user-1' as UUID,
    createdByName: 'User One',
    createdAt: '2024-12-01T00:00:00Z',
    updatedAt: '2024-12-01T00:00:00Z',
    ...overrides,
  };
}

function createWorkOrder(overrides: Partial<WorkOrder> = {}): WorkOrder {
  return {
    id: 'wo-1' as UUID,
    workOrderNumber: 'WO-20250101-0001',
    type: 'internal',
    orderType: 'planned',
    state: 'in-progress',
    ruleId: 'rule-1' as UUID,
    companyId: undefined,
    assignedTo: undefined,
    approvalResponsibleId: undefined,
    leadTimeDays: 10,
    scheduledStart: '2025-01-05',
    scheduledEnd: undefined,
    actualStart: '2025-01-06T09:00:00Z',
    actualEnd: undefined,
    offers: [],
    lineItems: [
      { assetId: 'asset-1' as UUID, completionStatus: 'completed' },
    ],
    history: [],
    createdBy: 'user-1' as UUID,
    createdByName: 'User One',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-02T00:00:00Z',
    ...overrides,
  };
}

describe('MaintenanceService createWorkOrder', () => {
  let storageProvider: IStorageProvider;
  let service: MaintenanceService;

  beforeEach(() => {
    storageProvider = createMockStorageProvider({
      getCurrentUser: vi.fn().mockResolvedValue({ id: 'user-1', firstName: 'Test', lastName: 'User' }),
      createWorkOrder: vi.fn().mockImplementation(async (wo: WorkOrder) => wo),
    });
    service = new MaintenanceService({ storageProvider, now: () => new Date('2025-01-15T00:00:00Z') });
    vi.clearAllMocks();
  });

  it('generates workOrderNumber when not provided or empty', async () => {
    const workOrderData = {
      workOrderNumber: '',
      type: 'internal' as const,
      orderType: 'planned' as const,
      state: 'backlog' as const,
      leadTimeDays: 14,
      lineItems: [{ assetId: 'asset-1' as UUID, completionStatus: 'pending' as const }],
      history: [],
      createdBy: '' as UUID,
    };

    const created = await service.createWorkOrder(workOrderData);

    // Should have generated a work order number in format WO-YYYYMMDD-XXXX
    expect(created.workOrderNumber).toMatch(/^WO-\d{8}-\d{4}$/);
    expect(created.workOrderNumber).toBe('WO-20250115-0001');
  });

  it('preserves workOrderNumber when provided', async () => {
    const workOrderData = {
      workOrderNumber: 'CUSTOM-001',
      type: 'internal' as const,
      orderType: 'planned' as const,
      state: 'backlog' as const,
      leadTimeDays: 14,
      lineItems: [{ assetId: 'asset-1' as UUID, completionStatus: 'pending' as const }],
      history: [],
      createdBy: 'user-1' as UUID,
    };

    const created = await service.createWorkOrder(workOrderData);

    expect(created.workOrderNumber).toBe('CUSTOM-001');
  });

  it('sets createdBy from current user when not provided or empty', async () => {
    const workOrderData = {
      workOrderNumber: '',
      type: 'internal' as const,
      orderType: 'planned' as const,
      state: 'backlog' as const,
      leadTimeDays: 14,
      lineItems: [{ assetId: 'asset-1' as UUID, completionStatus: 'pending' as const }],
      history: [],
      createdBy: '' as UUID,
    };

    const created = await service.createWorkOrder(workOrderData);

    expect(created.createdBy).toBe('user-1');
    expect(created.createdByName).toBe('Test User');
  });

  it('creates history entry with initial state', async () => {
    const workOrderData = {
      workOrderNumber: '',
      type: 'internal' as const,
      orderType: 'planned' as const,
      state: 'backlog' as const,
      leadTimeDays: 14,
      lineItems: [{ assetId: 'asset-1' as UUID, completionStatus: 'pending' as const }],
      history: [],
      createdBy: '' as UUID,
    };

    const created = await service.createWorkOrder(workOrderData);

    expect(created.history).toHaveLength(1);
    expect(created.history[0].state).toBe('backlog');
    expect(created.history[0].changedBy).toBe('user-1');
  });
});

describe('MaintenanceService scheduling', () => {
  let storageProvider: IStorageProvider;
  let service: MaintenanceService;

  beforeEach(() => {
    storageProvider = createMockStorageProvider();
    service = new MaintenanceService({ storageProvider, now: () => new Date('2025-01-15T00:00:00Z') });
    vi.clearAllMocks();
  });

  it('updates next due date using the actual completion timestamp', async () => {
    const workOrder = createWorkOrder();
    const updatedWorkOrder = { ...workOrder, state: 'completed', actualEnd: '2025-02-10T12:00:00Z' };
    const rule = createRule({ nextDueDate: '2025-02-01' });

    (storageProvider.getWorkOrder as unknown as Mock).mockResolvedValue(workOrder);
    (storageProvider.updateWorkOrder as unknown as Mock).mockImplementation(async (_id: string, data: WorkOrder) => data);
    (storageProvider.getMaintenanceRule as unknown as Mock).mockResolvedValue(rule);
    (storageProvider.updateMaintenanceRule as unknown as Mock).mockImplementation(async (_id: string, data: MaintenanceRule) => data);

    await service.transitionWorkOrderState(workOrder.id, { type: 'COMPLETE', actualEnd: '2025-02-10T12:00:00Z' }, 'user-1' as UUID);

    expect(storageProvider.updateMaintenanceRule).toHaveBeenCalled();
    const updatedRule = (storageProvider.updateMaintenanceRule as unknown as Mock).mock.calls[0][1] as MaintenanceRule;
    expect(updatedRule.nextDueDate).toBe('2025-03-10');
  });

});

describe('MaintenanceService rule integration with work order generation (T6.1.3-T6.1.5)', () => {
  let storageProvider: IStorageProvider;
  let service: MaintenanceService;

  beforeEach(() => {
    storageProvider = createMockStorageProvider({
      getCurrentUser: vi.fn().mockResolvedValue({ id: 'user-1', firstName: 'Test', lastName: 'User' }),
      createMaintenanceRule: vi.fn().mockImplementation(async (rule: MaintenanceRule) => rule),
      updateMaintenanceRule: vi.fn().mockImplementation(async (_id: string, rule: MaintenanceRule) => rule),
      deleteMaintenanceRule: vi.fn().mockResolvedValue(undefined),
      getMaintenanceRule: vi.fn(),
      getWorkOrders: vi.fn().mockResolvedValue([]),
      createWorkOrder: vi.fn().mockImplementation(async (wo: WorkOrder) => wo),
      deleteWorkOrder: vi.fn().mockResolvedValue(undefined),
      updateWorkOrder: vi.fn().mockImplementation(async (_id: string, wo: WorkOrder) => wo),
    });
    service = new MaintenanceService({ storageProvider, now: () => new Date('2025-01-01T00:00:00Z') });
    vi.clearAllMocks();
  });

  describe('T6.1.3: Rule creation generates future work orders', () => {
    it('should generate scheduled work orders when creating a rule', async () => {
      const ruleData = {
        name: 'Monthly Inspection',
        workType: 'inspection' as const,
        isInternal: true,
        targets: [{ type: 'asset' as const, ids: ['asset-1' as UUID] }],
        intervalType: 'months' as const,
        intervalValue: 1,
        startDate: '2025-01-01',
        nextDueDate: '2025-01-01',
        leadTimeDays: 7,
        createdBy: 'user-1' as UUID,
      };

      await service.createRule(ruleData);

      // Should have created multiple scheduled work orders
      const createCalls = (storageProvider.createWorkOrder as Mock).mock.calls;
      expect(createCalls.length).toBeGreaterThan(0);
      
      // First generated work order should be scheduled for start date
      const firstWO = createCalls[0][0] as WorkOrder;
      expect(firstWO.state).toBe('scheduled');
      expect(firstWO.scheduledStart).toBe('2025-01-01');
    });
  });

  describe('T6.1.4: Rule update regenerates work orders when schedule changes', () => {
    it('should delete and regenerate scheduled work orders when interval changes', async () => {
      const existingRule = createRule({
        id: 'rule-1' as UUID,
        intervalType: 'months',
        intervalValue: 1,
        nextDueDate: '2025-02-01',
      });
      const scheduledWorkOrder = createWorkOrder({
        id: 'scheduled-wo' as UUID,
        ruleId: 'rule-1' as UUID,
        state: 'scheduled',
        scheduledStart: '2025-02-01',
      });

      (storageProvider.getMaintenanceRule as Mock).mockResolvedValue(existingRule);
      (storageProvider.getWorkOrders as Mock).mockResolvedValue([scheduledWorkOrder]);

      await service.updateRule('rule-1' as UUID, {
        intervalValue: 3, // Changed from 1 month to 3 months
      });

      // Should have deleted old scheduled work orders
      expect(storageProvider.deleteWorkOrder).toHaveBeenCalledWith('scheduled-wo');

      // Should have created new scheduled work orders
      const createCalls = (storageProvider.createWorkOrder as Mock).mock.calls;
      expect(createCalls.length).toBeGreaterThan(0);
    });

    it('should not regenerate work orders when only name changes', async () => {
      const existingRule = createRule({
        id: 'rule-1' as UUID,
      });

      (storageProvider.getMaintenanceRule as Mock).mockResolvedValue(existingRule);

      await service.updateRule('rule-1' as UUID, {
        name: 'Updated Rule Name',
      });

      // Should NOT have deleted or created work orders
      expect(storageProvider.deleteWorkOrder).not.toHaveBeenCalled();
      expect(storageProvider.createWorkOrder).not.toHaveBeenCalled();
    });
  });

  describe('T6.1.5: Rule deletion removes scheduled work orders', () => {
    it('should delete all scheduled work orders when rule is deleted', async () => {
      const existingRule = createRule({
        id: 'rule-1' as UUID,
      });
      const scheduledWorkOrders = [
        createWorkOrder({
          id: 'scheduled-wo-1' as UUID,
          ruleId: 'rule-1' as UUID,
          state: 'scheduled',
        }),
        createWorkOrder({
          id: 'scheduled-wo-2' as UUID,
          ruleId: 'rule-1' as UUID,
          state: 'scheduled',
        }),
      ];

      (storageProvider.getMaintenanceRule as Mock).mockResolvedValue(existingRule);
      (storageProvider.getWorkOrders as Mock).mockResolvedValue(scheduledWorkOrders);

      await service.deleteRule('rule-1' as UUID);

      // Should have deleted all scheduled work orders
      expect(storageProvider.deleteWorkOrder).toHaveBeenCalledTimes(2);
      expect(storageProvider.deleteWorkOrder).toHaveBeenCalledWith('scheduled-wo-1');
      expect(storageProvider.deleteWorkOrder).toHaveBeenCalledWith('scheduled-wo-2');
    });

    it('should not delete non-scheduled work orders when rule is deleted', async () => {
      const existingRule = createRule({
        id: 'rule-1' as UUID,
      });
      const workOrders = [
        createWorkOrder({
          id: 'active-wo' as UUID,
          ruleId: 'rule-1' as UUID,
          state: 'in-progress', // Not scheduled
        }),
        createWorkOrder({
          id: 'scheduled-wo' as UUID,
          ruleId: 'rule-1' as UUID,
          state: 'scheduled',
        }),
      ];

      (storageProvider.getMaintenanceRule as Mock).mockResolvedValue(existingRule);
      (storageProvider.getWorkOrders as Mock).mockResolvedValue(workOrders);

      await service.deleteRule('rule-1' as UUID);

      // Should only delete the scheduled one
      expect(storageProvider.deleteWorkOrder).toHaveBeenCalledTimes(1);
      expect(storageProvider.deleteWorkOrder).toHaveBeenCalledWith('scheduled-wo');
    });
  });
});

describe('MaintenanceService scheduled work order processing (T6.2.3)', () => {
  let storageProvider: IStorageProvider;
  let service: MaintenanceService;

  beforeEach(() => {
    storageProvider = createMockStorageProvider({
      getCurrentUser: vi.fn().mockResolvedValue({ id: 'user-1', firstName: 'Test', lastName: 'User' }),
      getWorkOrders: vi.fn().mockResolvedValue([]),
      updateWorkOrder: vi.fn().mockImplementation(async (_id: string, wo: WorkOrder) => wo),
    });
    service = new MaintenanceService({ storageProvider, now: () => new Date('2025-01-15T00:00:00Z') });
    vi.clearAllMocks();
  });

  describe('processScheduledWorkOrders', () => {
    it('should move scheduled work orders to backlog when within lead time', async () => {
      const scheduledWorkOrder = createWorkOrder({
        id: 'wo-1' as UUID,
        state: 'scheduled',
        scheduledStart: '2025-01-20', // 5 days from now
        leadTimeDays: 7, // Lead time is 7 days, so activation starts Jan 13
      });

      (storageProvider.getWorkOrders as Mock).mockResolvedValue([scheduledWorkOrder]);

      await service.processScheduledWorkOrders();

      expect(storageProvider.updateWorkOrder).toHaveBeenCalledWith(
        'wo-1',
        expect.objectContaining({ state: 'backlog' })
      );
    });

    it('should not move scheduled work orders that are outside lead time', async () => {
      const scheduledWorkOrder = createWorkOrder({
        id: 'wo-1' as UUID,
        state: 'scheduled',
        scheduledStart: '2025-02-01', // 17 days from now
        leadTimeDays: 7, // Lead time starts Jan 25, which is after Jan 15
      });

      (storageProvider.getWorkOrders as Mock).mockResolvedValue([scheduledWorkOrder]);

      await service.processScheduledWorkOrders();

      expect(storageProvider.updateWorkOrder).not.toHaveBeenCalled();
    });

    it('should skip non-scheduled work orders', async () => {
      const activeWorkOrder = createWorkOrder({
        id: 'wo-1' as UUID,
        state: 'backlog',
        scheduledStart: '2025-01-20',
        leadTimeDays: 7,
      });

      (storageProvider.getWorkOrders as Mock).mockResolvedValue([activeWorkOrder]);

      await service.processScheduledWorkOrders();

      expect(storageProvider.updateWorkOrder).not.toHaveBeenCalled();
    });

    it('should process multiple scheduled work orders', async () => {
      const workOrders = [
        createWorkOrder({
          id: 'wo-1' as UUID,
          state: 'scheduled',
          scheduledStart: '2025-01-18', // Within lead time
          leadTimeDays: 7,
        }),
        createWorkOrder({
          id: 'wo-2' as UUID,
          state: 'scheduled',
          scheduledStart: '2025-01-20', // Within lead time
          leadTimeDays: 7,
        }),
        createWorkOrder({
          id: 'wo-3' as UUID,
          state: 'scheduled',
          scheduledStart: '2025-02-15', // Outside lead time
          leadTimeDays: 7,
        }),
      ];

      (storageProvider.getWorkOrders as Mock).mockResolvedValue(workOrders);

      await service.processScheduledWorkOrders();

      // Only first two should be updated
      expect(storageProvider.updateWorkOrder).toHaveBeenCalledTimes(2);
      expect(storageProvider.updateWorkOrder).toHaveBeenCalledWith('wo-1', expect.objectContaining({ state: 'backlog' }));
      expect(storageProvider.updateWorkOrder).toHaveBeenCalledWith('wo-2', expect.objectContaining({ state: 'backlog' }));
    });
  });
});
