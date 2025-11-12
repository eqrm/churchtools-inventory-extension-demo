# Tasks: Advanced Inventory Features (Backend/Frontend Split)

**Input**: Design documents from `/specs/004-advanced-inventory-features/`  
**Feature Branch**: `004-advanced-inventory-features`  
**User Stories**: 11 total (5 P1, 4 P2, 2 P3)

**Tests**: TDD approach REQUIRED for 4 critical services per Constitution Principle V and service contracts documentation.

**Organization**: Tasks split into **Backend Track** (B-series) and **Frontend Track** (F-series) for parallel development.

**Last Updated**: 2025-01-20  
**Update**: Added 54 new tasks from 9 supplementary requirement documents (DESIGN_SYSTEM.md, DELETION_POLICY.md, ERROR_HANDLING.md, ROUTING.md, API_ERROR_HANDLING.md, SCHEMA_VERSIONING.md, BULK_OPERATIONS.md, DATE_VALIDATION.md, RATE_LIMITING.md). Total task count increased from 201 to 255 tasks. See Phase 16 for new requirements.

## Task Numbering System
- **B### = Backend Tasks**: Services, stores, hooks, types, utilities, tests
- **F### = Frontend Tasks**: React components, pages, UI integration
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)

## Workflow Options
1. **Sequential**: Backend completes all B-tasks, then Frontend does all F-tasks
2. **Parallel** (Recommended): Frontend uses mocked services, integrates real services at handoff points
3. **Feature-by-Feature**: Complete each user story (backend + frontend) before next story

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and configure project infrastructure

- [X] T001 Install new dependencies (Dexie.js v3, i18next v23, react-i18next v13, @tanstack/react-virtual v3, xstate v5, @dnd-kit/core v6)
- [X] T002 [P] Configure i18next with English locale files in src/i18n/config.ts
- [X] T003 [P] Create IndexedDB database schema using Dexie.js in src/services/db/UndoDatabase.ts
- [X] T004 [P] Create IndexedDB database for settings versions in src/services/db/SettingsDatabase.ts
- [X] T005 [P] Setup background job service skeleton in src/services/BackgroundJobService.ts
- [ ] T006 [P] Install p-queue library for rate limiting (`npm install p-queue`) [RATE_LIMITING.md]
- [ ] T007 [P] Install Zod v3 for schema validation (`npm install zod`) [SCHEMA_VERSIONING.md, ERROR_HANDLING.md]
- [ ] T008 [P] Configure React Router v6 in src/router/index.tsx [ROUTING.md]
- [ ] T009 [P] Create design system tokens file in src/theme/tokens.ts (spacing, colors, typography) [DESIGN_SYSTEM.md]

**Constitution Compliance Gates**:
- [X] TypeScript strict mode verified in tsconfig.json
- [X] ESLint configuration passing with no warnings
- [ ] Bundle size baseline measured (~130 KB currently)
- [X] i18n English locale file created at src/i18n/locales/en/common.json

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure and type definitions required by all user stories

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T010 [P] Create UndoAction type definitions in src/types/undo.ts
- [X] T011 [P] Create DamageReport type definitions in src/types/damage.ts
- [X] T012 [P] Create Assignment type definitions in src/types/assignment.ts
- [X] T013 [P] Create FixedKit type definitions in src/types/kit.ts
- [X] T014 [P] Create AssetModel type definitions in src/types/model.ts
- [X] T015 [P] Create Tag type definitions in src/types/tag.ts
- [X] T016 [P] Create DataView and FilterCondition type definitions in src/types/view.ts
- [X] T017 [P] Create MaintenanceCompany, MaintenanceRule, WorkOrder type definitions in src/types/maintenance.ts
- [X] T018 [P] Create SettingsVersion type definitions in src/types/settings.ts
- [X] T019 Modify Asset entity in src/types/asset.ts (add kitId, modelId, tags, inheritedTags, currentAssignmentId, expand status enum)
- [X] T020 [P] Create image compression utility in src/utils/imageCompression.ts
- [X] T021 [P] Create base64 encoding/decoding utilities in src/utils/base64Utils.ts
- [X] T022 [P] Create state machine helper utilities in src/utils/stateMachine.ts
- [X] T023 [P] Create relative date calculation utilities in src/utils/dateUtils.ts
- [X] T024 [P] Add English translations for common terms in src/i18n/locales/en/common.json
- [ ] T025 [P] Create Zod schema definitions for all entities in src/schemas/ (Asset, Kit, DamageReport, etc.) [SCHEMA_VERSIONING.md]
- [ ] T026 [P] Create type-safe route builders in src/router/routes.ts [ROUTING.md]
- [ ] T027 [P] Create ChurchToolsRequestQueue class in src/services/ChurchToolsRequestQueue.ts [RATE_LIMITING.md]
- [ ] T028 [P] Configure Axios with base URL and interceptors in src/services/api/axiosConfig.ts [API_ERROR_HANDLING.md]
- [ ] T029 [P] Create error code mapping utilities in src/utils/errorCodes.ts (ERR_ASSET_001 pattern) [ERROR_HANDLING.md]
- [ ] T030 [P] Create soft delete utilities in src/utils/softDelete.ts [DELETION_POLICY.md]
- [ ] T031 [P] Create date validation utilities in src/utils/dateValidation.ts (0-730 past, 1-365 future) [DATE_VALIDATION.md]
- [ ] T032 [P] Create bulk operation queue service in src/services/BulkOperationService.ts [BULK_OPERATIONS.md]

**Constitution Compliance Gates**:
- [ ] All type definitions use explicit types (no `any` without justification)
- [ ] Asset entity modifications preserve backward compatibility
- [ ] Utilities include JSDoc comments
- [ ] All Zod schemas validated with test cases [SCHEMA_VERSIONING.md]
- [ ] ESLint rules configured for JSDoc requirement [ERROR_HANDLING.md]

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Undo Functionality (Priority: P1) 🎯 MVP

