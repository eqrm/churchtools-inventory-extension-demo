import { createActor } from 'xstate';
import type {
  MaintenanceCompany,
  MaintenanceRule,
  WorkOrder,
  WorkOrderLineItem,
  WorkOrderHistoryEntry,
  InternalWorkOrderState,
  ExternalWorkOrderState,
} from '../types/maintenance';
import type { IStorageProvider } from '../types/storage';
import type { UUID, ISOTimestamp, ISODate } from '../types/entities';
import type { UndoActionType } from '../types/undo';
import { internalWorkOrderMachine } from './machines/InternalWorkOrderMachine';
import { externalWorkOrderMachine } from './machines/ExternalWorkOrderMachine';
import type { InternalWorkOrderEvent } from './machines/InternalWorkOrderMachine';
import type { ExternalWorkOrderEvent } from './machines/ExternalWorkOrderMachine';
import { recordUndoAction, registerUndoHandler } from './undo';

export interface MaintenanceServiceOptions {
  storageProvider: IStorageProvider;
  now?: () => Date;
}

type CompanyUndoState = { company: MaintenanceCompany };
type RuleUndoState = { rule: MaintenanceRule };
type WorkOrderUndoState = { workOrder: WorkOrder };

/**
 * MaintenanceService (T142)
 * 
 * Handles CRUD operations for:
 * - MaintenanceCompany: External service providers
 * - MaintenanceRule: Recurring maintenance schedules
 * - WorkOrder: Work order instances with XState state machine management
 * 
 * Features:
 * - XState v5 actor-based state management for work orders
 * - Snapshot persistence for work order state resumption
 * - Rule conflict detection (overlapping intervals)
 * - Automatic work order generation from rules
 * - Per-asset completion tracking in work orders
 * - Integration with undo service
 */
export class MaintenanceService {
  private readonly storageProvider: IStorageProvider;
  private readonly now: () => Date;

  constructor(options: MaintenanceServiceOptions) {
    this.storageProvider = options.storageProvider;
    this.now = options.now ?? (() => new Date());
    this.registerUndoHandlers();
  }

  private timestamp(): ISOTimestamp {
    return this.now().toISOString();
  }

  // ========================================
  // MaintenanceCompany CRUD
  // ========================================

  async getCompanies(): Promise<MaintenanceCompany[]> {
    return await this.storageProvider.getMaintenanceCompanies();
  }

  async getCompany(id: UUID): Promise<MaintenanceCompany | null> {
    return await this.storageProvider.getMaintenanceCompany(id);
  }

  async createCompany(
    data: Omit<MaintenanceCompany, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<MaintenanceCompany> {
    const company: MaintenanceCompany = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: this.timestamp(),
      updatedAt: this.timestamp(),
    };

    const created = await this.storageProvider.createMaintenanceCompany(company);

    await recordUndoAction({
      entityType: 'maintenanceCompany',
      entityId: created.id,
      actionType: 'create',
      beforeState: null,
      afterState: { company: created } satisfies CompanyUndoState,
      metadata: { companyName: created.name },
    });

    return created;
  }

  async updateCompany(
    id: UUID,
    data: Partial<Omit<MaintenanceCompany, 'id' | 'createdAt' | 'createdBy'>>
  ): Promise<MaintenanceCompany> {
    const existing = await this.requireCompany(id);

    const updated: MaintenanceCompany = {
      ...existing,
      ...data,
      id: existing.id,
      createdAt: existing.createdAt,
      createdBy: existing.createdBy,
      updatedAt: this.timestamp(),
    };

    const saved = await this.storageProvider.updateMaintenanceCompany(id, updated);

    await recordUndoAction({
      entityType: 'maintenanceCompany',
      entityId: id,
      actionType: 'update',
      beforeState: { company: existing } satisfies CompanyUndoState,
      afterState: { company: saved } satisfies CompanyUndoState,
      metadata: { companyName: saved.name },
    });

    return saved;
  }

  async deleteCompany(id: UUID): Promise<void> {
    const existing = await this.requireCompany(id);

    await this.storageProvider.deleteMaintenanceCompany(id);

    await recordUndoAction({
      entityType: 'maintenanceCompany',
      entityId: id,
      actionType: 'delete',
      beforeState: { company: existing } satisfies CompanyUndoState,
      afterState: null,
      metadata: { companyName: existing.name },
    });
  }

