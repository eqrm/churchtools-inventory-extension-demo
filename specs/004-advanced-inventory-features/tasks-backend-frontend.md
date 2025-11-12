# Tasks: Advanced Inventory Features (Backend/Frontend Split)

**Feature Branch**: `004-advanced-inventory-extension`  
**User Stories**: 11 total (5 P1, 4 P2, 2 P3)

**Task Numbering**:
- **B001-B150**: Backend tasks (services, stores, hooks, types, utilities, tests)
- **F001-F100**: Frontend tasks (React components, pages, UI integration)

**Instructions for Developers**:
- **Backend Developer**: Execute tasks B001-B150 in order (or marked [P] in parallel)
- **Frontend Developer**: Execute tasks F001-F100 in order (can start after B020 with mocked services)

---

# BACKEND TRACK (Backend Developer)

## Phase B1: Setup & Infrastructure

**Duration**: 2-3 days  
**Purpose**: Install dependencies, configure infrastructure, define all type contracts

- [ ] **B001** Install new dependencies (Dexie.js v3, i18next v23, react-i18next v13, @tanstack/react-virtual v3, xstate v5, @dnd-kit/core v6, @dnd-kit/sortable v6, @dnd-kit/utilities v6, react-day-picker v9, @axe-core/react v4, jest-axe v8)
- [ ] **B002** Configure i18next with English locale files in src/i18n/config.ts
- [ ] **B003** Create IndexedDB database schema using Dexie.js in src/services/db/UndoDatabase.ts
- [ ] **B004** Create IndexedDB database for settings versions in src/services/db/SettingsDatabase.ts
- [ ] **B005** Setup background job service skeleton in src/services/BackgroundJobService.ts

**Gates**:
- [ ] TypeScript strict mode verified in tsconfig.json
- [ ] ESLint configuration passing with no warnings
- [ ] Bundle size baseline measured (~130 KB currently)

---

## Phase B2: Type Definitions & Utilities

**Duration**: 2-3 days  
**Purpose**: Define all TypeScript interfaces and utility functions

**⚠️ HANDOFF POINT 1**: After B020, commit all types. Frontend can start F001 with mocked services.

- [ ] **B006** [P] Create UndoAction type definitions in src/types/undo.ts
- [ ] **B007** [P] Create DamageReport type definitions in src/types/damage.ts
- [ ] **B008** [P] Create Assignment type definitions in src/types/assignment.ts
- [ ] **B009** [P] Create FixedKit type definitions in src/types/kit.ts
- [ ] **B010** [P] Create AssetModel type definitions in src/types/model.ts
- [ ] **B011** [P] Create Tag type definitions in src/types/tag.ts
- [ ] **B012** [P] Create DataView and FilterCondition type definitions in src/types/view.ts
- [ ] **B013** [P] Create MaintenanceCompany, MaintenanceRule, WorkOrder type definitions in src/types/maintenance.ts
- [ ] **B014** [P] Create SettingsVersion type definitions in src/types/settings.ts
- [ ] **B015** Modify Asset entity in src/types/asset.ts (add kitId, modelId, tags, inheritedTags, currentAssignmentId, expand status enum)
- [ ] **B016** [P] Create image compression utility in src/utils/imageCompression.ts
- [ ] **B017** [P] Create base64 encoding/decoding utilities in src/utils/base64Utils.ts
- [ ] **B018** [P] Create state machine helper utilities in src/utils/stateMachine.ts
- [ ] **B019** [P] Create relative date calculation utilities in src/utils/dateUtils.ts
- [ ] **B020** [P] Add English translations for common terms in src/i18n/locales/en/common.json

---

## Phase B3: User Story 1 - Undo Service (TDD REQUIRED)

**Duration**: 5-7 days  
**Goal**: Implement undo functionality with IndexedDB persistence

### TDD Tests (RED Phase)

- [ ] **B021** [P] Write RED test for recordAction (simple create/update/delete) in src/tests/services/UndoService.test.ts
- [ ] **B022** [P] Write RED test for recordCompoundAction (kit + sub-assets) in src/tests/services/UndoService.test.ts
- [ ] **B023** [P] Write RED test for undoAction (create/update/delete scenarios) in src/tests/services/UndoService.test.ts
- [ ] **B024** [P] Write RED test for rejecting expired undo (>24 hours) in src/tests/services/UndoService.test.ts
- [ ] **B025** [P] Write RED test for rejecting already-undone actions in src/tests/services/UndoService.test.ts
- [ ] **B026** [P] Write RED test for getUserUndoHistory (limit 50) in src/tests/services/UndoService.test.ts
- [ ] **B027** [P] Write RED test for cleanupExpired (removes only expired) in src/tests/services/UndoService.test.ts

