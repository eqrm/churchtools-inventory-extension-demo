# Tasks: Advanced Inventory Features (UI/Backend Split)

**Feature Branch**: `004-advanced-inventory-features`  
**User Stories**: 11 total (5 P1, 4 P2, 2 P3)

**Team Structure**:
- **Backend Developer**: Implements services, stores, hooks, types, utilities (TDD required for critical services)
- **UI Developer**: Implements React components and pages (depends on backend contracts)

**Workflow**: Backend tasks MUST complete first to provide stable APIs for UI integration. Some UI tasks can start once service contracts are defined (mocking services).

---

## BACKEND TRACK

### Phase B1: Setup & Infrastructure (Backend Developer)

**Purpose**: Install dependencies, configure infrastructure, define all type contracts

**Duration**: 2-3 days

- [ ] **TB001** Install new dependencies (Dexie.js v3, i18next v23, react-i18next v13, @tanstack/react-virtual v3, xstate v5, @dnd-kit/core v6)
- [ ] **TB002** Configure i18next with English locale files in src/i18n/config.ts
- [ ] **TB003** Create IndexedDB database schema using Dexie.js in src/services/db/UndoDatabase.ts
- [ ] **TB004** Create IndexedDB database for settings versions in src/services/db/SettingsDatabase.ts
- [ ] **TB005** Setup background job service skeleton in src/services/BackgroundJobService.ts

**Constitution Compliance Gates**:
- [ ] TypeScript strict mode verified in tsconfig.json
- [ ] ESLint configuration passing with no warnings
- [ ] Bundle size baseline measured (~130 KB currently)
- [ ] i18n English locale file created at src/i18n/locales/en/common.json

---

### Phase B2: Type Definitions & Utilities (Backend Developer)

**Purpose**: Define all TypeScript interfaces and utility functions

**Duration**: 2-3 days

**⚠️ CRITICAL**: UI work can begin once these types are committed (UI can mock services)

- [ ] **TB006** [P] Create UndoAction type definitions in src/types/undo.ts
- [ ] **TB007** [P] Create DamageReport type definitions in src/types/damage.ts
- [ ] **TB008** [P] Create Assignment type definitions in src/types/assignment.ts
- [ ] **TB009** [P] Create FixedKit type definitions in src/types/kit.ts
- [ ] **TB010** [P] Create AssetModel type definitions in src/types/model.ts
- [ ] **TB011** [P] Create Tag type definitions in src/types/tag.ts
- [ ] **TB012** [P] Create DataView and FilterCondition type definitions in src/types/view.ts
- [ ] **TB013** [P] Create MaintenanceCompany, MaintenanceRule, WorkOrder type definitions in src/types/maintenance.ts
- [ ] **TB014** [P] Create SettingsVersion type definitions in src/types/settings.ts
- [ ] **TB015** Modify Asset entity in src/types/asset.ts (add kitId, modelId, tags, inheritedTags, currentAssignmentId, expand status enum)
- [ ] **TB016** [P] Create image compression utility in src/utils/imageCompression.ts
- [ ] **TB017** [P] Create base64 encoding/decoding utilities in src/utils/base64Utils.ts
- [ ] **TB018** [P] Create state machine helper utilities in src/utils/stateMachine.ts
- [ ] **TB019** [P] Create relative date calculation utilities in src/utils/dateUtils.ts
- [ ] **TB020** [P] Add English translations for common terms in src/i18n/locales/en/common.json

**Handoff Point 1**: Commit all types to Git. UI Developer can now start UI work with mocked services.

---

### Phase B3: User Story 1 - Undo Service (Backend Developer, TDD REQUIRED)

**Goal**: Implement undo functionality with IndexedDB persistence

**Duration**: 5-7 days

#### TDD Tests (RED Phase)

- [ ] **TB021** [P] Write RED test for recordAction (simple create/update/delete) in src/tests/services/UndoService.test.ts
- [ ] **TB022** [P] Write RED test for recordCompoundAction (kit + sub-assets) in src/tests/services/UndoService.test.ts
- [ ] **TB023** [P] Write RED test for undoAction (create/update/delete scenarios) in src/tests/services/UndoService.test.ts
- [ ] **TB024** [P] Write RED test for rejecting expired undo (>24 hours) in src/tests/services/UndoService.test.ts
- [ ] **TB025** [P] Write RED test for rejecting already-undone actions in src/tests/services/UndoService.test.ts
- [ ] **TB026** [P] Write RED test for getUserUndoHistory (limit 50) in src/tests/services/UndoService.test.ts
- [ ] **TB027** [P] Write RED test for cleanupExpired (removes only expired) in src/tests/services/UndoService.test.ts

**Commit checkpoint**: Commit failing tests before implementation

#### Implementation (GREEN Phase)

