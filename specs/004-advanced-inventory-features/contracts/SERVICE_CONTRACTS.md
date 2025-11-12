# Service Contracts: Advanced Inventory Features

**Feature**: 004-advanced-inventory-features  
**Date**: 2025-11-10

## Overview

This document defines the public interfaces (contracts) for all services implementing the Advanced Inventory Features. These contracts serve as the API specification for service interactions and enable test-driven development.

---

## 1. UndoService

**Purpose**: Manage undo/redo functionality with IndexedDB persistence

```typescript
interface IUndoService {
  /**
   * Record a user action for undo capability
   * @param action - The action to record
   * @returns Promise resolving to the created UndoAction ID
   */
  recordAction(action: UndoableAction): Promise<string>;
  
  /**
   * Record a compound action (multiple entities created/modified together)
   * @param action - The compound action details
   * @returns Promise resolving to the created UndoAction ID
   */
  recordCompoundAction(action: CompoundAction): Promise<string>;
  
  /**
   * Undo a specific action
   * @param actionId - ID of the UndoAction to undo
   * @returns Promise resolving to true if successful
   * @throws Error if action expired or already undone
   */
  undoAction(actionId: string): Promise<boolean>;
  
  /**
   * Get undo history for current user
   * @param limit - Maximum number of actions to return (default 50)
   * @returns Promise resolving to array of UndoActions
   */
  getUserUndoHistory(limit?: number): Promise<UndoAction[]>;
  
  /**
   * Cleanup expired undo actions (older than 24 hours)
   * @returns Promise resolving to number of actions deleted
   */
  cleanupExpired(): Promise<number>;
}

interface UndoableAction {
  entityType: string;
  entityId: string;
  actionType: 'create' | 'update' | 'delete' | 'status_change';
  beforeState: Record<string, any> | null;
  afterState: Record<string, any> | null;
  description: string;
}

interface CompoundAction extends UndoableAction {
  createdEntityIds: string[];
}
```

**Test Coverage Requirements** (TDD):
- ✅ Record simple action (create/update/delete)
- ✅ Record compound action (kit + sub-assets)
- ✅ Undo create action (deletes entity)
- ✅ Undo update action (restores previous state)
- ✅ Undo compound action (cascades to all created entities)
- ✅ Reject undo of expired action (>24 hours)
- ✅ Reject undo of already-undone action
- ✅ Cleanup removes only expired actions

---

## 2. PhotoStorageService

**Purpose**: Abstraction layer for damage report photo storage

```typescript
interface IPhotoStorageService {
  /**
   * Store photos with compression and encoding
   * @param files - Array of File objects (max 3)
   * @returns Promise resolving to array of storage handles (base64 strings or URLs)
   * @throws Error if file exceeds 2MB or more than 3 files
   */
  storePhotos(files: File[]): Promise<string[]>;
  
  /**
   * Retrieve photo data for display
   * @param handle - Storage handle (base64 string or URL)
   * @returns Promise resolving to displayable image data
   */
  retrievePhoto(handle: string): Promise<string>;
  
  /**
   * Delete photos
   * @param handles - Array of storage handles to delete
   * @returns Promise resolving when deletion complete
   */
  deletePhotos(handles: string[]): Promise<void>;
  
  /**
   * Compress image before storage
   * @param file - Image file to compress
   * @param options - Compression options
   * @returns Promise resolving to compressed base64 string
   * @throws Error if compressed image still exceeds limit
   */
  compressImage(
    file: File,
    options?: { maxWidth?: number; maxHeight?: number; quality?: number }
  ): Promise<string>;
}
```

**Implementation Modes** (feature-flagged):
- **Mode A** (Current): Base64 encoding with compression, stored in ChurchTools custom data
- **Mode B** (Future): ChurchTools Files API integration

**Test Coverage Requirements** (TDD):
- ✅ Compress image to target size (800x600, quality 0.8)
- ✅ Reject file larger than 2MB after compression
- ✅ Reject more than 3 files
- ✅ Store and retrieve photos correctly
- ✅ Base64 encoding/decoding roundtrip preserves image
- ✅ Feature flag switches storage mode

---

## 3. PropertyInheritanceService

**Purpose**: Manage kit property inheritance logic