**Goal**: Users can undo any action within 24 hours by clicking a single button

**Independent Test**: Create an asset, undo creation, verify asset is deleted and UI updates

### TDD Tests for User Story 1 (REQUIRED - TDD approach)

**NOTE: Write these tests FIRST, ensure they FAIL (RED) before implementation**

- [X] T033 [P] [US1] Write RED test for recordAction (simple create/update/delete) in src/tests/services/UndoService.test.ts
- [X] T034 [P] [US1] Write RED test for recordCompoundAction (kit + sub-assets) in src/tests/services/UndoService.test.ts
- [X] T035 [P] [US1] Write RED test for undoAction (create/update/delete scenarios) in src/tests/services/UndoService.test.ts
- [X] T036 [P] [US1] Write RED test for rejecting expired undo (>24 hours) in src/tests/services/UndoService.test.ts
- [X] T037 [P] [US1] Write RED test for rejecting already-undone actions in src/tests/services/UndoService.test.ts
- [X] T038 [P] [US1] Write RED test for getUserUndoHistory (limit 50) in src/tests/services/UndoService.test.ts
- [X] T039 [P] [US1] Write RED test for cleanupExpired (removes only expired) in src/tests/services/UndoService.test.ts

### Implementation for User Story 1

- [X] T040 [US1] Implement UndoService (GREEN) in src/services/UndoService.ts - pass all RED tests from T033-T039
- [X] T041 [US1] Create Zustand undo store in src/stores/undoStore.ts
- [X] T042 [US1] Create useUndo hook in src/hooks/useUndo.ts (wraps UndoService with React Query)
- [X] T043 [P] [US1] Create UndoHistory component in src/components/undo/UndoHistory.tsx
- [X] T044 [P] [US1] Create UndoButton component in src/components/undo/UndoButton.tsx
- [X] T045 [US1] Add undo locale strings in src/i18n/locales/en/undo.json
- [X] T046 [US1] Integrate UndoHistory into existing layout (sidebar or header)
- [X] T047 [US1] Register undo cleanup job in BackgroundJobService (24-hour retention)
- [X] T048 [US1] REFACTOR: Review UndoService code quality and simplify if needed

**Checkpoint**: User Story 1 complete - undo functionality works independently for any entity

---

## Phase 4: User Story 2 - Damage Tracking (Priority: P1)

**Goal**: Document asset damage with photos and repair history

**Independent Test**: Mark asset as broken, add damage report with 3 photos, mark as repaired, view repair history

### TDD Tests for User Story 2 (REQUIRED - TDD approach for PhotoStorageService)

- [ ] T049 [P] [US2] Write RED test for compressImage (800x600 @ 0.8 quality) in src/tests/services/PhotoStorageService.test.ts
- [ ] T050 [P] [US2] Write RED test for rejecting >2MB files in src/tests/services/PhotoStorageService.test.ts
- [ ] T051 [P] [US2] Write RED test for rejecting >3 files in src/tests/services/PhotoStorageService.test.ts
- [ ] T052 [P] [US2] Write RED test for storePhotos and retrievePhoto roundtrip in src/tests/services/PhotoStorageService.test.ts
- [ ] T053 [P] [US2] Write RED test for feature flag switching (Mode A base64 vs Mode B Files API) in src/tests/services/PhotoStorageService.test.ts

### Implementation for User Story 2

- [ ] T054 [US2] Implement PhotoStorageService (GREEN) in src/services/PhotoStorageService.ts - pass all RED tests from T049-T053
- [ ] T055 [US2] Implement DamageService in src/services/DamageService.ts (createDamageReport, markAsRepaired, getRepairHistory, getBrokenAssets)
- [ ] T056 [US2] Create Zustand damage store in src/stores/damageStore.ts
- [ ] T057 [US2] Create useDamageReports hook in src/hooks/useDamageReports.ts
- [X] T058 [P] [US2] Create PhotoUpload component in src/components/damage/PhotoUpload.tsx (with compression preview)
- [X] T059 [P] [US2] Create DamageReportForm component in src/components/damage/DamageReportForm.tsx
- [X] T060 [P] [US2] Create RepairHistoryTab component in src/components/damage/RepairHistoryTab.tsx
- [ ] T061 [US2] Add damage locale strings in src/i18n/locales/en/damage.json
- [X] T062 [US2] Modify AssetDetail page to include "Mark as Broken" toggle and RepairHistoryTab
- [ ] T063 [US2] Integrate damage reports with undo service (record create/repair actions)
- [ ] T064 [US2] Update asset status to "Broken" when damage report created
- [ ] T065 [US2] REFACTOR: Review PhotoStorageService abstraction for Files API migration readiness

**Checkpoint**: User Story 2 complete - damage tracking with photos works independently

---

## Phase 5: User Story 3 - Asset Assignment (Priority: P1)

**Goal**: Assign assets to ChurchTools users or groups with history tracking

**Independent Test**: Search for person, assign asset, verify status changes to "In Use", check in asset, verify history

### Implementation for User Story 3 (Manual testing, TDD not required per contracts)

- [ ] T066 [US3] Implement AssignmentService in src/services/AssignmentService.ts (assignAsset, checkInAsset, getAssignmentHistory, getCurrentAssignment, getUserAssignments)
- [ ] T067 [US3] Create Zustand assignment store in src/stores/assignmentStore.ts
- [ ] T068 [US3] Create useAssignments hook in src/hooks/useAssignments.ts
- [ ] T069 [US3] Create useChurchToolsSearch hook in src/hooks/useChurchToolsSearch.ts (debounced person/group search)
- [X] T070 [P] [US3] Create PersonSearch component in src/components/assignment/PersonSearch.tsx (autocomplete with ChurchTools API)
- [X] T071 [P] [US3] Create AssignmentField component in src/components/assignment/AssignmentField.tsx
- [X] T072 [P] [US3] Create AssignmentHistoryTab component in src/components/assignment/AssignmentHistoryTab.tsx
- [ ] T073 [US3] Add assignment locale strings in src/i18n/locales/en/assignment.json
- [X] T074 [US3] Modify AssetDetail page to include AssignmentField and AssignmentHistoryTab
- [ ] T075 [US3] Implement asset status auto-update (Available ↔ In Use) on assignment/check-in
- [X] T076 [US3] Add confirmation popup when changing status of assigned asset
- [ ] T077 [US3] Integrate assignments with undo service (record assignment/check-in actions)

