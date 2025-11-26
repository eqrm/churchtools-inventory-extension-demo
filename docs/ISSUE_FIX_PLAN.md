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
- `AssetModel` (route `/models`) - creation templates with default values (src/types/model.ts)
- `AssetGroup` (from asset detail "Join/Create Asset Model") - runtime field inheritance (src/types/entities.ts)

**Goal**: Merge into a single unified system with runtime field inheritance.

### Phase 1.1: Analysis & Migration Planning

- [ ] **T1.1.1** Audit current `AssetModel` usage
  - **File to create**: `src/tests/migrations/assetModel-audit.test.ts`
  - **Action**: Search codebase for `AssetModel` imports (grep for `from.*model` and `AssetModel`)
  - **Document**: Current fields: `id`, `name`, `assetTypeId`, `manufacturer`, `modelNumber`, `defaultWarrantyMonths`, `defaultBookable`, `defaultValues`, `tagIds`, `createdBy`, `createdByName`, `createdAt`, `updatedAt`
  - **Test**: Write test that snapshots current AssetModel interface fields
  - **Files to check**: `src/types/model.ts`, `src/services/AssetModelService.ts`, `src/pages/AssetModelList.tsx`, `src/components/models/AssetModelForm.tsx`

- [ ] **T1.1.2** Audit current `AssetGroup` usage  
  - **File to create**: `src/tests/migrations/assetGroup-audit.test.ts`
  - **Action**: Search for `AssetGroup` imports and `assetGroup` field usage
  - **Document**: Current fields: `id`, `groupNumber`, `name`, `barcode`, `assetType`, `manufacturer`, `model`, `modelNumber`, `description`, `mainImage`, `inheritanceRules`, `sharedCustomFields`, `customFieldRules`, `memberAssetIds`, `memberCount`, etc.
  - **Test**: Write test that validates inheritance rule application: when `inheritanceRules.location.inherited=true`, member assets get group's location
  - **Files to check**: `src/types/entities.ts` (AssetGroup interface), `src/pages/AssetGroupsPage.tsx`, `src/pages/AssetGroupDetailPage.tsx`, `src/components/asset-groups/*`

- [ ] **T1.1.3** Design unified `AssetModel` schema
  - **File to create**: `src/schemas/unifiedAssetModel.ts`
  - **Action**: Create new Zod schema combining:
    - From AssetGroup: `inheritanceRules`, `sharedCustomFields`, `customFieldRules`, `memberAssetIds`, `memberCount`
    - From AssetModel: `defaultValues`, `defaultWarrantyMonths`, `defaultBookable`
  - **Test**: `src/tests/schemas/unifiedAssetModel.test.ts` - validate schema accepts both old formats
  - **Acceptance**: Schema validates correctly with sample data from both old systems

### Phase 1.2: Backend Migration

- [ ] **T1.2.1** Create unified `AssetModel` type definition
  - **File to modify**: `src/types/entities.ts` - add `UnifiedAssetModel` interface
  - **Keep from AssetGroup**: `id`, `groupNumber`, `name`, `barcode`, `assetType`, `manufacturer`, `model`, `modelNumber`, `description`, `mainImage`, `inheritanceRules`, `sharedCustomFields`, `customFieldRules`, `memberAssetIds`, `memberCount`, `barcodeHistory`
  - **Add from old AssetModel**: `defaultValues: Record<string, unknown>`, `defaultWarrantyMonths?: number`, `defaultBookable?: boolean`
  - **Test**: `src/tests/types/unifiedAssetModel.test.ts` - type should compile and be assignable from both old types

- [ ] **T1.2.2** Create data migration utility
  - **File to create**: `src/services/migrations/assetModelMigration.ts`
  - **Function 1**: `migrateOldAssetModel(old: OldAssetModel): UnifiedAssetModel` - map old AssetModel fields to new structure
  - **Function 2**: `migrateAssetGroup(group: AssetGroup): UnifiedAssetModel` - map AssetGroup fields (mostly identity)
  - **Test**: `src/tests/services/migrations/assetModelMigration.test.ts`
    - Test case 1: Old AssetModel with defaultValues migrates correctly
    - Test case 2: AssetGroup with inheritanceRules migrates correctly
    - Test case 3: Handle missing optional fields gracefully

- [ ] **T1.2.3** Update storage provider for unified model
  - **File to modify**: `src/services/storage/churchToolsProvider/assetGroups.ts`
  - **Action 1**: Rename file to `assetModels.ts`
  - **Action 2**: Add `defaultValues`, `defaultWarrantyMonths`, `defaultBookable` to storage mapping
  - **Action 3**: Update ChurchTools data category field mappings
  - **Test**: `src/services/storage/__tests__/ChurchToolsProvider.assetModels.test.ts`
    - Test create with defaultValues
    - Test update preserves inheritanceRules
    - Test read returns unified type

- [ ] **T1.2.4** Update `AssetModelService`
  - **File to modify**: `src/services/AssetModelService.ts`
  - **Action 1**: Add `addMemberAsset(modelId, assetId)` method
  - **Action 2**: Add `removeMemberAsset(modelId, assetId)` method
  - **Action 3**: Add `applyInheritedFields(modelId, assetId)` method - copies inherited field values to asset
  - **Action 4**: Add `getEffectiveFieldValue(modelId, assetId, fieldName)` - returns inherited or local value
  - **Test**: `src/tests/services/AssetModelService.test.ts`
    - Test adding member asset updates memberAssetIds
    - Test applyInheritedFields copies location when inheritanceRules.location.inherited=true
    - Test getEffectiveFieldValue returns local when fieldSources[field]='local'

### Phase 1.3: Frontend Unification

- [ ] **T1.3.1** Remove `/models` route and `AssetModelList` page
  - **File to modify**: `src/router/AppRouter.tsx` - remove line with `path: 'models'`
  - **File to modify**: `src/components/layout/Navigation.tsx` - remove "Models" nav link
  - **Keep file**: `src/pages/AssetModelList.tsx` (mark as deprecated, remove in Phase 1.4)
  - **Test**: `src/tests/router/routes.test.ts` - navigating to `/models` should redirect to `/asset-groups`

- [ ] **T1.3.2** Rename `AssetGroupForm` to `AssetModelForm`
  - **File to rename**: `src/components/asset-groups/AssetGroupForm.tsx` → `src/components/models/UnifiedAssetModelForm.tsx`
  - **Action 1**: Add `defaultValues` section with dynamic field inputs based on assetType.customFields
  - **Action 2**: Add `defaultWarrantyMonths` NumberInput field
  - **Action 3**: Add `defaultBookable` Checkbox field
  - **Action 4**: Keep existing inheritanceRules checkboxes
  - **Test**: `src/tests/components/models/UnifiedAssetModelForm.test.tsx`
    - Test defaultValues section renders custom field inputs
    - Test form submits with both defaultValues and inheritanceRules

- [ ] **T1.3.3** Update asset detail "Join/Create Model" modals
  - **File to modify**: `src/components/assets/ConvertAssetToGroupModal.tsx` → rename to `ConvertAssetToModelModal.tsx`
  - **File to modify**: `src/components/assets/JoinAssetGroupModal.tsx` → rename to `JoinAssetModelModal.tsx`
  - **Action**: Update imports to use `UnifiedAssetModel` type
  - **Action**: Update i18n keys from `assetGroups:*` to `assetModels:*`
  - **Test**: `src/tests/components/assets/ConvertAssetToModelModal.test.tsx`
    - Test modal creates model with current asset as template
    - Test modal applies defaultValues from model to new member assets

- [ ] **T1.3.4** Update `AssetForm` model selection
  - **File to modify**: `src/components/assets/AssetForm.tsx`
  - **Action 1**: Remove old "Model" select that used AssetModel (line ~150-180 area)
  - **Action 2**: Keep/enhance "Asset Group" select, rename label to "Asset Model"
  - **Action 3**: When model selected, auto-populate form fields from model.defaultValues
  - **Test**: `src/tests/components/assets/AssetForm.test.tsx`
    - Test selecting model populates manufacturer from model.defaultValues.manufacturer
    - Test user can override auto-populated values (fieldSources becomes 'local')

