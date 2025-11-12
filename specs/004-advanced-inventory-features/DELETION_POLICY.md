# Deletion Policy Requirements

**Status**: Approved  
**References**: CHK026, CHK050, CHK098  
**Last Updated**: 2025-01-20

## Overview

This document defines the deletion strategy for all entities in the advanced inventory system, ensuring data integrity, recoverability, and compliance with data retention requirements.

## 1. Soft Delete Strategy

### 1.1 Core Principle

**All user-facing entities use soft delete** (tombstone records) rather than hard delete to:
- Enable undo/recovery within retention window
- Preserve audit trails and relationships
- Prevent data loss from accidental deletions
- Support compliance and data retention policies

### 1.2 Implementation Pattern

All entities include:

```typescript
interface SoftDeletable {
  deletedAt: string | null;  // ISO 8601 timestamp, null = not deleted
  deletedBy: string | null;   // User ID who performed deletion
}
```

**Deletion States**:
- `deletedAt === null`: Active entity (visible in normal queries)
- `deletedAt !== null`: Soft-deleted (excluded from normal queries, visible in "Recently Deleted")

### 1.3 Retention Window

**Standard Retention**: 90 days from soft delete timestamp

After 90 days, records are eligible for hard deletion (permanent removal) via automated cleanup job.

## 2. Entity-Specific Rules

### 2.1 Asset

**Soft Delete Behavior**:
- Asset marked with `deletedAt` timestamp
- Asset excluded from all normal list/search queries
- Asset remains accessible via direct ID lookup (for audit/recovery)
- Child relationships preserved (see cascade rules below)

**Cascade Rules**:
- **Assignments**: Active assignment must be closed (check-in) before asset deletion
  - UI prompts: "Asset has active assignment. Check in before deleting?"
  - API validation: Reject deletion if `currentAssignmentId !== null`
- **Damage Reports**: Cascade soft-delete (all damage reports for asset also soft-deleted)
- **Maintenance Schedules**: Cascade soft-delete (maintenance tied to deleted asset removed from schedule)
- **WorkOrders**: Do NOT cascade (work orders reference asset but remain for audit trail)
- **Kit Membership**: Remove from kit's sub-asset list (kit structure updated)
- **Photos**: Cascade soft-delete (base64 photos in custom fields marked deleted)

**Recovery Behavior**:
- Restoring asset also restores cascaded damage reports, maintenance schedules, photos
- Does NOT restore closed assignments (those are historical records)

**UI Requirements**:
- Confirmation modal: "Delete asset '[Asset Name]'? This will also remove [X] damage reports and [Y] maintenance schedules."
- Show "Deleted [timestamp]" in asset detail view if soft-deleted

### 2.2 Kit

**Soft Delete Behavior**:
- Kit marked with `deletedAt` timestamp
- Sub-assets remain active (kits do not own child assets)

**Cascade Rules**:
- **Sub-Assets**: Do NOT cascade (child assets become independent, `parentKitId` set to null)
- **Tags**: Remove from kit entity, do NOT remove from child assets (they keep inherited tags)
- **Assignments**: Same as Asset (must close before deletion)

**Recovery Behavior**:
- Restoring kit does NOT restore child asset relationships (disassembly is permanent)
- UI warns: "Restoring this kit will not restore child asset relationships (disassembled)"

### 2.3 Asset Model

**Soft Delete Behavior**:
- Model marked with `deletedAt` timestamp
- Assets referencing model remain active (keep `modelId` reference)

**Cascade Rules**:
- **Assets**: Do NOT cascade (assets keep model reference for audit trail)
  - Assets with deleted model show "(Model Deleted)" in UI
  - New assets cannot select deleted models

**Recovery Behavior**:
- Restoring model makes it available for new asset creation again

### 2.4 Damage Report

**Soft Delete Behavior**:
- Damage report marked with `deletedAt` timestamp
- Photos embedded in damage report also soft-deleted

