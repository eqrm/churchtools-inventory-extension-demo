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
- 2.1.1 Identify the shared filter builder components (AssetList + `AdvancedFilterEditor`).
- 2.1.2 Implement a compact, Notion-like dropdown layout: small row height, field list on the left, operator + value inline.
- 2.1.3 Add AND/OR toggle between rules within the builder UI.
- 2.1.4 Add an "Advanced" link/button that opens the stacked rules view for power users.

2.2 Introduce relative date operators
- 2.2.1 Define new filter operators for relative dates: e.g. "in last N days", "in next N days".
- 2.2.2 Implement a reusable `RelativeDateInput` component for capturing N and direction.
- 2.2.3 Wire relative date operators into the existing filter evaluation utilities.
- 2.2.4 Add tests for filter evaluation with relative operators across boundary conditions.

2.3 Split quick vs advanced filters
- 2.3.1 Define the schema for "Quick filters" vs "Advanced filters" while keeping the current underlying model.
- 2.3.2 Implement UI separation in AssetList (quick chips/controls vs advanced builder panel).
- 2.3.3 Ensure saved views can store both quick and advanced filter states without breaking old data.

2.4 Fix and harden "Save view" UX
- 2.4.1 Refactor the "Save view" name field into a fully controlled input.
- 2.4.2 Verify saved view creation and updates persist correctly via the existing settings/view storage layer.
- 2.4.3 Add unit tests for saving, updating, and loading views (including edge cases: empty name, rename, overwrite).

---

## Phase 3 – Asset List & Kits

**Goal:** Make kit assets first-class and fix kit-related navigation and availability issues.

3.1 Enhance kit rows in AssetList
- 3.1.1 Extend kit row rendering in `AssetList` to show a member count badge.
- 3.1.2 Add a Mantine `Tooltip` that lists child assets (number + name) on hover using `kitAssets` helpers.
- 3.1.3 Add tests verifying the tooltip content for a kit with multiple members.

3.2 Kit-aware detail navigation
- 3.2.1 Ensure clicking a kit row navigates to a kit-aware detail route.
- 3.2.2 Implement a dedicated "Kit" layout in `AssetDetail` when `asset.isKit === true` (image, prefix+number, barcode, members, tags, inherited status).
- 3.2.3 Optionally define a dedicated `KitDetail` component embedded in the existing asset route.
- 3.2.4 Add tests confirming kit navigation loads the correct layout and data.

3.3 Fix kit ID resolution
- 3.3.1 Investigate the "Asset with ID kit-2108 not found" error path.
- 3.3.2 Decide on a strategy: ensure kit rows use real asset IDs or teach the detail layer to resolve kit IDs → asset IDs.
- 3.3.3 Implement chosen fix and add tests covering kit ID resolution for existing data.

3.4 Kit builder availability rules
- 3.4.1 Update kit builders to allow selecting all assets except those with `status === 'deleted'`.
- 3.4.2 When binding a non-available asset, display a clear warning that its status may be overwritten/updated on save.
- 3.4.3 Align frontend selection rules with backend validation to avoid "Asset X is not available" conflicts.
- 3.4.4 Add tests for selection constraints and warning display logic.

---

## Phase 4 – Asset Models View Redesign

**Goal:** Turn the models view into a usable catalog powered by real asset types.

4.1 Replace table with card/grid layout
- 4.1.1 Analyze current `AssetModelsPage` implementation and its dependencies.
- 4.1.2 Implement a card/grid layout: model name, manufacturer, asset type badge, asset count, optional preview image.
- 4.1.3 Add quick actions to each card: edit model, create asset from model.
- 4.1.4 Ensure layout is responsive across common breakpoints.

4.2 Wire real asset types
- 4.2.1 Replace placeholder asset type lists with real data from the ChurchTools provider.
- 4.2.2 Ensure model forms and filters use the same canonical asset type source.
- 4.2.3 Align labels and i18n strings with global "Asset Type" terminology.

4.3 Simplify models scope (no kits)
- 4.3.1 Locate and remove or hide any "Kit" options in the models sidebar/navigation.
- 4.3.2 Validate that models are used purely for asset templates, not kit templates.

4.4 Improve models filters and empty states
- 4.4.1 Add filters by asset type and manufacturer to the models view.
- 4.4.2 Implement helpful empty states for "no models" and "no models match filters".
- 4.4.3 Add unit tests for models view rendering, filtering, and empty state behavior.

---

