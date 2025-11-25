# Data Model: Advanced Inventory Features

**Feature**: 004-advanced-inventory-features  
**Date**: 2025-11-10  
**Status**: Complete

## Overview

This document defines all data entities, their schemas, relationships, validation rules, and state transitions for the Advanced Inventory Features specification. All entities are stored in ChurchTools Custom Modules API except where noted (IndexedDB for client-side caching).

---

## Entity Schemas

### 1. UndoAction (IndexedDB only)

**Storage**: IndexedDB via Dexie.js  
**Retention**: 24 hours from timestamp  
**Purpose**: Track user actions for undo/redo functionality

```typescript
interface UndoAction {
  id: string;                    // UUID
  timestamp: string;             // ISO 8601 datetime
  userId: string;                // ChurchTools user ID
  entityType: 'asset' | 'kit' | 'model' | 'tag' | 'maintenanceCompany' | 'maintenanceRule' | 'workOrder' | 'assignment' | 'damageReport';
  entityId: string;              // ID of affected entity
  actionType: 'create' | 'update' | 'delete' | 'status_change';
  beforeState: Record<string, any> | null;  // JSON snapshot before action (null for create)
  afterState: Record<string, any> | null;   // JSON snapshot after action (null for delete)
  undoStatus: 'pending' | 'undone' | 'expired';
  createdEntityIds: string[];    // For compound actions (e.g., kit + sub-assets)
  description: string;           // Human-readable action description for UI
}

// Dexie.js schema
undoActions: 'id, timestamp, [timestamp+userId], entityType, undoStatus'
```

**Validation Rules**:
- `timestamp` must be valid ISO 8601
- `beforeState` required for update/delete, null for create
- `afterState` required for create/update, null for delete
- `createdEntityIds` non-empty only for compound create actions
- Auto-delete when `timestamp` > 24 hours ago

**Indexes**:
- Primary: `id`
- Compound: `[timestamp+userId]` for user-specific undo history queries
- Single: `timestamp` for cleanup queries

---

### 2. DamageReport (ChurchTools Custom Data)

**Storage**: ChurchTools custom data module  
**Purpose**: Track asset damage, repairs, and maintenance history

```typescript
interface DamageReport {
  id: string;                    // UUID
  assetId: string;               // Foreign key to Asset
  description: string;           // Required damage description
  photos: string[];              // Array of base64-encoded images (max 3)
  reportedBy: string;            // ChurchTools user ID
  reportedDate: string;          // ISO 8601 datetime
  repairStatus: 'broken' | 'repaired';
  repairNotes: string | null;    // Notes added when marking as repaired
  repairedBy: string | null;     // ChurchTools user ID who marked repaired
  repairedDate: string | null;   // ISO 8601 datetime when repaired
}
```

**Validation Rules**:
- `description` min 10 characters, max 1000 characters
- `photos` max 3 items, each max 2MB before base64 encoding (~2.7MB after)
- `photos` stored across 3 custom data fields if needed (each ~10K char limit)
- `repairStatus` defaults to 'broken' on creation
- `repairNotes`, `repairedBy`, `repairedDate` required when `repairStatus` = 'repaired'
- Cannot delete damage report, only mark as repaired

**State Transitions**:
```
broken → repaired (requires repairNotes, repairedBy, repairedDate)
repaired → ❌ (final state, no reversal)
```

**Relationships**:
- Many-to-one with Asset (assetId)
- Timeline sorted by `reportedDate` descending

---

### 3. Assignment (ChurchTools Custom Data)

**Storage**: ChurchTools custom data module  
**Purpose**: Track asset checkout/check-in to users or groups

```typescript
interface Assignment {
  id: string;                    // UUID
  assetId: string;               // Foreign key to Asset
  assignedTo: {
    type: 'person' | 'group';
    id: string;                  // ChurchTools person or group ID
    name: string;                // Cached name for display
  };
  checkoutDate: string;          // ISO 8601 datetime
  checkInDate: string | null;    // ISO 8601 datetime (null if currently assigned)
  assignedBy: string;            // ChurchTools user ID who created assignment
  notes: string | null;          // Optional checkout notes
}
```