**Checkpoint**: User Story 3 complete - asset assignment with ChurchTools integration works independently

---

## Phase 6: User Story 7 - Data Views (Priority: P1)

**Goal**: Notion-like views with filters, sorts, grouping across table/gallery/kanban/calendar

**Independent Test**: Create saved filter "Status equals In Use", switch between table/gallery view, verify filter persists, create kanban grouped by status

### TDD Tests for User Story 7 (Recommended for filter execution logic)

- [ ] T066 [P] [US7] Write tests for applyFilters (text, date, tag, number, empty filters) in src/tests/services/DataViewService.test.ts
- [ ] T067 [P] [US7] Write tests for relative date resolution (last 7 days, next 30 days) in src/tests/services/DataViewService.test.ts
- [ ] T068 [P] [US7] Write tests for applySorts (single and multi-field) in src/tests/services/DataViewService.test.ts
- [ ] T069 [P] [US7] Write tests for groupAssets logic in src/tests/services/DataViewService.test.ts

### Implementation for User Story 7

- [ ] T070 [US7] Implement DataViewService (pass tests T066-T069) in src/services/DataViewService.ts (createView, updateView, deleteView, getUserViews, applyFilters, applySorts, groupAssets)
- [ ] T071 [US7] Create Zustand data view store in src/stores/dataViewStore.ts
- [ ] T072 [US7] Create useDataViews hook in src/hooks/useDataViews.ts
- [ ] T073 [P] [US7] Create ViewSelector component in src/components/views/ViewSelector.tsx (tabs for table/gallery/kanban/calendar)
- [ ] T074 [P] [US7] Create FilterBuilder component in src/components/views/FilterBuilder.tsx (modal with filter DSL UI)
- [ ] T075 [P] [US7] Create GroupingControls component in src/components/views/GroupingControls.tsx
- [ ] T076 [P] [US7] Create DataViewList component in src/components/views/DataViewList.tsx (saved views)
- [ ] T077 [US7] Create VirtualTable component using @tanstack/react-virtual in src/components/views/table/VirtualTable.tsx
- [ ] T078 [P] [US7] Create GalleryGrid component in src/components/views/gallery/GalleryGrid.tsx
- [ ] T079 [P] [US7] Create PaginationControls component in src/components/views/gallery/PaginationControls.tsx (24 items/page)
- [ ] T080 [US7] Create KanbanBoard component using @dnd-kit/core in src/components/views/kanban/KanbanBoard.tsx
- [ ] T081 [P] [US7] Create DraggableCard component in src/components/views/kanban/DraggableCard.tsx
- [ ] T082 [P] [US7] Create CalendarView component in src/components/views/calendar/CalendarView.tsx (wrapper for existing calendar lib)
- [ ] T083 [US7] Add views locale strings in src/i18n/locales/en/views.json
- [ ] T084 [US7] Modify AssetList page to integrate ViewSelector and FilterBuilder
- [ ] T085 [US7] Implement collapsed group state persistence in dataViewStore
- [ ] T086 [US7] Integrate kanban drag-and-drop with undo service (record status changes)
- [ ] T087 [US7] Implement adaptive pagination (Gallery 24/page, Table virtual 100 window, Kanban 20/column, Calendar none)

**Checkpoint**: User Story 7 complete - all view types with filters/sorts/grouping work independently

---

## Phase 7: User Story 4 - Fixed Kits with Property Inheritance (Priority: P2)

**Goal**: Create fixed kits where sub-assets inherit location, status, or tags from parent kit

**Independent Test**: Create kit with 3 sub-assets, enable location inheritance, change kit location, verify sub-assets auto-update, disassemble kit, verify unlocked

### TDD Tests for User Story 4 (REQUIRED - TDD approach for PropertyInheritanceService)

- [ ] T088 [P] [US4] Write RED test for getInheritedProperties calculation in src/tests/services/PropertyInheritanceService.test.ts
- [ ] T089 [P] [US4] Write RED test for isPropertyInherited detection in src/tests/services/PropertyInheritanceService.test.ts
- [ ] T090 [P] [US4] Write RED test for propagateKitChange (location) in src/tests/services/PropertyInheritanceService.test.ts
- [ ] T091 [P] [US4] Write RED test for propagateKitChange (status) in src/tests/services/PropertyInheritanceService.test.ts
- [ ] T092 [P] [US4] Write RED test for propagateKitChange (tags) in src/tests/services/PropertyInheritanceService.test.ts
- [ ] T093 [P] [US4] Write RED test for unlockInheritedProperties on disassembly in src/tests/services/PropertyInheritanceService.test.ts
- [ ] T094 [P] [US4] Write RED test for compound undo action recording in src/tests/services/PropertyInheritanceService.test.ts
- [ ] T095 [P] [US4] Write RED test for rejecting non-inherited property propagation in src/tests/services/PropertyInheritanceService.test.ts

### Implementation for User Story 4