```typescript
interface IPropertyInheritanceService {
  /**
   * Calculate inherited properties for a sub-asset
   * @param assetId - ID of the sub-asset
   * @param kitId - ID of the parent kit
   * @returns Promise resolving to inherited property values
   */
  getInheritedProperties(assetId: string, kitId: string): Promise<InheritedProperties>;
  
  /**
   * Check if a property is inherited
   * @param assetId - ID of the asset
   * @param propertyName - Name of the property to check
   * @returns Promise resolving to inheritance status
   */
  isPropertyInherited(
    assetId: string,
    propertyName: string
  ): Promise<{ inherited: boolean; source?: string }>;
  
  /**
   * Propagate kit property change to all sub-assets
   * @param kitId - ID of the kit
   * @param propertyName - Property being updated
   * @param newValue - New property value
   * @returns Promise resolving to array of updated asset IDs
   * @throws Error if property not configured for inheritance
   */
  propagateKitChange(
    kitId: string,
    propertyName: string,
    newValue: any
  ): Promise<string[]>;
  
  /**
   * Unlock inherited properties on kit disassembly
   * @param kitId - ID of the kit being disassembled
   * @returns Promise resolving when unlock complete
   */
  unlockInheritedProperties(kitId: string): Promise<void>;
}

interface InheritedProperties {
  location?: string;
  status?: string;
  tags?: string[];
}
```

**Test Coverage Requirements** (TDD):
- ✅ Calculate inherited properties based on kit configuration
- ✅ Detect inherited properties correctly
- ✅ Propagate location change to all sub-assets
- ✅ Propagate status change to all sub-assets
- ✅ Propagate tag changes to all sub-assets
- ✅ Unlock properties on disassembly
- ✅ Record compound undo action for propagation
- ✅ Reject propagation for non-inherited properties

---

## 4. WorkOrderStateMachine

**Purpose**: Validate work order state transitions

```typescript
interface IWorkOrderStateMachine {
  /**
   * Check if a state transition is valid
   * @param workOrder - Current work order
   * @param newState - Target state
   * @returns Validation result with allowed transitions
   */
  canTransition(
    workOrder: WorkOrder,
    newState: WorkOrderState
  ): { allowed: boolean; reason?: string; allowedStates: WorkOrderState[] };
  
  /**
   * Transition work order to new state
   * @param workOrderId - ID of the work order
   * @param newState - Target state
   * @param context - Additional context (e.g., user performing action)
   * @returns Promise resolving to updated work order
   * @throws Error if transition not allowed
   */
  transition(
    workOrderId: string,
    newState: WorkOrderState,
    context?: StateTransitionContext
  ): Promise<WorkOrder>;
  
  /**
   * Get allowed next states for work order
   * @param workOrder - Current work order
   * @returns Array of states that can be transitioned to
   */
  getAllowedNextStates(workOrder: WorkOrder): WorkOrderState[];
}

interface StateTransitionContext {
  userId: string;
  notes?: string;
  timestamp?: string;
}

type WorkOrderState = 
  | 'backlog'
  | 'assigned'
  | 'offer_requested'
  | 'offer_received'
  | 'planned'
  | 'in_progress'
  | 'completed'
  | 'aborted'
  | 'obsolete'
  | 'done';
```

**Test Coverage Requirements** (TDD):
- ✅ Allow valid transitions (e.g., backlog → assigned)
- ✅ Reject invalid transitions (e.g., backlog → completed)
- ✅ Different state machines for internal vs external work orders
- ✅ Validate prerequisites (e.g., assignedTo required for 'assigned' state)
- ✅ Record state history
- ✅ Allow reopen from completed to in_progress
- ✅ Terminal states (done, aborted, obsolete) have no outgoing transitions

---

## 5. DamageService

**Purpose**: Manage damage reports and repair history

```typescript
interface IDamageService {
  /**
   * Create a damage report for an asset
   * @param assetId - ID of the asset
   * @param report - Damage report data
   * @returns Promise resolving to created DamageReport
   */
  createDamageReport(assetId: string, report: CreateDamageReportDTO): Promise<DamageReport>;
  
  /**
   * Mark asset as repaired
   * @param reportId - ID of the damage report
   * @param repairData - Repair details
   * @returns Promise resolving to updated DamageReport
   * @throws Error if report already marked as repaired
   */
  markAsRepaired(reportId: string, repairData: RepairDataDTO): Promise<DamageReport>;
  
  /**
   * Get repair history for an asset
   * @param assetId - ID of the asset
   * @returns Promise resolving to array of DamageReports
   */
  getRepairHistory(assetId: string): Promise<DamageReport[]>;
  
  /**
   * Get all broken assets
   * @returns Promise resolving to array of Assets with status 'Broken'
   */
  getBrokenAssets(): Promise<Asset[]>;
}

interface CreateDamageReportDTO {
  description: string;
  photos: File[];  // Max 3 files, 2MB each
}

interface RepairDataDTO {
  repairNotes: string;
  repairedBy: string;
  repairedDate?: string;  // Defaults to now
}
```

**Test Coverage Requirements**:
- Manual testing for photo upload UI
- TDD for damage report state transitions
- TDD for asset status update on damage report creation

