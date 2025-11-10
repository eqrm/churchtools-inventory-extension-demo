# Asset Groups Redesign Plan

**Date:** 2025-11-04  
**Feature:** Asset Groups (formerly Parent/Child Assets)  
**Status:** Planning Phase

## Overview

Redesign the parent/child asset relationship as "Asset Groups" to better manage collections of similar assets (e.g., 10 microphones of the same model) where some properties are shared across the group and others are unique to each individual asset.

## Terminology Update (2025-11-07)

- Rename asset **categories** to **Types** everywhere we surface user-facing copy, filters, or metadata labels.
- Present asset **groups** to end users as **Asset Models** to reduce confusion with organizational groups; keep existing `AssetGroup` storage keys until migration tooling is ready.
- Audit documentation, UI strings, API responses, and data exports to ensure both renames are consistent and discoverable.

## Newly Reported Issues (2025-11-07)

- **Location search parity:** The location selector in the asset model (group) detail form must reuse the global searchable location picker so users can find sites the same way they do for individual assets.
- **Shared numbering & barcodes:** Remove dedicated group numbering; asset models should rely on the same QR/barcode reassignment workflow that standard assets use.
- **Detail view layout:** The single asset model detail experience should move out of the modal and become a full-width page, matching the layout used by individual asset detail views.
- **Terminology clarity:** Update navigation, headings, and empty states to introduce "Types" and "Asset Models" in place of the legacy terms to prevent user confusion.

## Key Concepts

### Asset Model (formerly Asset Group)
- A container entity that defines shared properties for multiple similar assets
- Uses the standard asset numbering and QR/barcode tooling instead of a dedicated prefix
- Defines which fields are **inherited** vs **overridable** at the asset level
- Can specify custom field inheritance rules

### Model Member (Sub-Asset)
- Individual assets within a group
- **Keeps its original asset ID** when added to a group
- Inherits specified fields from the group
- Has unique fields that cannot be inherited (serial number, status, history, assignment, etc.)
- Can override inherited fields if configured to allow it

## Use Cases

### Use Case 1: Convert Existing Asset to Group
**Scenario:** User has a single microphone asset and wants to create a group for 10 identical units.

**Workflow:**
1. User views asset detail page for microphone `AST-042`
2. Clicks "Create Asset Group from this Asset" button
3. System creates new Asset Group `AG-001` with:
  - Shared fields copied from `AST-042` (manufacturer, model, type, etc.)
   - Custom field inheritance rules configured
4. Asset `AST-042` becomes first member of `AG-001`
5. User can now add more assets to the group

### Use Case 2: Create Multiple Assets from Group
**Scenario:** User has an Asset Group and wants to bulk-create new member assets.

**Workflow:**
1. User views Asset Group detail page for `AG-001`
2. Clicks "Add Assets to Group" button
3. Specifies quantity (e.g., 9 more microphones)
4. System creates 9 new assets (`AST-043` through `AST-051`) with:
   - Inherited fields from group
   - Unique fields left empty for manual entry
   - Automatically linked to `AG-001`

## Data Model

### Asset Model Entity

```typescript
interface AssetGroup {
  id: UUID;                    // Unique ID (different from asset IDs)
  groupNumber?: string;        // Deprecated: asset models now share numbering with standard assets
  name: string;                // Group name (e.g., "Shure SM58 Microphones")
  barcode?: string;            // Group barcode
  
  // Shared/Template Fields
  type: {
    id: UUID;
    name: string;
  };                           // Formerly "category"
  manufacturer?: string;
  model?: string;
  
  // Field Inheritance Configuration
  inheritanceRules: {
    [fieldKey: string]: {
      inherited: boolean;       // If true, members inherit this field
      overridable: boolean;     // If true, members can override inherited value
    };
  };
  
  // Shared custom fields (templated for all members)
  sharedCustomFields?: Record<string, unknown>;
  
  // Custom field inheritance rules
  customFieldRules?: {
    [customFieldId: string]: {
      inherited: boolean;
      overridable: boolean;
    };
  };
  
  // Metadata
  memberCount: number;
  createdBy: string;
  createdByName: string;
  createdAt: ISOTimestamp;
  lastModifiedBy: string;
  lastModifiedByName: string;
  lastModifiedAt: ISOTimestamp;
  schemaVersion?: string;
}
```