**Commit checkpoint**: Commit failing tests before implementation

### Implementation (GREEN Phase)

- [ ] **B028** Implement UndoService (GREEN) in src/services/UndoService.ts - pass all RED tests from B021-B027
- [ ] **B029** Create Zustand undo store in src/stores/undoStore.ts
- [ ] **B030** Create useUndo hook in src/hooks/useUndo.ts (wraps UndoService with React Query)
- [ ] **B031** Add undo locale strings in src/i18n/locales/en/undo.json
- [ ] **B032** Register undo cleanup job in BackgroundJobService (24-hour retention)
- [ ] **B033** REFACTOR: Review UndoService code quality and simplify if needed

**⚠️ HANDOFF POINT 2**: After B030, UndoService complete. Frontend can integrate real service (F004-F006).

---

## Phase B4: User Story 2 - Damage Tracking (TDD REQUIRED)

**Duration**: 5-7 days  
**Goal**: Implement damage reports with photo storage

### TDD Tests (RED Phase)

- [ ] **B034** [P] Write RED test for compressImage (800x600 @ 0.8 quality) in src/tests/services/PhotoStorageService.test.ts
- [ ] **B035** [P] Write RED test for rejecting >2MB files in src/tests/services/PhotoStorageService.test.ts
- [ ] **B036** [P] Write RED test for rejecting >3 files in src/tests/services/PhotoStorageService.test.ts
- [ ] **B037** [P] Write RED test for storePhotos and retrievePhoto roundtrip in src/tests/services/PhotoStorageService.test.ts
- [ ] **B038** [P] Write RED test for feature flag switching (Mode A base64 vs Mode B Files API) in src/tests/services/PhotoStorageService.test.ts

**Commit checkpoint**: Commit failing tests before implementation

### Implementation (GREEN Phase)

- [ ] **B039** Implement PhotoStorageService (GREEN) in src/services/PhotoStorageService.ts - pass all RED tests from B034-B038
- [ ] **B040** Implement DamageService in src/services/DamageService.ts (createDamageReport, markAsRepaired, getRepairHistory, getBrokenAssets)
- [ ] **B041** Create Zustand damage store in src/stores/damageStore.ts
- [ ] **B042** Create useDamageReports hook in src/hooks/useDamageReports.ts
- [ ] **B043** Add damage locale strings in src/i18n/locales/en/damage.json
- [ ] **B044** Integrate damage reports with undo service (record create/repair actions)
- [ ] **B045** Update asset status to "Broken" when damage report created
- [ ] **B046** REFACTOR: Review PhotoStorageService abstraction for Files API migration readiness

**⚠️ HANDOFF POINT 3**: After B042, DamageService complete. Frontend can integrate real service (F010-F013).

---

## Phase B5: User Story 3 - Asset Assignment

**Duration**: 4-5 days  
**Goal**: Implement ChurchTools-integrated assignment system

- [ ] **B047** Implement AssignmentService in src/services/AssignmentService.ts (assignAsset, checkInAsset, getAssignmentHistory, getCurrentAssignment, getUserAssignments)
- [ ] **B048** Create Zustand assignment store in src/stores/assignmentStore.ts
- [ ] **B049** Create useAssignments hook in src/hooks/useAssignments.ts
- [ ] **B050** Create useChurchToolsSearch hook in src/hooks/useChurchToolsSearch.ts (debounced person/group search)
- [ ] **B051** Add assignment locale strings in src/i18n/locales/en/assignment.json
- [ ] **B052** Implement asset status auto-update (Available ↔ In Use) on assignment/check-in
- [ ] **B053** Integrate assignments with undo service (record assignment/check-in actions)

**⚠️ HANDOFF POINT 4**: After B050, AssignmentService complete. Frontend can integrate real service (F017-F021).

---

## Phase B6: User Story 7 - Data Views Backend

**Duration**: 5-7 days  
**Goal**: Implement filter execution and view persistence logic

### Tests (Recommended)

- [ ] **B054** [P] Write tests for applyFilters (text, date, tag, number, empty filters) in src/tests/services/DataViewService.test.ts
- [ ] **B055** [P] Write tests for relative date resolution (last 7 days, next 30 days) in src/tests/services/DataViewService.test.ts
- [ ] **B056** [P] Write tests for applySorts (single and multi-field) in src/tests/services/DataViewService.test.ts
- [ ] **B057** [P] Write tests for groupAssets logic in src/tests/services/DataViewService.test.ts

