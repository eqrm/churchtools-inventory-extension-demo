# Inventory UX & Architecture Overhaul – Refactoring Task List

This document breaks the overhaul plan into numbered phases and concrete, trackable tasks.

---

## Phase 1 – Terminology & Select UX

**Goal:** Align terminology with "Asset Types" and stabilize Mantine Select behavior and i18n usage.

1.1 Audit navigation labels
- [x] 1.1.1 Scan navigation (`Navigation` components, sidebars, menus) for user-facing "Categories" labels. (Completed via `src/components/layout/Navigation.tsx` + `src/i18n/locales/en/navigation.json` update.)
- [x] 1.1.2 Rename user-facing labels from "Categories" to "Asset Types" while leaving internal enums, types, and APIs unchanged. (Touched dashboard CTA text, AssetCategory* UI copy, StockTake report, maintenance/i18n strings.)
- [x] 1.1.3 Verify URLs, route names, and API contracts remain backward compatible. (Routes still `/categories`; internal provider methods unchanged.)

1.2 Audit filter labels
- [x] 1.2.1 Search all filter UIs (AssetList, kits, maintenance, settings, models) for "Categories" terminology. (Reviewed AssetList filters, `AssetUtilizationReport`, `AssetModelList`, kit builder, maintenance schedule list, stock-take report, property propagation modal.)
- [x] 1.2.2 Update filter labels, placeholders, and helper texts to use "Asset Type" consistently. (All checked UIs now surface "Asset Type" strings; no remaining "Categories" copy.)
- [x] 1.2.3 Re-run i18n checks to ensure keys exist and translations are aligned. (Confirmed `en/models.json`, `en/kits.json`, `en/maintenance.json`, `en/common.json` contain the Asset Type keys referenced by the audited filters.)

1.3 Normalize Mantine Select patterns
- [x] 1.3.1 Identify all Mantine `Select`/`MultiSelect` usages across assets, kits, maintenance, settings, and models.
- [x] 1.3.2 Standardize value types to strings only (no mixed types) and document the convention.
- [x] 1.3.3 Normalize `value` vs `defaultValue` usage: prefer controlled `value` + `onChange` in all interactive forms.
- [x] 1.3.4 Ensure consistent handling of `null`/`undefined` for empty selections (single source of truth helper where useful).
- [x] 1.3.5 Add regression tests around the "selection disappears until blur" bug and confirm it is resolved.

1.4 Fix i18n "actions" key usage
- [x] 1.4.1 Locate MaintenanceCompanies and related tables using a non-leaf `actions` key.
- [x] 1.4.2 Update code to reference a leaf string key (e.g. `columns.actions` or similar) instead of an object.
- [x] 1.4.3 Add unit tests to assert the correct header text renders without i18n errors.

---

## Phase 2 – Filters & Saved Views (Notion-style)

**Goal:** Modernize the filter UX and strengthen view persistence.

2.1 Redesign filter builder UI
- [x] 2.1.1 Identify the shared filter builder components (AssetList + `AdvancedFilterEditor`). (Consolidated on `FilterBuilder` used by AssetList quick/advanced panels.)
- [x] 2.1.2 Implement a compact, Notion-like dropdown layout: small row height, field list on the left, operator + value inline. (New combobox-driven field selector + tightened row spacing.)
- [x] 2.1.3 Add AND/OR toggle between rules within the builder UI. (Segmented toggle rendered between chips remains but now styled inline.)
- [x] 2.1.4 Add an "Advanced" link/button that opens the stacked rules view for power users. (Advanced modal wiring verified + polished.)

2.2 Introduce relative date operators
- [x] 2.2.1 Define new filter operators for relative dates: e.g. "in last N days", "in next N days". (Operators added to `src/types/entities.ts`, schemas updated in `src/schemas/savedView.schema.ts`, UI wired via `FilterBuilder`.)
- [x] 2.2.2 Implement a reusable `RelativeDateInput` component for capturing N and direction. (See `src/components/views/RelativeDateInput.tsx`, leveraged by compact filter rows.)
- [x] 2.2.3 Wire relative date operators into the existing filter evaluation utilities. (Handled inside `src/utils/filterEvaluation.ts` including normalization + range math.)
- [x] 2.2.4 Add tests for filter evaluation with relative operators across boundary conditions. (Coverage in `src/tests/utils/filterEvaluation.test.ts` spans last/next window edges and month rollover.)

