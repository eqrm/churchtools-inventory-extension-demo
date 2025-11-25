# Implementation Plan: Advanced Inventory Features

**Branch**: `004-advanced-inventory-features` | **Date**: 2025-11-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-advanced-inventory-features/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

This feature adds comprehensive inventory management capabilities including: undo functionality with 24-hour retention (IndexedDB), damage tracking with base64 photo storage, ChurchTools-integrated asset assignment, fixed kits with property inheritance, asset models as templates, flexible tagging system, Notion-like data views (table/gallery/kanban/calendar), dashboard widgets, CAFM/CMMS maintenance management with work order state machines, i18n support (English only), and settings versioning with export/import. The feature prioritizes P1 features (undo, damage, assignment, data views) followed by P2 (kits, models, tags, maintenance) and P3 (dashboard, settings).

## Technical Context

**Language/Version**: TypeScript 5.x with strict mode enabled  
**Primary Dependencies**: React 18, Vite 5, Mantine UI v7, TanStack Query v5, Zustand v4, i18next v23 (to be added), Dexie.js v3 (to be added for IndexedDB)  
**Storage**: ChurchTools Custom Modules API (primary persistence), IndexedDB via Dexie.js (undo history, data views, settings cache), Base64 photos in custom data fields with migration path to ChurchTools Files API  
**Testing**: Vitest (unit/integration), Manual testing in ChurchTools embedded mode, TDD required for undo logic, state machines, property inheritance, work order state transitions  
**Target Platform**: Web browser (ChurchTools extension), embedded iframe within ChurchTools  
**Project Type**: Single-page web application (frontend only, no backend)  
**Performance Goals**: <200 KB gzipped bundle, <1s initial load on 3G, <100ms UI interactions, virtual scrolling for 100+ items  
**Constraints**: ChurchTools API rate limits, custom data field ~10K character limit per field, 24-hour undo retention, 90-day settings version retention, offline-capable for undo history  
**Scale/Scope**: 11 user stories, 73 functional requirements, 11 new entities, estimated 50+ new React components, 20+ new services, 15+ new hooks

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Initial Check (Pre-Research)**: ✅ PASSED  
**Post-Design Check**: ✅ PASSED

- [x] **Type Safety**: TypeScript strict mode enabled, all service interfaces in `contracts/SERVICE_CONTRACTS.md` use explicit types, no `any` without justification
- [x] **UX Consistency**: Mantine UI v7 components planned, ChurchTools patterns documented (chevron icons in research.md, confirmation modals in data-model.md), embedded mode testing in quickstart.md
- [x] **Code Quality**: ESLint configured, service-based modularity (9 services defined), unused code audit in cleanup requirements (FR-006 to FR-009), JSDoc comments required in contracts
- [x] **Performance Budget**: Bundle analysis in research.md shows ~200 KB projected (70 KB new deps + 130 KB existing), virtual scrolling for data views, adaptive pagination strategy, photo compression documented
- [x] **Testing Strategy**: Manual testing documented in spec.md user stories, TDD required for 4 critical services (UndoService, PropertyInheritanceService, WorkOrderStateMachine, PhotoStorageService), test requirements in contracts
- [x] **TDD Workflow**: RED-GREEN-REFACTOR cycle documented in quickstart.md with examples, test-first pattern enforced in contracts, commit strategy defined (tests before implementation)
- [x] **Environment Config**: No new secrets required (uses existing ChurchTools API credentials from .env), base64 photo storage avoids external dependencies

**No violations. All gates passed at both checkpoints.**

## Project Structure

### Documentation (this feature)