### Asset Entity Updates

```typescript
interface Asset {
  // ... existing fields ...
  
  // New group relationship
  assetGroup?: {
    id: UUID;                   // Reference to AssetGroup
    groupNumber: string;        // e.g., "AG-001"
    name: string;               // Group name for display
  };
  
  // Inherited vs local field tracking
  fieldSources?: {
    [fieldKey: string]: 'group' | 'local' | 'override';
  };
  
  // ... rest of existing fields ...
}
```

## Field Inheritance Rules

### Default Inheritance Configuration

| Field Category | Inherited by Default | Overridable | Notes |
|----------------|---------------------|-------------|-------|
| **Type** | ✅ Yes | ❌ No | All members must be in same type |
| **Manufacturer** | ✅ Yes | ❌ No | Same brand for all units |
| **Model/Model Number** | ✅ Yes | ❌ No | Same model for all units |
| **Description** | ✅ Yes | ✅ Yes | Template description, can customize |
| **Custom Fields** | ⚙️ Configurable | ⚙️ Configurable | Per-field setting |
| **Serial Number** | ❌ Never | N/A | Always unique per asset |
| **Asset Number** | ❌ Never | N/A | Always unique per asset |
| **Status** | ❌ Never | N/A | Independent per asset |
| **Location** | ❌ Never | N/A | Assets can be in different locations |
| **Assigned To** | ❌ Never | N/A | Independent assignments |
| **Purchase Info** | ✅ Yes | ✅ Yes | Typically same, but can vary |
| **Barcode** | ❌ Never | N/A | Always unique per asset |
| **Photos** | ✅ Yes | ✅ Yes | Template photos, can add more |
| **History** | ❌ Never | N/A | Independent per asset |

### Custom Field Inheritance

Each custom field can be configured with:
- **Inherited:** If true, members get the group's value
- **Overridable:** If true, members can specify their own value
- **Required for Members:** If true, even if inherited, members must confirm/set

Examples:
- **Instruction Manual URL:** Inherited = true, Overridable = false (same for all)
- **Warranty End Date:** Inherited = true, Overridable = true (usually same, but can vary)
- **Internal Notes:** Inherited = false (unique to each asset)

## Barcode/ID Strategy

### Asset Model Identifiers
- Reuse the standard asset numbering sequence and barcode reassignment workflow; no dedicated `AG-` prefix.
- Continue supporting barcode regeneration and reassignment so models can adopt the same QR lifecycle as individual assets.

### Regular Asset Identifiers
- **Asset Number Prefix:** `AST-` (or existing prefix)
- **Example:** `AST-042` with barcode `1000042`

### Benefits
- Simplifies training by keeping one numbering mental model.
- Enables shared tooling (scanners, reassign dialogs) for assets and models.
- Avoids fragmentation of barcode pools while still allowing metadata to indicate whether a record is a model or member.
- Legacy screenshots and examples in this plan still show `AG-` identifiers; refresh those artifacts once the shared numbering rollout is complete.

## UI/UX Design

### Asset Detail Page - "Create Group" Button

**Location:** Action toolbar (next to Edit, Delete)

**Button:** "Create Asset Group"