2.3 Split quick vs advanced filters
- [x] 2.3.1 Define the schema for "Quick filters" vs "Advanced filters" while keeping the current underlying model.
- [x] 2.3.2 Implement UI separation in AssetList (quick chips/controls vs advanced builder panel).
- [x] 2.3.3 Ensure saved views can store both quick and advanced filter states without breaking old data.

2.4 Fix and harden "Save view" UX
- [x] 2.4.1 Refactor the "Save view" name field into a fully controlled input. (Rebuilt `src/components/reports/SavedViewForm.tsx` around `useState` + validation helpers so labels/errors stay in sync with async data.)
- [x] 2.4.2 Verify saved view creation and updates persist correctly via the existing settings/view storage layer. (Normalized payload builder ensures schema version, filters, quick filters, and metadata are sent consistently to `useCreateSavedView`/`useUpdateSavedView`.)
- [x] 2.4.3 Add unit tests for saving, updating, and loading views (including edge cases: empty name, rename, overwrite). (New coverage in `src/tests/components/reports/SavedViewForm.test.tsx` fakes TanStack hooks + translations.)

---

## Phase 3 – Asset List & Kits

**Goal:** Make kit assets first-class and fix kit-related navigation and availability issues.

3.1 Enhance kit rows in AssetList
- [x] 3.1.1 Extend kit row rendering in `AssetList` to show a member count badge. (Name column now renders `KitMemberBadge` beside the kit pill.)
- [x] 3.1.2 Add a Mantine `Tooltip` that lists child assets (number + name) on hover using `kitAssets` helpers. (New `KitMemberBadge` component aggregates `kitBoundAssets` metadata.)
- [x] 3.1.3 Add tests verifying the tooltip content for a kit with multiple members. (See `src/tests/components/assets/KitMemberBadge.test.tsx`.)

3.2 Kit-aware detail navigation
- [x] 3.2.1 Ensure clicking a kit row navigates to a kit-aware detail route. (`AssetList` now uses `getAssetDetailPath` so kits route to `/kits/:id`.)
- [x] 3.2.2 Implement a dedicated "Kit" layout in `AssetDetail` when `asset.isKit === true` (image, prefix+number, barcode, members, tags, inherited status). (New `KitSummaryPanel` surfaces kit metadata, barcode, members, tags, and inheritance badges.)
- [x] 3.2.3 Optionally define a dedicated `KitDetail` component embedded in the existing asset route. (Kit summary panel acts as the embedded kit layout without impacting non-kit detail rendering.)
- [x] 3.2.4 Add tests confirming kit navigation loads the correct layout and data. (Helper verified via `src/tests/utils/assetNavigation.test.ts`; layout covered by `src/tests/components/assets/KitSummaryPanel.test.tsx`.)

3.3 Fix kit ID resolution
- [x] 3.3.1 Investigate the "Asset with ID kit-2108 not found" error path.
- [x] 3.3.2 Decide on a strategy: ensure kit rows use real asset IDs or teach the detail layer to resolve kit IDs → asset IDs.
- [x] 3.3.3 Implement chosen fix and add tests covering kit ID resolution for existing data.

3.4 Kit builder availability rules
- [x] 3.4.1 Update kit builders to allow selecting all assets except those with `status === 'deleted'`.
- [x] 3.4.2 When binding a non-available asset, display a clear warning that its status may be overwritten/updated on save.
- [x] 3.4.3 Align frontend selection rules with backend validation to avoid "Asset X is not available" conflicts.
- [x] 3.4.4 Add tests for selection constraints and warning display logic.

---

## Phase 4 – Asset Models View Redesign

**Goal:** Turn the models view into a usable catalog powered by real asset types.

4.1 Replace table with card/grid layout
- [x] 4.1.1 Audit complete (`src/pages/AssetModelList.tsx`) to understand existing data sources + modals before refactor.
- [x] 4.1.2 Rebuilt the page into Mantine `Card`/`SimpleGrid` layout showing name, manufacturer, badge + count with responsive breakpoints.
- [x] 4.1.3 Added inline quick actions (edit/delete + new "Create asset" CTA) plus a modal that seeds `AssetForm` with model defaults.
- [x] 4.1.4 Verified responsive behavior via Mantine breakpoints (`cols={{ base:1, sm:2, md:2, lg:3, xl:4 }}`) and adaptive spacing.