- [ ] **TB028** Implement UndoService (GREEN) in src/services/UndoService.ts - pass all RED tests from TB021-TB027
- [ ] **TB029** Create Zustand undo store in src/stores/undoStore.ts
- [ ] **TB030** Create useUndo hook in src/hooks/useUndo.ts (wraps UndoService with React Query)
- [ ] **TB033** Add undo locale strings in src/i18n/locales/en/undo.json
- [ ] **TB035** Register undo cleanup job in BackgroundJobService (24-hour retention)
- [ ] **TB036** REFACTOR: Review UndoService code quality and simplify if needed

**Handoff Point 2**: UndoService, undoStore, useUndo hook complete. UI Developer can integrate UndoHistory and UndoButton components.

---

### Phase B4: User Story 2 - Damage Tracking (Backend Developer, TDD REQUIRED)

**Goal**: Implement damage reports with photo storage

**Duration**: 5-7 days

#### TDD Tests (RED Phase)

- [ ] **TB037** [P] Write RED test for compressImage (800x600 @ 0.8 quality) in src/tests/services/PhotoStorageService.test.ts
- [ ] **TB038** [P] Write RED test for rejecting >2MB files in src/tests/services/PhotoStorageService.test.ts
- [ ] **TB039** [P] Write RED test for rejecting >3 files in src/tests/services/PhotoStorageService.test.ts
- [ ] **TB040** [P] Write RED test for storePhotos and retrievePhoto roundtrip in src/tests/services/PhotoStorageService.test.ts
- [ ] **TB041** [P] Write RED test for feature flag switching (Mode A base64 vs Mode B Files API) in src/tests/services/PhotoStorageService.test.ts

**Commit checkpoint**: Commit failing tests before implementation

#### Implementation (GREEN Phase)

- [ ] **TB042** Implement PhotoStorageService (GREEN) in src/services/PhotoStorageService.ts - pass all RED tests from TB037-TB041
- [ ] **TB043** Implement DamageService in src/services/DamageService.ts (createDamageReport, markAsRepaired, getRepairHistory, getBrokenAssets)
- [ ] **TB044** Create Zustand damage store in src/stores/damageStore.ts
- [ ] **TB045** Create useDamageReports hook in src/hooks/useDamageReports.ts
- [ ] **TB049** Add damage locale strings in src/i18n/locales/en/damage.json
- [ ] **TB051** Integrate damage reports with undo service (record create/repair actions)
- [ ] **TB052** Update asset status to "Broken" when damage report created
- [ ] **TB053** REFACTOR: Review PhotoStorageService abstraction for Files API migration readiness

**Handoff Point 3**: DamageService complete. UI Developer can integrate PhotoUpload, DamageReportForm, RepairHistoryTab components.

---

### Phase B5: User Story 3 - Asset Assignment (Backend Developer)

**Goal**: Implement ChurchTools-integrated assignment system

**Duration**: 4-5 days

- [ ] **TB054** Implement AssignmentService in src/services/AssignmentService.ts (assignAsset, checkInAsset, getAssignmentHistory, getCurrentAssignment, getUserAssignments)
- [ ] **TB055** Create Zustand assignment store in src/stores/assignmentStore.ts
- [ ] **TB056** Create useAssignments hook in src/hooks/useAssignments.ts
- [ ] **TB057** Create useChurchToolsSearch hook in src/hooks/useChurchToolsSearch.ts (debounced person/group search)
- [ ] **TB061** Add assignment locale strings in src/i18n/locales/en/assignment.json
- [ ] **TB063** Implement asset status auto-update (Available ↔ In Use) on assignment/check-in
- [ ] **TB065** Integrate assignments with undo service (record assignment/check-in actions)

**Handoff Point 4**: AssignmentService complete. UI Developer can integrate PersonSearch, AssignmentField, AssignmentHistoryTab components.

---

### Phase B6: User Story 7 - Data Views Backend (Backend Developer)

**Goal**: Implement filter execution and view persistence logic

**Duration**: 5-7 days

#### Tests (Recommended)

- [ ] **TB066** [P] Write tests for applyFilters (text, date, tag, number, empty filters) in src/tests/services/DataViewService.test.ts
- [ ] **TB067** [P] Write tests for relative date resolution (last 7 days, next 30 days) in src/tests/services/DataViewService.test.ts
- [ ] **TB068** [P] Write tests for applySorts (single and multi-field) in src/tests/services/DataViewService.test.ts
- [ ] **TB069** [P] Write tests for groupAssets logic in src/tests/services/DataViewService.test.ts

#### Implementation

- [ ] **TB070** Implement DataViewService (pass tests TB066-TB069) in src/services/DataViewService.ts (createView, updateView, deleteView, getUserViews, applyFilters, applySorts, groupAssets)
- [ ] **TB071** Create Zustand data view store in src/stores/dataViewStore.ts
- [ ] **TB072** Create useDataViews hook in src/hooks/useDataViews.ts
- [ ] **TB083** Add views locale strings in src/i18n/locales/en/views.json
- [ ] **TB085** Implement collapsed group state persistence in dataViewStore