- [ ] **T1.3.5** Update all imports and references
  - **Action 1**: Run `grep -r "AssetGroup" src/ --include="*.ts" --include="*.tsx"` and update relevant imports
  - **Action 2**: Rename hook `useAssetGroups` → `useAssetModels` in `src/hooks/useAssetGroups.ts`
  - **Action 3**: Update type exports in `src/types/index.ts`
  - **Test**: `npm run typecheck` passes with no errors

### Phase 1.4: Cleanup

- [ ] **T1.4.1** Remove deprecated code
  - **Delete**: `src/types/model.ts` (old AssetModel type)
  - **Delete**: `src/pages/AssetModelList.tsx` (old models page)
  - **Delete**: `src/components/models/AssetModelForm.tsx` (old form)
  - **Action**: Remove unused imports flagged by ESLint
  - **Test**: `npm run build` passes, `npm run lint` shows no dead code warnings

- [ ] **T1.4.2** Update documentation
  - **File to modify**: `docs/api.md` - update AssetModel API section
  - **File to modify**: `docs/components.md` - update component references
  - **File to modify**: `docs/user-guide.md` - explain unified model concept
  - **Test**: All internal doc links resolve (no 404s)

---

## Issue 2: Remove Flexible Kits & Fix Kit View

**Problem**: 
- Flexible kits exist but shouldn't (adds unnecessary complexity)
- Clicking a kit in asset list shows kit list instead of kit details
- No proper kit detail/edit view

**Goal**: Remove flexible kits, show kit details inline in asset list/detail.

### Phase 2.1: Remove Flexible Kit Code

- [ ] **T2.1.1** Remove `FlexibleKitBuilder` component
  - **File to delete**: `src/components/kits/FlexibleKitBuilder.tsx`
  - **File to modify**: `src/components/kits/KitForm.tsx` - remove import and usage of `FlexibleKitBuilder`
  - **Test**: `npm run build` passes without FlexibleKitBuilder

- [ ] **T2.1.2** Update `KitForm` to remove kit type selection
  - **File to modify**: `src/components/kits/KitForm.tsx`
  - **Line ~45**: Remove `typeOptions` useMemo that creates fixed/flexible options
  - **Line ~65**: Remove `type` from form initialValues, hardcode to `'fixed'`
  - **Line ~85**: Remove useEffect that resets fields when type changes
  - **Line ~125**: Remove the `Select` component for type selection
  - **Line ~155**: Remove the conditional `FlexibleKitBuilder` render
  - **Test**: `src/tests/components/kits/KitForm.test.tsx`
    - Test form does not render type select
    - Test form always submits with type='fixed'
    - Test form validates boundAssets required

- [ ] **T2.1.3** Update `Kit` type and schema
  - **File to modify**: `src/types/entities.ts`
    - Change `type KitType = 'fixed' | 'flexible'` to `type KitType = 'fixed'`
    - Remove `poolRequirements?: {...}[]` from Kit interface
  - **File to modify**: `src/schemas/kit.ts` (if exists) or kit validation code
    - Remove 'flexible' from type enum
    - Remove poolRequirements validation
  - **Test**: `src/tests/types/kit.test.ts`
    - Test Kit type only allows 'fixed'
    - Test schema rejects poolRequirements

- [ ] **T2.1.4** Update `KitService`
  - **File to modify**: `src/services/KitService.ts`
  - **Line ~70** `assertFixedKitDefinition`: Simplify - always require boundAssets
  - **Line ~200** `syncAssetBindings`: Remove `if (next.type !== 'fixed')` branches
  - **Line ~250** `propagateInheritedProperties`: Remove `if (next.type !== 'fixed')` check
  - **Remove**: Any pool fulfillment or flexible allocation logic
  - **Test**: `src/tests/services/KitService.test.ts`
    - Test createKit throws if boundAssets empty
    - Test createKit succeeds with boundAssets array

- [ ] **T2.1.5** Update storage provider
  - **File to modify**: `src/services/storage/churchToolsProvider/kits.ts`
  - **Line ~109**: Remove validation for flexible kit pool requirements
  - **Line ~290-400**: Remove `checkFlexibleKitAvailability` function
  - **Update** data mapping to not store poolRequirements
  - **Test**: `src/services/storage/__tests__/ChurchToolsProvider.kits.test.ts`
    - Test create kit without poolRequirements
    - Test read kit returns only fixed kit fields

- [ ] **T2.1.6** Data migration for existing flexible kits
  - **File to create**: `src/services/migrations/flexibleKitMigration.ts`
  - **Function**: `migrateFlexibleKits(): Promise<{converted: number, skipped: number}>`
    - Query all kits where type='flexible'
    - For each: log warning, set type='fixed', clear poolRequirements
    - OR: Delete flexible kits and log admin notification
  - **Test**: `src/tests/services/migrations/flexibleKitMigration.test.ts`
    - Test flexible kit converted to fixed
    - Test poolRequirements cleared
    - Test fixed kits unchanged

- [ ] **T2.1.7** Remove flexible kit i18n keys
  - **File to modify**: `src/i18n/locales/en/kits.json`
  - **Remove**: `"typeFlexible"`, `"flexible"` object, flexible descriptions
  - **File to modify**: `src/i18n/locales/de/kits.json` (if exists)
  - **Test**: `npm run build` - no missing translation warnings

### Phase 2.2: Fix Kit View in Asset List

- [ ] **T2.2.1** Update `AssetList` kit row click handler
  - **File to modify**: `src/components/assets/EnhancedAssetList.tsx` (or AssetList.tsx)
  - **Find**: Row click handler / `onRowClick` or similar
  - **Change**: For kit assets (`asset.isKit === true`), navigate to `/assets/{kitAssetId}` (not `/kits/{kitId}`)
  - **Test**: `src/tests/components/assets/EnhancedAssetList.test.tsx`
    - Test clicking kit asset row calls `navigate('/assets/kit-asset-123')`
    - Test clicking regular asset row calls `navigate('/assets/asset-123')`

- [ ] **T2.2.2** Enhance `AssetDetail` for kit assets
  - **File to modify**: `src/pages/AssetDetailPage.tsx`
  - **Add condition**: `if (asset.isKit)` show kit-specific sections
  - **Add section 1**: "Kit Contents" showing bound assets table (reuse from KitDetailView)
  - **Add section 2**: "Kit Status" badge (complete/incomplete)
  - **Add section 3**: "Inheritance Settings" showing which properties propagate
  - **Import**: `KitInformationSection` from `src/components/assets/KitInformationSection.tsx`
  - **Test**: `src/tests/pages/AssetDetailPage.test.tsx`
    - Test kit asset shows KitInformationSection
    - Test non-kit asset does NOT show KitInformationSection

- [ ] **T2.2.3** Add "Edit Kit" action to kit asset detail
  - **File to modify**: `src/pages/AssetDetailPage.tsx`
  - **Add button**: "Edit Kit Configuration" next to asset edit button
  - **On click**: Open modal with `KitForm` in edit mode, passing kit data
  - **Fetch kit**: Use `useKit(asset.id)` or derive kit from asset.kit* fields
  - **Test**: `src/tests/pages/AssetDetailPage.test.tsx`
    - Test "Edit Kit" button visible for kit assets
    - Test clicking opens KitForm modal with kit data

- [ ] **T2.2.4** Refactor `KitDetailView` for embedded use
  - **File to modify**: `src/components/kits/KitDetailView.tsx`
  - **Extract**: Move bound assets table to `BoundAssetsTable` component
  - **Extract**: Move inheritance display to `InheritanceSettings` component
  - **Make composable**: Export sub-components for use in AssetDetailPage
  - **Test**: `src/tests/components/kits/KitDetailView.test.tsx`
    - Test BoundAssetsTable renders asset list
    - Test InheritanceSettings shows checkboxes

- [ ] **T2.2.5** Remove or redirect standalone kit routes
  - **File to modify**: `src/router/AppRouter.tsx`
  - **Option A**: Remove `/kits/:id` route, let KitsPage handle as list only
  - **Option B**: Redirect `/kits/:id` to `/assets/:kitAssetId` 
  - **Find kit's asset ID**: Query asset where `isKit=true AND kitId=:id`
  - **Test**: `src/tests/router/kitRoutes.test.tsx`
    - Test `/kits/123` redirects to `/assets/{corresponding-asset-id}`