---

## 6. AssignmentService

**Purpose**: Manage asset assignments to users/groups

```typescript
interface IAssignmentService {
  /**
   * Assign asset to user or group
   * @param assetId - ID of the asset
   * @param assignmentData - Assignment details
   * @returns Promise resolving to created Assignment
   * @throws Error if asset already assigned
   */
  assignAsset(assetId: string, assignmentData: CreateAssignmentDTO): Promise<Assignment>;
  
  /**
   * Check in assigned asset
   * @param assignmentId - ID of the active assignment
   * @returns Promise resolving to updated Assignment
   * @throws Error if assignment already checked in
   */
  checkInAsset(assignmentId: string): Promise<Assignment>;
  
  /**
   * Get assignment history for asset
   * @param assetId - ID of the asset
   * @returns Promise resolving to array of Assignments
   */
  getAssignmentHistory(assetId: string): Promise<Assignment[]>;
  
  /**
   * Get current assignment for asset
   * @param assetId - ID of the asset
   * @returns Promise resolving to Assignment or null
   */
  getCurrentAssignment(assetId: string): Promise<Assignment | null>;
  
  /**
   * Get all assigned assets for user
   * @param userId - ChurchTools user ID
   * @returns Promise resolving to array of Assets
   */
  getUserAssignments(userId: string): Promise<Asset[]>;
}

interface CreateAssignmentDTO {
  assignedTo: {
    type: 'person' | 'group';
    id: string;
    name: string;
  };
  checkoutDate?: string;  // Defaults to now
  notes?: string;
}
```

**Test Coverage Requirements**:
- TDD for assignment creation
- TDD for asset status update (Available → In Use)
- TDD for check-in (sets checkInDate, updates status)
- TDD for rejection of double assignment

---

## 7. DataViewService

**Purpose**: Manage saved views and filter execution

```typescript
interface IDataViewService {
  /**
   * Create saved view
   * @param view - View configuration
   * @returns Promise resolving to created DataView
   */
  createView(view: CreateDataViewDTO): Promise<DataView>;
  
  /**
   * Update saved view
   * @param viewId - ID of the view
   * @param updates - Partial view updates
   * @returns Promise resolving to updated DataView
   */
  updateView(viewId: string, updates: Partial<DataView>): Promise<DataView>;
  
  /**
   * Delete saved view
   * @param viewId - ID of the view
   * @returns Promise resolving when deletion complete
   */
  deleteView(viewId: string): Promise<void>;
  
  /**
   * Get user's saved views
   * @param userId - ChurchTools user ID
   * @returns Promise resolving to array of DataViews
   */
  getUserViews(userId: string): Promise<DataView[]>;
  
  /**
   * Execute filters on asset array
   * @param assets - Array of assets to filter
   * @param filters - Array of filter conditions
   * @returns Filtered asset array
   */
  applyFilters(assets: Asset[], filters: FilterCondition[]): Asset[];
  
  /**
   * Apply sorting to asset array
   * @param assets - Array of assets to sort
   * @param sorts - Array of sort configurations
   * @returns Sorted asset array
   */
  applySorts(assets: Asset[], sorts: SortConfig[]): Asset[];
  
  /**
   * Group assets by field
   * @param assets - Array of assets to group
   * @param groupBy - Grouping configuration
   * @returns Grouped assets map
   */
  groupAssets(assets: Asset[], groupBy: GroupConfig): Map<string, Asset[]>;
}

interface CreateDataViewDTO {
  name: string;
  viewType: 'table' | 'gallery' | 'kanban' | 'calendar';
  filters?: FilterCondition[];
  sorts?: SortConfig[];
  groupBy?: GroupConfig;
}
```

**Test Coverage Requirements**:
- TDD for filter execution (all filter types)
- TDD for relative date resolution
- TDD for sort application
- TDD for grouping logic
- Manual testing for UI interactions

---

## 8. MaintenanceService

**Purpose**: Manage maintenance companies, rules, and work orders