**Handoff Point 5**: DataViewService complete. UI Developer can integrate all view components (ViewSelector, FilterBuilder, VirtualTable, GalleryGrid, KanbanBoard, CalendarView).

---

### Phase B7: User Story 4 - Property Inheritance (Backend Developer, TDD REQUIRED)

**Goal**: Implement kit property inheritance logic

**Duration**: 6-8 days

#### TDD Tests (RED Phase)

- [ ] **TB088** [P] Write RED test for getInheritedProperties calculation in src/tests/services/PropertyInheritanceService.test.ts
- [ ] **TB089** [P] Write RED test for isPropertyInherited detection in src/tests/services/PropertyInheritanceService.test.ts
- [ ] **TB090** [P] Write RED test for propagateKitChange (location) in src/tests/services/PropertyInheritanceService.test.ts
- [ ] **TB091** [P] Write RED test for propagateKitChange (status) in src/tests/services/PropertyInheritanceService.test.ts
- [ ] **TB092** [P] Write RED test for propagateKitChange (tags) in src/tests/services/PropertyInheritanceService.test.ts
- [ ] **TB093** [P] Write RED test for unlockInheritedProperties on disassembly in src/tests/services/PropertyInheritanceService.test.ts
- [ ] **TB094** [P] Write RED test for compound undo action recording in src/tests/services/PropertyInheritanceService.test.ts
- [ ] **TB095** [P] Write RED test for rejecting non-inherited property propagation in src/tests/services/PropertyInheritanceService.test.ts

**Commit checkpoint**: Commit failing tests before implementation

#### Implementation (GREEN Phase)

- [ ] **TB096** Implement PropertyInheritanceService (GREEN) in src/services/PropertyInheritanceService.ts - pass all RED tests from TB088-TB095
- [ ] **TB097** Implement KitService in src/services/KitService.ts (createKit, updateKit, deleteKit, assembleKit, disassembleKit, getKitSubAssets)
- [ ] **TB098** Create Zustand kit store in src/stores/kitStore.ts
- [ ] **TB099** Create useKits hook in src/hooks/useKits.ts
- [ ] **TB100** Create usePropertyInheritance hook in src/hooks/usePropertyInheritance.ts
- [ ] **TB104** Add kits locale strings in src/i18n/locales/en/kits.json
- [ ] **TB108** Implement completeness status auto-calculation (incomplete if any sub-asset broken)
- [ ] **TB109** Integrate kit operations with undo service (record assembly/disassembly/propagation as compound actions)
- [ ] **TB110** REFACTOR: Review PropertyInheritanceService for edge cases

**Handoff Point 6**: KitService and PropertyInheritanceService complete. UI Developer can integrate KitForm, KitDetailView, PropertyInheritanceIndicator components.

---

### Phase B8: User Story 5 - AssetModel Templates (Backend Developer)

**Goal**: Implement model template system

**Duration**: 3-4 days

- [ ] **TB111** Implement AssetModelService in src/services/AssetModelService.ts (createModel, updateModel, deleteModel, getModels, createAssetFromModel)
- [ ] **TB112** Create Zustand model store in src/stores/modelStore.ts
- [ ] **TB113** Create useAssetModels hook in src/hooks/useAssetModels.ts
- [ ] **TB116** Add models locale strings in src/i18n/locales/en/models.json
- [ ] **TB120** Integrate model operations with undo service

**Handoff Point 7**: AssetModelService complete. UI Developer can integrate AssetModelForm, ModelTemplateSelector components.

---

### Phase B9: User Story 6 - Tagging System (Backend Developer)

**Goal**: Implement tag propagation logic

**Duration**: 3-4 days

- [ ] **TB121** Implement TagService in src/services/TagService.ts (createTag, updateTag, deleteTag, getTags, applyTagToEntity, removeTagFromEntity)
- [ ] **TB122** Create Zustand tag store in src/stores/tagStore.ts
- [ ] **TB123** Create useTags hook in src/hooks/useTags.ts
- [ ] **TB127** Add tags locale strings in src/i18n/locales/en/tags.json
- [ ] **TB130** Implement tag propagation logic (kit → sub-assets, model → created assets)
- [ ] **TB132** Integrate tag operations with undo service

**Handoff Point 8**: TagService complete. UI Developer can integrate TagInput, InheritedTagBadge, TagPropagationConfirmation components.

---

### Phase B10: User Story 9 - Maintenance Management (Backend Developer, TDD REQUIRED)

**Goal**: Implement work order state machines and maintenance logic

**Duration**: 7-10 days

#### TDD Tests (RED Phase)