## Phase 5 – Maintenance Simplification & Fixes

**Goal:** Simplify maintenance UX and stabilize key flows for companies, rules, and work orders.

5.1 Simplify maintenance navigation
- 5.1.1 Review maintenance top-level tabs and routes.
- 5.1.2 Keep only: Overview, Companies, Rules, Work Orders.
- 5.1.3 Hide or remove "Plans", "Schedules", and "Records" tabs that duplicate workflows.
- 5.1.4 Confirm deep links or bookmarks are either redirected or deprecated gracefully.

5.2 Improve maintenance companies
- 5.2.1 Extend `MaintenanceCompany` type to include contact email and phone number (contact person optional).
- 5.2.2 Update maintenance company forms and validation to capture these fields.
- 5.2.3 Fix the "actions" translation key so the column header uses a leaf string.
- 5.2.4 Add tests for company creation/editing and correct table header rendering.

5.3 Improve maintenance rules
- 5.3.1 Implement "Replan once" logic: when a work order is completed early/late and user opts in, shift next due date and future recurrences based on delta.
- 5.3.2 Alternatively support mode: reschedule based on actual completion date using existing interval rules.
- 5.3.3 Fix model target selection in rule editor so models are correctly listed and selectable.
- 5.3.4 Ensure asset pickers used in rules filter out deleted assets.
- 5.3.5 Simplify "Work type" UI to: single dropdown (standard types + "Custom") plus clear Internal/External toggle.
- 5.3.6 Add rule-focused unit tests for target selection, work type selection, and "Replan once" logic.

5.4 Improve work orders
- 5.4.1 Allow selecting assets (not just rules) when creating manual work orders via existing asset search/select component.
- 5.4.2 Ensure asset selection filters out deleted assets.
- 5.4.3 Add an `orderType` field (planned, unplanned, follow-up) with a pill selector.
- 5.4.4 Display `orderType` in work order lists and detail views.
- 5.4.5 Add tests for work order creation with different `orderType` values and asset selections.

---

## Phase 6 – Rule Execution & Testability

**Goal:** Make scheduling logic deterministic, isolated, and well-tested.

6.1 Refactor scheduling into pure functions
- 6.1.1 Identify existing rule → schedule → work order generation logic.
- 6.1.2 Extract core scheduling into a pure function that takes current time ("now") and rule definitions as parameters.
- 6.1.3 Remove hidden time dependencies (e.g. direct `Date.now()` calls) from scheduling logic.

6.2 Add rule execution tests
- 6.2.1 Write tests that define a rule, advance "now", and assert the correct work orders are created.
- 6.2.2 Add tests covering "Replan once" scenarios where completion shifts subsequent schedules.
- 6.2.3 Ensure test fixtures cover different intervals (daily, weekly, monthly) and edge dates.

6.3 Optional "Test rule" UI
- 6.3.1 Implement a "Test rule" button in the rule editor or detail view.
- 6.3.2 Wire the button to run a dry-run of scheduling for an upcoming period.
- 6.3.3 Render a simple preview list of expected work orders (dates, assets, work types).
- 6.3.4 Add component tests verifying preview rendering and integration with the pure scheduler.

---

## Phase 7 – Scanner Integration for Asset Selection

**Goal:** Reuse scanner capabilities across asset selection flows.

7.1 Inventory asset-selection UIs
- 7.1.1 Identify all UIs where assets can be selected: kit builder, work orders, quick booking (if present), stock-take, etc.
- 7.1.2 Document each selector’s component and data source.

7.2 Add scan input to selectors
- 7.2.1 Add a small "Scan barcode" input next to each asset selector.
- 7.2.2 Reuse existing scanner focus/keyboard handling so scanners behave consistently.

7.3 Implement scan resolution helper
- 7.3.1 Implement a helper (e.g. `findAssetByScanValue`) backed by `useAssets` or a dedicated query.
- 7.3.2 Resolve assets by barcode or asset number; define precedence rules if both match.
- 7.3.3 Automatically select or add the scanned asset when found.
- 7.3.4 Show a clear toast/notification when no asset matches the scanned value.
- 7.3.5 Add unit tests for `findAssetByScanValue` and a couple of UI components integrating scan selection.

7.4 Reuse scanner configuration
- 7.4.1 Ensure all scanner entry points respect global scanner configuration from settings (scanner model, prefixes, etc.).
- 7.4.2 Add tests asserting that settings changes influence scan behavior where appropriate.

