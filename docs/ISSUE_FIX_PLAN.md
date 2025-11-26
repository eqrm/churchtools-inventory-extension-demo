# Issue Fix Plan

**Created**: 2025-11-26  
**Status**: Planning  
**Approach**: Test-Driven Development (TDD)

---

## Table of Contents

1. [Issue 1: Merge Asset Models with Asset Groups](#issue-1-merge-asset-models-with-asset-groups)
2. [Issue 2: Remove Flexible Kits & Fix Kit View](#issue-2-remove-flexible-kits--fix-kit-view)
3. [Issue 3: Unified Asset Selection with Scanner Support](#issue-3-unified-asset-selection-with-scanner-support)
4. [Issue 4: Work Order Fixes](#issue-4-work-order-fixes)
5. [Issue 5: Maintenance Rules - Days Interval](#issue-5-maintenance-rules---days-interval)
6. [Issue 6: Work Order Pre-Generation from Rules](#issue-6-work-order-pre-generation-from-rules)
7. [Issue 7: Asset Type Icon Display Fix](#issue-7-asset-type-icon-display-fix)
8. [Issue 8: Remove Global Undo History, Add Bulk Actions](#issue-8-remove-global-undo-history-add-bulk-actions)
9. [Issue 9: Settings Export - Scanner Only](#issue-9-settings-export---scanner-only)
10. [Issue 10: i18n Missing Keys Validation](#issue-10-i18n-missing-keys-validation)
11. [Issue 11: Remove Settings Version History](#issue-11-remove-settings-version-history)
12. [Issue 12: Maintenance Feature Review](#issue-12-maintenance-feature-review)

---

## Issue 1: Merge Asset Models with Asset Groups

**Problem**: Two separate systems exist for asset templates:
- `AssetModel` (route `/models`) - creation templates with default values
- `AssetGroup` (from asset detail "Join/Create Asset Model") - runtime field inheritance

**Goal**: Merge into a single unified system with runtime field inheritance.

### Phase 1.1: Analysis & Migration Planning

- [ ] **T1.1.1** Audit current `AssetModel` usage
  - Document all places `AssetModel` is used
  - List all fields in `AssetModel` type
  - Identify any data currently stored as `AssetModel`
  - **Test**: Create migration test file that validates no data loss

- [ ] **T1.1.2** Audit current `AssetGroup` usage  
  - Document all places `AssetGroup` is used
  - List all fields in `AssetGroup` type
  - Identify inheritance rules implementation
  - **Test**: Document expected inheritance behavior with test cases

- [ ] **T1.1.3** Design unified `AssetModel` schema
  - Combine fields from both types
  - Keep `AssetGroup` inheritance mechanism
  - Add `defaultValues` from old `AssetModel`
  - **Test**: Write Zod schema validation tests

### Phase 1.2: Backend Migration

- [ ] **T1.2.1** Create unified `AssetModel` type definition
  - Merge `AssetModel` and `AssetGroup` interfaces
  - Keep inheritance rules from `AssetGroup`
  - Add default value fields from old `AssetModel`
  - **Test**: Type compilation tests

- [ ] **T1.2.2** Create data migration utility
  - Migrate existing `AssetModel` data to new format
  - Migrate existing `AssetGroup` data to new format
  - Handle field mapping and conflicts
  - **Test**: Unit tests for migration functions

- [ ] **T1.2.3** Update storage provider for unified model
  - Merge `assetModels` and `assetGroups` storage
  - Update CRUD operations
  - Ensure backward compatibility during migration
  - **Test**: Integration tests for storage operations

- [ ] **T1.2.4** Update `AssetModelService`
  - Add inheritance rule management
  - Add member asset management
  - Support shared/override fields
  - **Test**: Service unit tests

### Phase 1.3: Frontend Unification

- [ ] **T1.3.1** Remove `/models` route and `AssetModelList` page
  - Remove route from router config
  - Remove navigation link
  - Keep component code for reference during migration
  - **Test**: Route tests - `/models` should 404

- [ ] **T1.3.2** Update `AssetGroupForm` as primary model form
  - Rename to `AssetModelForm`
  - Add `defaultValues` section
  - Keep inheritance rules UI
  - **Test**: Form validation tests

- [ ] **T1.3.3** Update asset detail "Join/Create Model" modals
  - Use unified `AssetModel` type
  - Update `ConvertAssetToGroupModal` → `ConvertAssetToModelModal`
  - Update `JoinAssetGroupModal` → `JoinAssetModelModal`
  - **Test**: Modal interaction tests

- [ ] **T1.3.4** Update `AssetForm` model selection
  - Remove separate model template selector
  - Use `AssetGroup` reference as model
  - Apply defaults when joining model
  - **Test**: Form integration tests

- [ ] **T1.3.5** Update all imports and references
  - Search and replace `AssetGroup` → `AssetModel` where appropriate
  - Update hooks (`useAssetGroups` → `useAssetModels`)
  - Update stores
  - **Test**: TypeScript compilation

### Phase 1.4: Cleanup

- [ ] **T1.4.1** Remove deprecated code
  - Remove old `AssetModel` type (non-unified)
  - Remove old services
  - Remove old hooks
  - **Test**: Build passes, no dead code

- [ ] **T1.4.2** Update documentation
  - Update API docs
  - Update component docs
  - Update user guide
  - **Test**: Doc links work

---

## Issue 2: Remove Flexible Kits & Fix Kit View

**Problem**: 
- Flexible kits exist but shouldn't
- Clicking a kit in asset list shows kit list instead of kit details
- No proper kit detail/edit view

**Goal**: Remove flexible kits, show kit details inline in asset list/detail.

### Phase 2.1: Remove Flexible Kit Code

- [ ] **T2.1.1** Remove `FlexibleKitBuilder` component
  - Delete component file
  - Remove imports
  - **Test**: Build passes without component

- [ ] **T2.1.2** Update `KitForm` to remove kit type selection
  - Remove `type` field (always 'fixed')
  - Remove flexible-specific UI elements
  - Simplify form
  - **Test**: Kit form only creates fixed kits

- [ ] **T2.1.3** Update `Kit` type and schema
  - Remove `type` field or make it always 'fixed'
  - Remove `poolRequirements` field
  - Remove flexible-related fields
  - **Test**: Schema validation tests

- [ ] **T2.1.4** Update `KitService` 
  - Remove flexible kit logic
  - Simplify booking logic
  - Remove pool fulfillment code
  - **Test**: Service unit tests

- [ ] **T2.1.5** Update storage provider
  - Remove flexible kit handling
  - Simplify kit storage
  - **Test**: Storage integration tests

- [ ] **T2.1.6** Data migration for existing flexible kits
  - Convert any flexible kits to fixed (or remove)
  - Log warnings for admin review
  - **Test**: Migration test

### Phase 2.2: Fix Kit View in Asset List

- [ ] **T2.2.1** Update `AssetList` kit row click handler
  - Navigate to asset detail (not kit list) when clicking kit
  - Pass kit asset ID
  - **Test**: Click kit row → opens asset detail

- [ ] **T2.2.2** Enhance `AssetDetail` for kit assets
  - Show kit-specific sections when `asset.isKit === true`
  - Display bound assets table
  - Show kit status (complete/incomplete)
  - Show inheritance settings
  - **Test**: Asset detail shows kit info when viewing kit

- [ ] **T2.2.3** Add "Edit Kit" action to kit asset detail
  - Open `KitForm` in edit mode
  - Pre-populate with kit data
  - Allow editing bound assets, inheritance
  - **Test**: Edit button opens form, saves correctly

- [ ] **T2.2.4** Update `KitDetailView` component
  - Ensure it works as embedded section in `AssetDetail`
  - Remove any redundant wrapper/page logic
  - **Test**: Component renders correctly embedded

- [ ] **T2.2.5** Remove standalone kit routes if any
  - Check for `/kits/:id` routes
  - Redirect or remove
  - **Test**: No standalone kit detail routes

---

## Issue 3: Unified Asset Selection with Scanner Support

**Problem**: Separate barcode input fields in forms. Want unified modal with search + scanner.

**Goal**: Create `AssetSelectionModal` component for all asset selection use cases.

### Phase 3.1: Design & Core Component

- [ ] **T3.1.1** Design `AssetSelectionModal` interface
  - Props: `opened`, `onClose`, `onConfirm`, `selectedAssets`, `filter?`
  - Support single/multi-select modes
  - **Test**: Type definitions

- [ ] **T3.1.2** Create `AssetSelectionModal` component shell
  - Modal container with search input
  - Selected assets display area
  - Confirm/Cancel buttons
  - **Test**: Renders without errors

- [ ] **T3.1.3** Implement search functionality
  - Search by name, asset number, description
  - Debounced search input
  - Keyboard navigation (arrow keys)
  - **Test**: Search returns filtered results

- [ ] **T3.1.4** Implement keyboard selection
  - Arrow up/down to navigate results
  - Space/Enter to toggle selection
  - Enter on search confirms all
  - **Test**: Keyboard navigation works

- [ ] **T3.1.5** Implement scanner input capture
  - Detect barcode scanner input (rapid keystrokes)
  - Auto-add scanned asset to selection
  - Visual/audio feedback on scan
  - **Test**: Scanner simulation adds assets

- [ ] **T3.1.6** Implement selected assets display
  - Show list of selected assets with remove button
  - Show asset number, name, status badge
  - **Test**: Selected items display correctly

- [ ] **T3.1.7** Add confirmation flow
  - Confirm button returns selected assets
  - Clear selection on close
  - **Test**: Confirm returns correct assets

### Phase 3.2: Integration

- [ ] **T3.2.1** Integrate into `FixedKitBuilder`
  - Replace inline asset select with "Add Assets" button
  - Open `AssetSelectionModal`
  - Add returned assets to kit
  - **Test**: Kit builder uses modal for selection

- [ ] **T3.2.2** Integrate into `WorkOrderForm`
  - Replace asset multi-select with "Add Assets" button
  - Open `AssetSelectionModal`
  - Add to line items
  - **Test**: Work order form uses modal

- [ ] **T3.2.3** Integrate into `BookingForm`
  - Replace asset select with "Select Asset" button
  - Open `AssetSelectionModal` (single mode)
  - Set selected asset
  - **Test**: Booking form uses modal

- [ ] **T3.2.4** Remove inline scanner inputs from forms
  - Remove `InlineScanInput` usage in updated forms
  - Clean up redundant code
  - **Test**: No duplicate scanner inputs

### Phase 3.3: Polish

- [ ] **T3.3.1** Add empty state
  - Show message when no assets match
  - Suggest scan or search
  - **Test**: Empty state displays

- [ ] **T3.3.2** Add loading state
  - Show skeleton while loading assets
  - **Test**: Loading state displays

- [ ] **T3.3.3** Add accessibility
  - ARIA labels
  - Focus management
  - Screen reader support
  - **Test**: Accessibility audit passes

---

## Issue 4: Work Order Fixes

**Problem**: 
- Manual work order creation doesn't work
- Work orders not visible in UI
- Rule test button doesn't work
- Asset detail doesn't show linked work orders

### Phase 4.1: Fix Manual Work Order Creation

- [ ] **T4.1.1** Debug manual work order creation flow
  - Trace from UI to service to storage
  - Identify where it fails
  - **Test**: Log statements for debugging

- [ ] **T4.1.2** Fix `WorkOrderForm` submission
  - Ensure form data is properly formatted
  - Check required fields
  - Fix validation issues
  - **Test**: Form submits without errors

- [ ] **T4.1.3** Fix `useCreateWorkOrder` mutation
  - Check mutation function
  - Ensure proper error handling
  - Update cache correctly
  - **Test**: Mutation creates work order

- [ ] **T4.1.4** Fix `MaintenanceService.createWorkOrder`
  - Validate input data
  - Ensure storage provider call works
  - Return created work order
  - **Test**: Service creates work order

- [ ] **T4.1.5** Fix storage provider work order creation
  - Check category exists
  - Proper data serialization
  - **Test**: Work order persists

### Phase 4.2: Fix Work Order Visibility

- [ ] **T4.2.1** Debug `useWorkOrders` hook
  - Ensure it fetches from storage
  - Check for filter issues
  - **Test**: Hook returns work orders

- [ ] **T4.2.2** Fix `WorkOrders` page display
  - Ensure table renders with data
  - Check column definitions
  - **Test**: Work orders appear in list

- [ ] **T4.2.3** Fix work order detail view
  - Ensure clicking row opens detail
  - State machine displays correctly
  - **Test**: Can view work order details

### Phase 4.3: Add Work Orders to Asset Detail

- [ ] **T4.3.1** Create `useAssetWorkOrders` hook
  - Fetch work orders where asset is in line items
  - Return filtered list
  - **Test**: Hook returns asset's work orders

- [ ] **T4.3.2** Add work orders section to `AssetDetail`
  - New tab or section in Maintenance tab
  - Show work order list (number, status, due date)
  - Link to work order detail
  - **Test**: Asset detail shows linked work orders

- [ ] **T4.3.3** Show upcoming/overdue indicators
  - Badge for overdue
  - Next maintenance date
  - **Test**: Indicators display correctly

### Phase 4.4: Fix Rule Test Button

- [ ] **T4.4.1** Debug test button handler
  - Check `handleOpenTestModal` in `MaintenanceRuleForm`
  - Trace modal state
  - **Test**: Button click opens modal

- [ ] **T4.4.2** Fix `MaintenanceRuleTestModal`
  - Ensure it receives rule data
  - Preview calculation works
  - **Test**: Modal shows preview

- [ ] **T4.4.3** Fix `previewRuleSchedule` function
  - Check calculation logic
  - Ensure dates are correct
  - **Test**: Preview returns correct dates

---

## Issue 5: Maintenance Rules - Days Interval

**Problem**: Only `months` and `uses` intervals supported. Need `days` option.

**Goal**: Add `days` as interval type option.

### Phase 5.1: Schema & Type Updates

- [ ] **T5.1.1** Update `MaintenanceIntervalType`
  - Add `'days'` to type union
  - Update in `src/types/maintenance.ts`
  - **Test**: Type compiles

- [ ] **T5.1.2** Update maintenance rule schema
  - Add `'days'` to interval type enum
  - Update Zod schema in `src/schemas/maintenance.ts`
  - **Test**: Schema accepts 'days'

### Phase 5.2: Scheduler Logic

- [ ] **T5.2.1** Update `calculateNextDueDate`
  - Handle `'days'` interval type
  - Add days to anchor date
  - **Test**: Days calculation correct

- [ ] **T5.2.2** Update `previewRuleSchedule`
  - Include days in preview
  - **Test**: Preview works for days

- [ ] **T5.2.3** Update `computeScheduleAfterCompletion`
  - Handle days interval for rescheduling
  - **Test**: Reschedule works for days

### Phase 5.3: UI Updates

- [ ] **T5.3.1** Update `MaintenanceRuleForm` interval options
  - Add "Days" option to select
  - Update translations
  - **Test**: Days option appears in form

- [ ] **T5.3.2** Update interval display in rule list
  - Show "X days" format
  - **Test**: Days display correctly

- [ ] **T5.3.3** Add i18n keys for days
  - Add `maintenance:intervals.days`
  - Update English translations
  - **Test**: Translations work

---

## Issue 6: Work Order Pre-Generation from Rules

**Problem**: Work orders should be created in advance based on rules, up to 5 years (60 months).

**Goal**: Generate future work orders automatically, update when rules change.

### Phase 6.1: Generation Logic

- [ ] **T6.1.1** Define generation horizon constant
  - `MAX_WORK_ORDER_HORIZON_MONTHS = 60` (5 years)
  - Add to constants file
  - **Test**: Constant exists

- [ ] **T6.1.2** Create `generateFutureWorkOrders` function
  - Input: rule, horizon months
  - Output: array of work order drafts
  - Calculate all due dates within horizon
  - **Test**: Generates correct number of work orders

- [ ] **T6.1.3** Integrate with rule creation
  - After creating rule, generate future work orders
  - Save as 'scheduled' status
  - **Test**: Rule creation generates work orders

- [ ] **T6.1.4** Integrate with rule update
  - Detect interval/start date changes
  - Delete obsolete scheduled work orders
  - Regenerate from new schedule
  - **Test**: Rule update reschedules work orders

- [ ] **T6.1.5** Handle rule deletion
  - Prompt about scheduled work orders
  - Option to delete all or keep existing
  - **Test**: Rule deletion handles work orders

### Phase 6.2: Status Management

- [ ] **T6.2.1** Add 'scheduled' status to work orders
  - Update `WorkOrderState` type
  - Update state machine
  - **Test**: Scheduled status valid

- [ ] **T6.2.2** Distinguish scheduled vs active work orders
  - Scheduled: future, not yet actionable
  - Active: within lead time, can be worked on
  - **Test**: Status transitions correct

- [ ] **T6.2.3** Auto-activate scheduled work orders
  - Background job checks lead time
  - Move to 'backlog' when within lead time
  - **Test**: Auto-activation works

### Phase 6.3: UI Updates

- [ ] **T6.3.1** Update work order list to show scheduled
  - Add filter for scheduled work orders
  - Show due date prominently
  - **Test**: Scheduled work orders visible

- [ ] **T6.3.2** Add calendar view for scheduled work orders
  - Visual timeline of upcoming work
  - Group by month
  - **Test**: Calendar displays scheduled

- [ ] **T6.3.3** Show regeneration confirmation
  - When editing rule, show affected work orders
  - Confirm before regenerating
  - **Test**: Confirmation modal works

---

## Issue 7: Asset Type Icon Display Fix

**Problem**: Asset type select shows `mdi:office-building-cog-outline Gebäudetechnik` instead of icon + name.

**Goal**: Display actual icon, not icon text.

### Phase 7.1: Fix Asset Form

- [ ] **T7.1.1** Update `AssetForm` asset type select
  - Use `IconDisplay` component in select option
  - Remove text concatenation of icon
  - **Test**: Icon renders in dropdown

- [ ] **T7.1.2** Create custom `renderOption` for Select
  - Render icon + text side by side
  - Handle missing icons gracefully
  - **Test**: Custom render works

- [ ] **T7.1.3** Update selected value display
  - Show icon in selected value area
  - **Test**: Selected shows icon

### Phase 7.2: Audit Other Locations

- [ ] **T7.2.1** Search for similar icon text issues
  - Grep for `cat.icon` or `type.icon` string concatenation
  - Fix any found instances
  - **Test**: No icon text in UI

- [ ] **T7.2.2** Create reusable `AssetTypeOption` component
  - Standardize icon + name display
  - Use in all asset type selects
  - **Test**: Component works everywhere

---

## Issue 8: Remove Global Undo History, Add Bulk Actions

**Problem**: 
- Global undo history in top right not needed
- Want bulk actions in asset list with undo for those only

**Goal**: Remove global undo, implement bulk actions with undo.

### Phase 8.1: Remove Global Undo

- [ ] **T8.1.1** Remove `UndoHistory` from layout/header
  - Find where it's rendered globally
  - Remove component usage
  - **Test**: No undo panel in header

- [ ] **T8.1.2** Keep undo infrastructure
  - Keep `useUndo` hook for bulk actions
  - Keep `UndoService` for persistence
  - **Test**: Infrastructure still works

### Phase 8.2: Implement Bulk Actions

- [ ] **T8.2.1** Add row selection to `AssetList`
  - Checkbox column for selection
  - Select all/none header checkbox
  - Track selected asset IDs
  - **Test**: Can select multiple rows

- [ ] **T8.2.2** Create `BulkActionBar` component
  - Shows when items selected
  - Displays selected count
  - Action buttons
  - **Test**: Bar appears on selection

- [ ] **T8.2.3** Implement bulk status change
  - Select status from dropdown
  - Apply to all selected
  - Show confirmation modal
  - **Test**: Status updates for all

- [ ] **T8.2.4** Implement bulk location change
  - Select/type location
  - Apply to all selected
  - Confirmation modal
  - **Test**: Location updates for all

- [ ] **T8.2.5** Implement bulk tag add/remove
  - Multi-select tags
  - Add or remove mode
  - Apply to all selected
  - **Test**: Tags update for all

- [ ] **T8.2.6** Implement bulk custom field update
  - Select field, enter value
  - Apply to all selected (where field exists)
  - **Test**: Custom fields update

- [ ] **T8.2.7** Implement bulk delete
  - Confirmation with count
  - Soft delete all selected
  - **Test**: Assets deleted

### Phase 8.3: Bulk Action Undo

- [ ] **T8.3.1** Create `BulkActionUndo` system
  - Store bulk action as compound undo
  - Track all affected assets and previous values
  - **Test**: Bulk action recorded in undo

- [ ] **T8.3.2** Show undo toast after bulk action
  - Toast with undo button
  - 10-second timeout
  - Click undoes all changes
  - **Test**: Undo toast works

- [ ] **T8.3.3** Implement bulk undo handler
  - Restore all assets to previous state
  - Handle partial failures gracefully
  - **Test**: Bulk undo restores all

---

## Issue 9: Settings Export - Scanner Only

**Problem**: Export exports all settings, should only export scanner configuration.

**Goal**: Default export to scanner config only.

### Phase 9.1: Update Export Logic

- [ ] **T9.1.1** Update `exportSettings` to default to scanner-only
  - Change default scope from 'full' to 'scanner-only'
  - Keep full export as option
  - **Test**: Default export is scanner only

- [ ] **T9.1.2** Update `SettingsExportImport` UI
  - Remove full export button (or make it secondary)
  - Primary button exports scanner config
  - **Test**: UI shows scanner export as primary

- [ ] **T9.1.3** Update export filename
  - `inventory-scanner-settings-{date}.json`
  - **Test**: Correct filename

### Phase 9.2: Update Import

- [ ] **T9.2.1** Import should detect scope
  - Parse imported JSON
  - Only import scanner settings
  - Ignore other settings in file
  - **Test**: Import works with scanner-only

---

## Issue 10: i18n Missing Keys Validation

**Problem**: Need to detect missing translation keys.

**Goal**: Create lint tool/test to validate all i18n keys exist.

### Phase 10.1: Create Extraction Script

- [ ] **T10.1.1** Create `scripts/extract-i18n-keys.mjs`
  - Parse all `.tsx` and `.ts` files
  - Extract `t('key')` patterns
  - Handle namespaced keys `t('namespace:key')`
  - Output list of used keys
  - **Test**: Script runs and outputs keys

- [ ] **T10.1.2** Handle dynamic keys
  - Flag dynamic keys (variables)
  - Exclude from strict checking
  - **Test**: Dynamic keys flagged

### Phase 10.2: Create Validation

- [ ] **T10.2.1** Create `scripts/validate-i18n.mjs`
  - Load all locale JSON files
  - Compare extracted keys vs defined keys
  - Report missing keys
  - Report unused keys (optional)
  - **Test**: Script detects missing keys

- [ ] **T10.2.2** Add npm script
  - `"i18n:check": "node scripts/validate-i18n.mjs"`
  - Add to CI/lint process
  - **Test**: npm run i18n:check works

### Phase 10.3: Create Test

- [ ] **T10.3.1** Create `tests/i18n/missing-keys.test.ts`
  - Import extraction and validation
  - Assert no missing keys
  - Fail if any missing
  - **Test**: Test fails when key missing

- [ ] **T10.3.2** Add to test suite
  - Include in `npm test`
  - **Test**: Runs with other tests

---

## Issue 11: Remove Settings Version History

**Problem**: Settings version history not needed.

**Goal**: Remove version history feature from settings.

### Phase 11.1: Remove UI

- [ ] **T11.1.1** Remove "History" tab from `SettingsPage`
  - Remove tab definition
  - Remove panel content
  - **Test**: No history tab

- [ ] **T11.1.2** Remove `SettingsVersionHistory` component
  - Delete component file
  - Remove imports
  - **Test**: Build passes

- [ ] **T11.1.3** Remove version history from export/import
  - Keep only scanner export/import
  - Remove version-related UI
  - **Test**: Export/import still works

### Phase 11.2: Remove Backend

- [ ] **T11.2.1** Remove `SettingsVersionService`
  - Delete service file
  - Remove imports
  - **Test**: Build passes

- [ ] **T11.2.2** Remove `useSettingsVersions` hook
  - Delete hook file
  - Update any usages
  - **Test**: Build passes

- [ ] **T11.2.3** Remove settings version store
  - Remove from `settingsStore`
  - Clean up state
  - **Test**: Store works

- [ ] **T11.2.4** Remove settings version types
  - Remove `SettingsVersion` type
  - Clean up related types
  - **Test**: Types compile

---

## Issue 12: Maintenance Feature Review

**Problem**: Ensure maintenance features work like proper facility management tool.

**Goal**: Review and fix maintenance workflow end-to-end.

### Phase 12.1: Workflow Audit

- [ ] **T12.1.1** Document expected maintenance workflow
  - Define rules → Generate work orders → Assign → Execute → Complete
  - Create flowchart
  - **Test**: Documentation complete

- [ ] **T12.1.2** Audit current implementation
  - Test each workflow step
  - Document gaps/bugs
  - **Test**: Audit complete

### Phase 12.2: State Machine Review

- [ ] **T12.2.1** Review work order state machine
  - Verify all states are reachable
  - Verify transitions make sense
  - **Test**: State machine diagram matches code

- [ ] **T12.2.2** Fix any state transition issues
  - Ensure actions trigger correct transitions
  - Handle edge cases
  - **Test**: All transitions work

### Phase 12.3: Dashboard Review

- [ ] **T12.3.1** Review maintenance dashboard
  - Shows overdue items
  - Shows upcoming items
  - Quick actions work
  - **Test**: Dashboard functional

- [ ] **T12.3.2** Add missing dashboard features
  - Compliance percentage
  - Trend charts (if needed)
  - **Test**: Dashboard complete

### Phase 12.4: Reporting Review

- [ ] **T12.4.1** Review maintenance reports
  - Work order completion rates
  - Average response times
  - **Test**: Reports generate

- [ ] **T12.4.2** Add missing reports
  - Asset maintenance history
  - Cost tracking (if applicable)
  - **Test**: Reports complete

---

## Implementation Order

Recommended order based on dependencies and impact:

1. **Issue 7**: Asset Type Icon (quick fix, improves UX immediately)
2. **Issue 11**: Remove Settings Version History (simplification)
3. **Issue 9**: Settings Export Scanner Only (quick fix)
4. **Issue 5**: Maintenance Rules Days Interval (foundation for Issue 6)
5. **Issue 4**: Work Order Fixes (critical functionality)
6. **Issue 6**: Work Order Pre-Generation (depends on Issue 4, 5)
7. **Issue 2**: Remove Flexible Kits & Fix Kit View
8. **Issue 3**: Unified Asset Selection Modal (reusable component)
9. **Issue 1**: Merge Asset Models (largest refactor)
10. **Issue 8**: Bulk Actions (feature enhancement)
11. **Issue 10**: i18n Validation (tooling)
12. **Issue 12**: Maintenance Review (final polish)

---

## Test Strategy

For each task:
1. **Write test first** (TDD)
2. **Run test** (should fail)
3. **Implement feature**
4. **Run test** (should pass)
5. **Commit with test**

Test types:
- **Unit tests**: Service logic, utilities, pure functions
- **Integration tests**: Hooks, storage providers
- **Component tests**: React components with mocked dependencies
- **E2E tests**: Critical user flows (optional, for major features)

---

## Progress Tracking

Update this section as tasks are completed:

```
Issue 1:  [ ] Phase 1.1 [ ] Phase 1.2 [ ] Phase 1.3 [ ] Phase 1.4
Issue 2:  [ ] Phase 2.1 [ ] Phase 2.2
Issue 3:  [ ] Phase 3.1 [ ] Phase 3.2 [ ] Phase 3.3
Issue 4:  [ ] Phase 4.1 [ ] Phase 4.2 [ ] Phase 4.3 [ ] Phase 4.4
Issue 5:  [ ] Phase 5.1 [ ] Phase 5.2 [ ] Phase 5.3
Issue 6:  [ ] Phase 6.1 [ ] Phase 6.2 [ ] Phase 6.3
Issue 7:  [ ] Phase 7.1 [ ] Phase 7.2
Issue 8:  [ ] Phase 8.1 [ ] Phase 8.2 [ ] Phase 8.3
Issue 9:  [ ] Phase 9.1 [ ] Phase 9.2
Issue 10: [ ] Phase 10.1 [ ] Phase 10.2 [ ] Phase 10.3
Issue 11: [ ] Phase 11.1 [ ] Phase 11.2
Issue 12: [ ] Phase 12.1 [ ] Phase 12.2 [ ] Phase 12.3 [ ] Phase 12.4
```

---

## Notes

- All changes should maintain backward compatibility where possible
- Database migrations should be reversible
- Feature flags can be used for gradual rollout
- User communication needed for breaking changes