- [ ] **TB133** [P] Write RED test for canTransition (internal valid transitions) in src/tests/services/WorkOrderStateMachine.test.ts
- [ ] **TB134** [P] Write RED test for canTransition (external valid transitions) in src/tests/services/WorkOrderStateMachine.test.ts
- [ ] **TB135** [P] Write RED test for rejecting invalid transitions in src/tests/services/WorkOrderStateMachine.test.ts
- [ ] **TB136** [P] Write RED test for prerequisite validation (assignedTo required for 'assigned') in src/tests/services/WorkOrderStateMachine.test.ts
- [ ] **TB137** [P] Write RED test for state history recording in src/tests/services/WorkOrderStateMachine.test.ts
- [ ] **TB138** [P] Write RED test for reopen capability (completed → in_progress) in src/tests/services/WorkOrderStateMachine.test.ts
- [ ] **TB139** [P] Write RED test for terminal states (done, aborted, obsolete) in src/tests/services/WorkOrderStateMachine.test.ts

**Commit checkpoint**: Commit failing tests before implementation

#### Implementation (GREEN Phase)

- [ ] **TB140** Implement internal WorkOrderStateMachine using XState (GREEN) in src/services/machines/InternalWorkOrderMachine.ts - pass RED tests TB133-TB139
- [ ] **TB141** Implement external WorkOrderStateMachine using XState (GREEN) in src/services/machines/ExternalWorkOrderMachine.ts - pass RED tests TB134-TB139
- [ ] **TB142** Implement MaintenanceService in src/services/MaintenanceService.ts (all company/rule/work order CRUD, detectRuleConflicts, createWorkOrderFromRule, transitionWorkOrderState, markAssetComplete)
- [ ] **TB143** Create Zustand maintenance store in src/stores/maintenanceStore.ts
- [ ] **TB144** Create useMaintenance hook in src/hooks/useMaintenance.ts
- [ ] **TB150** Add maintenance locale strings in src/i18n/locales/en/maintenance.json
- [ ] **TB155** Implement work order auto-generation from rules (background job at 00:05)
- [ ] **TB156** Register work order creation job in BackgroundJobService
- [ ] **TB157** Integrate maintenance operations with undo service
- [ ] **TB158** REFACTOR: Review XState machines for state coverage

**Handoff Point 9**: MaintenanceService and state machines complete. UI Developer can integrate all maintenance UI components.

---

### Phase B11: User Story 10 - Work Order Tracking (Backend Developer)

**Goal**: Extend work order functionality for per-asset tracking

**Duration**: 2-3 days (depends on Phase B10)

- [ ] **TB162** Implement markAssetComplete functionality in MaintenanceService
- [ ] **TB166** Integrate per-asset completion with undo service

**Handoff Point 10**: Work order tracking logic complete. UI Developer can integrate AssetScheduleTable, WorkOrderStateHistory components.

---

### Phase B12: User Story 11 - Settings Versioning (Backend Developer)

**Goal**: Implement settings export/import/rollback

**Duration**: 3-4 days

- [ ] **TB178** Implement SettingsVersionService in src/services/SettingsVersionService.ts (createVersion, getVersionHistory, rollbackToVersion, exportSettings, importSettings, cleanupExpiredVersions)
- [ ] **TB179** Create Zustand settings store in src/stores/settingsStore.ts
- [ ] **TB180** Create useSettingsVersions hook in src/hooks/useSettingsVersions.ts
- [ ] **TB183** Add settings locale strings in src/i18n/locales/en/settings.json
- [ ] **TB185** Implement JSON schema validation on import (Zod schema)
- [ ] **TB187** Register settings cleanup job in BackgroundJobService (90-day retention, preserve latest)
- [ ] **TB188** Integrate settings operations with undo service (record version creation/rollback)

**Handoff Point 11**: SettingsVersionService complete. UI Developer can integrate SettingsVersionHistory, SettingsExportImport components.

---

### Phase B13: Code Cleanup (Backend Developer)

**Purpose**: Remove legacy code and finalize backend

**Duration**: 2-3 days

- [ ] **TB189** [P] Remove asset type template functionality (services, stores, hooks) (FR-006)
- [ ] **TB190** [P] Remove offline database storage and sync logic (FR-007)
- [ ] **TB191** [P] Remove demo data seeding from services (keep only in tests/fixtures/) (FR-008)
- [ ] **TB192** Run German text detection script and fix violations in services/ and stores/
- [ ] **TB193** Audit codebase for unused imports, functions in backend files (FR-009)
- [ ] **TB193a** Verify all error messages use i18next keys (automated ESLint rule)

**Handoff Point 12**: Backend cleanup complete. All backend APIs stable for final UI integration.

---

## UI TRACK

### Phase U1: Wait for Backend Types (UI Developer)

**Purpose**: Wait for Phase B2 completion, then set up mocked services

**Duration**: Can start immediately after TB020 committed

- [ ] **TU001** Review all type definitions in src/types/ to understand data structures
- [ ] **TU002** Create mock service implementations for local development (optional, for testing UI without backend)
- [ ] **TU003** Set up Storybook for component development (optional but recommended)