### Implementation

- [ ] **B058** Implement DataViewService (pass tests B054-B057) in src/services/DataViewService.ts (createView, updateView, deleteView, getUserViews, applyFilters, applySorts, groupAssets)
- [ ] **B059** Create Zustand data view store in src/stores/dataViewStore.ts
- [ ] **B060** Create useDataViews hook in src/hooks/useDataViews.ts
- [ ] **B061** Add views locale strings in src/i18n/locales/en/views.json
- [ ] **B062** Implement collapsed group state persistence in dataViewStore

**⚠️ HANDOFF POINT 5**: After B060, DataViewService complete. Frontend can integrate real service (F025-F037).

---

## Phase B7: User Story 4 - Property Inheritance (TDD REQUIRED)

**Duration**: 6-8 days  
**Goal**: Implement kit property inheritance logic

### TDD Tests (RED Phase)

- [ ] **B063** [P] Write RED test for getInheritedProperties calculation in src/tests/services/PropertyInheritanceService.test.ts
- [ ] **B064** [P] Write RED test for isPropertyInherited detection in src/tests/services/PropertyInheritanceService.test.ts
- [ ] **B065** [P] Write RED test for propagateKitChange (location) in src/tests/services/PropertyInheritanceService.test.ts
- [ ] **B066** [P] Write RED test for propagateKitChange (status) in src/tests/services/PropertyInheritanceService.test.ts
- [ ] **B067** [P] Write RED test for propagateKitChange (tags) in src/tests/services/PropertyInheritanceService.test.ts
- [ ] **B068** [P] Write RED test for unlockInheritedProperties on disassembly in src/tests/services/PropertyInheritanceService.test.ts
- [ ] **B069** [P] Write RED test for compound undo action recording in src/tests/services/PropertyInheritanceService.test.ts
- [ ] **B070** [P] Write RED test for rejecting non-inherited property propagation in src/tests/services/PropertyInheritanceService.test.ts

**Commit checkpoint**: Commit failing tests before implementation

### Implementation (GREEN Phase)

- [ ] **B071** Implement PropertyInheritanceService (GREEN) in src/services/PropertyInheritanceService.ts - pass all RED tests from B063-B070
- [ ] **B072** Implement KitService in src/services/KitService.ts (createKit, updateKit, deleteKit, assembleKit, disassembleKit, getKitSubAssets)
- [ ] **B073** Create Zustand kit store in src/stores/kitStore.ts
- [ ] **B074** Create useKits hook in src/hooks/useKits.ts
- [ ] **B075** Create usePropertyInheritance hook in src/hooks/usePropertyInheritance.ts
- [ ] **B076** Add kits locale strings in src/i18n/locales/en/kits.json
- [ ] **B077** Implement completeness status auto-calculation (incomplete if any sub-asset broken)
- [ ] **B078** Integrate kit operations with undo service (record assembly/disassembly/propagation as compound actions)
- [ ] **B079** REFACTOR: Review PropertyInheritanceService for edge cases

**⚠️ HANDOFF POINT 6**: After B075, KitService complete. Frontend can integrate real service (F041-F047).

---

## Phase B8: User Story 5 - AssetModel Templates

**Duration**: 3-4 days  
**Goal**: Implement model template system

- [ ] **B080** Implement AssetModelService in src/services/AssetModelService.ts (createModel, updateModel, deleteModel, getModels, createAssetFromModel)
- [ ] **B081** Create Zustand model store in src/stores/modelStore.ts
- [ ] **B082** Create useAssetModels hook in src/hooks/useAssetModels.ts
- [ ] **B083** Add models locale strings in src/i18n/locales/en/models.json
- [ ] **B084** Integrate model operations with undo service

**⚠️ HANDOFF POINT 7**: After B082, AssetModelService complete. Frontend can integrate real service (F051-F055).

---

## Phase B9: User Story 6 - Tagging System

**Duration**: 3-4 days  
**Goal**: Implement tag propagation logic

- [ ] **B085** Implement TagService in src/services/TagService.ts (createTag, updateTag, deleteTag, getTags, applyTagToEntity, removeTagFromEntity)
- [ ] **B086** Create Zustand tag store in src/stores/tagStore.ts
- [ ] **B087** Create useTags hook in src/hooks/useTags.ts
- [ ] **B088** Add tags locale strings in src/i18n/locales/en/tags.json
- [ ] **B089** Implement tag propagation logic (kit → sub-assets, model → created assets)
- [ ] **B090** Integrate tag operations with undo service