---

## Issue 3: Unified Asset Selection with Scanner Support

**Problem**: Separate barcode input fields in forms. Want unified modal with search + scanner.

**Goal**: Create `AssetSelectionModal` component for all asset selection use cases.

### Phase 3.1: Design & Core Component

- [ ] **T3.1.1** Design `AssetSelectionModal` interface
  - **File to create**: `src/components/common/AssetSelectionModal.tsx`
  - **Props interface**:
    ```typescript
    interface AssetSelectionModalProps {
      opened: boolean;
      onClose: () => void;
      onConfirm: (assets: Asset[]) => void;
      selectedAssets?: Asset[];
      mode: 'single' | 'multi';
      filter?: AssetFilters; // e.g., { status: ['available'] }
      excludeAssetIds?: string[]; // Assets to hide from selection
    }
    ```
  - **Test**: `src/tests/components/common/AssetSelectionModal.test.tsx`
    - Test component accepts all props without TypeScript errors

- [ ] **T3.1.2** Create `AssetSelectionModal` component shell
  - **File**: `src/components/common/AssetSelectionModal.tsx`
  - **Structure**:
    - `<Modal>` wrapper with `size="lg"`
    - `<TextInput>` for search with `IconSearch` left section
    - `<ScrollArea>` for results list (max height 400px)
    - `<Group>` footer with selected count and Confirm/Cancel buttons
  - **State**: `searchQuery: string`, `highlightedIndex: number`
  - **Test**: Test modal renders with search input and buttons

- [ ] **T3.1.3** Implement search functionality
  - **File**: `src/components/common/AssetSelectionModal.tsx`
  - **Hook**: Use `useAssets({ search: debouncedQuery, ...filter })`
  - **Debounce**: 300ms delay on search input using `useDebouncedValue` from Mantine
  - **Filter logic**: Match `asset.name`, `asset.assetNumber`, `asset.description`, `asset.barcode`
  - **Exclude**: Filter out assets in `excludeAssetIds` prop
  - **Test**: 
    - Test typing "CAM" filters to assets containing "CAM"
    - Test excluded assets don't appear
    - Test empty query shows all (filtered) assets

- [ ] **T3.1.4** Implement keyboard navigation
  - **File**: `src/components/common/AssetSelectionModal.tsx`
  - **Add ref**: `searchInputRef` to TextInput
  - **onKeyDown handler**:
    - `ArrowDown`: `setHighlightedIndex(i => Math.min(i + 1, results.length - 1))`
    - `ArrowUp`: `setHighlightedIndex(i => Math.max(i - 1, 0))`
    - `Enter` on result: Toggle selection of highlighted asset
    - `Enter` on empty search with selections: Call onConfirm
    - `Escape`: Call onClose
  - **Visual**: Highlighted row has `bg="blue.0"` (light highlight)
  - **Test**:
    - Test ArrowDown moves highlight to next row
    - Test Enter toggles selection
    - Test Escape closes modal

- [ ] **T3.1.5** Implement scanner input capture
  - **File**: `src/components/common/AssetSelectionModal.tsx`
  - **Detection logic**: Track keystroke timing - if >5 chars typed within 50ms, treat as scan
  - **Hook**: Create `useScannerDetection(onScan: (value: string) => void)`
  - **onScan handler**: 
    1. Find asset by barcode: `assets.find(a => a.barcode === scannedValue)`
    2. If found and not selected: Add to selection, show success notification
    3. If found and already selected: Show info notification "Already selected"
    4. If not found: Show error notification "Asset not found"
  - **Audio feedback**: Play `new Audio('/sounds/beep.mp3')` on successful scan (optional)
  - **Test**: `src/tests/hooks/useScannerDetection.test.ts`
    - Test rapid input (simulated scan) triggers onScan
    - Test slow typing does NOT trigger onScan

- [ ] **T3.1.6** Implement selected assets display
  - **File**: `src/components/common/AssetSelectionModal.tsx`
  - **Add section**: Above results, show "Selected ({count})" with horizontal scroll of chips
  - **Chip component**: `<Badge>` with asset number, X button to remove
  - **Each chip**: `<Group><Text>{asset.assetNumber}</Text><CloseButton onClick={() => removeFromSelection(asset.id)} /></Group>`
  - **Style**: Wrap in `<ScrollArea type="auto" offsetScrollbars>` for horizontal scroll
  - **Test**:
    - Test selected assets show as chips
    - Test clicking X removes from selection
    - Test chips scroll horizontally when many selected

- [ ] **T3.1.7** Implement result row component
  - **File to create**: `src/components/common/AssetSelectionRow.tsx`
  - **Props**: `asset: Asset`, `selected: boolean`, `highlighted: boolean`, `onToggle: () => void`
  - **Layout**: `<Group><Checkbox checked={selected} /><Stack gap={0}><Text>{asset.name}</Text><Text size="xs" c="dimmed">{asset.assetNumber}</Text></Stack><Badge>{asset.status}</Badge></Group>`
  - **Click handler**: Call `onToggle`
  - **Test**: Test row shows name, number, status badge, checkbox state

- [ ] **T3.1.8** Add confirmation flow
  - **File**: `src/components/common/AssetSelectionModal.tsx`
  - **Confirm button**: `<Button onClick={() => onConfirm(selectedAssets)} disabled={selectedAssets.length === 0}>Confirm ({selectedAssets.length})</Button>`
  - **onConfirm**: Pass array of selected Asset objects, not just IDs
  - **After confirm**: Parent should clear selection (controlled component pattern)
  - **Test**:
    - Test confirm returns selected assets array
    - Test confirm button disabled when none selected
    - Test onClose does NOT pass any data

### Phase 3.2: Integration

- [ ] **T3.2.1** Integrate into `FixedKitBuilder`
  - **File to modify**: `src/components/kits/FixedKitBuilder.tsx`
  - **Remove**: Inline asset Select component
  - **Add**: `<Button onClick={() => setSelectionModalOpen(true)}>Add Assets</Button>`
  - **Add**: `<AssetSelectionModal mode="multi" excludeAssetIds={alreadyBoundAssetIds} onConfirm={handleAddAssets} />`
  - **handleAddAssets**: Append to boundAssets array, call onChange
  - **Test**: `src/tests/components/kits/FixedKitBuilder.test.tsx`
    - Test clicking "Add Assets" opens modal
    - Test confirming selection adds assets to list

- [ ] **T3.2.2** Integrate into `WorkOrderForm`
  - **File to modify**: `src/components/maintenance/WorkOrderForm.tsx`
  - **Remove**: Line ~170 MultiSelect for assets
  - **Remove**: Line ~180 TextInput for barcode scanning
  - **Add**: `<Button onClick={() => setAssetModalOpen(true)}>Select Assets ({lineItems.length})</Button>`
  - **Add**: `<AssetSelectionModal mode="multi" onConfirm={handleAssetsSelected} selectedAssets={lineItemAssets} />`
  - **handleAssetsSelected**: Convert assets to WorkOrderLineItem objects
  - **Test**: `src/tests/components/maintenance/WorkOrderForm.test.tsx`
    - Test selecting assets updates lineItems
    - Test scanning asset in modal adds to lineItems

- [ ] **T3.2.3** Integrate into `BookingForm` (if exists)
  - **File to find**: `src/components/bookings/BookingForm.tsx`
  - **Change**: Replace asset Select with "Select Asset" button
  - **Add**: `<AssetSelectionModal mode="single" filter={{ bookable: true }} onConfirm={handleAssetSelected} />`
  - **handleAssetSelected**: `setSelectedAsset(assets[0])`
  - **Test**: Test single mode returns only one asset

- [ ] **T3.2.4** Remove duplicate scanner inputs
  - **Search**: `grep -r "InlineScanInput\|scanInput\|handleAssetScan" src/components/`
  - **Remove**: Any inline barcode input fields in forms that now use AssetSelectionModal
  - **Keep**: Scanner inputs in non-modal contexts (e.g., StockTake page)
  - **Test**: `npm run build` passes, no console warnings about duplicate handlers