- [ ] T096 [US4] Implement PropertyInheritanceService (GREEN) in src/services/PropertyInheritanceService.ts - pass all RED tests from T088-T095
- [ ] T097 [US4] Implement KitService in src/services/KitService.ts (createKit, updateKit, deleteKit, assembleKit, disassembleKit, getKitSubAssets)
- [ ] T098 [US4] Create Zustand kit store in src/stores/kitStore.ts
- [ ] T099 [US4] Create useKits hook in src/hooks/useKits.ts
- [ ] T100 [US4] Create usePropertyInheritance hook in src/hooks/usePropertyInheritance.ts
- [ ] T101 [P] [US4] Create KitForm component in src/components/kits/KitForm.tsx (with inheritance config checkboxes)
- [ ] T102 [P] [US4] Create KitDetailView component in src/components/kits/KitDetailView.tsx
- [ ] T103 [P] [US4] Create PropertyInheritanceIndicator component in src/components/kits/PropertyInheritanceIndicator.tsx (locked field with tooltip)
- [ ] T104 [US4] Add kits locale strings in src/i18n/locales/en/kits.json
- [ ] T105 [US4] Create KitList page in src/pages/KitList.tsx
- [ ] T106 [US4] Create KitDetail page in src/pages/KitDetail.tsx
- [ ] T107 [US4] Modify AssetDetail page to show PropertyInheritanceIndicator for inherited fields
- [ ] T108 [US4] Implement completeness status auto-calculation (incomplete if any sub-asset broken)
- [ ] T109 [US4] Integrate kit operations with undo service (record assembly/disassembly/propagation as compound actions)
- [ ] T110 [US4] REFACTOR: Review PropertyInheritanceService for edge cases

**Checkpoint**: User Story 4 complete - fixed kits with property inheritance work independently

---

## Phase 8: User Story 5 - Asset Models as Templates (Priority: P2)

**Goal**: Create asset models as templates to quickly create assets with pre-filled defaults

**Independent Test**: Create model "Dell Latitude 5510", create 3 assets from model, verify inherited properties

### Implementation for User Story 5

- [ ] T111 [US5] Implement AssetModelService in src/services/AssetModelService.ts (createModel, updateModel, deleteModel, getModels, createAssetFromModel)
- [ ] T112 [US5] Create Zustand model store in src/stores/modelStore.ts
- [ ] T113 [US5] Create useAssetModels hook in src/hooks/useAssetModels.ts
- [ ] T114 [P] [US5] Create AssetModelForm component in src/components/models/AssetModelForm.tsx
- [ ] T115 [P] [US5] Create ModelTemplateSelector component in src/components/models/ModelTemplateSelector.tsx (dropdown in AssetForm)
- [ ] T116 [US5] Add models locale strings in src/i18n/locales/en/models.json
- [ ] T117 [US5] Create AssetModelList page in src/pages/AssetModelList.tsx
- [ ] T118 [US5] Modify AssetForm to include ModelTemplateSelector (pre-fill fields from model)
- [ ] T119 [US5] Implement tag propagation confirmation prompt when editing model tags
- [ ] T120 [US5] Integrate model operations with undo service

**Checkpoint**: User Story 5 complete - asset models work as templates independently

---

## Phase 9: User Story 6 - Tagging System (Priority: P2)

**Goal**: Tag assets/kits/models with visual inheritance indicators

**Independent Test**: Create tag "Production Equipment", apply to kit, verify sub-assets show inherited tag with indicator, try to remove from sub-asset (prevented)

### Implementation for User Story 6

- [ ] T121 [US6] Implement TagService in src/services/TagService.ts (createTag, updateTag, deleteTag, getTags, applyTagToEntity, removeTagFromEntity)
- [ ] T122 [US6] Create Zustand tag store in src/stores/tagStore.ts
- [ ] T123 [US6] Create useTags hook in src/hooks/useTags.ts
- [ ] T124 [P] [US6] Create TagInput component in src/components/tags/TagInput.tsx (multi-select with color badges)
- [ ] T125 [P] [US6] Create InheritedTagBadge component in src/components/tags/InheritedTagBadge.tsx (icon + tooltip showing source)
- [ ] T126 [P] [US6] Create TagPropagationConfirmation component in src/components/tags/TagPropagationConfirmation.tsx (modal)
- [ ] T127 [US6] Add tags locale strings in src/i18n/locales/en/tags.json
- [ ] T128 [US6] Modify AssetDetail page to display TagInput with inherited vs direct tags
- [ ] T129 [US6] Modify KitDetail page to display TagInput with propagation confirmation
- [ ] T130 [US6] Implement tag propagation logic (kit → sub-assets, model → created assets)
- [ ] T131 [US6] Prevent removal of inherited tags from sub-assets (show error tooltip)
- [ ] T132 [US6] Integrate tag operations with undo service

**Checkpoint**: User Story 6 complete - tagging with inheritance works independently

---

## Phase 10: User Story 9 - Maintenance Management (Priority: P2)

**Goal**: Define maintenance companies, rules, and create work orders with state machine transitions

**Independent Test**: Create company "AC Experts", create rule "Inspect AC every 6 months", verify rule applies to tagged assets, create work order, transition through states

### TDD Tests for User Story 9 (REQUIRED - TDD approach for WorkOrderStateMachine)

- [ ] T133 [P] [US9] Write RED test for canTransition (internal valid transitions) in src/tests/services/WorkOrderStateMachine.test.ts
- [ ] T134 [P] [US9] Write RED test for canTransition (external valid transitions) in src/tests/services/WorkOrderStateMachine.test.ts
- [ ] T135 [P] [US9] Write RED test for rejecting invalid transitions in src/tests/services/WorkOrderStateMachine.test.ts
- [ ] T136 [P] [US9] Write RED test for prerequisite validation (assignedTo required for 'assigned') in src/tests/services/WorkOrderStateMachine.test.ts
- [ ] T137 [P] [US9] Write RED test for state history recording in src/tests/services/WorkOrderStateMachine.test.ts
- [ ] T138 [P] [US9] Write RED test for reopen capability (completed → in_progress) in src/tests/services/WorkOrderStateMachine.test.ts
- [ ] T139 [P] [US9] Write RED test for terminal states (done, aborted, obsolete) in src/tests/services/WorkOrderStateMachine.test.ts