  private async requireCompany(id: UUID): Promise<MaintenanceCompany> {
    const company = await this.getCompany(id);
    if (!company) {
      throw new Error(`MaintenanceCompany not found: ${id}`);
    }
    return company;
  }

  // ========================================
  // MaintenanceRule CRUD
  // ========================================

  async getRules(): Promise<MaintenanceRule[]> {
    return await this.storageProvider.getMaintenanceRules();
  }

  async getRule(id: UUID): Promise<MaintenanceRule | null> {
    return await this.storageProvider.getMaintenanceRule(id);
  }

  async createRule(
    data: Omit<MaintenanceRule, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<MaintenanceRule> {
    // Get current user for createdBy field
    const user = await this.storageProvider.getCurrentUser();
    
    // Calculate nextDueDate if not provided
    let nextDueDate = data.nextDueDate;
    if (!nextDueDate) {
      const startDate = new Date(data.startDate);
      if (data.intervalType === 'months') {
        const dueDate = new Date(startDate);
        dueDate.setMonth(dueDate.getMonth() + data.intervalValue);
        nextDueDate = dueDate.toISOString().split('T')[0] as ISODate;
      } else {
        // For 'uses' type, nextDueDate is the same as startDate initially
        nextDueDate = data.startDate;
      }
    }

    const rule: MaintenanceRule = {
      ...data,
      nextDueDate,
      createdBy: data.createdBy || user.id,
      createdByName: data.createdByName || `${user.firstName} ${user.lastName}`,
      id: crypto.randomUUID(),
      createdAt: this.timestamp(),
      updatedAt: this.timestamp(),
    };

    const created = await this.storageProvider.createMaintenanceRule(rule);

    await recordUndoAction({
      entityType: 'maintenanceRule',
      entityId: created.id,
      actionType: 'create',
      beforeState: null,
      afterState: { rule: created } satisfies RuleUndoState,
      metadata: { ruleName: created.name },
    });

    return created;
  }

  async updateRule(
    id: UUID,
    data: Partial<Omit<MaintenanceRule, 'id' | 'createdAt' | 'createdBy'>>
  ): Promise<MaintenanceRule> {
    const existing = await this.requireRule(id);

    const updated: MaintenanceRule = {
      ...existing,
      ...data,
      id: existing.id,
      createdAt: existing.createdAt,
      createdBy: existing.createdBy,
      updatedAt: this.timestamp(),
    };

    const saved = await this.storageProvider.updateMaintenanceRule(id, updated);

    await recordUndoAction({
      entityType: 'maintenanceRule',
      entityId: id,
      actionType: 'update',
      beforeState: { rule: existing } satisfies RuleUndoState,
      afterState: { rule: saved } satisfies RuleUndoState,
      metadata: { ruleName: saved.name },
    });

    return saved;
  }

  async deleteRule(id: UUID): Promise<void> {
    const existing = await this.requireRule(id);

    await this.storageProvider.deleteMaintenanceRule(id);

    await recordUndoAction({
      entityType: 'maintenanceRule',
      entityId: id,
      actionType: 'delete',
      beforeState: { rule: existing } satisfies RuleUndoState,
      afterState: null,
      metadata: { ruleName: existing.name },
    });
  }

  private async requireRule(id: UUID): Promise<MaintenanceRule> {
    const rule = await this.getRule(id);
    if (!rule) {
      throw new Error(`MaintenanceRule not found: ${id}`);
    }
    return rule;
  }

  /**
   * Detect conflicting maintenance rules (overlapping intervals on same targets)
   * Returns array of rule pairs that have conflicts
   */
  async detectRuleConflicts(): Promise<Array<{ rule1: MaintenanceRule; rule2: MaintenanceRule }>> {
    const rules = await this.getRules();
    const conflicts: Array<{ rule1: MaintenanceRule; rule2: MaintenanceRule }> = [];

    for (let i = 0; i < rules.length; i++) {
      for (let j = i + 1; j < rules.length; j++) {
        const rule1 = rules[i];
        const rule2 = rules[j];
        if (!rule1 || !rule2) continue;

        // Check if rules target same entities
        const hasOverlappingTargets = this.doTargetsOverlap(rule1, rule2);
        if (!hasOverlappingTargets) continue;

        // Check if intervals overlap (same work type + similar intervals)
        const hasOverlappingIntervals = this.doIntervalsOverlap(rule1, rule2);
        if (hasOverlappingIntervals) {
          conflicts.push({ rule1, rule2 });
        }
      }
    }

    return conflicts;
  }

  private doTargetsOverlap(rule1: MaintenanceRule, rule2: MaintenanceRule): boolean {
    for (const target1 of rule1.targets) {
      for (const target2 of rule2.targets) {
        if (target1.type !== target2.type) continue;

        // Check if any IDs overlap
        const hasCommonId = target1.ids.some((id) => target2.ids.includes(id));
        if (hasCommonId) return true;
      }
    }
    return false;
  }

  private doIntervalsOverlap(rule1: MaintenanceRule, rule2: MaintenanceRule): boolean {
    // Must be same work type
    if (rule1.workType !== rule2.workType) return false;

    // Must be same interval type (months vs uses)
    if (rule1.intervalType !== rule2.intervalType) return false;

    // Consider overlapping if intervals are within 20% of each other
    const ratio = rule1.intervalValue / rule2.intervalValue;
    return ratio >= 0.8 && ratio <= 1.2;
  }

  // ========================================
  // WorkOrder CRUD & State Management
  // ========================================

  async getWorkOrders(): Promise<WorkOrder[]> {
    return await this.storageProvider.getWorkOrders();
  }

  async getWorkOrder(id: UUID): Promise<WorkOrder | null> {
    return await this.storageProvider.getWorkOrder(id);
  }

  /**
   * Create work order from maintenance rule
   * Automatically generates line items for all target assets
   */
  async createWorkOrderFromRule(ruleId: UUID): Promise<WorkOrder> {
    const rule = await this.requireRule(ruleId);

    // Generate line items from rule targets
    const lineItems = await this.generateLineItemsFromRule(rule);

    const workOrder: Omit<WorkOrder, 'id' | 'createdAt' | 'updatedAt'> = {
      workOrderNumber: await this.generateWorkOrderNumber(),
      type: rule.isInternal ? 'internal' : 'external',
      state: 'backlog',
      ruleId: rule.id,
      companyId: rule.serviceProviderId,
      leadTimeDays: rule.leadTimeDays,
      lineItems,
      offers: [],
      history: [],
      createdBy: rule.createdBy,
      createdByName: rule.createdByName,
    };

    return await this.createWorkOrder(workOrder);
  }

  /**
   * Create work order manually
   */
  async createWorkOrder(
    data: Omit<WorkOrder, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<WorkOrder> {
    const workOrder: WorkOrder = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: this.timestamp(),
      updatedAt: this.timestamp(),
      history: [
        {
          id: crypto.randomUUID(),
          state: data.state,
          changedAt: this.timestamp(),
          changedBy: data.createdBy,
          changedByName: data.createdByName,
        },
      ],
    };

    const created = await this.storageProvider.createWorkOrder(workOrder);

    await recordUndoAction({
      entityType: 'workOrder',
      entityId: created.id,
      actionType: 'create',
      beforeState: null,
      afterState: { workOrder: created } satisfies WorkOrderUndoState,
      metadata: { workOrderNumber: created.workOrderNumber },
    });

    return created;
  }

  /**
   * Transition work order state using XState actor
   * 
   * This method:
   * 1. Loads current work order
   * 2. Creates XState actor from persisted snapshot
   * 3. Sends transition event
   * 4. Persists new snapshot
   * 5. Records undo action
   */
  async transitionWorkOrderState(
    id: UUID,
    event: InternalWorkOrderEvent | ExternalWorkOrderEvent,
    changedBy: UUID,
    changedByName?: string
  ): Promise<WorkOrder> {
    const existing = await this.requireWorkOrder(id);

    // Create appropriate machine based on work order type
    const machine =
      existing.type === 'internal' ? internalWorkOrderMachine : externalWorkOrderMachine;

    // Create actor with current work order state
    const actor = createActor(machine, {
      input: { workOrder: existing },
    });

    actor.start();

    // Send transition event
    actor.send(event);

    // Get new state snapshot
    const snapshot = actor.getSnapshot();

    // Check if state changed
    if (snapshot.value === existing.state) {
      throw new Error(`Invalid transition: ${event.type} not allowed from state ${existing.state}`);
    }

    // Build updated work order from snapshot
    const newState = snapshot.value as InternalWorkOrderState | ExternalWorkOrderState;
    const updatedContext = snapshot.context.workOrder;

    const historyEntry: WorkOrderHistoryEntry = {
      id: crypto.randomUUID(),
      state: newState,
      changedAt: this.timestamp(),
      changedBy,
      changedByName,
    };

    const updated: WorkOrder = {
      ...existing,
      ...updatedContext,
      state: newState,
      history: [...existing.history, historyEntry],
      updatedAt: this.timestamp(),
    };

    const saved = await this.storageProvider.updateWorkOrder(id, updated);

    await recordUndoAction({
      entityType: 'workOrder',
      entityId: id,
      actionType: 'update',
      beforeState: { workOrder: existing } satisfies WorkOrderUndoState,
      afterState: { workOrder: saved } satisfies WorkOrderUndoState,
      metadata: { workOrderNumber: saved.workOrderNumber },
    });

    actor.stop();
    return saved;
  }

  /**
   * Mark individual asset as complete in work order
   */
  async markAssetComplete(
    workOrderId: UUID,
    assetId: UUID,
    _completedBy: UUID
  ): Promise<WorkOrder> {
    const existing = await this.requireWorkOrder(workOrderId);

    const lineItems: WorkOrderLineItem[] = existing.lineItems.map((item) => {
      if (item.assetId === assetId) {
        return {
          ...item,
          completionStatus: 'completed',
          completedAt: this.timestamp(),
        };
      }
      return item;
    });

    const updated: WorkOrder = {
      ...existing,
      lineItems,
      updatedAt: this.timestamp(),
    };

    const saved = await this.storageProvider.updateWorkOrder(workOrderId, updated);

    await recordUndoAction({
      entityType: 'workOrder',
      entityId: workOrderId,
      actionType: 'update',
      beforeState: { workOrder: existing } satisfies WorkOrderUndoState,
      afterState: { workOrder: saved } satisfies WorkOrderUndoState,
      metadata: { workOrderNumber: saved.workOrderNumber },
    });

    return saved;
  }

  private async requireWorkOrder(id: UUID): Promise<WorkOrder> {
    const workOrder = await this.getWorkOrder(id);
    if (!workOrder) {
      throw new Error(`WorkOrder not found: ${id}`);
    }
    return workOrder;
  }

  /**
   * Generate line items from rule targets
   * Resolves tags/models/kits to individual assets
   */
  private async generateLineItemsFromRule(rule: MaintenanceRule): Promise<WorkOrderLineItem[]> {
    const assetIds = new Set<UUID>();

    for (const target of rule.targets) {
      if (target.type === 'asset') {
        target.ids.forEach((id) => assetIds.add(id));
      } else if (target.type === 'kit') {
        // Resolve kit to bound assets
        for (const kitId of target.ids) {
          const kit = await this.storageProvider.getKit(kitId);
          if (kit && kit.boundAssets) {
            kit.boundAssets.forEach((bound) => assetIds.add(bound.assetId));
          }
        }
      } else if (target.type === 'model') {
        // Resolve model to assets
        const assets = await this.storageProvider.getAssets();
        assets.forEach((asset) => {
          if (asset.modelId && target.ids.includes(asset.modelId)) {
            assetIds.add(asset.id);
          }
        });
      } else if (target.type === 'tag') {
        // Resolve tag to assets
        const assets = await this.storageProvider.getAssets();
        assets.forEach((asset) => {
          const directTags = asset.tagIds || [];
          const inheritedTags = (asset.inheritedTags || []).map((t) => t.tagId);
          const allTags = [...directTags, ...inheritedTags];
          if (allTags.some((tagId) => target.ids.includes(tagId))) {
            assetIds.add(asset.id);
          }
        });
      }
    }

    return Array.from(assetIds).map((assetId) => ({
      assetId,
      completionStatus: 'pending',
    }));
  }

  /**
   * Generate unique work order number
   * Format: WO-YYYYMMDD-XXXX
   */
  private async generateWorkOrderNumber(): Promise<string> {
    const datePart = this.now().toISOString().split('T')[0];
    if (!datePart) {
      throw new Error('Failed to extract date from ISO string');
    }
    const dateStr = datePart.replace(/-/g, '');
    const existingOrders = await this.getWorkOrders();

    // Find max sequence number for today
    const todayPrefix = `WO-${dateStr}-`;
    const todayOrders = existingOrders.filter((wo) => wo.workOrderNumber.startsWith(todayPrefix));

    let maxSeq = 0;
    todayOrders.forEach((wo) => {
      const parts = wo.workOrderNumber.split('-');
      const seqStr = parts[2];
      if (seqStr) {
        const seq = parseInt(seqStr, 10);
        if (!isNaN(seq) && seq > maxSeq) {
          maxSeq = seq;
        }
      }
    });

    const nextSeq = (maxSeq + 1).toString().padStart(4, '0');
    return `${todayPrefix}${nextSeq}`;
  }

  // ========================================
  // Work Order Auto-Generation
  // ========================================

  /**
   * Generate work orders for all active rules based on their schedules.
   * This should be run daily (e.g., at 00:05) as a background job.
   */
  public async autoGenerateWorkOrders(): Promise<void> {
    const rules = await this.getRules();
    const today = new Date();

    for (const rule of rules) {
      // Check if work order should be created for this rule
      const shouldCreate = await this.shouldCreateWorkOrderForRule(rule, today);
      
      if (shouldCreate) {
        try {
          await this.createWorkOrderFromRule(rule.id);
        } catch (error) {
          console.error(`Failed to auto-generate work order for rule ${rule.id}:`, error);
          // Continue with other rules even if one fails
        }
      }
    }
  }

  /**
   * Determine if a work order should be created for a rule today.
   * Checks the rule's interval and last work order creation date.
   */
  private async shouldCreateWorkOrderForRule(
    rule: MaintenanceRule,
    today: Date
  ): Promise<boolean> {
    const startDate = new Date(rule.startDate);
    
    // Don't create if start date is in the future
    if (startDate > today) {
      return false;
    }

    // Get all work orders for this rule
    const allWorkOrders = await this.getWorkOrders();
    const ruleWorkOrders = allWorkOrders
      .filter((wo) => wo.ruleId === rule.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // If no work orders exist, create one if we're past the start date
    if (ruleWorkOrders.length === 0) {
      return true;
    }

    const lastWorkOrder = ruleWorkOrders[0];
    if (!lastWorkOrder) {
      return true;
    }
    
    const lastCreated = new Date(lastWorkOrder.createdAt);

    // Calculate next due date based on interval type
    if (rule.intervalType === 'months') {
      const nextDueDate = new Date(lastCreated);
      nextDueDate.setMonth(nextDueDate.getMonth() + rule.intervalValue);
      
      // Subtract lead time days
      const scheduledDate = new Date(nextDueDate);
      scheduledDate.setDate(scheduledDate.getDate() - rule.leadTimeDays);

      return today >= scheduledDate;
    } else {
      // For 'uses' interval type, we would need usage tracking
      // For now, skip auto-generation for usage-based rules
      return false;
    }
  }

  // ========================================
  // Undo Integration
  // ========================================

  private registerUndoHandlers(): void {
    registerUndoHandler('maintenanceCompany' as UndoActionType, async (action) => {
      if (action.actionType === 'create') {
        await this.storageProvider.deleteMaintenanceCompany(action.entityId);
      } else if (action.actionType === 'update' && action.beforeState) {
        const { company } = action.beforeState as CompanyUndoState;
        await this.storageProvider.updateMaintenanceCompany(action.entityId, company);
      } else if (action.actionType === 'delete' && action.beforeState) {
        const { company } = action.beforeState as CompanyUndoState;
        await this.storageProvider.createMaintenanceCompany(company);
      }
    });

    registerUndoHandler('maintenanceRule' as UndoActionType, async (action) => {
      if (action.actionType === 'create') {
        await this.storageProvider.deleteMaintenanceRule(action.entityId);
      } else if (action.actionType === 'update' && action.beforeState) {
        const { rule } = action.beforeState as RuleUndoState;
        await this.storageProvider.updateMaintenanceRule(action.entityId, rule);
      } else if (action.actionType === 'delete' && action.beforeState) {
        const { rule } = action.beforeState as RuleUndoState;
        await this.storageProvider.createMaintenanceRule(rule);
      }
    });

    registerUndoHandler('workOrder' as UndoActionType, async (action) => {
      if (action.actionType === 'create') {
        await this.storageProvider.deleteWorkOrder(action.entityId);
      } else if (action.actionType === 'update' && action.beforeState) {
        const { workOrder } = action.beforeState as WorkOrderUndoState;
        await this.storageProvider.updateWorkOrder(action.entityId, workOrder);
      } else if (action.actionType === 'delete' && action.beforeState) {
        const { workOrder } = action.beforeState as WorkOrderUndoState;
        await this.storageProvider.createWorkOrder(workOrder);
      }
    });
  }
}