### Phase 3.3: Polish

- [ ] **T3.3.1** Add empty state
  - **File**: `src/components/common/AssetSelectionModal.tsx`
  - **Condition**: When `filteredAssets.length === 0`
  - **Display**: `<Center py="xl"><Stack align="center"><IconPackageOff size={48} /><Text>No assets found</Text><Text size="sm" c="dimmed">Try a different search or scan a barcode</Text></Stack></Center>`
  - **Test**: Test empty state shows when no matches

- [ ] **T3.3.2** Add loading state
  - **File**: `src/components/common/AssetSelectionModal.tsx`
  - **Condition**: When `isLoading` from useAssets hook
  - **Display**: `<Stack>{Array(5).fill(0).map((_, i) => <Skeleton key={i} height={50} />)}</Stack>`
  - **Test**: Test skeleton shows during load

- [ ] **T3.3.3** Add accessibility
  - **File**: `src/components/common/AssetSelectionModal.tsx`
  - **Add**: `aria-label="Asset selection modal"` to Modal
  - **Add**: `role="listbox"` to results container
  - **Add**: `role="option"` and `aria-selected={selected}` to each row
  - **Add**: `aria-activedescendant={highlightedAssetId}` to results container
  - **Focus**: Auto-focus search input on modal open
  - **Test**: Run `npm run test:a11y` (if configured) or manual screen reader test

---

## Issue 4: Work Order Fixes

**Problem**: 
- Manual work order creation doesn't work
- Work orders not visible in UI
- Rule test button doesn't work
- Asset detail doesn't show linked work orders

### Phase 4.1: Fix Manual Work Order Creation

- [x] **T4.1.1** Debug manual work order creation flow
  - **File to check**: `src/pages/WorkOrders.tsx` line ~115 `createWorkOrder.mutate()`
  - **Action 1**: Add console.log before mutate: `console.log('Creating WO:', data)`
  - **Action 2**: Check browser Network tab for API call
  - **Action 3**: Check browser Console for errors
  - **Identify**: Is error in form validation, mutation, or storage provider?
  - **Test**: Create manual test: open WorkOrders page, click "Add", fill form, submit, check console

- [x] **T4.1.2** Fix `WorkOrderForm` submission
  - **File to check**: `src/components/maintenance/WorkOrderForm.tsx`
  - **Line ~90 validate**: Ensure all required fields have proper validation
  - **Line ~95 handleSubmit**: Log `values` to verify data structure matches expected type
  - **Common issues**:
    - `workOrderNumber` should be empty string (generated by service)
    - `history` should be empty array `[]`
    - `createdBy` should be empty (set by service)
    - `lineItems` must have at least one item (validation at line ~85)
  - **Fix**: Ensure form values match `WorkOrderCreate` type (not full `WorkOrder`)
  - **Test**: `src/tests/components/maintenance/WorkOrderForm.test.tsx`
    - Test form.onSubmit receives correctly shaped data
    - Test validation errors show when lineItems empty

- [x] **T4.1.3** Fix `useCreateWorkOrder` mutation
  - **File to check**: `src/hooks/useMaintenance.ts` line ~738
  - **Verify**: `mutationFn` calls `service.createWorkOrder(data)`
  - **Verify**: `onSuccess` invalidates correct query keys: `['workOrders']`
  - **Add error handling**: Wrap in try/catch, log error details
  - **Test**: `src/tests/hooks/useMaintenanceUndo.test.tsx`
    - Test mutation calls service.createWorkOrder
    - Test mutation invalidates workOrders query on success

- [x] **T4.1.4** Fix `MaintenanceService.createWorkOrder`
  - **File to check**: `src/services/MaintenanceService.ts` line ~366
  - **Line ~370**: Verify `workOrderNumber` generation logic works
  - **Line ~380**: Check `lineItems` are properly formatted
  - **Line ~386**: Verify `storageProvider.createWorkOrder(workOrder)` is called
  - **Add logging**: `console.log('Service creating WO:', workOrder)`
  - **Fix Applied**: Service now generates workOrderNumber when empty, gets current user for createdBy when empty
  - **Test**: `tests/unit/maintenance/MaintenanceService.test.ts`
    - Test createWorkOrder generates workOrderNumber
    - Test createWorkOrder sets createdBy from current user
    - Test createWorkOrder creates initial history entry

- [x] **T4.1.5** Fix storage provider work order creation
  - **File created**: `src/services/storage/churchToolsProvider/maintenance.ts` - Added WorkOrder CRUD functions
  - **File modified**: `src/services/storage/churchToolsProvider/maintenance.provider.ts` - Added prototype bindings
  - **Implementation**: Added getWorkOrdersCategory(), mapToWorkOrder(), getWorkOrders(), getWorkOrder(), createWorkOrder(), updateWorkOrder(), deleteWorkOrder()
  - **Test**: `src/services/storage/__tests__/ChurchToolsProvider.maintenance.test.ts`
    - 5 tests added: creates and retrieves work order, retrieves all, updates, deletes, returns null for non-existent

### Phase 4.2: Fix Work Order Visibility

- [x] **T4.2.1** Debug `useWorkOrders` hook
  - **File checked**: `src/hooks/useMaintenance.ts` - Hook was already correct
  - **Issue was**: Storage provider was missing WorkOrder CRUD methods (fixed in T4.1.5)
  - **Test created**: `src/tests/hooks/useWorkOrders.test.tsx`
    - 5 tests: returns array of WorkOrder objects, handles empty array, returns correct type fields, returns all state types, each work order has required lineItems

- [x] **T4.2.2** Fix `WorkOrders` page display
  - **File checked**: `src/pages/WorkOrders.tsx` - Page was already correct
  - **Tests added**: `src/tests/pages/WorkOrders.test.tsx`
    - 4 visibility tests: displays work orders in table when data exists, shows state badges, shows type information, filter "all" shows all work orders

- [x] **T4.2.3** Fix work order detail view
  - **Tests verified**: `src/tests/components/maintenance/AssetWorkOrdersList.test.tsx`
    - 6 tests already passing for asset detail work order display

### Phase 4.3: Add Work Orders to Asset Detail

- [x] **T4.3.1** Create `useAssetWorkOrders` hook
  - **File created**: `src/hooks/useAssetWorkOrders.ts`
  - **Implementation**: Hook filters workOrders where lineItems contain assetId
  - **Test**: `src/tests/hooks/useAssetWorkOrders.test.tsx` - 3 tests passing

- [x] **T4.3.2** Add work orders section to `AssetDetail`
  - **File created**: `src/components/maintenance/AssetWorkOrdersList.tsx`
  - **File modified**: `src/components/assets/AssetDetail.tsx` - Added Work Orders Card to maintenance-damage tab
  - **i18n**: Added `noWorkOrdersForAsset` key to `src/i18n/locales/en/maintenance.json`
  - **Test**: `src/tests/components/maintenance/AssetWorkOrdersList.test.tsx` - 6 tests passing

- [x] **T4.3.3** Show upcoming/overdue indicators
  - **File created**: `src/hooks/useAssetMaintenanceStatus.ts` - Hook providing hasOverdue, overdueCount, nextScheduled
  - **File modified**: `src/components/maintenance/AssetWorkOrdersList.tsx` - Added overdue badge with red color and alert icon
  - **i18n**: Added `overdue` key to workOrders section in maintenance.json
  - **Test**: `src/tests/hooks/useAssetMaintenanceStatus.test.tsx` - 9 tests passing
  - **Test**: Overdue badge test added to AssetWorkOrdersList.test.tsx

### Phase 4.4: Fix Rule Test Button

- [x] **T4.4.1** Debug test button handler
  - **Verified**: `handleOpenTestModal` in `MaintenanceRuleForm.tsx` correctly validates form and opens modal
  - **Status**: Already working - validates form, builds rule payload, sets isTestModalOpen(true)
  - **Test**: Existing button handler works correctly

- [x] **T4.4.2** Fix `MaintenanceRuleTestModal`
  - **Verified**: Component receives rule prop and passes to previewRuleSchedule
  - **Status**: Already working - 2 existing tests pass
  - **Test**: `src/tests/components/maintenance/MaintenanceRuleTestModal.test.tsx` - 2 tests passing