**⚠️ HANDOFF POINT 8**: After B087, TagService complete. Frontend can integrate real service (F059-F065).

---

## Phase B10: User Story 9 - Maintenance Management (TDD REQUIRED)

**Duration**: 7-10 days  
**Goal**: Implement work order state machines and maintenance logic

### TDD Tests (RED Phase)

- [ ] **B091** [P] Write RED test for canTransition (internal valid transitions) in src/tests/services/WorkOrderStateMachine.test.ts
- [ ] **B092** [P] Write RED test for canTransition (external valid transitions) in src/tests/services/WorkOrderStateMachine.test.ts
- [ ] **B093** [P] Write RED test for rejecting invalid transitions in src/tests/services/WorkOrderStateMachine.test.ts
- [ ] **B094** [P] Write RED test for prerequisite validation (assignedTo required for 'assigned') in src/tests/services/WorkOrderStateMachine.test.ts
- [ ] **B095** [P] Write RED test for state history recording in src/tests/services/WorkOrderStateMachine.test.ts
- [ ] **B096** [P] Write RED test for reopen capability (completed → in_progress) in src/tests/services/WorkOrderStateMachine.test.ts
- [ ] **B097** [P] Write RED test for terminal states (done, aborted, obsolete) in src/tests/services/WorkOrderStateMachine.test.ts

**Commit checkpoint**: Commit failing tests before implementation

### Implementation (GREEN Phase)

- [ ] **B098** Implement internal WorkOrderStateMachine using XState (GREEN) in src/services/machines/InternalWorkOrderMachine.ts - pass RED tests B091-B097
- [ ] **B099** Implement external WorkOrderStateMachine using XState (GREEN) in src/services/machines/ExternalWorkOrderMachine.ts - pass RED tests B092-B097
- [ ] **B100** Implement MaintenanceService in src/services/MaintenanceService.ts (all company/rule/work order CRUD, detectRuleConflicts, createWorkOrderFromRule, transitionWorkOrderState, markAssetComplete)
- [ ] **B101** Create Zustand maintenance store in src/stores/maintenanceStore.ts
- [ ] **B102** Create useMaintenance hook in src/hooks/useMaintenance.ts
- [ ] **B103** Add maintenance locale strings in src/i18n/locales/en/maintenance.json
- [ ] **B104** Implement work order auto-generation from rules (background job at 00:05)
- [ ] **B105** Register work order creation job in BackgroundJobService
- [ ] **B106** Integrate maintenance operations with undo service
- [ ] **B107** REFACTOR: Review XState machines for state coverage

**⚠️ HANDOFF POINT 9**: After B102, MaintenanceService complete. Frontend can integrate real service (F069-F083).

---

## Phase B11: User Story 10 - Work Order Tracking

**Duration**: 2-3 days (depends on Phase B10)  
**Goal**: Extend work order functionality for per-asset tracking

- [ ] **B108** Implement markAssetComplete functionality in MaintenanceService
- [ ] **B109** Integrate per-asset completion with undo service

**⚠️ HANDOFF POINT 10**: After B109, Work order tracking complete. Frontend can integrate (F084-F089).

---

## Phase B12: User Story 11 - Settings Versioning

**Duration**: 3-4 days  
**Goal**: Implement settings export/import/rollback

- [ ] **B110** Implement SettingsVersionService in src/services/SettingsVersionService.ts (createVersion, getVersionHistory, rollbackToVersion, exportSettings, importSettings, cleanupExpiredVersions)
- [ ] **B111** Create Zustand settings store in src/stores/settingsStore.ts
- [ ] **B112** Create useSettingsVersions hook in src/hooks/useSettingsVersions.ts
- [ ] **B113** Add settings locale strings in src/i18n/locales/en/settings.json
- [ ] **B114** Implement JSON schema validation on import (Zod schema)
- [ ] **B115** Register settings cleanup job in BackgroundJobService (90-day retention, preserve latest)
- [ ] **B116** Integrate settings operations with undo service (record version creation/rollback)

**⚠️ HANDOFF POINT 11**: After B112, SettingsVersionService complete. Frontend can integrate (F093-F097).

---

## Phase B13: Backend Cleanup

**Duration**: 2-3 days  
**Purpose**: Remove legacy code and finalize backend