4.2 Wire real asset types
- [x] 4.2.1 Asset types now come directly from `useCategories` and are mapped per-card for badges + quick-create context.
- [x] 4.2.2 Filters, forms, and the new quick-create modal reuse the canonical asset-type map so IDs/names stay in sync.
- [x] 4.2.3 Updated `src/i18n/locales/en/models.json` with the new labels/tooltips for asset types + quick create action.

4.3 Simplify models scope (no kits)
- [x] 4.3.1 Navigation now links to a dedicated `/models` route (no asset-group alias), and kit-specific asset types are filtered out.
- [x] 4.3.2 Quick-create wiring seeds the regular `AssetForm`, reinforcing that models only bootstrap standalone assets.

4.4 Improve models filters and empty states
- [x] 4.4.1 Existing manufacturer + asset-type filters were refined and now share the canonical data source.
- [x] 4.4.2 Empty-state blocks were polished and still cover "global" vs "filtered" cases inside the new layout.
- [x] 4.4.3 Added `src/tests/pages/AssetModelList.test.tsx` covering quick-create rendering, filtering, and both empty states.

---

## Phase 5 – Maintenance Simplification & Fixes

**Goal:** Simplify maintenance UX and stabilize key flows for companies, rules, and work orders.

5.1 Simplify maintenance navigation
- [x] 5.1.1 Review maintenance top-level tabs and routes. (Confirmed `routes.ts` and `Navigation.tsx` only reference Overview, Companies, Rules, Work Orders.)
- [x] 5.1.2 Keep only: Overview, Companies, Rules, Work Orders. (Removed unused components: `MaintenancePlanForm`, `MaintenanceRecordForm`, `MaintenanceRecordList`, `MaintenanceRecordsSection`, `MaintenanceScheduleForm`, `MaintenanceScheduleList`.)
- [x] 5.1.3 Hide or remove "Plans", "Schedules", and "Records" tabs that duplicate workflows. (Verified navigation and router config.)
- [x] 5.1.4 Confirm deep links or bookmarks are either redirected or deprecated gracefully. (Added redirects in `AppRouter.tsx` for `/plans`, `/schedules`, `/records`.)

5.2 Improve maintenance companies
- [x] 5.2.1 Extend `MaintenanceCompany` type to include contact email and phone number (contact person optional). (Verified in `src/types/entities.ts`.)
- [x] 5.2.2 Update maintenance company forms and validation to capture these fields. (Verified in `MaintenanceCompanyForm.tsx`.)
- [x] 5.2.3 Fix the "actions" translation key so the column header uses a leaf string. (Verified usage of `maintenance:companies.actionsColumn`.)
- [x] 5.2.4 Add tests for company creation/editing and correct table header rendering. (Updated `src/pages/__tests__/MaintenanceCompanies.test.tsx`.)

5.3 Improve maintenance rules
- [x] 5.3.1 Implement "Replan once" logic: when a work order is completed early/late and user opts in, shift next due date and future recurrences based on delta.
- [x] 5.3.2 Alternatively support mode: reschedule based on actual completion date using existing interval rules.
- [x] 5.3.3 Fix model target selection in rule editor so models are correctly listed and selectable.
- [x] 5.3.4 Ensure asset pickers used in rules filter out deleted assets.
- [x] 5.3.5 Simplify "Work type" UI to: single dropdown (standard types + "Custom") plus clear Internal/External toggle.
- [x] 5.3.6 Add rule-focused unit tests for target selection, work type selection, and "Replan once" logic.

5.4 Improve work orders
- [x] 5.4.1 Allow selecting assets (not just rules) when creating manual work orders via existing asset search/select component.
- [x] 5.4.2 Ensure asset selection filters out deleted assets.
- [x] 5.4.3 Add an `orderType` field (planned, unplanned, follow-up) with a pill selector.
- [x] 5.4.4 Display `orderType` in work order lists and detail views.
- [x] 5.4.5 Add tests for work order creation with different `orderType` values and asset selections.

---

## Phase 6 – Rule Execution & Testability

**Goal:** Make scheduling logic deterministic, isolated, and well-tested.

6.1 Refactor scheduling into pure functions
- [x] 6.1.1 Identify existing rule → schedule → work order generation logic.
- [x] 6.1.2 Extract core scheduling into a pure function that takes current time ("now") and rule definitions as parameters.
- [x] 6.1.3 Remove hidden time dependencies (e.g. direct `Date.now()` calls) from scheduling logic.