### Implementation for User Story 9

- [ ] T140 [US9] Implement internal WorkOrderStateMachine using XState (GREEN) in src/services/machines/InternalWorkOrderMachine.ts - pass RED tests T133-T139
- [ ] T141 [US9] Implement external WorkOrderStateMachine using XState (GREEN) in src/services/machines/ExternalWorkOrderMachine.ts - pass RED tests T134-T139
- [ ] T142 [US9] Implement MaintenanceService in src/services/MaintenanceService.ts (all company/rule/work order CRUD, detectRuleConflicts, createWorkOrderFromRule, transitionWorkOrderState, markAssetComplete)
- [ ] T143 [US9] Create Zustand maintenance store in src/stores/maintenanceStore.ts
- [ ] T144 [US9] Create useMaintenance hook in src/hooks/useMaintenance.ts
- [ ] T145 [P] [US9] Create MaintenanceCompanyForm component in src/components/maintenance/MaintenanceCompanyForm.tsx
- [ ] T146 [P] [US9] Create MaintenanceRuleForm component in src/components/maintenance/MaintenanceRuleForm.tsx (applies-to selector)
- [ ] T147 [P] [US9] Create WorkOrderForm component in src/components/maintenance/WorkOrderForm.tsx
- [ ] T148 [P] [US9] Create WorkOrderStateTransition component in src/components/maintenance/WorkOrderStateTransition.tsx (shows allowed next states)
- [ ] T149 [P] [US9] Create OfferManagement component in src/components/maintenance/OfferManagement.tsx (for external work orders)
- [ ] T150 [US9] Add maintenance locale strings in src/i18n/locales/en/maintenance.json
- [ ] T151 [US9] Create MaintenanceCompanies page in src/pages/MaintenanceCompanies.tsx
- [ ] T152 [US9] Create MaintenanceRules page in src/pages/MaintenanceRules.tsx
- [ ] T153 [US9] Create WorkOrders page in src/pages/WorkOrders.tsx (table/kanban/timeline views)
- [ ] T154 [US9] Implement rule conflict detection UI (highlight overlapping rules in red)
- [ ] T155 [US9] Implement work order auto-generation from rules (background job at 00:05)
- [ ] T156 [US9] Register work order creation job in BackgroundJobService
- [ ] T157 [US9] Integrate maintenance operations with undo service
- [ ] T158 [US9] REFACTOR: Review XState machines for state coverage

**Checkpoint**: User Story 9 complete - maintenance management with state machines works independently

---

## Phase 11: User Story 10 - Work Order Tracking (Priority: P2)

**Goal**: Create and track work orders with per-asset completion status

**Independent Test**: Create internal work order for 3 assets, assign to staff, transition Backlog → Assigned → In Progress → Completed → Done, verify state history

### Implementation for User Story 10 (depends on User Story 9 state machines)

- [ ] T159 [US10] Extend WorkOrderForm for per-asset scheduling in src/components/maintenance/WorkOrderForm.tsx
- [ ] T160 [P] [US10] Create AssetScheduleTable component in src/components/maintenance/AssetScheduleTable.tsx (shows completion status per asset)
- [ ] T161 [P] [US10] Create WorkOrderStateHistory component in src/components/maintenance/WorkOrderStateHistory.tsx (timeline)
- [ ] T162 [US10] Implement markAssetComplete functionality in WorkOrderForm
- [ ] T163 [US10] Add partial completion indicator ("3/5 assets completed")
- [ ] T164 [US10] Implement approval workflow (assign approvalResponsible, notify when completed)
- [ ] T165 [US10] Stub invoicing UI (upload button present but non-functional, shows "Coming Soon")
- [ ] T166 [US10] Integrate per-asset completion with undo service

**Checkpoint**: User Story 10 complete - work order tracking with per-asset status works independently

---

## Phase 12: User Story 8 - Dashboard Widgets (Priority: P3)

**Goal**: Display fixed dashboard with key metrics and alerts

**Independent Test**: Open dashboard, verify widgets show correct counts (assigned assets, broken assets, maintenance due)

### Implementation for User Story 8

- [ ] T167 [US8] Create Dashboard page in src/pages/Dashboard.tsx
- [ ] T168 [P] [US8] Create DashboardGrid layout component in src/components/dashboard/DashboardGrid.tsx
- [ ] T169 [P] [US8] Create MyAssignedAssets widget in src/components/dashboard/widgets/MyAssignedAssets.tsx
- [ ] T170 [P] [US8] Create AssetsNeedingAttention widget in src/components/dashboard/widgets/AssetsNeedingAttention.tsx
- [ ] T171 [P] [US8] Create UpcomingMaintenance widget in src/components/dashboard/widgets/UpcomingMaintenance.tsx
- [ ] T172 [P] [US8] Create RecentActivityTimeline widget in src/components/dashboard/widgets/RecentActivityTimeline.tsx
- [ ] T173 [P] [US8] Create UtilizationStats widget in src/components/dashboard/widgets/UtilizationStats.tsx
- [ ] T174 [P] [US8] Create OverdueWorkOrders widget in src/components/dashboard/widgets/OverdueWorkOrders.tsx
- [ ] T175 [US8] Add dashboard locale strings in src/i18n/locales/en/dashboard.json
- [ ] T176 [US8] Link widgets to filtered views (e.g., "View All" opens AssetList with broken filter)
- [ ] T177 [US8] Implement real-time count updates using TanStack Query

**Checkpoint**: User Story 8 complete - dashboard displays accurate metrics independently

---

## Phase 13: User Story 11 - Settings Versioning (Priority: P3)

**Goal**: Export/import settings as JSON with rollback capability

**Independent Test**: Export settings, modify scanner prefix, import exported JSON, verify rollback to previous state

### Implementation for User Story 11