- [ ] **B117** [P] Remove asset type template functionality (services, stores, hooks) (FR-006)
- [ ] **B118** [P] Remove offline database storage and sync logic (FR-007)
- [ ] **B119** [P] Remove demo data seeding from services (keep only in tests/fixtures/) (FR-008)
- [ ] **B120** Run German text detection script and fix violations in services/ and stores/
- [ ] **B121** Audit codebase for unused imports, functions in backend files (FR-009)
- [ ] **B122** Verify all error messages use i18next keys (automated ESLint rule)

**⚠️ HANDOFF POINT 12**: All backend APIs stable for final UI integration.

---

# FRONTEND TRACK (Frontend Developer)

## Phase F1: Setup & Mock Services

**Duration**: Can start immediately after B020 (types committed)  
**Purpose**: Set up component development environment

- [ ] **F001** Review all type definitions in src/types/ to understand data structures
- [ ] **F002** Create mock service implementations for local development (optional)
- [ ] **F003** Set up Storybook for component development (optional but recommended)

---

## Phase F2: User Story 1 - Undo UI

**Duration**: 2-3 days  
**Prerequisite**: B030 (useUndo hook) completed OR use mocked hook

- [ ] **F004** [P] Create UndoHistory component in src/components/undo/UndoHistory.tsx
- [ ] **F005** [P] Create UndoButton component in src/components/undo/UndoButton.tsx
- [ ] **F006** Integrate UndoHistory into existing layout (sidebar or header)

**Integration Point**: Once B030 complete, replace mocked hooks with real implementation

---

## Phase F3: User Story 2 - Damage Tracking UI

**Duration**: 3-4 days  
**Prerequisite**: B042 (useDamageReports hook) completed OR use mocked hook

- [ ] **F007** [P] Create PhotoUpload component in src/components/damage/PhotoUpload.tsx (with compression preview)
- [ ] **F008** [P] Create DamageReportForm component in src/components/damage/DamageReportForm.tsx
- [ ] **F009** [P] Create RepairHistoryTab component in src/components/damage/RepairHistoryTab.tsx
- [ ] **F010** Modify AssetDetail page to include "Mark as Broken" toggle and RepairHistoryTab in src/pages/AssetDetail.tsx

**Integration Point**: Once B042 complete, replace mocked hooks with real implementation

---

## Phase F4: User Story 3 - Assignment UI

**Duration**: 3-4 days  
**Prerequisite**: B050 (useChurchToolsSearch hook) completed OR use mocked hook

- [ ] **F011** [P] Create PersonSearch component in src/components/assignment/PersonSearch.tsx (autocomplete with ChurchTools API)
- [ ] **F012** [P] Create AssignmentField component in src/components/assignment/AssignmentField.tsx
- [ ] **F013** [P] Create AssignmentHistoryTab component in src/components/assignment/AssignmentHistoryTab.tsx
- [ ] **F014** Modify AssetDetail page to include AssignmentField and AssignmentHistoryTab in src/pages/AssetDetail.tsx
- [ ] **F015** Add confirmation popup when changing status of assigned asset (use Mantine Modal)

**Integration Point**: Once B050 complete, replace mocked hooks with real implementation

---

## Phase F5: User Story 7 - Data Views UI

**Duration**: 7-10 days  
**Prerequisite**: B060 (useDataViews hook) completed OR use mocked hook

- [ ] **F016** [P] Create ViewSelector component in src/components/views/ViewSelector.tsx (tabs for table/gallery/kanban/calendar)
- [ ] **F017** [P] Create FilterBuilder component in src/components/views/FilterBuilder.tsx (modal with filter DSL UI)
- [ ] **F018** [P] Create GroupingControls component in src/components/views/GroupingControls.tsx
- [ ] **F019** [P] Create DataViewList component in src/components/views/DataViewList.tsx (saved views)
- [ ] **F020** Create VirtualTable component using @tanstack/react-virtual in src/components/views/table/VirtualTable.tsx
- [ ] **F021** [P] Create GalleryGrid component in src/components/views/gallery/GalleryGrid.tsx
- [ ] **F022** [P] Create PaginationControls component in src/components/views/gallery/PaginationControls.tsx (24 items/page)
- [ ] **F023** Create KanbanBoard component using @dnd-kit/core in src/components/views/kanban/KanbanBoard.tsx
- [ ] **F024** [P] Create DraggableCard component in src/components/views/kanban/DraggableCard.tsx
- [ ] **F025** [P] Create CalendarView component in src/components/views/calendar/CalendarView.tsx (wrapper for existing calendar lib)
- [ ] **F026** Modify AssetList page to integrate ViewSelector and FilterBuilder in src/pages/AssetList.tsx
- [ ] **F027** Integrate kanban drag-and-drop with undo service (call useUndo hook on drop)
- [ ] **F028** Implement adaptive pagination (Gallery 24/page, Table virtual 100 window, Kanban 20/column, Calendar none)

