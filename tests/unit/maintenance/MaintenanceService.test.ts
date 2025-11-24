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