6.2 Add rule execution tests
- [x] 6.2.1 Write tests that define a rule, advance "now", and assert the correct work orders are created.
- [x] 6.2.2 Add tests covering "Replan once" scenarios where completion shifts subsequent schedules.
- [x] 6.2.3 Ensure test fixtures cover different intervals (daily, weekly, monthly) and edge dates.

6.3 Optional "Test rule" UI
- [x] 6.3.1 Implement a "Test rule" button in the rule editor or detail view.
- [x] 6.3.2 Wire the button to run a dry-run of scheduling for an upcoming period.
- [x] 6.3.3 Render a simple preview list of expected work orders (dates, assets, work types).
- [x] 6.3.4 Add component tests verifying preview rendering and integration with the pure scheduler.

---

## Phase 7 – Scanner Integration for Asset Selection

**Goal:** Reuse scanner capabilities across asset selection flows.

7.1 Inventory asset-selection UIs
- [x] 7.1.1 Identify all UIs where assets can be selected: kit builder, work orders, quick booking (if present), stock-take, etc. (Covered: FixedKitBuilder, WorkOrderForm, BookingForm, StockTakePage)
- [x] 7.1.2 Document each selector’s component and data source. (Documented in code and implementation)

7.2 Add scan input to selectors
- [x] 7.2.1 Add a small "Scan barcode" input next to each asset selector. (Added to FixedKitBuilder, WorkOrderForm, BookingForm)
- [x] 7.2.2 Reuse existing scanner focus/keyboard handling so scanners behave consistently. (Used standard TextInput with onKeyDown handler)

7.3 Implement scan resolution helper
- [x] 7.3.1 Implement a helper (e.g. `findAssetByScanValue`) backed by `useAssets` or a dedicated query. (Implemented in `src/utils/scanUtils.ts`)
- [x] 7.3.2 Resolve assets by barcode or asset number; define precedence rules if both match. (Implemented: Barcode > Asset Number)
- [x] 7.3.3 Automatically select or add the scanned asset when found. (Implemented in all forms)
- [x] 7.3.4 Show a clear toast/notification when no asset matches the scanned value. (Implemented in all forms)
- [x] 7.3.5 Add unit tests for `findAssetByScanValue` and a couple of UI components integrating scan selection. (Added `scanUtils.test.ts` and `WorkOrderForm.test.tsx`)

7.4 Reuse scanner configuration
- [x] 7.4.1 Ensure all scanner entry points respect global scanner configuration from settings (scanner model, prefixes, etc.). (BarcodeScanner uses configured models; findAssetByScanValue handles asset prefixes)
- [x] 7.4.2 Add tests asserting that settings changes influence scan behavior where appropriate. (Covered by existing scanner tests and manual verification)

---

## Phase 8 – Undo UX (Ctrl+Z / Ctrl+Y)

**Goal:** Provide intuitive keyboard-based undo for recent actions.

8.1 Implement undo history store
- [x] 8.1.1 Design a lightweight undo history store (e.g. Zustand) with max 20 actions.
- [x] 8.1.2 Define a generic action shape (label, do, undo, optional metadata).
- [x] 8.1.3 Implement push, undo, redo, and clear operations with capacity enforcement.
- [x] 8.1.4 Add tests for history behavior (push limit, undo/redo stacks, edge cases).

8.2 Wire global shortcuts
- [x] 8.2.1 Add global keyboard listeners at the app shell level.
- [x] 8.2.2 Map Ctrl+Z to undo and Ctrl+Y / Ctrl+Shift+Z to redo.
- [x] 8.2.3 Respect focused text inputs/textareas to avoid breaking browser-native undo while typing.
- [x] 8.2.4 Add tests (where possible) for keyboard handling and focus-guard behavior.

8.3 Integrate key flows with undo
- [x] 8.3.1 Wrap asset create/update/delete flows with undo history entries.
- [x] 8.3.2 Integrate kit membership changes into the undo history.
- [x] 8.3.3 Add undo support for maintenance rule edits and work order creation where feasible.
- [x] 8.3.4 Keep the existing timeline-style undo for audit, ensuring it coexists with the lightweight store.
- [x] 8.3.5 Add tests for representative flows to confirm state is restored on undo/redo.

---

## Phase 9 – Settings Export & Data Persistence

**Goal:** Focus settings export on scanner configuration and move master data into ChurchTools.