**Integration Point**: Once B060 complete, replace mocked hooks with real implementation

---

## Phase F6: User Story 4 - Kits UI

**Duration**: 4-5 days  
**Prerequisite**: B075 (usePropertyInheritance hook) completed OR use mocked hook

- [ ] **F029** [P] Create KitForm component in src/components/kits/KitForm.tsx (with inheritance config checkboxes)
- [ ] **F030** [P] Create KitDetailView component in src/components/kits/KitDetailView.tsx
- [ ] **F031** [P] Create PropertyInheritanceIndicator component in src/components/kits/PropertyInheritanceIndicator.tsx (locked field with tooltip)
- [ ] **F032** Create KitList page in src/pages/KitList.tsx
- [ ] **F033** Create KitDetail page in src/pages/KitDetail.tsx
- [ ] **F034** Modify AssetDetail page to show PropertyInheritanceIndicator for inherited fields in src/pages/AssetDetail.tsx

**Integration Point**: Once B075 complete, replace mocked hooks with real implementation

---

## Phase F7: User Story 5 - AssetModel UI

**Duration**: 2-3 days  
**Prerequisite**: B082 (useAssetModels hook) completed OR use mocked hook

- [ ] **F035** [P] Create AssetModelForm component in src/components/models/AssetModelForm.tsx
- [ ] **F036** [P] Create ModelTemplateSelector component in src/components/models/ModelTemplateSelector.tsx (dropdown in AssetForm)
- [ ] **F037** Create AssetModelList page in src/pages/AssetModelList.tsx
- [ ] **F038** Modify AssetForm to include ModelTemplateSelector (pre-fill fields from model) in src/components/assets/AssetForm.tsx
- [ ] **F039** Implement tag propagation confirmation prompt when editing model tags (use Mantine Modal)

**Integration Point**: Once B082 complete, replace mocked hooks with real implementation

---

## Phase F8: User Story 6 - Tagging UI

**Duration**: 3-4 days  
**Prerequisite**: B087 (useTags hook) completed OR use mocked hook

- [ ] **F040** [P] Create TagInput component in src/components/tags/TagInput.tsx (multi-select with color badges)
- [ ] **F041** [P] Create InheritedTagBadge component in src/components/tags/InheritedTagBadge.tsx (icon + tooltip showing source)
- [ ] **F042** [P] Create TagPropagationConfirmation component in src/components/tags/TagPropagationConfirmation.tsx (modal)
- [ ] **F043** Modify AssetDetail page to display TagInput with inherited vs direct tags in src/pages/AssetDetail.tsx
- [ ] **F044** Modify KitDetail page to display TagInput with propagation confirmation in src/pages/KitDetail.tsx
- [ ] **F045** Prevent removal of inherited tags from sub-assets (show error tooltip using Mantine Tooltip)

**Integration Point**: Once B087 complete, replace mocked hooks with real implementation

---

## Phase F9: User Story 9 & 10 - Maintenance UI

**Duration**: 6-8 days  
**Prerequisite**: B102 (useMaintenance hook) completed OR use mocked hook

- [ ] **F046** [P] Create MaintenanceCompanyForm component in src/components/maintenance/MaintenanceCompanyForm.tsx
- [ ] **F047** [P] Create MaintenanceRuleForm component in src/components/maintenance/MaintenanceRuleForm.tsx (applies-to selector)
- [ ] **F048** [P] Create WorkOrderForm component in src/components/maintenance/WorkOrderForm.tsx
- [ ] **F049** [P] Create WorkOrderStateTransition component in src/components/maintenance/WorkOrderStateTransition.tsx (shows allowed next states)
- [ ] **F050** [P] Create OfferManagement component in src/components/maintenance/OfferManagement.tsx (for external work orders)
- [ ] **F051** Create MaintenanceCompanies page in src/pages/MaintenanceCompanies.tsx
- [ ] **F052** Create MaintenanceRules page in src/pages/MaintenanceRules.tsx
- [ ] **F053** Create WorkOrders page in src/pages/WorkOrders.tsx (table/kanban/timeline views)
- [ ] **F054** Implement rule conflict detection UI (highlight overlapping rules in red)
- [ ] **F055** Extend WorkOrderForm for per-asset scheduling in src/components/maintenance/WorkOrderForm.tsx
- [ ] **F056** [P] Create AssetScheduleTable component in src/components/maintenance/AssetScheduleTable.tsx (shows completion status per asset)
- [ ] **F057** [P] Create WorkOrderStateHistory component in src/components/maintenance/WorkOrderStateHistory.tsx (timeline)
- [ ] **F058** Add partial completion indicator ("3/5 assets completed") to WorkOrderForm
- [ ] **F059** Implement approval workflow (assign approvalResponsible, notify when completed)
- [ ] **F060** Stub invoicing UI (upload button present but non-functional, shows "Coming Soon" message)