- [ ] T178 [US11] Implement SettingsVersionService in src/services/SettingsVersionService.ts (createVersion, getVersionHistory, rollbackToVersion, exportSettings, importSettings, cleanupExpiredVersions)
- [ ] T179 [US11] Create Zustand settings store in src/stores/settingsStore.ts
- [ ] T180 [US11] Create useSettingsVersions hook in src/hooks/useSettingsVersions.ts
- [ ] T181 [P] [US11] Create SettingsVersionHistory component in src/components/settings/SettingsVersionHistory.tsx (table with rollback buttons)
- [ ] T182 [P] [US11] Create SettingsExportImport component in src/components/settings/SettingsExportImport.tsx (export/import buttons)
- [ ] T183 [US11] Add settings locale strings in src/i18n/locales/en/settings.json
- [ ] T184 [US11] Modify Settings page to include SettingsVersionHistory and SettingsExportImport
- [ ] T185 [US11] Implement JSON schema validation on import (Zod schema)
- [ ] T186 [US11] Implement version age warning indicator (85-90 days old)
- [ ] T187 [US11] Register settings cleanup job in BackgroundJobService (90-day retention, preserve latest)
- [ ] T188 [US11] Integrate settings operations with undo service (record version creation/rollback)

**Checkpoint**: User Story 11 complete - settings versioning with export/import works independently

---

## Phase 14: Code Cleanup & i18n Finalization

**Purpose**: Remove legacy code and finalize internationalization

- [ ] T189 [P] Remove asset type template entities and UI (FR-006)
- [ ] T190 [P] Remove offline database storage and sync logic (FR-007)
- [ ] T191 [P] Remove demo data seeding (keep only in tests/fixtures/) (FR-008)
- [ ] T192 Run German text detection script and fix all violations in src/
- [ ] T193 Audit codebase for unused imports, functions, components (FR-009)
- [ ] T194 [P] Add missing locale strings for all new features
- [ ] T195 Verify all user-facing strings use i18next (no hardcoded English)

---

## Phase 15: Polish & Cross-Cutting Concerns

**Purpose**: Final quality improvements across all user stories

- [ ] T196 [P] Update user guide in docs/user-guide.md (add sections for all 11 user stories)
- [ ] T197 [P] Update API documentation in docs/api.md (new entities and endpoints)
- [ ] T198 Code cleanup and refactoring (remove console.log, debug code)
- [ ] T199 Performance optimization (lazy loading for maintenance module, code splitting)
- [ ] T200 [P] Add E2E tests for critical user journeys (optional)
- [ ] T201 Security review (XSS prevention in photo upload, input validation)
- [ ] T202 Run quickstart.md validation checklist

---

## Phase 16: New Requirements from Supplementary Documents

**Purpose**: Implement requirements from the 9 supplementary documentation files

### Design System Implementation [DESIGN_SYSTEM.md]

- [ ] T203 [P] Create Mantine theme configuration in src/theme/mantineTheme.ts with approved tokens
- [ ] T204 [P] Document component patterns in Storybook (optional)
- [ ] T205 [P] Run Lighthouse accessibility audit on all pages (target ≥90)
- [ ] T206 [P] Verify WCAG 2.1 Level AA contrast ratios (4.5:1 text, 3:1 UI)

### Error Handling & Validation [ERROR_HANDLING.md, SCHEMA_VERSIONING.md]

- [ ] T207 [P] Create error notification components in src/components/errors/
- [ ] T208 [P] Add Zod validation to all form submissions
- [ ] T209 [P] Write schema migration functions for each entity version
- [ ] T210 [P] Create schema version detection utility
- [ ] T211 [P] Add ESLint rule for JSDoc coverage
- [ ] T212 [P] Write tests for schema migrations (v1.0 → v1.1 → v2.0)

### Routing & Navigation [ROUTING.md]

- [ ] T213 [P] Implement breadcrumb auto-generation component
- [ ] T214 [P] Create 404 and 403 error pages
- [ ] T215 [P] Add deep linking support with query parameters
- [ ] T216 [P] Implement protected routes with permission guards
- [ ] T217 [P] Add route testing utilities

### API Error Handling & Rate Limiting [API_ERROR_HANDLING.md, RATE_LIMITING.md]

- [ ] T218 [P] Implement exponential backoff with jitter for retries
- [ ] T219 [P] Create status-specific error handlers (401/403/429/5xx)
- [ ] T220 [P] Add request queue with priority system (high/medium/low)
- [ ] T221 [P] Implement rate limit detection from response headers
- [ ] T222 [P] Create rate limit banner UI component
- [ ] T223 [P] Add rate limit monitoring and metrics
- [ ] T224 [P] Configure TanStack Query retry behavior (staleTime: 60s, cacheTime: 5min)
- [ ] T225 [P] Write tests for retry logic and error handlers

### Bulk Operations [BULK_OPERATIONS.md]

- [ ] T226 [P] Implement bulk selection UI (checkboxes, select all, range select)
- [ ] T227 [P] Create bulk actions menu dropdown
- [ ] T228 [P] Implement bulk operation progress dialog with cancel
- [ ] T229 [P] Add bulk operation results summary with retry
- [ ] T230 [P] Implement keyboard shortcuts (Ctrl+A, Shift+Click, Escape)
- [ ] T231 [P] Add virtual scrolling for 1000+ items
- [ ] T232 [P] Write tests for bulk operations (1000-item limit, partial success)

### Date Validation & Handling [DATE_VALIDATION.md]

- [ ] T233 [P] Implement relative date range helpers (last 0-730 days, next 1-365 days)
- [ ] T234 [P] Create quick date filter buttons (Today, Yesterday, Last 7 Days, etc.)
- [ ] T235 [P] Add custom date range input with validation
- [ ] T236 [P] Implement timezone conversion (store UTC, display local)
- [ ] T237 [P] Handle month-end edge cases (Jan 31 + 1 month = Feb 28/29)
- [ ] T238 [P] Write tests for date validation and edge cases (leap years, DST)