**Validation Rules**:
- Asset can have max 1 active assignment (`checkInDate` = null)
- `checkoutDate` cannot be in future
- `checkInDate` must be >= `checkoutDate` if not null
- Asset status automatically set to "In Use" when `checkInDate` = null
- Asset status automatically set to "Available" when `checkInDate` is set

**Business Rules**:
- Checking in asset: set `checkInDate` to current timestamp
- Reassigning asset: check in current assignment, create new assignment
- Deleting asset: must check in or reject if currently assigned

**Relationships**:
- Many-to-one with Asset (assetId)
- One-to-one with ChurchTools Person or Group (assignedTo)
- Timeline sorted by `checkoutDate` descending

---

### 4. FixedKit (ChurchTools Custom Data)

**Storage**: ChurchTools custom data module  
**Purpose**: Group assets with property inheritance

```typescript
interface FixedKit {
  id: string;                    // UUID
  name: string;                  // Required kit name
  description: string | null;    // Optional description
  location: string | null;       // Inheritable property
  status: AssetStatus;           // Inheritable property (see state machine below)
  tags: string[];                // Inheritable property
  subAssetIds: string[];         // Array of Asset IDs
  inheritedProperties: ('location' | 'status' | 'tags')[];  // Which properties to inherit
  assemblyDate: string;          // ISO 8601 datetime
  disassemblyDate: string | null;  // ISO 8601 datetime (null if still assembled)
  completenessStatus: 'complete' | 'incomplete';  // Auto-calculated
  createdBy: string;             // ChurchTools user ID
}
```

**Validation Rules**:
- `name` required, max 100 characters
- `subAssetIds` min 1 item (kit must have at least 1 sub-asset)
- `inheritedProperties` subset of ['location', 'status', 'tags']
- `disassemblyDate` must be >= `assemblyDate` if not null
- `completenessStatus` auto-calculated:
  - 'incomplete' if any sub-asset has status = 'Broken'
  - 'complete' otherwise

**Property Inheritance Logic**:
- If 'location' in `inheritedProperties`: all sub-assets inherit kit's location (read-only)
- If 'status' in `inheritedProperties`: all sub-assets inherit kit's status (read-only)
- If 'tags' in `inheritedProperties`: all sub-assets inherit kit's tags (additive, read-only)
- Disassembling kit: set `disassemblyDate`, unlock all inherited properties on sub-assets

**State Transitions**:
```
assembled (disassemblyDate = null) → disassembled (disassemblyDate = now)
disassembled → ❌ (final state, cannot reassemble existing kit)
```

**Relationships**:
- One-to-many with Asset (subAssetIds)
- Sub-assets reference kit via `kitId` field on Asset entity

---

### 5. AssetModel (ChurchTools Custom Data)

**Storage**: ChurchTools custom data module  
**Purpose**: Templates for creating assets with default values

```typescript
interface AssetModel {
  id: string;                    // UUID
  name: string;                  // Required model name
  manufacturer: string | null;   // Default manufacturer
  defaultWarrantyMonths: number | null;  // Default warranty period
  specifications: Record<string, any>;   // JSON object with model-specific fields
  defaultTags: string[];         // Tags auto-applied to assets created from this model
  assetType: string;             // Category/type classification
  createdBy: string;             // ChurchTools user ID
  createdDate: string;           // ISO 8601 datetime
}
```

**Validation Rules**:
- `name` required, max 200 characters
- `manufacturer` max 100 characters
- `defaultWarrantyMonths` min 0, max 120 (10 years)
- `specifications` max 5000 characters when JSON stringified
- `assetType` required, max 50 characters

**Usage Pattern**:
- When creating asset from model:
  1. Pre-fill manufacturer, warranty, specifications
  2. Apply tags from `defaultTags` as inherited tags
  3. User can override any field
  4. Asset stores `modelId` reference

**Not a Dynamic Group**:
- Assets created from model do NOT auto-update when model changes
- Editing model tags shows confirmation: "Update 23 existing assets?"
- User can choose to propagate or skip

**Relationships**:
- One-to-many with Asset (assets store `modelId`)
- No cascade delete (assets keep `modelId` even if model deleted)

---

### 6. Tag (ChurchTools Custom Data)

**Storage**: ChurchTools custom data module  
**Purpose**: Flexible categorization for assets, kits, models