**Integration Point**: Once B102 complete, replace mocked hooks with real implementation

---

## Phase F10: User Story 8 - Dashboard UI

**Duration**: 3-4 days  
**Prerequisite**: Multiple backend hooks completed (B030, B042, B102) OR use mocked hooks

- [ ] **F061** Create Dashboard page in src/pages/Dashboard.tsx
- [ ] **F062** [P] Create DashboardGrid layout component in src/components/dashboard/DashboardGrid.tsx
- [ ] **F063** [P] Create MyAssignedAssets widget in src/components/dashboard/widgets/MyAssignedAssets.tsx
- [ ] **F064** [P] Create AssetsNeedingAttention widget in src/components/dashboard/widgets/AssetsNeedingAttention.tsx
- [ ] **F065** [P] Create UpcomingMaintenance widget in src/components/dashboard/widgets/UpcomingMaintenance.tsx
- [ ] **F066** [P] Create RecentActivityTimeline widget in src/components/dashboard/widgets/RecentActivityTimeline.tsx
- [ ] **F067** [P] Create UtilizationStats widget in src/components/dashboard/widgets/UtilizationStats.tsx
- [ ] **F068** [P] Create OverdueWorkOrders widget in src/components/dashboard/widgets/OverdueWorkOrders.tsx
- [ ] **F069** Add dashboard locale strings in src/i18n/locales/en/dashboard.json
- [ ] **F070** Link widgets to filtered views (e.g., "View All" opens AssetList with broken filter)
- [ ] **F071** Implement real-time count updates using TanStack Query

**Integration Point**: Once all backend hooks complete, replace mocked hooks with real implementation

---

## Phase F11: User Story 11 - Settings UI

**Duration**: 2-3 days  
**Prerequisite**: B112 (useSettingsVersions hook) completed OR use mocked hook

- [ ] **F072** [P] Create SettingsVersionHistory component in src/components/settings/SettingsVersionHistory.tsx (table with rollback buttons)
- [ ] **F073** [P] Create SettingsExportImport component in src/components/settings/SettingsExportImport.tsx (export/import buttons)
- [ ] **F074** Modify Settings page to include SettingsVersionHistory and SettingsExportImport in src/pages/Settings.tsx
- [ ] **F075** Implement version age warning indicator (85-90 days old) in SettingsVersionHistory

**Integration Point**: Once B112 complete, replace mocked hooks with real implementation

---

## Phase F12: UI Cleanup & i18n Finalization

**Duration**: 2-3 days  
**Purpose**: Remove legacy UI code and finalize localization

- [ ] **F076** [P] Remove asset type template UI components and pages (FR-006)
- [ ] **F077** [P] Remove offline sync UI indicators and messages (FR-007)
- [ ] **F078** Run German text detection script and fix violations in components/ and pages/
- [ ] **F079** Audit UI code for unused components and imports (FR-009)
- [ ] **F080** [P] Add missing locale strings for all new features
- [ ] **F081** Manual verification: All user-facing strings use i18next (spot-check 20 random components)

---

## Phase F13: UI Polish & Testing

**Duration**: 2-3 days  
**Purpose**: Final UI refinements and cross-browser testing

- [ ] **F082** [P] Update user guide in docs/user-guide.md (add sections for all 11 user stories with screenshots)
- [ ] **F083** Code cleanup and refactoring (remove console.log, debug code, commented code)
- [ ] **F084** Performance optimization (lazy loading for maintenance module, code splitting)
- [ ] **F085** Security review (XSS prevention in photo upload, input validation)
- [ ] **F086** Run quickstart.md validation checklist