---

### Phase U2: User Story 1 - Undo UI (UI Developer)

**Purpose**: Build undo history and undo button components

**Duration**: 2-3 days (can start after TB030 or use mocked useUndo hook)

**Prerequisite**: TB030 (useUndo hook) completed OR use mocked hook

- [ ] **TU031** [P] Create UndoHistory component in src/components/undo/UndoHistory.tsx
- [ ] **TU032** [P] Create UndoButton component in src/components/undo/UndoButton.tsx
- [ ] **TU034** Integrate UndoHistory into existing layout (sidebar or header)

**Integration Point**: Once TB030 complete, replace mocked hooks with real implementation

---

### Phase U3: User Story 2 - Damage Tracking UI (UI Developer)

**Purpose**: Build damage reporting interface with photo upload

**Duration**: 3-4 days (can start after TB045 or use mocked hooks)

**Prerequisite**: TB045 (useDamageReports hook) completed OR use mocked hook

- [ ] **TU046** [P] Create PhotoUpload component in src/components/damage/PhotoUpload.tsx (with compression preview)
- [ ] **TU047** [P] Create DamageReportForm component in src/components/damage/DamageReportForm.tsx
- [ ] **TU048** [P] Create RepairHistoryTab component in src/components/damage/RepairHistoryTab.tsx
- [ ] **TU050** Modify AssetDetail page to include "Mark as Broken" toggle and RepairHistoryTab in src/pages/AssetDetail.tsx

**Integration Point**: Once TB045 complete, replace mocked hooks with real implementation

---

### Phase U4: User Story 3 - Assignment UI (UI Developer)

**Purpose**: Build ChurchTools-integrated assignment interface

**Duration**: 3-4 days (can start after TB057 or use mocked hooks)

**Prerequisite**: TB057 (useChurchToolsSearch hook) completed OR use mocked hook

- [ ] **TU058** [P] Create PersonSearch component in src/components/assignment/PersonSearch.tsx (autocomplete with ChurchTools API)
- [ ] **TU059** [P] Create AssignmentField component in src/components/assignment/AssignmentField.tsx
- [ ] **TU060** [P] Create AssignmentHistoryTab component in src/components/assignment/AssignmentHistoryTab.tsx
- [ ] **TU062** Modify AssetDetail page to include AssignmentField and AssignmentHistoryTab in src/pages/AssetDetail.tsx
- [ ] **TU064** Add confirmation popup when changing status of assigned asset (use Mantine Modal)

**Integration Point**: Once TB057 complete, replace mocked hooks with real implementation

---

### Phase U5: User Story 7 - Data Views UI (UI Developer)

**Purpose**: Build all view types and filter/sort UI

**Duration**: 7-10 days (can start after TB072 or use mocked hooks)

**Prerequisite**: TB072 (useDataViews hook) completed OR use mocked hook

- [ ] **TU073** [P] Create ViewSelector component in src/components/views/ViewSelector.tsx (tabs for table/gallery/kanban/calendar)
- [ ] **TU074** [P] Create FilterBuilder component in src/components/views/FilterBuilder.tsx (modal with filter DSL UI)
- [ ] **TU075** [P] Create GroupingControls component in src/components/views/GroupingControls.tsx
- [ ] **TU076** [P] Create DataViewList component in src/components/views/DataViewList.tsx (saved views)
- [ ] **TU077** Create VirtualTable component using @tanstack/react-virtual in src/components/views/table/VirtualTable.tsx
- [ ] **TU078** [P] Create GalleryGrid component in src/components/views/gallery/GalleryGrid.tsx
- [ ] **TU079** [P] Create PaginationControls component in src/components/views/gallery/PaginationControls.tsx (24 items/page)
- [ ] **TU080** Create KanbanBoard component using @dnd-kit/core in src/components/views/kanban/KanbanBoard.tsx
- [ ] **TU081** [P] Create DraggableCard component in src/components/views/kanban/DraggableCard.tsx
- [ ] **TU082** [P] Create CalendarView component in src/components/views/calendar/CalendarView.tsx (wrapper for existing calendar lib)
- [ ] **TU084** Modify AssetList page to integrate ViewSelector and FilterBuilder in src/pages/AssetList.tsx
- [ ] **TU086** Integrate kanban drag-and-drop with undo service (call useUndo hook on drop)
- [ ] **TU087** Implement adaptive pagination (Gallery 24/page, Table virtual 100 window, Kanban 20/column, Calendar none)

**Integration Point**: Once TB072 complete, replace mocked hooks with real implementation

---

### Phase U6: User Story 4 - Kits UI (UI Developer)

**Purpose**: Build kit management interface with inheritance indicators

**Duration**: 4-5 days (can start after TB100 or use mocked hooks)

**Prerequisite**: TB100 (usePropertyInheritance hook) completed OR use mocked hook