- [x] **T4.4.3** Fix `previewRuleSchedule` function
  - **Verified**: Function handles all interval types correctly
  - **Added tests**: 6 additional edge case tests for missing dates, uses interval, etc.
  - **Test**: `src/tests/services/maintenanceScheduler.test.ts` - 20 tests passing

---

## Issue 5: Maintenance Rules - Days Interval

**Problem**: Only `months` and `uses` intervals supported. Need `days` option.

**Goal**: Add `days` as interval type option.

**Status**: ✅ COMPLETED

### Phase 5.1: Schema & Type Updates

- [x] **T5.1.1** Update `MaintenanceIntervalType`
  - Add `'days'` to type union
  - Update in `src/types/maintenance.ts`
  - **Test**: Type compiles (src/tests/services/maintenanceScheduler.test.ts)

- [x] **T5.1.2** Update maintenance rule schema
  - Add `'days'` to interval type enum
  - Update Zod schema in `src/schemas/maintenance.ts`
  - **Test**: Schema accepts 'days'

### Phase 5.2: Scheduler Logic

- [x] **T5.2.1** Update `calculateNextDueDate`
  - Handle `'days'` interval type
  - Add days to anchor date
  - **Test**: Days calculation correct (src/tests/services/maintenanceScheduler.test.ts)

- [x] **T5.2.2** Update `previewRuleSchedule`
  - Include days in preview
  - **Test**: Preview works for days (src/tests/services/maintenanceScheduler.test.ts)

- [x] **T5.2.3** Update `computeScheduleAfterCompletion`
  - Handle days interval for rescheduling
  - **Test**: Reschedule works for days

### Phase 5.3: UI Updates

- [x] **T5.3.1** Update `MaintenanceRuleForm` interval options
  - Add "Days" option to select
  - Update translations
  - **Test**: Days option appears in form

- [x] **T5.3.2** Update interval display in rule list
  - Show "X days" format
  - **Test**: Days display correctly

- [x] **T5.3.3** Add i18n keys for days
  - Add `maintenance:intervalTypes.days`
  - Update English translations
  - **Test**: Translations work

---

## Issue 6: Work Order Pre-Generation from Rules

**Problem**: Work orders should be created in advance based on rules, up to 5 years (60 months).

**Goal**: Generate future work orders automatically, update when rules change.

### Phase 6.1: Generation Logic

- [x] **T6.1.1** Define generation horizon constant ✅
  - **File to modify**: `src/constants/maintenance.ts` (create if not exists)
  - **Add**: `export const MAX_WORK_ORDER_HORIZON_MONTHS = 60; // 5 years`
  - **Add**: `export const MAX_WORK_ORDER_HORIZON_DAYS = 60 * 30; // ~1800 days`
  - **Test**: Import constant in test file, verify value is 60

- [x] **T6.1.2** Create `generateFutureWorkOrders` function ✅
  - **File to create**: `src/services/workOrderGenerator.ts`
  - **Function signature**:
    ```typescript
    export function generateFutureWorkOrders(
      rule: MaintenanceRule,
      horizonMonths: number = MAX_WORK_ORDER_HORIZON_MONTHS,
      existingWorkOrders: WorkOrder[] = []
    ): WorkOrderCreate[]
    ```
  - **Logic**:
    1. Get anchor date from `rule.nextDueDate ?? rule.startDate`
    2. Calculate end date: `addMonths(new Date(), horizonMonths)`
    3. Loop using `calculateNextDueDate` until date > end date
    4. For each date, check if WorkOrder already exists for that date (skip if so)
    5. Create WorkOrderCreate with `state: 'scheduled'`, `scheduledStart: dueDate`
  - **Test**: `src/tests/services/workOrderGenerator.test.ts`
    - Test monthly rule generates 60 work orders for 5 year horizon
    - Test daily rule generates appropriate number (consider capping at ~365/year)
    - Test existing work orders are skipped

- [x] **T6.1.3** Integrate with rule creation ✅
  - **File to modify**: `src/services/MaintenanceService.ts`
  - **Find**: `createMaintenanceRule` method
  - **After rule created**: Call `generateFutureWorkOrders(rule)`
  - **Save**: Loop through generated work orders, call `storageProvider.createWorkOrder` for each
  - **Batch**: Consider batching creates (max 10-20 at a time) to avoid timeout
  - **Test**: `src/tests/services/MaintenanceService.test.ts`
    - Test creating rule also creates scheduled work orders
    - Test scheduled work orders have correct ruleId

- [x] **T6.1.4** Integrate with rule update ✅
  - **File to modify**: `src/services/MaintenanceService.ts`
  - **Find**: `updateMaintenanceRule` method
  - **Detect change**: Compare old vs new `intervalType`, `intervalValue`, `startDate`
  - **If changed**:
    1. Delete existing scheduled work orders for this rule: `storageProvider.deleteWorkOrders({ ruleId, state: 'scheduled' })`
    2. Regenerate with new schedule: `generateFutureWorkOrders(updatedRule)`
    3. Save new work orders
  - **Test**: `src/tests/services/MaintenanceService.test.ts`
    - Test updating rule interval regenerates work orders
    - Test updating rule name does NOT regenerate

- [x] **T6.1.5** Handle rule deletion ✅
  - **File to modify**: `src/services/MaintenanceService.ts`
  - **Find**: `deleteMaintenanceRule` method
  - **Before delete**: Query scheduled work orders: `getWorkOrders({ ruleId, state: 'scheduled' })`
  - **If scheduled exist**: 
    - Option A: Show confirmation: "This will delete X scheduled work orders. Continue?"
    - Option B: Delete automatically
  - **Current implementation**: Check if there's a confirm dialog, add one if not
  - **Test**: `src/tests/services/MaintenanceService.test.ts`
    - Test deleting rule deletes associated scheduled work orders

### Phase 6.2: Status Management

- [x] **T6.2.1** Add 'scheduled' status to work orders ✅
  - **File to modify**: `src/types/maintenance.ts`
  - **Update**: `InternalWorkOrderState` type union, add `| 'scheduled'`
  - **Update**: `ExternalWorkOrderState` type union, add `| 'scheduled'`
  - **File to modify**: `src/services/machines/WorkOrderMachineAdapter.ts` (or state machine config)
  - **Add state**: `scheduled` with transitions to `backlog`
  - **Test**: `src/tests/services/WorkOrderStateMachine.test.ts`
    - Test 'scheduled' is valid initial state
    - Test transition from scheduled → backlog

- [x] **T6.2.2** Distinguish scheduled vs active work orders ✅
  - **Definition**:
    - Scheduled: `state === 'scheduled'` - future, not yet actionable
    - Active: `state !== 'scheduled' && state !== 'done' && state !== 'obsolete'`
  - **File to create**: `src/utils/workOrderStatus.ts`
  - **Functions**:
    ```typescript
    export const isScheduled = (wo: WorkOrder) => wo.state === 'scheduled';
    export const isActive = (wo: WorkOrder) => !['scheduled', 'done', 'obsolete', 'aborted'].includes(wo.state);
    export const isWithinLeadTime = (wo: WorkOrder) => {
      if (!wo.scheduledStart) return false;
      const leadTimeStart = subDays(new Date(wo.scheduledStart), wo.leadTimeDays);
      return new Date() >= leadTimeStart;
    };
    ```
  - **Test**: `src/tests/utils/workOrderStatus.test.ts`
    - Test isScheduled returns true for scheduled
    - Test isWithinLeadTime calculates correctly

- [x] **T6.2.3** Auto-activate scheduled work orders ✅
  - **File to modify**: `src/services/MaintenanceService.ts`
  - **Create method**: `processScheduledWorkOrders(): Promise<void>`
  - **Logic**:
    1. Query `getWorkOrders({ state: 'scheduled' })`
    2. For each, check `isWithinLeadTime(wo)`
    3. If within lead time, update state to 'backlog'
  - **Trigger**: Call from `checkAndCreateDueWorkOrders` (existing cron-like function)
  - **Or**: Create new hook `useScheduledWorkOrderProcessor` that runs on app load
  - **Test**: `src/tests/services/MaintenanceService.test.ts`
    - Test scheduled work order moves to backlog when within lead time
    - Test scheduled work order stays scheduled when outside lead time