```typescript
interface IMaintenanceService {
  // Company Management
  createCompany(company: CreateCompanyDTO): Promise<MaintenanceCompany>;
  updateCompany(companyId: string, updates: Partial<MaintenanceCompany>): Promise<MaintenanceCompany>;
  deleteCompany(companyId: string): Promise<void>;
  getCompanies(): Promise<MaintenanceCompany[]>;
  
  // Rule Management
  createRule(rule: CreateRuleDTO): Promise<MaintenanceRule>;
  updateRule(ruleId: string, updates: Partial<MaintenanceRule>): Promise<MaintenanceRule>;
  deleteRule(ruleId: string): Promise<void>;
  getRulesForAsset(assetId: string): Promise<MaintenanceRule[]>;
  getActiveRules(): Promise<MaintenanceRule[]>;
  detectRuleConflicts(assetId: string): Promise<RuleConflict[]>;
  
  // Work Order Management
  createWorkOrder(workOrder: CreateWorkOrderDTO): Promise<WorkOrder>;
  updateWorkOrder(workOrderId: string, updates: Partial<WorkOrder>): Promise<WorkOrder>;
  transitionWorkOrderState(workOrderId: string, newState: WorkOrderState): Promise<WorkOrder>;
  markAssetComplete(workOrderId: string, assetId: string): Promise<WorkOrder>;
  addOffer(workOrderId: string, offer: OfferDTO): Promise<WorkOrder>;
  acceptOffer(workOrderId: string, offerId: string): Promise<WorkOrder>;
  
  // Auto-generation
  createWorkOrderFromRule(rule: MaintenanceRule): Promise<WorkOrder>;
}

interface RuleConflict {
  rule1: MaintenanceRule;
  rule2: MaintenanceRule;
  overlapDays: number;
  assetId: string;
}
```

**Test Coverage Requirements**:
- TDD for rule application logic (applies-to filtering)
- TDD for conflict detection
- TDD for work order auto-generation from rules
- TDD for work order state transitions (via WorkOrderStateMachine)

---

## 9. SettingsVersionService

**Purpose**: Manage settings versioning and export/import

```typescript
interface ISettingsVersionService {
  /**
   * Create new settings version
   * @param settings - Current settings snapshot
   * @param changeSummary - Description of changes
   * @returns Promise resolving to created SettingsVersion
   */
  createVersion(settings: any, changeSummary: string): Promise<SettingsVersion>;
  
  /**
   * Get settings version history
   * @returns Promise resolving to array of SettingsVersions
   */
  getVersionHistory(): Promise<SettingsVersion[]>;
  
  /**
   * Rollback to previous version
   * @param versionId - ID of the version to rollback to
   * @returns Promise resolving to new current version
   */
  rollbackToVersion(versionId: string): Promise<SettingsVersion>;
  
  /**
   * Export settings to JSON
   * @returns Promise resolving to JSON string
   */
  exportSettings(): Promise<string>;
  
  /**
   * Import settings from JSON
   * @param jsonData - JSON string with settings
   * @returns Promise resolving to created version
   * @throws Error if JSON invalid or schema mismatch
   */
  importSettings(jsonData: string): Promise<SettingsVersion>;
  
  /**
   * Cleanup expired versions (>90 days, except latest)
   * @returns Promise resolving to number of versions deleted
   */
  cleanupExpiredVersions(): Promise<number>;
}
```

**Test Coverage Requirements**:
- TDD for version creation
- TDD for rollback logic
- TDD for export/import validation
- TDD for cleanup (preserves latest version)

---

## Contract Compliance

All services implementing these interfaces MUST:

1. **Type Safety**: Implement interfaces with explicit TypeScript types
2. **Error Handling**: Throw typed errors with descriptive messages
3. **Testing**: Pass TDD test suites before implementation
4. **Documentation**: Include JSDoc comments for all public methods
5. **Async/Await**: Use promises for all async operations
6. **Validation**: Validate inputs before processing
7. **Logging**: Log errors and important state changes

**Example Implementation Pattern**:

```typescript
import { IUndoService, UndoableAction, UndoAction } from './contracts';

export class UndoService implements IUndoService {
  constructor(
    private db: UndoDatabase,
    private churchToolsClient: ChurchToolsClient
  ) {}
  
  async recordAction(action: UndoableAction): Promise<string> {
    // Validation
    if (!action.entityId || !action.entityType) {
      throw new Error('Invalid action: entityId and entityType required');
    }
    
    // Business logic
    const undoAction: UndoAction = {
      id: generateUUID(),
      timestamp: new Date().toISOString(),
      userId: this.getCurrentUserId(),
      ...action,
      undoStatus: 'pending',
      createdEntityIds: []
    };
    
    // Persistence
    await this.db.undoActions.add(undoAction);
    
    // Logging
    console.log(`Recorded undo action: ${action.description}`);
    
    return undoAction.id;
  }
  
  // ... implement other methods
}
```

---

## Summary

All 9 service contracts documented with:
- ✅ Complete TypeScript interfaces
- ✅ Method signatures and return types
- ✅ Error handling specifications
- ✅ TDD test coverage requirements
- ✅ Implementation guidelines

**Next Steps**:
1. Create `quickstart.md` for development workflow
2. Run agent context update script
3. Begin TDD implementation (RED-GREEN-REFACTOR)