- [ ] **TU101** [P] Create KitForm component in src/components/kits/KitForm.tsx (with inheritance config checkboxes)
- [ ] **TU102** [P] Create KitDetailView component in src/components/kits/KitDetailView.tsx
- [ ] **TU103** [P] Create PropertyInheritanceIndicator component in src/components/kits/PropertyInheritanceIndicator.tsx (locked field with tooltip)
- [ ] **TU105** Create KitList page in src/pages/KitList.tsx
- [ ] **TU106** Create KitDetail page in src/pages/KitDetail.tsx
- [ ] **TU107** Modify AssetDetail page to show PropertyInheritanceIndicator for inherited fields in src/pages/AssetDetail.tsx

**Integration Point**: Once TB100 complete, replace mocked hooks with real implementation

---

### Phase U7: User Story 5 - AssetModel UI (UI Developer)

**Purpose**: Build model template selection interface

**Duration**: 2-3 days (can start after TB113 or use mocked hooks)

**Prerequisite**: TB113 (useAssetModels hook) completed OR use mocked hook

- [ ] **TU114** [P] Create AssetModelForm component in src/components/models/AssetModelForm.tsx
- [ ] **TU115** [P] Create ModelTemplateSelector component in src/components/models/ModelTemplateSelector.tsx (dropdown in AssetForm)
- [ ] **TU117** Create AssetModelList page in src/pages/AssetModelList.tsx
- [ ] **TU118** Modify AssetForm to include ModelTemplateSelector (pre-fill fields from model) in src/components/assets/AssetForm.tsx
- [ ] **TU119** Implement tag propagation confirmation prompt when editing model tags (use Mantine Modal)

**Integration Point**: Once TB113 complete, replace mocked hooks with real implementation

---

### Phase U8: User Story 6 - Tagging UI (UI Developer)

**Purpose**: Build tag management with inheritance visualization

**Duration**: 3-4 days (can start after TB123 or use mocked hooks)

**Prerequisite**: TB123 (useTags hook) completed OR use mocked hook

- [ ] **TU124** [P] Create TagInput component in src/components/tags/TagInput.tsx (multi-select with color badges)
- [ ] **TU125** [P] Create InheritedTagBadge component in src/components/tags/InheritedTagBadge.tsx (icon + tooltip showing source)
- [ ] **TU126** [P] Create TagPropagationConfirmation component in src/components/tags/TagPropagationConfirmation.tsx (modal)
- [ ] **TU128** Modify AssetDetail page to display TagInput with inherited vs direct tags in src/pages/AssetDetail.tsx
- [ ] **TU129** Modify KitDetail page to display TagInput with propagation confirmation in src/pages/KitDetail.tsx
- [ ] **TU131** Prevent removal of inherited tags from sub-assets (show error tooltip using Mantine Tooltip)

**Integration Point**: Once TB123 complete, replace mocked hooks with real implementation

---

### Phase U9: User Story 9 & 10 - Maintenance UI (UI Developer)

**Purpose**: Build maintenance management interface with work order tracking

**Duration**: 6-8 days (can start after TB144 or use mocked hooks)

**Prerequisite**: TB144 (useMaintenance hook) completed OR use mocked hook

- [ ] **TU145** [P] Create MaintenanceCompanyForm component in src/components/maintenance/MaintenanceCompanyForm.tsx
- [ ] **TU146** [P] Create MaintenanceRuleForm component in src/components/maintenance/MaintenanceRuleForm.tsx (applies-to selector)
- [ ] **TU147** [P] Create WorkOrderForm component in src/components/maintenance/WorkOrderForm.tsx
- [ ] **TU148** [P] Create WorkOrderStateTransition component in src/components/maintenance/WorkOrderStateTransition.tsx (shows allowed next states)
- [ ] **TU149** [P] Create OfferManagement component in src/components/maintenance/OfferManagement.tsx (for external work orders)
- [ ] **TU151** Create MaintenanceCompanies page in src/pages/MaintenanceCompanies.tsx
- [ ] **TU152** Create MaintenanceRules page in src/pages/MaintenanceRules.tsx
- [ ] **TU153** Create WorkOrders page in src/pages/WorkOrders.tsx (table/kanban/timeline views)
- [ ] **TU154** Implement rule conflict detection UI (highlight overlapping rules in red)
- [ ] **TU159** Extend WorkOrderForm for per-asset scheduling in src/components/maintenance/WorkOrderForm.tsx
- [ ] **TU160** [P] Create AssetScheduleTable component in src/components/maintenance/AssetScheduleTable.tsx (shows completion status per asset)
- [ ] **TU161** [P] Create WorkOrderStateHistory component in src/components/maintenance/WorkOrderStateHistory.tsx (timeline)
- [ ] **TU163** Add partial completion indicator ("3/5 assets completed") to WorkOrderForm
- [ ] **TU164** Implement approval workflow (assign approvalResponsible, notify when completed)
- [ ] **TU165** Stub invoicing UI (upload button present but non-functional, shows "Coming Soon" message)