### Deletion Policy [DELETION_POLICY.md]

- [ ] T239 [P] Implement soft delete for all entities (add deletedAt timestamp)
- [ ] T240 [P] Create entity-specific cascade rules
- [ ] T241 [P] Add 90-day cleanup job for soft-deleted records
- [ ] T242 [P] Implement "Restore" functionality in trash view
- [ ] T243 [P] Write tests for soft delete and cascade behavior

**Checkpoint**: All supplementary requirements implemented

---

## Pre-Deployment Quality Gates

**Pre-Deployment Quality Gates**:
- [ ] TypeScript compilation passes with no errors (`npm run type-check`)
- [ ] All ESLint rules passing with no warnings (`npm run lint`)
- [ ] Bundle size verified < 200 KB gzipped (`npm run bundle-analyze`)
- [ ] All TDD tests passing for 4 critical services (`npm test`)
- [ ] Manual testing completed for all P1 user stories (US1, US2, US3, US7)
- [ ] Manual testing completed in ChurchTools embedded mode
- [ ] German text detection returns zero results (`npm run detect-german`)
- [ ] Cross-browser testing (Chrome, Safari, Firefox)
- [ ] No console.log or debug statements in production code
- [ ] API error handling verified (network failures, rate limits)
- [ ] Performance budget met (<1s initial load on 3G, <100ms interactions)
- [ ] Accessibility check (keyboard navigation, ARIA labels, screen reader support)
- [ ] Lighthouse score ≥90 for accessibility [DESIGN_SYSTEM.md]
- [ ] All 9 supplementary requirement documents validated
- [ ] Version number updated in package.json
- [ ] Changelog/release notes prepared

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately ✅
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-13)**: All depend on Foundational phase completion
  - User stories can proceed in parallel (if staffed) OR sequentially by priority
- **Cleanup (Phase 14)**: Can start any time after US1 complete
- **Polish (Phase 15)**: Depends on all desired user stories being complete
- **Supplementary Requirements (Phase 16)**: Can start in parallel with user stories after Phase 2, some tasks integrate with specific user stories

### User Story Dependencies

**Critical Path (P1 - Must have for MVP)**:
- **US1 Undo (Phase 3)**: No dependencies → Can start after Phase 2 ✅
- **US2 Damage (Phase 4)**: No dependencies → Can start after Phase 2 ✅
- **US3 Assignment (Phase 5)**: No dependencies → Can start after Phase 2 ✅
- **US7 Data Views (Phase 6)**: No dependencies → Can start after Phase 2 ✅

**Important Features (P2 - Recommended)**:
- **US4 Kits (Phase 7)**: No dependencies → Can start after Phase 2 ✅
- **US5 Models (Phase 8)**: Integrates with US6 (tags) but independently testable
- **US6 Tags (Phase 9)**: No dependencies → Can start after Phase 2 ✅
- **US9 Maintenance (Phase 10)**: No dependencies → Can start after Phase 2 ✅
- **US10 Work Orders (Phase 11)**: Depends on US9 (state machines) ⚠️

**Nice to Have (P3 - Optional)**:
- **US8 Dashboard (Phase 12)**: Depends on US2, US3, US9 for widget data ⚠️
- **US11 Settings (Phase 13)**: No dependencies → Can start after Phase 2 ✅

### Within Each User Story

1. **Tests FIRST** (RED state): Write failing tests before implementation
2. **Verify RED**: Confirm tests fail with clear error messages
3. **Implementation** (GREEN state): Write minimal code to pass tests
4. **Run tests**: Confirm all tests pass
5. **Refactor**: Improve code quality while keeping tests green
6. **Commit**: Tests first, then implementation
7. **Integration**: Connect to UI, undo service, stores

### Parallel Opportunities Per Phase

**Phase 2 (Foundational)**: All type definition tasks (T006-T014) can run in parallel, all utility tasks (T016-T019) can run in parallel

**Phase 3 (US1 Undo)**: All RED test tasks (T021-T027) can run in parallel, UI components (T031-T032) can run in parallel

**Phase 4 (US2 Damage)**: All RED test tasks (T037-T041) can run in parallel, UI components (T046-T048) can run in parallel

**Phase 5 (US3 Assignment)**: UI components (T058-T060) can run in parallel

**Phase 6 (US7 Data Views)**: All RED test tasks (T066-T069) can run in parallel, UI components (T073-T076, T078-T082) can run in parallel

**Phase 7 (US4 Kits)**: All RED test tasks (T088-T095) can run in parallel, UI components (T101-T103) can run in parallel

**Phase 8 (US5 Models)**: UI components (T114-T115) can run in parallel

**Phase 9 (US6 Tags)**: UI components (T124-T126) can run in parallel

**Phase 10 (US9 Maintenance)**: All RED test tasks (T133-T139) can run in parallel, UI components (T145-T149) can run in parallel

**Phase 11 (US10 Work Orders)**: UI components (T160-T161) can run in parallel

**Phase 12 (US8 Dashboard)**: All widget components (T169-T174) can run in parallel

**Phase 13 (US11 Settings)**: UI components (T181-T182) can run in parallel

**Phase 14 (Cleanup)**: All removal tasks (T189-T191) can run in parallel

**Phase 15 (Polish)**: Documentation tasks (T196-T197) can run in parallel

---

## Parallel Example: User Story 1 (Undo)

**Session 1: RED Phase**
```bash
# Launch all test writing in parallel (different test files):
Task T021: Write RED test for recordAction
Task T022: Write RED test for recordCompoundAction
Task T023: Write RED test for undoAction
Task T024: Write RED test for rejecting expired undo
Task T025: Write RED test for rejecting already-undone
Task T026: Write RED test for getUserUndoHistory
Task T027: Write RED test for cleanupExpired

# Verify all tests FAIL (RED state confirmed)
npm test src/tests/services/UndoService.test.ts
```