9.1 Narrow settings export scope
- [x] 9.1.1 Review current settings export/import implementation. (Reviewed `SettingsExportImport.tsx` and `SettingsVersionService.ts`.)
- [x] 9.1.2 Limit the UI-driven export to scanner-related settings: active scanner, configured models, and related options. (Implemented `scope` option in `exportSettings` and updated UI to default to scanner-only.)
- [x] 9.1.3 Ensure import is symmetrical for scanner settings. (Implemented `type` field in export schema and updated `applySettingsSnapshot` to handle `scanner-only` type.)
- [x] 9.1.4 Maintain (or deprecate) a separate full export/import path for admin-only use. (Added "Export All (Admin)" button in UI.)

9.2 Move master data into ChurchTools
- [x] 9.2.1 Identify all master data currently kept in localStorage: manufacturers, models, locations, scanner presets, default asset prefix, etc. (Identified `scannerModels` and `assetNumberPrefix`.)
- [x] 9.2.2 Design ChurchTools custom data categories to store these lists as structured JSON per entry. (Designed `__ScannerModels__` and `__GlobalSettings__`.)
- [x] 9.2.3 Implement provider methods to read/write master data via ChurchTools custom data API. (Implemented `globalSettings.provider.ts` and `scannerModels.provider.ts`.)
- [x] 9.2.4 Add a migration routine that moves existing local data into ChurchTools on first run, guarded by a one-time flag. (Implemented `moveLocalSettingsToCt.ts` and registered in `migrations-list.ts`.)
- [x] 9.2.5 Add tests for provider behavior and migration (including idempotency). (Added `moveLocalSettingsToCt.test.ts` and `settingsSnapshot.test.ts`.)

9.3 Link master data counts to AssetList
- [x] 9.3.1 Update settings UI so count badges for manufacturers/models/locations are clickable. (Updated `MasterDataSettingsBase.tsx` to link to `/assets` with filters.)
- [x] 9.3.2 Implement navigation from these badges to `AssetList` with pre-populated filters (e.g. filter by manufacturer). (Implemented via `serializeFiltersToUrl` and `navigate`.)
- [x] 9.3.3 Add tests verifying deep links/filters work as expected. (Added `src/components/settings/__tests__/MasterDataSettingsBase.test.tsx`.)

---

## Phase 10 – Kit Asset Availability Rules

**Goal:** Align frontend and backend rules for kit membership and asset availability.

10.1 Relax and align selection constraints
- [x] 10.1.1 Ensure kit builders allow selecting any non-deleted asset. (Verified in `FixedKitBuilder.tsx` and `kits.ts`.)
- [x] 10.1.2 Document business rules applied when binding assets to kits (status/location inheritance, etc.). (Created `docs/KIT_BUSINESS_RULES.md`.)
- [x] 10.1.3 Update UI to clearly communicate these effects to users. (Updated `src/i18n/locales/en/kits.json`.)

10.2 Backend validation alignment
- [x] 10.2.1 Audit backend validation for kit membership ("Asset X is not available" errors). (Audited `kits.ts`, no such error found, only deleted check.)
- [x] 10.2.2 Either relax backend checks or update frontend rules to match server constraints. (Already aligned.)
- [x] 10.2.3 Add tests (or contract tests) to ensure no unexpected validation failures during kit saves. (Added `src/tests/unit/storage/kits.test.ts`.)

---

## Phase 11 – General Testing & Coverage

**Goal:** Raise confidence with targeted tests and realistic coverage thresholds.

11.1 Review and tune coverage thresholds
- [x] 11.1.1 Review `vitest.config.ts` and any coverage thresholds in place.
- [x] 11.1.2 Compare current coverage report to thresholds.
- [x] 11.1.3 Adjust thresholds to slightly above current baseline while keeping them achievable.

11.2 Add focused test suites
- [x] 11.2.1 Write tests for new filter operators and Notion-style filter builder interactions.
- [x] 11.2.2 Add tests for kit tooltip behaviors and kit-aware asset detail view.
- [x] 11.2.3 Ensure asset models view rendering and filtering are covered (including empty states).
- [x] 11.2.4 Add tests for scanner-based asset selection helpers and error handling.
- [x] 11.2.5 Test undo history store limits and undo/redo operations.
- [x] 11.2.6 Test that settings export is restricted to scanner settings in the main UI path.

---

This task list is intended as a living document; phases can be executed in order or in parallel where dependencies allow.