**Integration Point**: Once TB144 complete, replace mocked hooks with real implementation

---

### Phase U10: User Story 8 - Dashboard UI (UI Developer)

**Purpose**: Build dashboard with widgets

**Duration**: 3-4 days (can start after multiple backend services complete)

**Prerequisite**: TB030, TB045, TB144 (multiple hooks) completed OR use mocked hooks

- [ ] **TU167** Create Dashboard page in src/pages/Dashboard.tsx
- [ ] **TU168** [P] Create DashboardGrid layout component in src/components/dashboard/DashboardGrid.tsx
- [ ] **TU169** [P] Create MyAssignedAssets widget in src/components/dashboard/widgets/MyAssignedAssets.tsx
- [ ] **TU170** [P] Create AssetsNeedingAttention widget in src/components/dashboard/widgets/AssetsNeedingAttention.tsx
- [ ] **TU171** [P] Create UpcomingMaintenance widget in src/components/dashboard/widgets/UpcomingMaintenance.tsx
- [ ] **TU172** [P] Create RecentActivityTimeline widget in src/components/dashboard/widgets/RecentActivityTimeline.tsx
- [ ] **TU173** [P] Create UtilizationStats widget in src/components/dashboard/widgets/UtilizationStats.tsx
- [ ] **TU174** [P] Create OverdueWorkOrders widget in src/components/dashboard/widgets/OverdueWorkOrders.tsx
- [ ] **TU175** Add dashboard locale strings in src/i18n/locales/en/dashboard.json
- [ ] **TU176** Link widgets to filtered views (e.g., "View All" opens AssetList with broken filter)
- [ ] **TU177** Implement real-time count updates using TanStack Query

**Integration Point**: Once all backend hooks complete, replace mocked hooks with real implementation

---

### Phase U11: User Story 11 - Settings UI (UI Developer)

**Purpose**: Build settings version history interface

**Duration**: 2-3 days (can start after TB180 or use mocked hooks)

**Prerequisite**: TB180 (useSettingsVersions hook) completed OR use mocked hook

- [ ] **TU181** [P] Create SettingsVersionHistory component in src/components/settings/SettingsVersionHistory.tsx (table with rollback buttons)
- [ ] **TU182** [P] Create SettingsExportImport component in src/components/settings/SettingsExportImport.tsx (export/import buttons)
- [ ] **TU184** Modify Settings page to include SettingsVersionHistory and SettingsExportImport in src/pages/Settings.tsx
- [ ] **TU186** Implement version age warning indicator (85-90 days old) in SettingsVersionHistory

**Integration Point**: Once TB180 complete, replace mocked hooks with real implementation

---

### Phase U12: UI Cleanup & i18n Finalization (UI Developer)

**Purpose**: Remove legacy UI code and finalize localization

**Duration**: 2-3 days

- [ ] **TU189b** [P] Remove asset type template UI components and pages (FR-006)
- [ ] **TU190b** [P] Remove offline sync UI indicators and messages (FR-007)
- [ ] **TU192b** Run German text detection script and fix violations in components/ and pages/
- [ ] **TU193b** Audit UI code for unused components and imports (FR-009)
- [ ] **TU194** [P] Add missing locale strings for all new features
- [ ] **TU195** Manual verification: All user-facing strings use i18next (spot-check 20 random components)

---

### Phase U13: UI Polish & Testing (UI Developer)

**Purpose**: Final UI refinements and cross-browser testing

**Duration**: 2-3 days

- [ ] **TU196** [P] Update user guide in docs/user-guide.md (add sections for all 11 user stories with screenshots)
- [ ] **TU198** Code cleanup and refactoring (remove console.log, debug code, commented code)
- [ ] **TU199** Performance optimization (lazy loading for maintenance module, code splitting)
- [ ] **TU201** Security review (XSS prevention in photo upload, input validation)
- [ ] **TU202** Run quickstart.md validation checklist

**UI-Specific Quality Gates**:
- [ ] All Mantine UI components use consistent theming
- [ ] All forms have proper validation and error messages
- [ ] All interactive elements have keyboard navigation
- [ ] All images/icons have alt text
- [ ] Responsive design works on mobile/tablet/desktop
- [ ] Loading states displayed for all async operations
- [ ] Empty states shown when no data available

---

## INTEGRATION & DEPLOYMENT (Both Developers)

### Phase I1: Final Integration & Testing

**Purpose**: Integrate UI with real backend, comprehensive testing

**Duration**: 3-5 days

**Prerequisite**: All backend phases (B1-B13) AND all UI phases (U1-U13) complete