**UI-Specific Quality Gates**:
- [ ] All Mantine UI components use consistent theming
- [ ] All forms have proper validation and error messages
- [ ] All interactive elements have keyboard navigation
- [ ] All images/icons have alt text
- [ ] Responsive design works on mobile/tablet/desktop
- [ ] Loading states displayed for all async operations
- [ ] Empty states shown when no data available

---

# INTEGRATION & DEPLOYMENT (Both Developers)

## Phase I1: Final Integration & Testing

**Duration**: 3-5 days  
**Prerequisite**: All backend phases (B1-B13) AND all frontend phases (F1-F13) complete

- [ ] **I001** Replace all mocked services with real implementations in UI
- [ ] **I002** Run all TDD tests for 4 critical services (`npm test`)
- [ ] **I003** Manual testing for all P1 user stories (US1, US2, US3, US7) in standalone mode
- [ ] **I004** Manual testing in ChurchTools embedded mode
- [ ] **I005** Cross-browser testing (Chrome, Safari, Firefox)
- [ ] **I006** Test all edge cases from spec.md
- [ ] **I007** Accessibility check (keyboard navigation, ARIA labels, screen reader support)

**Pre-Deployment Quality Gates**:
- [ ] TypeScript compilation passes with no errors (`npm run type-check`)
- [ ] All ESLint rules passing with no warnings (`npm run lint`)
- [ ] Bundle size verified < 200 KB gzipped (`npm run bundle-analyze`)
- [ ] All TDD tests passing for 4 critical services (`npm test`)
- [ ] German text detection returns zero results (`npm run detect-german`)
- [ ] No console.log or debug statements in production code
- [ ] API error handling verified (network failures, rate limits)
- [ ] Performance budget met (<1s initial load on 3G, <100ms interactions)
- [ ] Version number updated in package.json
- [ ] Changelog/release notes prepared

---

## Task Count Summary

**Backend Tasks**: B001-B122 (122 tasks)
- Setup & Infrastructure: B001-B005 (5 tasks)
- Types & Utilities: B006-B020 (15 tasks)
- User Story 1 (Undo): B021-B033 (13 tasks, 7 TDD tests)
- User Story 2 (Damage): B034-B046 (13 tasks, 5 TDD tests)
- User Story 3 (Assignment): B047-B053 (7 tasks)
- User Story 7 (Data Views): B054-B062 (9 tasks, 4 tests)
- User Story 4 (Kits): B063-B079 (17 tasks, 8 TDD tests)
- User Story 5 (Models): B080-B084 (5 tasks)
- User Story 6 (Tags): B085-B090 (6 tasks)
- User Story 9 (Maintenance): B091-B107 (17 tasks, 7 TDD tests)
- User Story 10 (Work Orders): B108-B109 (2 tasks)
- User Story 11 (Settings): B110-B116 (7 tasks)
- Backend Cleanup: B117-B122 (6 tasks)

**Frontend Tasks**: F001-F086 (86 tasks)
- Setup: F001-F003 (3 tasks)
- User Story 1 (Undo UI): F004-F006 (3 tasks)
- User Story 2 (Damage UI): F007-F010 (4 tasks)
- User Story 3 (Assignment UI): F011-F015 (5 tasks)
- User Story 7 (Data Views UI): F016-F028 (13 tasks)
- User Story 4 (Kits UI): F029-F034 (6 tasks)
- User Story 5 (Models UI): F035-F039 (5 tasks)
- User Story 6 (Tags UI): F040-F045 (6 tasks)
- User Story 9 & 10 (Maintenance UI): F046-F060 (15 tasks)
- User Story 8 (Dashboard UI): F061-F071 (11 tasks)
- User Story 11 (Settings UI): F072-F075 (4 tasks)
- UI Cleanup: F076-F081 (6 tasks)
- UI Polish: F082-F086 (5 tasks)

**Integration Tasks**: I001-I007 (7 tasks)

**Grand Total**: 215 tasks (122 backend + 86 frontend + 7 integration)

---

## Recommended Workflow: Parallel Development

**Week 1-3**: Backend completes B001-B020 (setup + types)
- Frontend can start F001-F003 (setup + mocks) once B020 committed

**Week 4-20**: Both developers work in parallel
- Backend: B021-B122 (all services with TDD)
- Frontend: F004-F086 (all UI with mocked services)
- Integration happens at 11 handoff points

**Week 21-23**: Integration & Testing
- Replace all mocks with real services (I001)
- Comprehensive testing (I002-I007)
- Quality gates validation
- Deploy

**Estimated Timeline**: 21-23 weeks with parallel development vs. 30+ weeks sequential