**Modal/Form:**
```
┌─────────────────────────────────────────┐
│ Create Asset Group from Asset           │
├─────────────────────────────────────────┤
│                                         │
│ Group Name: [Shure SM58 Microphones  ] │
│                                         │
│ This asset will become the first       │
│ member of the new group.               │
│                                         │
│ Configure Field Inheritance:           │
│ ┌─────────────────────────────────┐   │
│ │ ✅ Manufacturer    🔒 Locked    │   │
│ │ ✅ Model Name      🔒 Locked    │   │
│ │ ✅ Model Number    🔒 Locked    │   │
│ │ ✅ Description     🔓 Override  │   │
│ │ ✅ Purchase Cost   🔓 Override  │   │
│ └─────────────────────────────────┘   │
│                                         │
│ Custom Fields:                          │
│ ┌─────────────────────────────────┐   │
│ │ ✅ Manual URL      🔒 Locked    │   │
│ │ ❌ Internal Notes  (not shared) │   │
│ └─────────────────────────────────┘   │
│                                         │
│        [Cancel]  [Create Group]        │
└─────────────────────────────────────────┘
```

### Asset Group Detail Page

**Header Section:**
```
┌─────────────────────────────────────────────────┐
│ 🏷️ AG-001: Shure SM58 Microphones              │
│ Barcode: 7000042                                │
│ Members: 10 assets                               │
│                                                  │
│ [Edit Group] [Add Assets] [Dissolve Group]      │
└─────────────────────────────────────────────────┘
```

**Group Properties (Inherited Fields):**
```
┌─────────────────────────────────────────────────┐
│ Group Properties (Inherited by Members)         │
├─────────────────────────────────────────────────┤
│ Type: Microphones (🔒)                          │
│ Manufacturer: Shure (🔒)                        │
│ Model: SM58 (🔒)                                │
│ Model Number: SM58-LC (🔒)                      │
│ Description: Professional cardioid... (🔓)      │
│ Manual URL: https://... (🔒)                    │
└─────────────────────────────────────────────────┘
```

**Member Assets Table:**
```
┌────────────────────────────────────────────────────────────┐
│ Asset #  │ Serial    │ Status    │ Location  │ Assigned   │
├──────────┼───────────┼───────────┼───────────┼────────────┤
│ AST-042  │ 123456    │ Available │ Room A    │ -          │
│ AST-043  │ 123457    │ In Use    │ Room B    │ John Doe   │
│ AST-044  │ 123458    │ Available │ Room A    │ -          │
│ ...      │ ...       │ ...       │ ...       │ ...        │
└────────────────────────────────────────────────────────────┘
```

**Add Assets Modal:**
```
┌─────────────────────────────────────────┐
│ Add Assets to AG-001                    │
├─────────────────────────────────────────┤
│                                         │
│ How many assets? [5              ]     │
│                                         │
│ New assets will inherit:               │
│ • Manufacturer: Shure                  │
│ • Model: SM58                          │
│ • Model Number: SM58-LC                │
│ • Manual URL: https://...              │
│                                         │
│ You will need to set for each:        │
│ • Serial Number (required)             │
│ • Asset Number (auto-generated)        │
│ • Barcode (optional)                   │
│ • Location                             │
│                                         │
│ After creation, you can edit each     │
│ asset individually.                    │
│                                         │
│        [Cancel]  [Create 5 Assets]     │
└─────────────────────────────────────────┘
```

### Asset List Page - Group Indicators

**Visual Treatment:**
```
┌──────────────────────────────────────────────────┐
│ 🏷️ AG-001 (Shure SM58 Microphones) - 10 units  │
│   ├─ AST-042 • SN: 123456 • Available          │
│   ├─ AST-043 • SN: 123457 • In Use             │
│   └─ ... (8 more)                               │
└──────────────────────────────────────────────────┘
```

Or as grouped rows with expand/collapse:
```
▶ [AG-001] Shure SM58 Microphones (10 assets)
```

When expanded:
```
▼ [AG-001] Shure SM58 Microphones (10 assets)
  AST-042 | SN: 123456 | Available | Room A
  AST-043 | SN: 123457 | In Use    | Room B
  AST-044 | SN: 123458 | Available | Room A
  ... (7 more)
```