---

## Phase 8 – Undo UX (Ctrl+Z / Ctrl+Y)

**Goal:** Provide intuitive keyboard-based undo for recent actions.

8.1 Implement undo history store
- 8.1.1 Design a lightweight undo history store (e.g. Zustand) with max 20 actions.
- 8.1.2 Define a generic action shape (label, do, undo, optional metadata).
- 8.1.3 Implement push, undo, redo, and clear operations with capacity enforcement.
- 8.1.4 Add tests for history behavior (push limit, undo/redo stacks, edge cases).

8.2 Wire global shortcuts
- 8.2.1 Add global keyboard listeners at the app shell level.
- 8.2.2 Map Ctrl+Z to undo and Ctrl+Y / Ctrl+Shift+Z to redo.
- 8.2.3 Respect focused text inputs/textareas to avoid breaking browser-native undo while typing.
- 8.2.4 Add tests (where possible) for keyboard handling and focus-guard behavior.

8.3 Integrate key flows with undo
- 8.3.1 Wrap asset create/update/delete flows with undo history entries.
- 8.3.2 Integrate kit membership changes into the undo history.
- 8.3.3 Add undo support for maintenance rule edits and work order creation where feasible.
- 8.3.4 Keep the existing timeline-style undo for audit, ensuring it coexists with the lightweight store.
- 8.3.5 Add tests for representative flows to confirm state is restored on undo/redo.

---

## Phase 9 – Settings Export & Data Persistence

**Goal:** Focus settings export on scanner configuration and move master data into ChurchTools.

9.1 Narrow settings export scope
- 9.1.1 Review current settings export/import implementation.
- 9.1.2 Limit the UI-driven export to scanner-related settings: active scanner, configured models, and related options.
- 9.1.3 Ensure import is symmetrical for scanner settings.
- 9.1.4 Maintain (or deprecate) a separate full export/import path for admin-only use.

9.2 Move master data into ChurchTools
- 9.2.1 Identify all master data currently kept in localStorage: manufacturers, models, locations, scanner presets, default asset prefix, etc.
- 9.2.2 Design ChurchTools custom data categories to store these lists as structured JSON per entry.
- 9.2.3 Implement provider methods to read/write master data via ChurchTools custom data API.
- 9.2.4 Add a migration routine that moves existing local data into ChurchTools on first run, guarded by a one-time flag.
- 9.2.5 Add tests for provider behavior and migration (including idempotency).

9.3 Link master data counts to AssetList
- 9.3.1 Update settings UI so count badges for manufacturers/models/locations are clickable.
- 9.3.2 Implement navigation from these badges to `AssetList` with pre-populated filters (e.g. filter by manufacturer).
- 9.3.3 Add tests verifying deep links/filters work as expected.

---

## Phase 10 – Kit Asset Availability Rules

**Goal:** Align frontend and backend rules for kit membership and asset availability.

10.1 Relax and align selection constraints
- 10.1.1 Ensure kit builders allow selecting any non-deleted asset.
- 10.1.2 Document business rules applied when binding assets to kits (status/location inheritance, etc.).
- 10.1.3 Update UI to clearly communicate these effects to users.

10.2 Backend validation alignment
- 10.2.1 Audit backend validation for kit membership ("Asset X is not available" errors).
- 10.2.2 Either relax backend checks or update frontend rules to match server constraints.
- 10.2.3 Add tests (or contract tests) to ensure no unexpected validation failures during kit saves.

---

## Phase 11 – General Testing & Coverage

**Goal:** Raise confidence with targeted tests and realistic coverage thresholds.

11.1 Review and tune coverage thresholds
- 11.1.1 Review `vitest.config.ts` and any coverage thresholds in place.
- 11.1.2 Compare current coverage report to thresholds.
- 11.1.3 Adjust thresholds to slightly above current baseline while keeping them achievable.

11.2 Add focused test suites
- 11.2.1 Write tests for new filter operators and Notion-style filter builder interactions.
- 11.2.2 Add tests for kit tooltip behaviors and kit-aware asset detail view.
- 11.2.3 Ensure asset models view rendering and filtering are covered (including empty states).
- 11.2.4 Add tests for scanner-based asset selection helpers and error handling.
- 11.2.5 Test undo history store limits and undo/redo operations.
- 11.2.6 Test that settings export is restricted to scanner settings in the main UI path.

---

This task list is intended as a living document; phases can be executed in order or in parallel where dependencies allow.