### Phase 6.3: UI Updates

- [x] **T6.3.1** Update work order list to show scheduled ✅
  - **File to modify**: `src/pages/WorkOrders.tsx`
  - **Add filter option**: Line ~280 filter Select, add `{ label: 'Scheduled', value: 'scheduled' }`
  - **Style scheduled rows**: Different background color or opacity for scheduled state
  - **Add column**: "Scheduled For" showing `scheduledStart` date prominently
  - **Test**: `src/tests/pages/WorkOrders.test.tsx`
    - Test scheduled filter shows only scheduled work orders
    - Test scheduled date column displays correctly

- [x] **T6.3.2** Add calendar view for scheduled work orders ✅
  - **File to create**: `src/components/maintenance/WorkOrderCalendar.tsx`
  - **Library**: Use `@mantine/dates` Calendar or a calendar library
  - **Display**: Dots/markers on dates with scheduled work orders
  - **Click date**: Show popover with work orders for that date
  - **Group by month**: List view alternative showing work orders grouped by month
  - **Integrate**: Add "Calendar" tab to WorkOrders page or Maintenance Dashboard
  - **Test**: `src/tests/components/maintenance/WorkOrderCalendar.test.tsx`
    - Test dates with work orders show indicators
    - Test clicking date shows work order details

- [x] **T6.3.3** Show regeneration confirmation ✅
  - **File to create**: `src/components/maintenance/RegenerateWorkOrdersModal.tsx`
  - **Props**: `rule: MaintenanceRule`, `affectedCount: number`, `onConfirm`, `onCancel`
  - **Content**: "Changing this rule will regenerate {count} scheduled work orders. This will delete existing scheduled work orders and create new ones based on the updated schedule."
  - **Actions**: "Cancel" | "Regenerate"
  - **Integrate**: Show before rule update when schedule changes detected
  - **Test**: `src/tests/components/maintenance/RegenerateWorkOrdersModal.test.tsx`
    - Test modal shows affected count
    - Test confirm calls regeneration

---

## Issue 7: Asset Type Icon Display Fix

**Problem**: Asset type select shows `mdi:office-building-cog-outline Gebäudetechnik` instead of icon + name.

**Goal**: Display actual icon, not icon text.

**Status**: ✅ COMPLETED

### Phase 7.1: Fix Asset Form

- [x] **T7.1.1** Update `AssetForm` asset type select
  - Use `IconDisplay` component in select option
  - Remove text concatenation of icon
  - **Test**: Icon renders in dropdown

- [x] **T7.1.2** Create custom `renderOption` for Select
  - Render icon + text side by side
  - Handle missing icons gracefully
  - **Test**: Custom render works

- [x] **T7.1.3** Update selected value display
  - Show icon in selected value area
  - **Test**: Selected shows icon

### Phase 7.2: Audit Other Locations

- [x] **T7.2.1** Search for similar icon text issues
  - Grep for `cat.icon` or `type.icon` string concatenation
  - Fix any found instances
  - **Test**: No icon text in UI

- [x] **T7.2.2** Create reusable `AssetTypeOption` component
  - Standardize icon + name display
  - Use in all asset type selects
  - **Test**: Component works everywhere (src/tests/components/categories/AssetTypeSelectOption.test.tsx)

---

## Issue 8: Remove Global Undo History, Add Bulk Actions

**Problem**: 
- Global undo history in top right not needed
- Want bulk actions in asset list with undo for those only

**Goal**: Remove global undo, implement bulk actions with undo.

### Phase 8.1: Remove Global Undo

- [ ] **T8.1.1** Remove `UndoHistory` from layout/header
  - **File to search**: `grep -r "UndoHistory" src/components/`
  - **Likely location**: `src/components/layout/Navigation.tsx` or `src/components/layout/Header.tsx`
  - **Action**: Remove `<UndoHistory />` component usage
  - **Action**: Remove import statement
  - **Keep file**: `src/components/UndoHistory.tsx` for reference (delete in T8.1.2)
  - **Test**: Visual check - no undo panel in header area

- [ ] **T8.1.2** Clean up unused undo UI components
  - **Delete**: `src/components/UndoHistory.tsx` (the component removed from header)
  - **Keep**: `src/services/undo.ts` - core undo service for bulk actions
  - **Keep**: `src/hooks/useUndo.ts` - hook for programmatic undo
  - **Keep**: `src/state/undoStore.ts` - state management for undo stack
  - **Remove**: Route for `/undo-history` in `src/router/AppRouter.tsx` (line ~320 area)
  - **Test**: `npm run build` passes, no unused component warnings

### Phase 8.2: Implement Bulk Actions

- [ ] **T8.2.1** Add row selection to `AssetList`
  - **File to modify**: `src/components/assets/EnhancedAssetList.tsx`
  - **Add state**: `const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set())`
  - **Add column**: First column with `<Checkbox checked={selectedAssetIds.has(asset.id)} onChange={...} />`
  - **Add header checkbox**: Select all / deselect all toggle
  - **Handler**: 
    ```typescript
    const toggleSelect = (assetId: string) => {
      setSelectedAssetIds(prev => {
        const next = new Set(prev);
        if (next.has(assetId)) next.delete(assetId);
        else next.add(assetId);
        return next;
      });
    };
    ```
  - **Test**: `src/tests/components/assets/EnhancedAssetList.test.tsx`
    - Test clicking checkbox adds/removes from selection
    - Test header checkbox selects all visible

- [ ] **T8.2.2** Create `BulkActionBar` component
  - **File to create**: `src/components/assets/BulkActionBar.tsx`
  - **Props**: `selectedCount: number`, `onClearSelection`, `actions: BulkAction[]`
  - **Layout**: Sticky bar at bottom of asset list when `selectedCount > 0`
  - **Content**: `"X selected" | [Action buttons] | [Clear selection button]`
  - **Style**: `position: "sticky"`, `bottom: 0`, `bg: "blue.6"`, `c: "white"`
  - **Test**: `src/tests/components/assets/BulkActionBar.test.tsx`
    - Test shows selected count
    - Test renders action buttons
    - Test clear button calls onClearSelection

- [ ] **T8.2.3** Implement bulk status change
  - **File to create**: `src/components/assets/bulk-actions/BulkStatusChange.tsx`
  - **UI**: Dropdown Select with status options from `ASSET_STATUS_OPTIONS`
  - **Confirmation**: Modal: "Change status of {count} assets to {status}?"
  - **Handler**:
    ```typescript
    const handleBulkStatusChange = async (status: AssetStatus) => {
      const assets = await Promise.all(
        selectedAssetIds.map(id => storageProvider.getAsset(id))
      );
      const undoData = assets.map(a => ({ id: a.id, prevStatus: a.status }));
      await Promise.all(
        selectedAssetIds.map(id => updateAsset({ id, status }))
      );
      showUndoToast('Status changed', () => bulkUndoStatusChange(undoData));
    };
    ```
  - **Test**: `src/tests/components/assets/bulk-actions/BulkStatusChange.test.tsx`
    - Test selecting status and confirming updates all selected assets
    - Test cancel does not update

- [ ] **T8.2.4** Implement bulk location change
  - **File to create**: `src/components/assets/bulk-actions/BulkLocationChange.tsx`
  - **UI**: `MasterDataSelectInput` for location (same as in AssetForm)
  - **Confirmation**: "Move {count} assets to {location}?"
  - **Handler**: Similar to status change, save previous locations for undo
  - **Test**: Test location updates for all selected assets

- [ ] **T8.2.5** Implement bulk tag add/remove
  - **File to create**: `src/components/assets/bulk-actions/BulkTagChange.tsx`
  - **UI**: Two buttons: "Add Tags" | "Remove Tags"
  - **Add Tags Modal**: Multi-select tags, append to existing
  - **Remove Tags Modal**: Multi-select tags to remove
  - **Handler**: 
    - Add: `asset.tagIds = [...new Set([...asset.tagIds, ...selectedTags])]`
    - Remove: `asset.tagIds = asset.tagIds.filter(t => !selectedTags.includes(t))`
  - **Test**: Test adding tags appends, removing tags filters