## API/Storage Design

### New Storage Methods

```typescript
interface StorageProvider {
  // Asset Group CRUD
  getAssetGroups(filters?: AssetGroupFilters): Promise<AssetGroup[]>;
  getAssetGroup(id: UUID): Promise<AssetGroup | null>;
  createAssetGroup(data: AssetGroupCreate): Promise<AssetGroup>;
  updateAssetGroup(id: UUID, data: AssetGroupUpdate): Promise<AssetGroup>;
  deleteAssetGroup(id: UUID, options?: { reassignAssets?: boolean }): Promise<void>;
  
  // Asset-Group relationships
  addAssetToGroup(assetId: UUID, groupId: UUID): Promise<Asset>;
  removeAssetFromGroup(assetId: UUID): Promise<Asset>;
  bulkCreateAssetsForGroup(groupId: UUID, count: number, baseData?: Partial<AssetCreate>): Promise<Asset[]>;
  
  // Utility methods
  getGroupMembers(groupId: UUID): Promise<Asset[]>;
  resolveAssetFieldValue(assetId: UUID, fieldKey: string): Promise<{ value: unknown; source: 'group' | 'local' | 'override' }>;
}
```

### ChurchTools Data Type Structure

Since ChurchTools doesn't have native "model" support, we'll use the existing asset type definition:

**Option A: Store groups as special assets**
- Asset with `isGroup: true` flag in custom field or data
- Use asset relationships to link members

**Option B: Store models in separate type**
- Create "Asset Models" data type
- Reference assets via custom field arrays


### Asset Model Type Schema

```typescript
{
  typeName: "Asset Models",
  fields: [
    { name: "groupNumber", type: "text", required: true },
    { name: "name", type: "text", required: true },
    { name: "barcode", type: "text", required: false },
  { name: "type", type: "text", required: true }, // Asset type
    { name: "manufacturer", type: "text" },
    { name: "model", type: "text" },
    { name: "modelNumber", type: "text" },
    { name: "description", type: "textarea" },
    { name: "inheritanceRules", type: "json" }, // Field inheritance config
    { name: "sharedCustomFields", type: "json" },
    { name: "customFieldRules", type: "json" },
    { name: "memberCount", type: "number" },
    { name: "memberAssetIds", type: "json" }, // Array of asset IDs
    // Standard metadata
    { name: "createdBy", type: "text" },
    { name: "createdByName", type: "text" },
    { name: "createdAt", type: "datetime" },
    { name: "lastModifiedBy", type: "text" },
    { name: "lastModifiedByName", type: "text" },
    { name: "lastModifiedAt", type: "datetime" },
  ]
}
```

### Asset Schema Updates

Add to existing Asset type:
```typescript
{
  // New fields
  { name: "assetGroupId", type: "text" }, // Reference to group
  { name: "assetGroupNumber", type: "text" }, // e.g., "AG-001"
  { name: "assetGroupName", type: "text" }, // Display name
  { name: "fieldSources", type: "json" }, // Tracks inherited vs local
}
```

## Implementation Phases

### Phase 1: Data Model & Storage (Week 1)
- [x] Create `AssetGroup` TypeScript types
- [x] Update `Asset` type with group relationship
- [x] Create "Asset Models" data type in ChurchTools
- [x] Add group-related fields to Asset type
- [x] Implement storage provider methods for groups
- [x] Write unit tests for storage layer

### Phase 2: Core Group Logic (Week 1-2)
- [x] Implement field inheritance resolver
- [x] Create group number generator (AG-xxx) *(legacy; deprecate after shared numbering rollout)*
- [x] Create validation logic (group constraints)
- [x] Implement "convert asset to group" logic
- [x] Implement "bulk create assets in group" logic
- [x] Write unit tests for business logic