**Cascade Rules**:
- **Photos**: Cascade soft-delete (base64 photos in custom fields)
- **Asset**: Do NOT cascade (damage report deletion doesn't affect asset)

**Recovery Behavior**:
- Restoring damage report also restores photos

### 2.5 Assignment

**Soft Delete Behavior**:
- Assignment marked with `deletedAt` timestamp
- Primarily used for accidentally created assignments before check-in

**Cascade Rules**:
- **Asset**: Do NOT cascade (assignment deletion doesn't delete asset)
- **Check-In**: If assignment already checked in, deletion is historical (soft-delete for audit)

**Recovery Behavior**:
- Can restore accidentally deleted active assignments
- Cannot restore if asset has new active assignment (conflict)

### 2.6 Work Order

**Soft Delete Behavior**:
- Work order marked with `deletedAt` timestamp
- Associated offers also soft-deleted

**Cascade Rules**:
- **Offers**: Cascade soft-delete (all offers for work order)
- **Assets**: Do NOT cascade (assets referenced by work order remain active)

**Recovery Behavior**:
- Restoring work order also restores offers

### 2.7 Offer

**Soft Delete Behavior**:
- Offer marked with `deletedAt` timestamp

**Cascade Rules**:
- **Work Order**: Do NOT cascade (offer deletion doesn't delete parent work order)

**Recovery Behavior**:
- Can restore if work order still exists (not deleted)
- Cannot restore if work order deleted (orphan prevention)

### 2.8 Maintenance Rule

**Soft Delete Behavior**:
- Maintenance rule marked with `deletedAt` timestamp
- Future scheduled maintenance entries removed from schedule

**Cascade Rules**:
- **Assets/Models**: Do NOT cascade (rule deletion doesn't delete entities)
- **Scheduled Entries**: Remove future entries, keep historical completions for audit

**Recovery Behavior**:
- Restoring rule regenerates future scheduled maintenance entries

### 2.9 Data View

**Soft Delete Behavior**:
- Data view marked with `deletedAt` timestamp

**Cascade Rules**:
- **None**: Data views are user preferences, no cascade effects

**Recovery Behavior**:
- Simple restore (reconstruct filters and settings)

### 2.10 Settings

**Soft Delete Behavior**:
- Settings history entries use soft delete for version tracking

**Cascade Rules**:
- **None**: Settings are versioned snapshots

**Recovery Behavior**:
- Can restore previous settings version (rollback)

### 2.11 Undo Action

**Soft Delete Behavior**:
- Undo actions use **hard delete** after 24-hour expiration (not recoverable)
- Exception to soft delete policy (undo actions are ephemeral by design)

**Cascade Rules**:
- **None**: Deleting undo action doesn't affect original entity

## 3. API Requirements

### 3.1 Service Contract Extensions

All service contracts must include:

```typescript
interface IDeletableService<T> {
  // Soft delete
  softDelete(id: string, userId: string): Promise<void>;
  
  // Restore from soft delete
  restore(id: string): Promise<void>;
  
  // Hard delete (admin only, bypasses soft delete)
  hardDelete(id: string): Promise<void>;
  
  // List recently deleted (within retention window)
  listDeleted(options?: { beforeDate?: Date }): Promise<T[]>;
  
  // Check if entity can be deleted (validation)
  canDelete(id: string): Promise<{ 
    canDelete: boolean; 
    reason?: string; 
    blockers?: string[];  // e.g., ["Active assignment exists"]
  }>;
}
```

### 3.2 Query Filtering

All list/search queries must **exclude soft-deleted records by default**:

```typescript
// ChurchTools custom data query
const assets = await customDataAPI.getValues({
  categoryId: ASSET_CATEGORY_ID,
  filter: {
    deletedAt: null  // CRITICAL: Always filter soft-deleted
  }
});
```

### 3.3 Cascade Validation

Before soft delete, validate cascade rules:

```typescript
async function validateAssetDeletion(assetId: string): Promise<ValidationResult> {
  const asset = await assetService.getById(assetId);
  
  // Check for active assignment
  if (asset.currentAssignmentId) {
    return {
      valid: false,
      reason: 'Asset has active assignment. Check in asset before deleting.',
      blockers: ['active_assignment']
    };
  }
  
  // Count cascade impact
  const damageReports = await damageService.listByAsset(assetId);
  const maintenanceSchedules = await maintenanceService.listByAsset(assetId);
  
  return {
    valid: true,
    cascadeImpact: {
      damageReports: damageReports.length,
      maintenanceSchedules: maintenanceSchedules.length
    }
  };
}
```

## 4. UI Requirements

### 4.1 Confirmation Modals

All delete actions require confirmation with:

**Content**:
- Entity name and type
- Cascade impact summary (e.g., "This will also delete 3 damage reports")
- Blockers (e.g., "Asset has active assignment")
- Recovery information ("Can be restored within 90 days")

**Example**:
```
Delete Asset "Projector A"?

This action will also delete:
• 2 damage reports
• 1 maintenance schedule

This asset has an active assignment. Please check in before deleting.

[Cancel] [Delete]
```

### 4.2 Recently Deleted View

Provide UI to view and restore soft-deleted entities:

**Location**: Settings → Recently Deleted (or per-entity list with filter toggle)

**Features**:
- List all soft-deleted entities within retention window
- Show "Deleted [X] days ago" timestamp
- "Restore" button per entity
- "Permanently Delete" button (admin only, requires secondary confirmation)
- Auto-expiration notice: "Items deleted >90 days ago are permanently removed"

### 4.3 Soft-Deleted Entity Views

When viewing soft-deleted entity (via direct link or audit trail):

**UI Indicators**:
- Banner: "This [entity] was deleted on [date] by [user]. [Restore] [Permanently Delete]"
- Grayed-out content or "Deleted" badge
- No edit/update actions (read-only)

## 5. Background Jobs

### 5.1 Hard Delete Cleanup Job

**Schedule**: Daily at 2:00 AM local time

**Logic**:
```typescript
async function cleanupExpiredDeletions() {
  const retentionDate = new Date();
  retentionDate.setDate(retentionDate.getDate() - 90);  // 90 days ago
  
  const expiredEntities = await getAllSoftDeleted({
    deletedBefore: retentionDate
  });
  
  for (const entity of expiredEntities) {
    await hardDelete(entity.id);  // Permanent removal
    await logAudit({
      action: 'hard_delete_expired',
      entityType: entity.type,
      entityId: entity.id,
      metadata: { deletedAt: entity.deletedAt }
    });
  }
}
```

**Performance Requirements**:
- Must complete in <5s for 10,000 expired records
- Use batch operations (delete in chunks of 100)
- Graceful handling of ChurchTools API rate limits

### 5.2 Orphan Prevention Job

**Schedule**: Weekly (Sunday 3:00 AM)

**Logic**: Detect and fix orphaned relationships:
- Assets with `parentKitId` referencing hard-deleted kit → set to null
- Offers with `workOrderId` referencing hard-deleted work order → hard delete
- Assignments with `assetId` referencing hard-deleted asset → hard delete

## 6. Permissions

### 6.1 Soft Delete Permission

Controlled by ChurchTools custom data category **delete** permission:
- Users with delete permission can soft-delete entities in that category
- Soft delete is reversible (within retention window)

### 6.2 Hard Delete Permission

**Admin-only** (not exposed via ChurchTools category permissions):
- Requires explicit application-level admin role check
- Irreversible action, requires secondary confirmation
- Only available via "Recently Deleted" UI (not normal entity views)

### 6.3 Restore Permission

Same as **write** permission for entity category:
- Users with write permission can restore soft-deleted entities they have access to
- Restore validates user still has write permission

## 7. Audit Trail

### 7.1 Deletion Events

Log all deletion events:

```typescript
interface DeletionAuditLog {
  eventType: 'soft_delete' | 'hard_delete' | 'restore';
  entityType: string;          // 'asset', 'work_order', etc.
  entityId: string;
  userId: string;              // Who performed action
  timestamp: string;           // ISO 8601
  cascadeImpact?: {            // For soft delete
    [entityType: string]: number;  // e.g., { damage_reports: 2 }
  };
}
```

### 7.2 Retention Requirements

- Deletion audit logs retained **indefinitely** (even after hard delete)
- Enables compliance reporting and data forensics
- Stored in ChurchTools custom data category with read-only admin access

## 8. Testing Requirements

### 8.1 Unit Tests

- Test soft delete sets `deletedAt` timestamp
- Test cascade rules for each entity type
- Test restore functionality
- Test validation blockers (e.g., active assignment)

### 8.2 Integration Tests

- Test cleanup job removes expired entities
- Test orphan prevention job
- Test permissions (soft delete, hard delete, restore)

### 8.3 Edge Cases

- Attempt to delete asset with active assignment → rejected
- Restore asset after kit disassembled → child relationships not restored
- Hard delete after manual restore → permanent removal
- Concurrent soft delete + restore → last operation wins

## 9. Migration Strategy

### 9.1 Existing Data

If existing ChurchTools data lacks `deletedAt` field:
- Add `deletedAt: null` to all existing entities (one-time migration)
- No functional change for active entities

### 9.2 Legacy Hard Deletes

If previous implementation used hard deletes:
- Document known data gaps in audit logs
- No retroactive recovery possible (already removed from ChurchTools)

## References

- CHK026: Entity deletion consistency requirements
- CHK050: Photo deletion cascade requirements
- CHK098: Kit disassembly vs model deletion semantics
- comprehensive-requirements.md