**Session 2: GREEN Phase**
```bash
# Implement UndoService to pass all tests
Task T028: Implement UndoService (GREEN)

# Run tests (should all PASS)
npm test src/tests/services/UndoService.test.ts
```

**Session 3: Integration**
```bash
# Build supporting infrastructure in parallel:
Task T029: Create undoStore
Task T030: Create useUndo hook
Task T031: Create UndoHistory component
Task T032: Create UndoButton component
```

---

## Implementation Strategy

### Recommended MVP Scope (Deliver Value Fast)

**Minimum Viable Product (5-7 weeks)**:
1. Complete Phase 1: Setup (2-3 days) - **9 tasks including new deps**
2. Complete Phase 2: Foundational (3-4 days) - **23 tasks including new infrastructure**
3. Complete Phase 3: User Story 1 - Undo (1 week, TDD required)
4. Complete Phase 4: User Story 2 - Damage Tracking (1 week, TDD required)
5. Complete Phase 5: User Story 3 - Assignment (4-5 days)
6. Complete Phase 6: User Story 7 - Data Views (1 week, TDD recommended)
7. Complete Phase 16 (Subset): Core supplementary requirements (1 week)
   - Design system setup (T203-T206): 2 days
   - Error handling & Zod validation (T207-T208): 2 days
   - Routing & navigation (T213-T216): 1 day
   - API error handling & rate limiting (T218-T224): 2 days
8. Complete Phase 14: Cleanup (2-3 days)
9. Complete Phase 15: Polish (2-3 days)

**Result**: Working inventory system with undo, damage tracking, assignments, powerful data views, and production-ready error handling, routing, and rate limiting

**Total MVP Tasks**: ~120 tasks (was ~90, added 30 from supplementary requirements)

### Incremental Delivery (Add Features Over Time)

**Release 1 (MVP)**: P1 features only (US1, US2, US3, US7)
- Undo, damage, assignment, data views
- Deploy and gather feedback

**Release 2**: Add P2 core features (US4, US6, US9)
- Kits with inheritance, tagging, maintenance management
- Deploy and gather feedback

**Release 3**: Add P2 extended features (US5, US10)
- Asset models, work order tracking
- Deploy and gather feedback

**Release 4**: Add P3 features (US8, US11)
- Dashboard, settings versioning
- Final polish and optimization

### Parallel Team Strategy (3+ Developers)

**After Phase 2 Foundational Complete**:
- **Developer A**: User Story 1 (Undo) + User Story 4 (Kits) - TDD expert
- **Developer B**: User Story 2 (Damage) + User Story 3 (Assignment) - UI focus
- **Developer C**: User Story 7 (Data Views) + User Story 6 (Tags) - Complex logic
- **Developer D**: User Story 9 (Maintenance) + User Story 10 (Work Orders) - State machines

Each developer owns their stories end-to-end (tests, services, UI, integration)

---

## Notes

- **[P]** tasks = different files, no dependencies, can run in parallel
- **[Story]** label maps task to specific user story for traceability and independent delivery
- **TDD REQUIRED** for 4 services per Constitution Principle V: UndoService, PhotoStorageService, PropertyInheritanceService, WorkOrderStateMachine
- **TDD RECOMMENDED** for DataViewService (complex filter logic)
- Each user story should be independently completable and testable
- **RED-GREEN-REFACTOR** cycle: Write failing tests → Implement → Pass tests → Improve code
- Commit tests before implementation (demonstrates TDD approach)
- Stop at any checkpoint to validate story independently
- Bundle size monitoring critical - check after adding each module
- German text detection must return zero results before deployment

---

## Total Task Count

- **Setup**: 9 tasks (was 5, added 4 from supplementary docs)
- **Foundational**: 23 tasks (was 15, added 8 from supplementary docs)
- **User Story 1 (Undo)**: 16 tasks (7 RED tests + 9 implementation)
- **User Story 2 (Damage)**: 17 tasks (5 RED tests + 12 implementation)
- **User Story 3 (Assignment)**: 12 tasks
- **User Story 7 (Data Views)**: 22 tasks (4 RED tests + 18 implementation)
- **User Story 4 (Kits)**: 23 tasks (8 RED tests + 15 implementation)
- **User Story 5 (Models)**: 10 tasks
- **User Story 6 (Tags)**: 12 tasks
- **User Story 9 (Maintenance)**: 26 tasks (7 RED tests + 19 implementation)
- **User Story 10 (Work Orders)**: 8 tasks
- **User Story 8 (Dashboard)**: 11 tasks
- **User Story 11 (Settings)**: 11 tasks
- **Cleanup**: 7 tasks
- **Polish**: 7 tasks
- **Supplementary Requirements (Phase 16)**: 41 tasks (NEW - from 9 supplementary documents)

**Grand Total**: 255 tasks (was 201, added 54 from supplementary documents)

**Parallel Opportunities**: 90+ tasks marked [P] can run in parallel within their phases (was 60+)

**MVP Subset**: ~120 tasks (Phase 1-6 + Phase 14-16 supplementary subset) for P1 features only (was ~90)

**Key Additions from Supplementary Documents**:
- Design System: 4 tasks (Mantine theme, Storybook, accessibility audits)
- Error Handling & Validation: 6 tasks (Zod schemas, migrations, ESLint rules)
- Routing & Navigation: 5 tasks (breadcrumbs, error pages, deep linking)
- API Error Handling & Rate Limiting: 8 tasks (retry logic, rate limits, monitoring)
- Bulk Operations: 7 tasks (selection UI, progress dialogs, keyboard shortcuts)
- Date Validation: 6 tasks (relative dates, timezones, edge cases)
- Deletion Policy: 5 tasks (soft delete, cascade rules, cleanup jobs)