### Phase 3: Asset Group UI Components (Week 2)
- [x] Create `AssetGroupList` component
- [x] Create `AssetGroupDetail` component
- [x] Create `AssetGroupForm` component (create/edit)
- [x] Create `GroupMemberTable` component
- [x] Create `InheritanceRuleEditor` component
- [x] Create `AddAssetsToGroupModal` component
- [x] Style group indicators/badges

### Phase 4: Asset UI Updates (Week 2-3)
- [x] Add "Create Asset Group" button to asset detail
- [x] Add "Convert to Group" modal/form
- [x] Display group membership on asset detail
- [x] Add group filter to asset list
- [x] Show inherited field indicators (🏷️ icon, tooltip)
- [x] Add group view toggle (expand/collapse in lists)
- [x] Update asset form to handle inherited fields

### Phase 5: Integration & Navigation (Week 3)
- [x] Create `/asset-groups` route
- [x] Add Asset Groups to navigation menu
- [x] Handle group scan → show group detail
- [x] Handle asset scan → show asset + group context
- [x] Update search to include groups
- [x] Update reports to include group aggregations

### Phase 6: Advanced Features (Week 3-4)
- [x] Implement "dissolve group" (remove all members)
  - Detail view gains a hazardous action that clears all members via the new storage API and refreshes counts instantly.
- [x] Implement "move asset to different group"
  - Members table now offers a "Move" action that opens a reassignment modal filtered to compatible groups.
- [x] Bulk edit for all group members
  - Bulk update modal lets admins push status/location/metadata changes and optionally clear overrides in one pass.
- [x] Group-level booking (reserve all available members)
  - Group booking modal creates identical bookings for selected members, defaulting to available assets.
- [x] Group status summary (X available, Y in use, Z maintenance)
  - A status card surfaces availability, issues, and top locations for the current member list.
- [x] Custom field templates for groups
  - Asset group form now supports saving, applying, and deleting reusable inheritance/custom-field templates persisted to localStorage.
- [x] Import/export group with members
  - Group detail menu now includes JSON snapshot export/import; import modal merges configuration, optional removal, and refreshes caches.

### Phase 7: Testing & Polish (Week 4)
- [ ] Integration tests for workflows
- [ ] E2E tests for UI flows
- [ ] Performance testing (large groups)
- [ ] Accessibility audit
- [ ] Documentation updates
- [ ] Migration guide for existing parent/child assets
- [ ] User guide for asset groups
- [ ] Terminology rollout: rename categories → Types and asset groups → Asset Models across UI, docs, and APIs
- [x] Make asset model location selector reuse the global searchable location picker
- [x] Retire dedicated group numbering and hook models into the standard QR/barcode reassignment flow
- [x] Replace asset model modal with a full-width detail route consistent with individual assets

## Migration Strategy

### Existing Parent/Child Assets

If there are existing parent/child relationships:

1. **Create migration script:**
   ```typescript
   async function migrateParentChildToGroups() {
     const parentAssets = await getAssetsWithChildren();
     
     for (const parent of parentAssets) {
       // Create group from parent
       const group = await createAssetGroup({
         name: `${parent.name} Group`,
         type: parent.type,
         manufacturer: parent.manufacturer,
         model: parent.model,
         // ... copy other fields
       });
       
       // Add parent as first member
       await addAssetToGroup(parent.id, group.id);
       
       // Add all children
       for (const child of parent.children) {
         await addAssetToGroup(child.id, group.id);
       }
     }
   }
   ```

2. **Backup data** before migration
3. **Run migration** with dry-run option
4. **Verify** group structure matches expectations
5. **Remove** old parent/child fields

## Edge Cases & Considerations

### 1. Circular Dependencies
- **Problem:** Asset A references Group 1, Group 1 references Asset A
- **Solution:** Validate during `addAssetToGroup` that asset is not already a group or member

### 2. Type Mismatch
- **Problem:** Trying to add asset from different type to group
- **Solution:** Enforce type matching in validation