- [ ] **T8.2.6** Implement bulk custom field update
  - **File to create**: `src/components/assets/bulk-actions/BulkCustomFieldChange.tsx`
  - **UI Step 1**: Select which custom field to update (from common fields across selected assets)
  - **UI Step 2**: Enter value for that field
  - **Logic**: Only show fields that exist on ALL selected assets (intersection)
  - **Handler**: Update `customFieldValues[fieldId]` for all selected
  - **Test**: Test custom field updates for all selected assets

- [ ] **T8.2.7** Implement bulk delete
  - **File to create**: `src/components/assets/bulk-actions/BulkDelete.tsx`
  - **UI**: Button with danger color
  - **Confirmation**: "Are you sure you want to delete {count} assets? This action can be undone."
  - **Handler**: Call `deleteAsset` for each, soft delete (set status to 'deleted')
  - **Undo**: Restore previous status from before delete
  - **Test**: Test deleting sets status to 'deleted' for all

### Phase 8.3: Bulk Action Undo

- [ ] **T8.3.1** Create `BulkActionUndo` system
  - **File to create**: `src/services/bulkUndo.ts`
  - **Interface**:
    ```typescript
    interface BulkUndoAction {
      id: string;
      type: 'status' | 'location' | 'tags' | 'customField' | 'delete';
      affectedAssets: Array<{ assetId: string; previousValue: unknown }>;
      timestamp: Date;
    }
    ```
  - **Store**: Keep last 10 bulk actions in memory (not persisted)
  - **Register**: `registerBulkUndo(action: BulkUndoAction)`
  - **Execute**: `executeBulkUndo(actionId: string)`
  - **Test**: `src/tests/services/bulkUndo.test.ts`
    - Test registering action stores it
    - Test executing undo restores previous values

- [ ] **T8.3.2** Show undo toast after bulk action
  - **File to modify**: Each bulk action component
  - **Use Mantine notifications**:
    ```typescript
    notifications.show({
      id: `bulk-undo-${action.id}`,
      title: 'Updated {count} assets',
      message: 'Click to undo',
      autoClose: 10000, // 10 seconds
      withCloseButton: true,
      onClick: () => executeBulkUndo(action.id),
    });
    ```
  - **Style**: Add undo icon, make clickable
  - **Test**: Test toast appears after bulk action
  - **Test**: Test clicking toast within 10s triggers undo

- [ ] **T8.3.3** Implement bulk undo handler
  - **File to modify**: `src/services/bulkUndo.ts`
  - **executeBulkUndo logic**:
    1. Find action by ID in stored actions
    2. For each affected asset, restore `previousValue`
    3. Handle partial failures: log errors but continue
    4. Show result notification: "Restored {successCount}/{totalCount} assets"
  - **Remove from store**: After undo executed or timeout, remove action
  - **Test**: `src/tests/services/bulkUndo.test.ts`
    - Test restoring all assets to previous state
    - Test partial failure still restores successful ones
    - Test notification shows correct counts

---

## Issue 9: Settings Export - Scanner Only

**Problem**: Export exports all settings, should only export scanner configuration.

**Goal**: Default export to scanner config only.

**Status**: ✅ COMPLETED

### Phase 9.1: Update Export Logic

- [x] **T9.1.1** Update `exportSettings` to default to scanner-only
  - Change default scope from 'full' to 'scanner-only'
  - Keep full export as option
  - **Test**: Default export is scanner only (src/tests/components/settings/SettingsExportImport.test.tsx)

- [x] **T9.1.2** Update `SettingsExportImport` UI
  - Remove full export button (or make it secondary)
  - Primary button exports scanner config
  - **Test**: UI shows scanner export as primary

- [x] **T9.1.3** Update export filename
  - `inventory-scanner-settings-{date}.json`
  - **Test**: Correct filename

### Phase 9.2: Update Import

- [x] **T9.2.1** Import should detect scope
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
  - **File to create**: `scripts/extract-i18n-keys.mjs`
  - **Dependencies**: `import fs from 'fs'`, `import path from 'path'`, `import { glob } from 'glob'`
  - **Logic**:
    1. Glob all `src/**/*.{ts,tsx}` files
    2. Read each file content
    3. Regex extract: `t\(['"]([\w:.]+)['"]\)` and `t\(['"]([\w:.]+)['"],\s*\{` patterns
    4. Handle namespaced keys: split on `:` → `{namespace: 'common', key: 'actions.save'}`
    5. Output JSON: `{ "namespace:key": { files: ["src/pages/X.tsx"], line: 42 } }`
  - **Run**: `node scripts/extract-i18n-keys.mjs > extracted-keys.json`
  - **Test**: Run script, verify output contains expected keys from a known file

- [ ] **T10.1.2** Handle dynamic keys
  - **Patterns to detect**:
    - Template literals: `t(\`namespace:${variable}\`)` → flag as dynamic
    - Variable keys: `t(keyVariable)` → flag as dynamic
    - Object interpolation: `t('key', { count: x })` → extract base key
  - **Output**: Separate list of dynamic keys that can't be statically validated
  - **Log warning**: "Found {count} dynamic keys - manual verification needed"
  - **Example dynamic keys file**: `dynamic-i18n-keys.json`
  - **Test**: Script flags `t(\`status.${status}\`)` as dynamic

### Phase 10.2: Create Validation

- [ ] **T10.2.1** Create `scripts/validate-i18n.mjs`
  - **File to create**: `scripts/validate-i18n.mjs`
  - **Logic**:
    1. Load extracted keys from `extracted-keys.json` (run extraction first)
    2. Load all locale files: `src/i18n/locales/en/*.json`
    3. For each extracted key:
       - Parse namespace and key path
       - Load corresponding locale file: `src/i18n/locales/en/{namespace}.json`
       - Check if key exists using lodash `get(localeData, keyPath)`
    4. Collect missing keys: `{ key: 'common:actions.submit', usedIn: ['src/pages/X.tsx:42'] }`
    5. Collect unused keys (optional): keys in locale files not found in extracted
  - **Output**: 
    - Exit code 0 if no missing keys
    - Exit code 1 if missing keys found
    - Print missing keys to stderr
  - **Test**: Add a fake `t('test:missing.key')` call, run validation, verify it's reported

- [ ] **T10.2.2** Add npm script
  - **File to modify**: `package.json`
  - **Add scripts**:
    ```json
    "i18n:extract": "node scripts/extract-i18n-keys.mjs",
    "i18n:validate": "node scripts/validate-i18n.mjs",
    "i18n:check": "npm run i18n:extract && npm run i18n:validate"
    ```
  - **Add to CI**: In `.github/workflows/ci.yml` (or similar), add `npm run i18n:check` step
  - **Test**: Run `npm run i18n:check` locally, verify it passes

### Phase 10.3: Create Test

- [ ] **T10.3.1** Create `src/tests/i18n/missing-keys.test.ts`
  - **File to create**: `src/tests/i18n/missing-keys.test.ts`
  - **Implementation**:
    ```typescript
    import { execSync } from 'child_process';
    
    describe('i18n keys', () => {
      it('should have all translation keys defined', () => {
        // Run validation script and capture output
        const result = execSync('npm run i18n:check', { 
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe']
        });
        // If script exits non-zero, execSync throws
        expect(result).not.toContain('Missing keys');
      });
    });
    ```
  - **Alternative**: Import extraction/validation as modules and test directly
  - **Test**: Break a key intentionally, verify test fails