- [ ] **TI001** Replace all mocked services with real implementations in UI
- [ ] **TI002** Run all TDD tests for 4 critical services (`npm test`)
- [ ] **TI003** Manual testing for all P1 user stories (US1, US2, US3, US7) in standalone mode
- [ ] **TI004** Manual testing in ChurchTools embedded mode
- [ ] **TI005** Cross-browser testing (Chrome, Safari, Firefox)
- [ ] **TI006** Test all edge cases from spec.md
- [ ] **TI007** Accessibility check (keyboard navigation, ARIA labels, screen reader support)

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

## Developer Assignment Summary

### Backend Developer Tasks (Total: ~140 tasks)

**Core Responsibilities**:
- All services (UndoService, PhotoStorageService, DamageService, AssignmentService, KitService, PropertyInheritanceService, AssetModelService, TagService, DataViewService, MaintenanceService, SettingsVersionService)
- All Zustand stores
- All React hooks
- All TypeScript type definitions
- All utilities (image compression, base64, state machine, date utils)
- TDD tests for 4 critical services (31 test tasks)
- IndexedDB schema and background jobs
- Service integration with undo functionality

**Task Prefix**: TB (Backend Task)

**Estimated Duration**: 12-16 weeks

**Critical TDD Services** (Must follow RED-GREEN-REFACTOR):
1. UndoService (TB021-TB028)
2. PhotoStorageService (TB037-TB042)
3. PropertyInheritanceService (TB088-TB096)
4. WorkOrderStateMachine (TB133-TB141)

---

### UI Developer Tasks (Total: ~80 tasks)

**Core Responsibilities**:
- All React components (50+ components across undo, damage, assignment, kits, models, tags, views, dashboard, maintenance, settings)
- All page modifications and new pages
- Component integration with hooks provided by backend
- UI/UX polish and responsiveness
- i18n locale string management
- User guide documentation with screenshots

**Task Prefix**: TU (UI Task)

**Estimated Duration**: 10-14 weeks (can start early with mocked services)

**Key UI Deliverables**:
- Undo interface (2 components)
- Damage tracking interface (3 components)
- Assignment interface (3 components)
- Data views interface (11 components + 4 view types)
- Kits interface (3 components + 2 pages)
- Models interface (2 components + 1 page)
- Tags interface (3 components)
- Maintenance interface (9 components + 3 pages)
- Dashboard (7 widgets + 1 page)
- Settings interface (2 components)

---

## Workflow Recommendations

### Option 1: Sequential (Backend First, Then UI)

**Timeline**: 22-30 weeks total

1. **Weeks 1-16**: Backend developer completes all backend tasks (TB001-TB193a)
2. **Weeks 17-30**: UI developer integrates with real backend (TU001-TU202)
3. **Weeks 31-33**: Joint integration and testing (TI001-TI007)

**Pros**: Clean handoff, stable APIs for UI  
**Cons**: UI developer idle for 16 weeks, longer total timeline

---

### Option 2: Parallel with Mocked Services (Recommended)

**Timeline**: 16-20 weeks total

1. **Week 1-3**: Backend completes Phase B1-B2 (setup + types)
2. **Week 4-20**: 
   - Backend continues with all service implementation (TB021-TB193a)
   - UI developer works in parallel using mocked hooks (TU001-TU202)
3. **Week 16-18**: Integration phase - replace mocked services with real ones
4. **Week 19-20**: Joint testing and deployment (TI001-TI007)

**Pros**: Faster delivery, both developers productive, parallel work  
**Cons**: Requires UI developer to create mocks initially, integration risk

**Handoff Points**:
- After TB020: UI can start with all types defined
- After TB030: Integrate real UndoService
- After TB045: Integrate real DamageService
- After TB057: Integrate real AssignmentService
- After TB072: Integrate real DataViewService
- After TB100: Integrate real KitService
- After TB113: Integrate real AssetModelService
- After TB123: Integrate real TagService
- After TB144: Integrate real MaintenanceService
- After TB180: Integrate real SettingsVersionService

---

### Option 3: Feature-by-Feature (Story by Story)

**Timeline**: 18-24 weeks total

Complete each user story end-to-end (backend + UI) before moving to next:

1. **Weeks 1-3**: Setup (both developers)
2. **Weeks 4-6**: US1 Undo (backend TB021-TB036, then UI TU031-TU034)
3. **Weeks 7-10**: US2 Damage (backend TB037-TB053, then UI TU046-TU050)
4. **Weeks 11-13**: US3 Assignment (backend TB054-TB065, then UI TU058-TU064)
5. **Weeks 14-18**: US7 Data Views (backend TB066-TB087, then UI TU073-TU087)
6. Etc.

**Pros**: Deliverable features early, easier testing per story  
**Cons**: UI developer has idle time waiting for each backend completion

---

## Recommended Approach: **Option 2 (Parallel with Mocked Services)**

This provides the best balance of:
- Fast delivery (16-20 weeks vs 22-30 weeks sequential)
- Both developers productive throughout
- Early UI feedback can inform backend API design
- Risk mitigation through gradual integration at handoff points