### 3. Orphaned Assets
- **Problem:** Group deleted but assets remain
- **Solution:** Either block deletion if members exist, or provide "dissolve and keep assets" option

### 4. Inherited Field Conflicts
- **Problem:** Asset has local value, group sets inherited value
- **Solution:** 
  - If `overridable: true` → keep asset's local value
  - If `overridable: false` → overwrite with group value
  - Track change in history

### 5. Barcode Scanning Ambiguity
- **Problem:** User scans group barcode, expects to see asset
- **Solution:** Show group detail with member list, allow quick navigation to specific asset

### 6. Booking a Group
- **Problem:** User wants to book "a microphone from the group"
- **Solution:** 
  - Book at group level → system auto-assigns available member
  - Book specific asset → normal booking flow
  - (Future enhancement)

### 7. Bulk Operations
- **Problem:** Changing inherited field affects all members
- **Solution:** 
  - Require confirmation modal showing affected count
  - Allow preview of changes
  - Undo option for recent group edits

### 8. Performance with Large Groups
- **Problem:** Group with 500+ assets loads slowly
- **Solution:** 
  - Paginate member list
  - Lazy-load member details
  - Cache group-level aggregations

## Success Criteria

- ✅ User can convert existing asset to group (Use Case 1)
- ✅ User can bulk-create assets in group (Use Case 2)
- ✅ Inherited fields update across all members
- ✅ Unique fields remain independent per asset
- ✅ Custom field inheritance rules work correctly
- ✅ Asset IDs preserved when joining group
- ✅ UI clearly indicates inherited vs local fields
- ✅ Scanning group barcode shows useful information
- ✅ All existing asset operations still work for group members

## Future Enhancements

1. **Group Templates:** Predefined group configurations for common asset types
2. **Group-Level Booking:** Book "any available from group"
3. **Group Maintenance:** Schedule maintenance for entire group
4. **Group Reporting:** Aggregate statistics, utilization rates
5. **Sub-Groups:** Nested groups (e.g., "Sound Equipment" → "Microphones" → "Wireless Mics")
6. **Smart Allocation:** Auto-assign best available asset based on criteria
7. **Group Kits:** Create kits that reference groups instead of specific assets

## Questions for Stakeholders

1. Should dissolving a group delete the member assets or just remove the relationship?
2. What happens to bookings when an asset is removed from a group?
3. Should group-level bookings be supported in Phase 1 or later?
4. What's the maximum expected group size? (affects performance design)
5. Should we support changing an asset's group, or only add/remove?
6. How should history track group-level changes vs asset-level changes?

## Appendix: Example Scenarios

### Scenario A: Microphone Fleet

**Initial State:**
- 1 asset: AST-042 (Shure SM58, SN: 123456)

**After Group Creation:**
- 1 group: AG-001 "Shure SM58 Microphones"
  - Member: AST-042 (SN: 123456)
  
**After Bulk Add (9 more):**
- 1 group: AG-001 "Shure SM58 Microphones"
  - Member: AST-042 (SN: 123456)
  - Member: AST-043 (SN: 123457)
  - ...
  - Member: AST-051 (SN: 123465)

### Scenario B: Laptop Fleet with Variations

**Group: AG-005 "Dell Latitude 5420 Laptops"**

Inherited Fields:
- Manufacturer: Dell
- Model: Latitude 5420
- Warranty: 3 years
- Manual URL: https://dell.com/manual

Asset-Specific Fields:
- Serial Number (unique)
- RAM: 16GB or 32GB (varies)
- Storage: 512GB or 1TB (varies)
- Location (each in different office)
- Assigned to (different users)

**Members:**
- AST-100: SN xxx, 16GB RAM, 512GB, Office A, John
- AST-101: SN yyy, 32GB RAM, 1TB, Office B, Jane
- AST-102: SN zzz, 16GB RAM, 512GB, Office C, Bob

---

**End of Asset Groups Redesign Plan**