```typescript
interface Tag {
  id: string;                    // UUID
  name: string;                  // Required, unique tag name
  color: string;                 // Hex color code for UI badge
  description: string | null;    // Optional description
  createdBy: string;             // ChurchTools user ID
  createdDate: string;           // ISO 8601 datetime
}
```

**Validation Rules**:
- `name` required, max 50 characters, case-insensitive unique
- `color` valid hex color (#RRGGBB format)
- `description` max 500 characters

**Tag Application**:
- Assets can have direct tags and inherited tags
- Inherited tags shown with different UI (icon/badge) + tooltip showing source
- Direct tags: user manually applied
- Inherited tags: from parent kit or asset model (read-only, can't remove)

**Tag Propagation**:
- Changing kit tags: prompt "Affects 5 sub-assets, continue?"
- Changing model tags: prompt "Update 23 existing assets?" (optional propagation)

**Relationships**:
- Many-to-many with Asset (via tags array on Asset)
- Many-to-many with FixedKit (via tags array on Kit)
- Many-to-many with AssetModel (via defaultTags array)

---

### 7. MaintenanceCompany (ChurchTools Custom Data)

**Storage**: ChurchTools custom data module  
**Purpose**: Track external service providers for maintenance

```typescript
interface MaintenanceCompany {
  id: string;                    // UUID
  name: string;                  // Required company name
  contactPerson: string | null;  // Primary contact name
  email: string | null;          // Contact email
  phone: string | null;          // Contact phone
  address: string | null;        // Company address
  slaTerms: string | null;       // Service level agreement terms
  hourlyRate: number | null;     // Rate in local currency
  contractNotes: string | null;  // Free-form notes
  createdBy: string;             // ChurchTools user ID
  createdDate: string;           // ISO 8601 datetime
}
```

**Validation Rules**:
- `name` required, max 200 characters
- `contactPerson` max 100 characters
- `email` valid email format if provided
- `phone` max 20 characters
- `hourlyRate` min 0, max 10000
- `slaTerms` max 2000 characters
- `contractNotes` max 5000 characters

**Relationships**:
- One-to-many with MaintenanceRule (company assigned to external rules)
- One-to-many with WorkOrder (company assigned to external work orders)
- Not tied to ChurchTools contacts (separate entity)

---

### 8. MaintenanceRule (ChurchTools Custom Data)

**Storage**: ChurchTools custom data module  
**Purpose**: Define recurring or scheduled maintenance work

```typescript
interface MaintenanceRule {
  id: string;                    // UUID
  name: string;                  // Required rule name
  appliesTo: {
    type: 'asset' | 'kit' | 'model' | 'tag';
    ids: string[];               // IDs of target entities
  };
  workType: string;              // Type of work (e.g., "Inspection", "Calibration")
  isInternal: boolean;           // true = internal staff, false = external contractor
  assignedCompanyId: string | null;  // Foreign key to MaintenanceCompany (required if !isInternal)
  intervalType: 'months' | 'uses';   // How to calculate recurrence
  intervalValue: number;         // Number of months or uses between maintenance
  startDate: string;             // ISO 8601 date (first occurrence)
  nextDueDate: string;           // ISO 8601 date (calculated)
  leadTimeDays: number;          // Days before due date to create work order (1-30, default 7)
  workOrderCreated: boolean;     // Flag to prevent duplicate work order creation
  lastWorkOrderDate: string | null;  // ISO 8601 datetime of last work order creation
  createdBy: string;             // ChurchTools user ID
  createdDate: string;           // ISO 8601 datetime
}
```

**Validation Rules**:
- `name` required, max 200 characters
- `appliesTo.ids` min 1 item
- `workType` required, max 100 characters
- `assignedCompanyId` required if `isInternal` = false
- `intervalType` = 'months': `intervalValue` 1-120 (max 10 years)
- `intervalType` = 'uses': `intervalValue` 1-10000
- `leadTimeDays` 1-30
- `nextDueDate` auto-calculated based on interval

**Next Due Date Calculation**:
- For 'months': `nextDueDate` = `startDate` + (`intervalValue` months)
- For 'uses': `nextDueDate` = when asset usage counter reaches threshold
- After work order created: `nextDueDate` += `intervalValue`

**Conflict Detection**:
- If 2+ rules apply to same asset with `nextDueDate` within 7 days: highlight conflict in UI
- User can choose to merge or keep separate

**Relationships**:
- Many-to-many with Asset/Kit/Model/Tag (via appliesTo)
- One-to-one with MaintenanceCompany (assignedCompanyId)
- One-to-many with WorkOrder (rules generate work orders)

---

### 9. WorkOrder (ChurchTools Custom Data)

**Storage**: ChurchTools custom data module  
**Purpose**: Track maintenance work execution

```typescript
interface WorkOrder {
  id: string;                    // UUID
  orderNumber: string;           // Human-readable number (e.g., "WO-2025-001")
  type: 'internal' | 'external';
  state: InternalWorkOrderState | ExternalWorkOrderState;  // See state machines below
  assetSchedule: Array<{
    assetId: string;
    assetName: string;           // Cached for display
    completionStatus: 'pending' | 'in_progress' | 'completed';
    completedDate: string | null;  // ISO 8601 datetime
    completedBy: string | null;  // ChurchTools user ID
  }>;
  assignedTo: string | null;     // ChurchTools user ID (for internal work orders)
  assignedCompanyId: string | null;  // Foreign key to MaintenanceCompany (for external)
  offers: Array<{
    companyId: string;
    companyName: string;         // Cached
    amount: number;              // Offer amount in local currency
    receivedDate: string;        // ISO 8601 datetime
    notes: string | null;
  }>;
  scheduledStartDate: string | null;  // ISO 8601 date
  scheduledEndDate: string | null;    // ISO 8601 date
  actualStartDate: string | null;     // ISO 8601 datetime
  actualEndDate: string | null;       // ISO 8601 datetime
  estimatedCost: number | null;       // Estimated cost
  actualCost: number | null;          // Actual cost after completion
  approvalResponsible: string;        // ChurchTools user ID (defaults to creator)
  invoices: Array<{                   // STUBBED - not functional yet
    id: string;
    fileUrl: string;
    uploadedDate: string;
  }>;
  notes: string | null;               // Free-form notes
  createdBy: string;                  // ChurchTools user ID
  createdDate: string;                // ISO 8601 datetime
  stateHistory: Array<{
    fromState: string | null;
    toState: string;
    timestamp: string;               // ISO 8601 datetime
    changedBy: string;               // ChurchTools user ID
  }>;
}

type InternalWorkOrderState = 
  | 'backlog'
  | 'assigned'
  | 'planned'
  | 'in_progress'
  | 'completed'
  | 'aborted'
  | 'obsolete'
  | 'done';

type ExternalWorkOrderState =
  | 'backlog'
  | 'offer_requested'
  | 'offer_received'
  | 'planned'
  | 'in_progress'
  | 'completed'
  | 'aborted'
  | 'obsolete'
  | 'done';
```

**Validation Rules**:
- `orderNumber` auto-generated, unique, format: WO-YYYY-NNN
- `type` immutable after creation
- `assetSchedule` min 1 item
- `assignedTo` required for internal work orders in states >= 'assigned'
- `assignedCompanyId` required for external work orders in states >= 'offer_requested'
- `offers` min 1 item for external work orders in state 'offer_received'
- `scheduledStartDate` <= `scheduledEndDate` if both provided
- `actualStartDate` <= `actualEndDate` if both provided
- `actualCost` required when state = 'completed'

**State Machine - Internal Work Orders**:
```
backlog → assigned (requires assignedTo)
assigned → planned (requires scheduledStartDate)
planned → in_progress (sets actualStartDate)
in_progress → completed (requires actualEndDate, actualCost)
completed → done (requires approval from approvalResponsible)

Any state → aborted (terminal)
Any state → obsolete (terminal)
completed → in_progress (reopen allowed)
```

**State Machine - External Work Orders**:
```
backlog → offer_requested (requires assignedCompanyId)
offer_requested → offer_received (requires offers.length >= 1)
offer_received → planned (requires accepting 1 offer, scheduledStartDate)
planned → in_progress (sets actualStartDate)
in_progress → completed (requires actualEndDate, actualCost)
completed → done (requires approval from approvalResponsible)

Any state → aborted (terminal)
Any state → obsolete (terminal)
offer_received → offer_requested (request more offers)
completed → in_progress (reopen allowed)
```

**Asset Completion Tracking**:
- Work order partially complete if some assetSchedule items completed
- Work order fully complete when all assetSchedule items completed
- Can mark individual assets complete independently

**Relationships**:
- Many-to-many with Asset (via assetSchedule)
- One-to-one with MaintenanceCompany (assignedCompanyId)
- One-to-one with ChurchTools User (assignedTo, approvalResponsible)
- One-to-one with MaintenanceRule (optional, if auto-created from rule)

---

### 10. DataView (IndexedDB + ChurchTools Custom Data)

**Storage**: IndexedDB for active views, ChurchTools for saved views  
**Purpose**: Persist user-created filtered/grouped views

```typescript
interface DataView {
  id: string;                    // UUID
  name: string;                  // Required view name
  viewType: 'table' | 'gallery' | 'kanban' | 'calendar';
  filters: FilterCondition[];    // Array of filter conditions (see research.md R7)
  sorts: Array<{
    field: string;
    direction: 'asc' | 'desc';
  }>;
  groupBy: {
    field: string;
    order: string[];             // Custom group ordering (e.g., ['High', 'Medium', 'Low'])
  } | null;
  collapsedGroups: string[];     // Group IDs that are collapsed
  owner: string;                 // ChurchTools user ID
  createdDate: string;           // ISO 8601 datetime
  lastUsedDate: string;          // ISO 8601 datetime
}

type FilterCondition = 
  | { type: 'text'; field: string; operator: 'contains' | 'equals'; value: string }
  | { type: 'date'; field: string; operator: 'between' | 'before' | 'after'; value: DateRange | RelativeDateRange }
  | { type: 'tag'; field: string; operator: 'includes' | 'excludes'; value: string[] }
  | { type: 'number'; field: string; operator: '=' | '>' | '<' | 'between'; value: number | [number, number] }
  | { type: 'empty'; field: string; operator: 'is_empty' | 'is_not_empty' };

interface DateRange {
  start: string;  // ISO 8601 date
  end: string;    // ISO 8601 date
}

interface RelativeDateRange {
  unit: 'days' | 'weeks' | 'months';
  value: number;
  direction: 'last' | 'next';
}
```

**Validation Rules**:
- `name` required, max 100 characters
- `filters` can be empty (no filtering)
- `sorts` can be empty (default sort)
- `groupBy` only applicable for table/kanban views
- `collapsedGroups` only applicable when `groupBy` is set

**Relative Date Resolution**:
- Relative dates recalculated on each view load
- Example: "Created in last 7 days" dynamically adjusts to current date
- Stored as relative range, not absolute dates

**Relationships**:
- One-to-one with ChurchTools User (owner)
- Applied to Asset list queries

---

### 11. SettingsVersion (IndexedDB + ChurchTools Custom Data)

**Storage**: IndexedDB for version history, ChurchTools for current settings  
**Retention**: 90 days from creation (most recent version always kept)  
**Purpose**: Track settings changes with rollback capability

```typescript
interface SettingsVersion {
  id: string;                    // UUID
  versionNumber: number;         // Auto-incrementing version number
  timestamp: string;             // ISO 8601 datetime
  changedBy: string;             // ChurchTools user ID
  changeSummary: string;         // Human-readable description of changes
  settingsSnapshot: {
    scannerSettings: any;        // Full scanner configuration
    prefixes: any[];             // Barcode prefixes
    manufacturers: any[];        // Manufacturer list
    models: any[];               // Model list
    locations: any[];            // Location list
    // ... other extension settings
  };
}
```

**Validation Rules**:
- `versionNumber` auto-increment, starts at 1
- `changeSummary` required, max 500 characters
- `settingsSnapshot` must be valid JSON
- Export validation: JSON schema check before import

**Export/Import Format**:
```json
{
  "version": "1.0",
  "exportDate": "2025-11-10T12:00:00Z",
  "exportedBy": "user-123",
  "settings": {
    "scannerSettings": { ... },
    "prefixes": [ ... ],
    "manufacturers": [ ... ]
  }
}
```

**Rollback Process**:
1. User selects version from history
2. System creates new version with rolled-back settings
3. New version's `changeSummary` = "Rolled back to version N"
4. Apply settings to ChurchTools

**Cleanup**:
- Auto-delete versions older than 90 days
- Exception: most recent version never deleted
- Daily cleanup job at 00:10:00

**Relationships**:
- One-to-one with ChurchTools User (changedBy)

---

## Modified Entities

### Asset (Existing, Modified)

**New Fields Added**:
```typescript
interface Asset {
  // ... existing fields ...
  
  // NEW: Kit relationship
  kitId: string | null;          // Foreign key to FixedKit
  
  // NEW: Model relationship
  modelId: string | null;        // Foreign key to AssetModel
  
  // NEW: Tags (direct + inherited)
  tags: string[];                // Direct tag IDs
  inheritedTags: string[];       // Tag IDs inherited from kit/model (read-only)
  
  // NEW: Current assignment
  currentAssignmentId: string | null;  // Foreign key to Assignment (null if not assigned)
  
  // MODIFIED: Status enum expanded
  status: 'Available' | 'In Use' | 'Broken' | 'In Maintenance' | 'Retired/Disposed';
}
```

**New Validation Rules**:
- If `kitId` not null: location/status/tags may be read-only (depends on kit's `inheritedProperties`)
- `currentAssignmentId` must reference Assignment with `checkInDate` = null
- Status transition validation (see state machine below)

**Asset Status State Machine**:
```
Available → In Use (when assigned)
Available → Broken (manual or via damage report)
Available → In Maintenance (manual or via work order)
Available → Retired/Disposed (manual)

In Use → Available (when checked in)
In Use → Broken (confirmation prompt: "Unassign asset?")
In Use → In Maintenance (confirmation prompt: "Unassign asset?")

Broken → Available (when marked repaired)
Broken → In Maintenance (manual)

In Maintenance → Available (manual)
In Maintenance → Broken (manual)

Retired/Disposed → ❌ (terminal state, no transitions)
```

---

## Indexes & Query Patterns

### IndexedDB Indexes (Dexie.js)

```typescript
// Undo history queries
undoActions: 'id, timestamp, [timestamp+userId], entityType, undoStatus'

// Example queries:
// 1. Get undo history for user in last 24h
await undoDb.undoActions
  .where('[timestamp+userId]')
  .between([cutoff, userId], [now, userId])
  .reverse()
  .toArray();

// 2. Cleanup expired undo actions
await undoDb.undoActions
  .where('timestamp')
  .below(cutoff)
  .delete();
```

### ChurchTools Custom Data Queries

**Assumed ChurchTools API supports**:
- Filter by foreign key (e.g., `GET /customdata/damageReports?assetId=123`)
- Filter by date range (e.g., `createdDate >= "2025-01-01"`)
- Filter by status/enum fields
- Full-text search on text fields

**Common Query Patterns**:
```typescript
// 1. Get damage reports for asset
GET /customdata/damageReports?assetId={assetId}&sort=-reportedDate

// 2. Get active assignment for asset
GET /customdata/assignments?assetId={assetId}&checkInDate=null

// 3. Get maintenance rules applying to asset
GET /customdata/maintenanceRules?appliesTo.type=asset&appliesTo.ids={assetId}

// 4. Get work orders for company
GET /customdata/workOrders?assignedCompanyId={companyId}&state!=done
```

---

## Data Migration Notes

### Cleanup Tasks (FR-006 to FR-009)

**To Remove**:
1. Asset type template entities and UI
2. Offline database tables (e.g., Dexie tables for offline sync)
3. Demo data seeding scripts (keep in `tests/fixtures/`)
4. Unused German locale files

**Migration Script**:
```typescript
// scripts/cleanup-legacy-data.ts
async function cleanupLegacyData() {
  // 1. Remove asset type templates
  await customDataClient.delete('/customdata/assetTypeTemplates');
  
  // 2. Drop offline DB
  await Dexie.delete('ChurchToolsInventoryOffline');
  
  // 3. Audit for unused code
  // (manual review, ESLint unused-vars rule)
}
```

---

## Summary

All 11 new entities and 1 modified entity documented with:
- Complete TypeScript schemas
- Validation rules
- State machines (WorkOrder, Asset status, DamageReport, FixedKit)
- Relationships and foreign keys
- Index strategies
- Query patterns

**Next Steps**:
1. Generate API contracts in `contracts/` directory
2. Create `quickstart.md` for development workflow
3. Run agent context update script