```
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```
src/
├── components/          # React components (existing + new)
│   ├── undo/           # NEW: UndoHistory, UndoButton
│   ├── damage/         # NEW: DamageReportForm, RepairHistoryTab, PhotoUpload
│   ├── assignment/     # NEW: AssignmentField, AssignmentHistoryTab, PersonSearch
│   ├── kits/           # NEW: KitForm, KitDetailView, PropertyInheritanceIndicator
│   ├── models/         # NEW: AssetModelForm, ModelTemplateSelector
│   ├── tags/           # NEW: TagInput, InheritedTagBadge, TagPropagationConfirmation
│   ├── views/          # NEW: ViewSelector, FilterBuilder, GroupingControls, DataViewList
│   │   ├── table/      # NEW: VirtualTable component
│   │   ├── gallery/    # NEW: GalleryGrid, PaginationControls
│   │   ├── kanban/     # NEW: KanbanBoard, DraggableCard
│   │   └── calendar/   # NEW: CalendarView wrapper
│   ├── dashboard/      # NEW: DashboardGrid, widgets/
│   ├── maintenance/    # NEW: MaintenanceCompanyForm, MaintenanceRuleForm, WorkOrderForm
│   └── settings/       # NEW: SettingsVersionHistory, SettingsExportImport
├── services/           # Business logic (existing + new)
│   ├── UndoService.ts          # NEW: Undo/redo logic, IndexedDB persistence
│   ├── DamageService.ts        # NEW: Damage report CRUD
│   ├── PhotoStorageService.ts  # NEW: Base64 encoding, compression, abstraction layer
│   ├── AssignmentService.ts    # NEW: Assignment CRUD, ChurchTools integration
│   ├── KitService.ts           # NEW: Kit CRUD, property inheritance logic
│   ├── PropertyInheritanceService.ts  # NEW: Inheritance propagation engine
│   ├── AssetModelService.ts    # NEW: Model template CRUD
│   ├── TagService.ts           # NEW: Tag CRUD, propagation logic
│   ├── DataViewService.ts      # NEW: View persistence, filter execution
│   ├── MaintenanceService.ts   # NEW: Company, rule, work order CRUD
│   ├── WorkOrderStateMachine.ts  # NEW: State transition validation
│   └── SettingsVersionService.ts  # NEW: Versioning, export/import, cleanup
├── stores/             # Zustand state management (existing + new)
│   ├── undoStore.ts            # NEW: Undo history state
│   ├── damageStore.ts          # NEW: Damage reports cache
│   ├── assignmentStore.ts      # NEW: Assignment state
│   ├── kitStore.ts             # NEW: Kit state
│   ├── tagStore.ts             # NEW: Tag state
│   ├── dataViewStore.ts        # NEW: Active view configuration
│   ├── maintenanceStore.ts     # NEW: Maintenance entities cache
│   └── settingsStore.ts        # NEW: Settings state, version tracking
├── hooks/              # React hooks (existing + new)
│   ├── useUndo.ts              # NEW: Undo/redo operations
│   ├── useDamageReports.ts     # NEW: Damage report queries/mutations
│   ├── useAssignments.ts       # NEW: Assignment queries/mutations
│   ├── useKits.ts              # NEW: Kit queries/mutations  
│   ├── usePropertyInheritance.ts  # NEW: Inheritance calculations
│   ├── useTags.ts              # NEW: Tag queries/mutations
│   ├── useDataViews.ts         # NEW: View queries/mutations, filter execution
│   ├── useMaintenance.ts       # NEW: Maintenance queries/mutations
│   └── useSettingsVersions.ts  # NEW: Settings version queries/mutations
├── types/              # TypeScript type definitions (existing + new)
│   ├── undo.ts         # NEW: UndoAction, UndoableAction types
│   ├── damage.ts       # NEW: DamageReport, RepairStatus types
│   ├── assignment.ts   # NEW: Assignment, AssignmentHistory types
│   ├── kit.ts          # NEW: FixedKit, KitConfig, InheritanceConfig types
│   ├── model.ts        # NEW: AssetModel types
│   ├── tag.ts          # NEW: Tag, InheritedTag types
│   ├── view.ts         # NEW: DataView, Filter, GroupConfig types
│   ├── maintenance.ts  # NEW: MaintenanceCompany, Rule, WorkOrder types
│   └── settings.ts     # NEW: SettingsVersion types
├── utils/              # Utility functions (existing + new)
│   ├── imageCompression.ts     # NEW: Photo compression before base64
│   ├── base64Utils.ts          # NEW: Base64 encoding/decoding
│   ├── stateMachine.ts         # NEW: Generic state machine helpers
│   └── dateUtils.ts            # NEW: Relative date calculations for filters
├── pages/              # Page components (existing + modified)
│   ├── Dashboard.tsx           # NEW: Dashboard page
│   ├── AssetList.tsx           # MODIFIED: Add view selector, filters
│   ├── AssetDetail.tsx         # MODIFIED: Add damage/assignment/repair tabs
│   ├── KitList.tsx             # NEW: Kit list page
│   ├── KitDetail.tsx           # NEW: Kit detail page
│   ├── AssetModelList.tsx      # NEW: Model list page
│   ├── MaintenanceCompanies.tsx  # NEW: Company list page
│   ├── MaintenanceRules.tsx    # NEW: Rule list page
│   ├── WorkOrders.tsx          # NEW: Work order list page
│   └── Settings.tsx            # MODIFIED: Add version history, export/import
└── i18n/               # Internationalization (existing + modified)
    └── en.json         # MODIFIED: Add all new translation keys