- [ ] **T10.3.2** Add to test suite
  - **Verify**: Test runs as part of `npm test`
  - **If separate**: Add to `vitest.config.ts` include patterns
  - **Consider**: Make it a separate test suite that runs less frequently (it's slow)
    ```json
    "test:i18n": "vitest run --testPathPattern=i18n"
    ```
  - **CI integration**: Run `npm run test:i18n` in CI pipeline
  - **Test**: `npm test` includes i18n validation

- [ ] **T10.3.3** Document i18n workflow
  - **File to create**: `docs/i18n-guide.md`
  - **Content**:
    - How to add new translation keys
    - How to run validation locally
    - How to handle dynamic keys
    - Namespace conventions
    - Common patterns and examples
  - **Link**: Add reference in main README or CONTRIBUTING.md

---

## Issue 11: Remove Settings Version History

**Problem**: Settings version history not needed.

**Goal**: Remove version history feature from settings.

**Status**: ✅ COMPLETED

### Phase 11.1: Remove UI

- [x] **T11.1.1** Remove "History" tab from `SettingsPage`
  - Remove tab definition
  - Remove panel content
  - **Test**: No history tab (src/tests/pages/SettingsPage.test.tsx)

- [x] **T11.1.2** Remove `SettingsVersionHistory` component
  - Delete component file
  - Remove imports
  - **Test**: Build passes

- [x] **T11.1.3** Remove version history from export/import
  - Keep only scanner export/import
  - Remove version-related UI
  - **Test**: Export/import still works

### Phase 11.2: Remove Backend

- [x] **T11.2.1** Remove `SettingsVersionService`
  - Delete service file
  - Remove imports
  - **Test**: Build passes

- [x] **T11.2.2** Remove `useSettingsVersions` hook
  - Delete hook file
  - Update any usages
  - **Test**: Build passes

- [x] **T11.2.3** Remove settings version store
  - Remove `settingsStore.ts`
  - Clean up state
  - **Test**: Store works

- [x] **T11.2.4** Remove settings version types
  - Types are still in settings.ts for export envelope (kept for compatibility)
  - Clean up related types
  - **Test**: Types compile

---

## Issue 12: Maintenance Feature Review

**Problem**: Ensure maintenance features work like proper facility management tool.

**Goal**: Review and fix maintenance workflow end-to-end.

### Phase 12.1: Workflow Audit

- [ ] **T12.1.1** Document expected maintenance workflow
  - **File to create**: `docs/MAINTENANCE_WORKFLOW.md`
  - **Flowchart sections**:
    1. **Rule Creation**: Admin creates rule → rule saved → future work orders generated
    2. **Work Order Lifecycle**: Scheduled → Backlog (lead time reached) → Assigned → Planned → In-Progress → Completed → Done
    3. **External Work Orders**: Backlog → Offer Requested → Offer Received → Planned → In-Progress → Completed → Done
    4. **Completion Flow**: Complete work order → Update rule nextDueDate → Generate next work order
  - **Use Mermaid syntax** for flowchart that renders in GitHub
  - **Test**: Flowchart renders correctly in GitHub preview

- [ ] **T12.1.2** Audit current implementation vs expected workflow
  - **Manual testing checklist**:
    1. [ ] Create internal maintenance rule - verify work order created
    2. [ ] Create external maintenance rule - verify work order created
    3. [ ] View work orders list - verify all states display
    4. [ ] Transition work order through all states (use UI buttons)
    5. [ ] Complete work order - verify rule nextDueDate updates
    6. [ ] Check asset detail - verify maintenance history shows
  - **Document gaps**: Create GitHub issues or add to this file for each bug found
  - **Test**: Complete full checklist, document results

### Phase 12.2: State Machine Review

- [ ] **T12.2.1** Review work order state machine
  - **File to check**: `src/services/machines/WorkOrderMachineAdapter.ts`
  - **Verify all states defined**: backlog, assigned, planned, offer-requested, offer-received, in-progress, completed, done, aborted, obsolete, (scheduled)
  - **Verify transitions**:
    - Internal: backlog → assigned → planned → in-progress → completed → done
    - External: backlog → offer-requested → offer-received → planned → in-progress → completed → done
    - Any state: → aborted | → obsolete
  - **Create diagram**: `docs/WORK_ORDER_STATE_MACHINE.md` with Mermaid stateDiagram
  - **Test**: `src/tests/services/WorkOrderStateMachine.test.ts` - verify all transitions

- [ ] **T12.2.2** Fix any state transition issues
  - **Common issues to check**:
    - Missing transition buttons in UI for valid transitions
    - Transitions allowed in code but not in UI
    - Guard conditions preventing valid transitions
  - **File to check**: `src/components/maintenance/WorkOrderStateTransition.tsx`
  - **Verify**: Each state shows correct "next" action buttons
  - **Fix**: Add missing transition buttons or fix guards
  - **Test**: Manual test each transition in UI

### Phase 12.3: Dashboard Review

- [ ] **T12.3.1** Review maintenance dashboard
  - **File to check**: `src/pages/MaintenanceDashboard.tsx`
  - **Expected features**:
    - [ ] Overdue work orders count/list (where scheduledEnd < today and not completed)
    - [ ] Upcoming work orders this week/month
    - [ ] Quick action: "Create Work Order" button
    - [ ] Quick action: "View All Rules" link
    - [ ] Summary stats: Open, In Progress, Completed this month
  - **Test each**: Navigate to dashboard, verify each feature works

- [ ] **T12.3.2** Add missing dashboard features
  - **If missing - Compliance percentage**:
    - Calculation: `(completedOnTime / totalDue) * 100` for past 30 days
    - Display: Progress ring or percentage badge
  - **If missing - Trend charts**:
    - Work orders created vs completed per week (last 8 weeks)
    - Library: `recharts` or `@mantine/charts`
  - **If missing - Overdue alert**:
    - Banner at top when overdue count > 0
    - "You have {count} overdue work orders" with link to filtered list
  - **Test**: Dashboard shows compliance and trends

### Phase 12.4: Reporting Review

- [ ] **T12.4.1** Review maintenance reports
  - **File to check**: `src/pages/ReportsPage.tsx` - maintenance section
  - **Expected reports**:
    - [ ] Work Order Completion Report: List of completed WOs with dates, time to complete
    - [ ] Asset Maintenance History: Per-asset list of all maintenance performed
    - [ ] Rule Compliance Report: Per-rule on-time vs late completion rate
  - **Check data**: Do reports pull correct data? Test with sample data

- [ ] **T12.4.2** Add missing reports
  - **Work Order Completion Report** (if missing):
    - **File to create**: `src/components/reports/WorkOrderCompletionReport.tsx`
    - **Columns**: WO #, Asset, Type, Scheduled Date, Completed Date, Days Early/Late
    - **Filters**: Date range, type (internal/external), status
    - **Export**: CSV download button
  - **Asset Maintenance History** (if missing):
    - **File to create**: `src/components/reports/AssetMaintenanceHistory.tsx`
    - **Input**: Asset selector
    - **Output**: Timeline of all maintenance for that asset
    - **Include**: Work orders, manual maintenance records
  - **Test**: Generate each report, verify data accuracy

- [ ] **T12.4.3** End-to-end integration test
  - **File to create**: `tests/e2e/maintenance-workflow.spec.ts`
  - **Test scenario**:
    1. Create maintenance rule (monthly, 7-day lead time)
    2. Verify work order created for next due date
    3. Transition work order: backlog → assigned → in-progress → completed → done
    4. Verify rule.nextDueDate advanced by 1 month
    5. Verify new work order created for new due date
    6. Check asset detail shows maintenance record
  - **Run**: `npx playwright test maintenance-workflow.spec.ts`
  - **Test**: E2E test passes

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
Issue 5:  [x] Phase 5.1 [x] Phase 5.2 [x] Phase 5.3 ✅ COMPLETED
Issue 6:  [ ] Phase 6.1 [ ] Phase 6.2 [ ] Phase 6.3
Issue 7:  [x] Phase 7.1 [x] Phase 7.2 ✅ COMPLETED
Issue 8:  [ ] Phase 8.1 [ ] Phase 8.2 [ ] Phase 8.3
Issue 9:  [x] Phase 9.1 [x] Phase 9.2 ✅ COMPLETED
Issue 10: [ ] Phase 10.1 [ ] Phase 10.2 [ ] Phase 10.3
Issue 11: [x] Phase 11.1 [x] Phase 11.2 ✅ COMPLETED
Issue 12: [ ] Phase 12.1 [ ] Phase 12.2 [ ] Phase 12.3 [ ] Phase 12.4
```

---

## Notes

- All changes should maintain backward compatibility where possible
- Database migrations should be reversible
- Feature flags can be used for gradual rollout
- User communication needed for breaking changes
