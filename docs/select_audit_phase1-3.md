# Phase 1.3.1 – Mantine Select Inventory

Goal: enumerate every Mantine `Select`/`MultiSelect` usage so we can normalize controlled value handling and null semantics in the next subtasks.

## Assets & Inventory Surfaces
- `src/components/assets/AssetForm.tsx`
- `src/components/assets/AssetList.tsx`
- `src/components/assets/BulkStatusUpdateModal.tsx`
- `src/components/assets/CustomFieldFilterInput.tsx`
- `src/components/assets/CustomFieldInput.tsx`
- `src/components/assets/ManageChildAssetsModal.tsx`
- `src/components/categories/CustomFieldDefinitionInput.tsx`
- `src/components/common/MasterDataSelectInput.tsx`
- `src/components/dataView/DataViewHeader.tsx`
- `src/components/dataView/DataViewLayout.tsx`
- `src/components/models/AssetModelForm.tsx`
- `src/components/models/ModelTemplateSelector.tsx`
- `src/components/reports/AssetUtilizationReport.tsx`
- `src/components/reports/StockTakeSummaryReport.tsx`
- `src/components/scanner/QuickScanModal.tsx`
- `src/components/stocktake/StockTakeSessionList.tsx`
- `src/pages/AssetModelList.tsx`
- `src/pages/StockTakePage.tsx`

## Maintenance & Work Orders
- `src/components/maintenance/MaintenancePlanForm.tsx`
- `src/components/maintenance/MaintenanceRecordForm.tsx`
- `src/components/maintenance/MaintenanceRecordsSection.tsx`
- `src/components/maintenance/MaintenanceRuleForm.tsx`
- `src/components/maintenance/MaintenanceScheduleForm.tsx`
- `src/components/maintenance/MaintenanceScheduleList.tsx`
- `src/components/maintenance/WorkOrderApprovalWorkflow.tsx`
- `src/components/maintenance/WorkOrderForm.tsx`
- `src/pages/MaintenancePage.tsx`
- `src/pages/WorkOrders.tsx`

## Kits, Groups, and Asset Collections
- `src/components/asset-groups/AddAssetsToGroupModal.tsx`
- `src/components/asset-groups/AssetGroupForm.tsx`
- `src/components/asset-groups/BulkUpdateMembersModal.tsx`
- `src/components/asset-groups/GroupBookingModal.tsx`
- `src/components/asset-groups/JoinAssetGroupModal.tsx`
- `src/components/asset-groups/ReassignMemberModal.tsx`
- `src/components/kits/FixedKitBuilder.tsx`
- `src/components/kits/FlexibleKitBuilder.tsx`
- `src/components/kits/KitForm.tsx`
- `src/components/kits/KitList.tsx`

## Bookings & Check-in
- `src/components/bookings/BookingCalendar.tsx`
- `src/components/bookings/BookingForm.tsx`
- `src/components/bookings/BookingList.tsx`
- `src/components/bookings/CheckInModal.tsx`
- `src/components/bookings/ConditionAssessment.tsx`
- `src/components/bookings/ConditionAssessmentWithPhotos.tsx`
- `src/components/dataView/DataViewLayout.tsx` (shared but powers booking filters too)

## Settings & Prefix Utilities
- `src/components/settings/PrefixSettingsPanel.tsx`
- `src/components/settings/ScannerModelForm.tsx`

## Shared Utilities & Tagging
- `src/components/tags/TagInput.tsx`
- `src/components/views/FilterBuilder.tsx`

## Notes
- Many of the above files contain multiple Select instances (filters + form fields). The next subtasks (1.3.2–1.3.4) will group them by shared behavior to decide where helpers like `useNormalizedSelectValue` or a `<ControlledSelect>` wrapper provide the best leverage.
- `MultiSelect` instances currently appear in `CustomFieldInput`, `CustomFieldFilterInput`, `MaintenanceRuleForm`, `MaintenancePlanForm`, `DataViewLayout`, `GroupBookingModal`, and `TagInput`. These will share the same helper conventions once defined.

## Controlled Select Pattern (Phase 1.3.2 – 1.3.4)
- Added `src/utils/selectControl.ts` with `bindSelectField`, `bindMultiSelectField`, `toSelectValue`, and `toMultiSelectValue` helpers.
- Convention: Mantine `Select` components always receive a `string | null` `value` and emit `string | null` back; downstream form state stores strings (empty string for required fields, `undefined` for optionals).
- `bindSelectField` is now the single source of truth when wiring `@mantine/form` fields to Select/MultiSelect inputs—no direct `form.getInputProps` spreading on dropdowns.
- Regression tests live in `src/utils/__tests__/selectControl.test.ts` to guard against the “selection disappears until blur” bug caused by `undefined` values.
- Updated high-impact forms (`AssetForm`, `MaintenanceRuleForm`, `MaintenanceRecordForm`, `MaintenanceScheduleForm`, `WorkOrderForm`) to the new bindings; apply the same helper when touching other Select-heavy forms.