tests/
├── services/           # Service tests (TDD for critical services)
│   ├── UndoService.test.ts
│   ├── PropertyInheritanceService.test.ts
│   ├── WorkOrderStateMachine.test.ts
│   └── PhotoStorageService.test.ts
└── components/         # Component tests (selective)
    ├── undo/
    ├── damage/
    └── maintenance/
```

**Structure Decision**: Using existing single-page web application structure. New features integrate into existing `src/` directory following established patterns (components/, services/, stores/, hooks/, types/). IndexedDB logic will be encapsulated in services using Dexie.js. No backend changes required - all persistence through ChurchTools Custom Modules API.

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

No violations detected. All constitution gates passed:
- ✅ Type Safety: Strict mode enabled, service interfaces defined
- ✅ UX Consistency: Mantine UI components, ChurchTools patterns
- ✅ Code Quality: ESLint configured, service-based architecture
- ✅ Performance Budget: Bundle analysis shows <200 KB projected
- ✅ Testing Strategy: TDD planned for critical services
- ✅ TDD Workflow: RED-GREEN-REFACTOR documented
- ✅ Environment Config: Uses existing ChurchTools credentials

---

## Phase Completion Summary

### Phase 0: Research ✅ COMPLETE

**Outputs**:
- `research.md` - 10 technical decisions documented with rationale
  - IndexedDB library (Dexie.js)
  - i18next integration
  - Photo compression strategy
  - Virtual scrolling (@tanstack/react-virtual)
  - State machines (XState)
  - Property inheritance pattern
  - Filter DSL design
  - Drag-and-drop (@dnd-kit)
  - Background job scheduling
  - ChurchTools API integration

**Key Findings**:
- Bundle impact: ~70 KB new dependencies (within budget)
- No blocking technical unknowns
- All clarifications from spec.md resolved

### Phase 1: Design & Contracts ✅ COMPLETE

**Outputs**:
- `data-model.md` - 11 new entities + 1 modified entity
  - Complete TypeScript schemas
  - Validation rules
  - State machines (WorkOrder, Asset, DamageReport, Kit)
  - Relationships and indexes
  - Query patterns
- `contracts/SERVICE_CONTRACTS.md` - 9 service interfaces
  - Complete method signatures
  - TDD test requirements
  - Error handling specifications
- `quickstart.md` - Development workflow guide
  - TDD workflow examples
  - Common patterns
  - Debugging tips
  - Testing checklist

**Agent Context Updated**:
- `.github/copilot-instructions.md` updated with:
  - TypeScript 5.x strict mode
  - React 18 + Vite 5 + Mantine UI v7
  - TanStack Query v5 + Zustand v4
  - Dexie.js v3 for IndexedDB
  - i18next v23 for i18n
  - ChurchTools Custom Modules API
  - Single-page web application structure

### Phase 2: Implementation Planning 🔄 NEXT

**Not created by this command** (per workflow specification).

To continue:
```bash
# Generate implementation tasks
/speckit.tasks

# OR manually
.specify/scripts/bash/generate-tasks.sh 004-advanced-inventory-features
```

This will create `tasks.md` with:
- Prioritized task breakdown (P1, P2, P3)
- Dependencies between tasks
- Estimated complexity
- TDD checklist per task

---

## Ready for Implementation

All planning artifacts complete. Branch `004-advanced-inventory-features` is ready for implementation.

**Artifacts Created**:
1. ✅ `plan.md` - This file
2. ✅ `research.md` - Technical decisions
3. ✅ `data-model.md` - Entity schemas
4. ✅ `contracts/SERVICE_CONTRACTS.md` - Service interfaces
5. ✅ `quickstart.md` - Developer guide
6. ✅ `.github/copilot-instructions.md` - Updated agent context

**Next Command**: `/speckit.tasks` to generate implementation task breakdown

