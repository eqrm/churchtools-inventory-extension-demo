---
description: "Task list for implementing the Inventory Upgrade Suite feature"
---

# Tasks: Inventory Upgrade Suite

**Input**: Design documents from `/specs/003-inventory-upgrade-suite/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md

**Tests**: Included where the specification or research highlights critical logic (booking quantity allocation, maintenance stage reducers, demo seeding reliability). All other stories rely on manual QA noted in independent tests.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions


## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Ensure environment configuration and tooling align with the implementation plan before feature work begins.

- [X] T001 Update `.env.example` with `VITE_KEY` / `VITE_BASE_URL` guidance and onboarding notes (`/.env.example`)
- [X] T002 Add bundle analysis script using `vite-bundle-visualizer` to `package.json` and document usage in `README.md` (`/package.json`, `/README.md`)
- [X] T003 [P] Create Vitest configuration enabling React Testing Library and coverage thresholds (`/vitest.config.ts`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure shared across all user stories.

- [X] T004 Memoize ChurchTools storage provider and export singleton utilities (`/src/services/churchTools/storageProvider.ts`)
- [X] T005 [P] Define shared history event types and adapters for TanStack Query (`/src/utils/history/types.ts`, `/src/hooks/useHistoryEvents.ts`)
- [X] T006 Initialize Dexie schema extensions for demo metadata and history caching (`/src/state/offline/db.ts`)
- [X] T007 Establish lazy-loaded route bundles for maintenance dashboard modules to protect bundle budget (`/src/pages/MaintenanceDashboard.tsx`, `/src/router/index.ts`)
- [X] T008 Add instrumentation to confirm single storage provider initialization and document metrics hook (`/src/utils/metrics/storageProviderInstrumentation.ts`)
- [X] T009 [P] Update ESLint/Vitest integration to cover new folders (`/.eslintrc.cjs`, `/package.json`)

**Constitution Compliance Gates**
- Confirm TypeScript strict mode remains enabled in `/tsconfig.json`
- Validate lint configuration covers new directories via `npm run lint`
- Ensure `.env.example` reflects required variables and explanations
- Record bundle baseline in `/docs/performance/baseline.md`
- Execute `npm test` and verify Vitest passes

**Checkpoint**: Foundation ready – user story work can begin.

---

## Phase 3: User Story 1 – Booking lifecycle trace (Priority: P1) 🎯 MVP

**Goal**: Deliver booking overview/history tabs with shared timeline component and quantity-aware booking flows.

**Independent Test**: Open any booking, toggle Overview ↔ History, verify lifecycle entries append in-place when actions occur, default assignee is creator, and quantity validation blocks over-allocation.

### Tests for User Story 1
- [x] T010 [P] [US1] Write unit tests for booking quantity allocator edge cases (`/tests/unit/bookings/quantityAllocator.test.ts`)
- [x] T011 [P] [US1] Add component test ensuring `<HistoryTimeline>` renders grouped events (`/tests/unit/components/HistoryTimeline.test.tsx`)

### Implementation for User Story 1
- [x] T012 [P] [US1] Implement reusable `<HistoryTimeline>` component with Mantine Timeline styles (`/src/components/common/HistoryTimeline.tsx`)
- [x] T013 [US1] Integrate Overview/History tabs into booking detail screen (`/src/components/bookings/BookingDetailsTabs.tsx`)
- [x] T014 [US1] Add quantity selector with availability checks to booking form (`/src/components/bookings/BookingForm.tsx`)
- [x] T015 [US1] Implement quantity allocation helper leveraging cached assets (`/src/services/bookings/quantityAllocator.ts`)
- [x] T016 [US1] Append lifecycle events in booking mutations and sync TanStack Query cache (`/src/services/bookings/bookingMutations.ts`)
- [x] T017 [US1] Surface shortages and success toast messaging via Mantine notifications (`/src/components/bookings/BookingForm.tsx`)

**Checkpoint**: Booking lifecycle trace functional and independently testable.

---

## Phase 4: User Story 2 – Multi-asset maintenance orchestration (Priority: P1)

**Goal**: Provide multi-asset maintenance planning with stage controls, calendar holds, and partial completion tracking.

**Independent Test**: Create a plan, move Draft → Planned → Completed, confirm calendar holds appear with maintenance color, and partial completion releases only selected assets while history updates.

### Tests for User Story 2
- [x] T018 [P] [US2] Cover maintenance stage reducer transitions and partial completion logic (`/tests/unit/maintenance/planReducer.test.ts`)

### Implementation for User Story 2
- [x] T019 [P] [US2] Create maintenance plan store with stage state machine (`/src/state/maintenance/planStore.ts`)
- [x] T020 [US2] Build maintenance plan form with asset/company multiselect and scheduling fields (`/src/components/maintenance/MaintenancePlanForm.tsx`)
- [x] T021 [US2] Implement per-asset completion table with shared timeline updates (`/src/components/maintenance/MaintenanceCompletionTable.tsx`)
- [x] T022 [US2] Publish maintenance calendar holds via ChurchTools API integration (`/src/services/maintenance/maintenanceCalendar.ts`)
- [x] T023 [US2] Embed maintenance history tab on asset detail using `<HistoryTimeline>` (`/src/components/assets/AssetMaintenanceHistory.tsx`)
- [x] T024 [US2] Add disabled file upload control with future capability hint (`/src/components/maintenance/MaintenanceCompletionDrawer.tsx`)

**Checkpoint**: Maintenance orchestration independently verifiable.

---

## Phase 5: User Story 3 – Configuration transparency for numbering (Priority: P2)

**Goal**: Surface prefix setup guidance and default prefix selection that persists to the person cache.

**Independent Test**: Remove prefixes, observe dashboard warning, set default prefix, create category and confirm auto-number respects prefix for current user.

### Tests for User Story 3
- [x] T025 [P] [US3] Validate auto-numbering helper respects prefix fallback hierarchy (`/tests/unit/assets/autoNumbering.test.ts`)

### Implementation for User Story 3
- [x] T026 [US3] Create dashboard prefix info card with settings navigation (`/src/components/dashboard/PrefixWarningCard.tsx`)
- [x] T027 [US3] Enhance prefix settings panel for default selection and persistence (`/src/components/settings/PrefixSettingsPanel.tsx`)
- [x] T028 [US3] Update auto-number service to read/write person cache (`/src/services/assets/autoNumbering.ts`)
- [x] T029 [US3] Adjust category creation workflow to consume default prefix (`/src/components/assets/CategoryForm.tsx`)

**Checkpoint**: Numbering transparency complete and testable.

---

## Phase 6: User Story 4 – Guided demo onboarding (Priority: P2)

**Goal**: Offer deterministic demo data seeding on first launch with reset controls confined to developer settings.

**Independent Test**: Trigger first-run modal, accept seeding, review sample data, then purge demo data via developer settings without touching real entries.

### Tests for User Story 4
- [x] T030 [P] [US4] Unit test demo seeder tagging and cleanup routines (`/tests/unit/demo/demoSeeder.test.ts`)

### Implementation for User Story 4
- [x] T031 [US4] Implement first-run modal with accept/decline handling (`/src/components/onboarding/DemoDataModal.tsx`)
- [x] T032 [US4] Build deterministic seeding routine with tagged entities (`/src/services/demo/demoSeeder.ts`)
- [x] T033 [US4] Track demo metadata in Dexie and expose helpers (`/src/state/offline/demoMetadataStore.ts`)
- [x] T034 [US4] Add developer settings controls for reset/reseed with confirmation prompts (`/src/components/settings/DeveloperToolsCard.tsx`)
- [x] T035 [US4] Guard seeding/reset flows behind dev-mode checks (`/src/utils/environment/flags.ts`)

**Checkpoint**: Demo onboarding independently verifiable.

---

## Phase 7: User Story 5 – Consistent people context & documentation (Priority: P3)

**Goal**: Normalize person avatars across views and consolidate documentation for stakeholder alignment.

**Independent Test**: Inspect booking, asset, and maintenance lists for consistent avatar rendering without extra API calls; confirm implementation notes, README, and German forum post updated.

### Implementation for User Story 5
- [x] T036 [US5] Create shared avatar component utilizing cache or initials (`/src/components/common/PersonAvatar.tsx`)
- [x] T037 [US5] Replace booking people badges with `PersonAvatar` (`/src/components/bookings/BookingParticipants.tsx`)
- [x] T038 [US5] Replace asset assignment avatars with `PersonAvatar` (`/src/components/assets/AssetAssignmentList.tsx`)
- [x] T039 [US5] Update maintenance staff listings to use `PersonAvatar` (`/src/components/maintenance/MaintenanceTeamList.tsx`)
- [x] T040 [US5] Consolidate implementation notes and decisions (`/docs/implementation-notes.md`)
- [x] T041 [US5] Refresh `README.md` with new features and usage guidance (`/README.md`)
- [x] T042 [US5] Draft German community forum post summarizing whole extension, write about usage of spec-kit, future plans granular permissions, files images etc (`/docs/forum-post-de.md`)

**Checkpoint**: People context consistent; documentation refreshed.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final quality gates and shared improvements.

- [x] T044 Verify TypeScript build, lint, and vitest all pass (`npm run build`, `npm run lint`, `npm test`)
- [x] T045 Measure gzipped bundle size and record in performance log (`/docs/performance/baseline.md`)
- [x] T046 [P] Conduct cross-browser smoke tests and document results (`/docs/testing/cross-browser.md`)
- [x] T047 [P] Validate demo quickstart instructions in `quickstart.md` (create during Phase 1 follow-up) and update as needed (`/specs/003-inventory-upgrade-suite/quickstart.md`)
- [x] T048 Perform accessibility sweep across new components and log issues (`/docs/testing/accessibility.md`)

**Pre-Deployment Quality Gates**
- TypeScript compilation passes with no errors (`npm run build`)
- ESLint returns clean output (`npm run lint`)
- Vitest suite fully green (`npm test`)
- Bundle size (gzipped) < 200 KB documented
- Manual QA completed on Chrome, Safari, Firefox (`/docs/testing/cross-browser.md`)
- No stray `console`/`debugger` statements in production bundles
- Demo seeding/reset scenarios validated using quickstart guide
- README and forum post reviewed by stakeholders

---

## Dependencies & Execution Order

1. **Phase 1 → Phase 2**: Setup tasks must finish before foundational work begins.
2. **Phase 2 → User Stories**: All foundational tasks complete (including constitution gates) before any user story starts.
3. **User Story Order**: US1 and US2 (both P1) can commence once the foundation is ready; US3 and US4 (P2) follow, and US5 (P3) can start after at least one P2 story completes or in parallel if resourced.
4. **Within Stories**:
   - Execute tests before implementation tasks (write tests → watch fail → implement → pass).
   - Follow logical dependency: data/services before UI integrations.
5. **Phase 8**: Begins only after desired user stories are delivered; serves as release polish and validation.

### Story Dependency Graph
- US1 ⟂ US2 (parallel after foundation)
- US3 depends on prefix-related foundation tasks (T005, T006, T008 indirectly) and can start after US1 if resource constrained.
- US4 depends on Dexie foundation (T006) and environment flags (T035 from same story, but ensure T006 complete first).
- US5 depends on shared avatar component work after foundation; documentation tasks can run once relevant features stabilize.

---

## Parallel Execution Examples

- **Foundation**: T005 and T009 can run alongside T006 once T004 scaffolds shared services.
- **User Story 1**: T012 and T015 can proceed in parallel, while T013 waits for both to integrate.
- **User Story 2**: T019 and T020 can start together; T022 depends on T019.
- **User Story 4**: T032 and T033 can run concurrently prior to wiring UI (T031).
- **Polish**: T043, T046, and T048 can be executed in parallel after feature development.

---

## Implementation Strategy

### MVP First (User Story 1)
1. Complete Phases 1–2.
2. Deliver Phase 3 (US1) with automated tests (T010–T017).
3. Validate via independent test and bundle check; this is the MVP for release if schedule tight.

### Incremental Delivery
- **Increment 1**: US1
- **Increment 2**: US2 (maintenance orchestration)
- **Increment 3**: US3 (numbering transparency)
- **Increment 4**: US4 (demo onboarding)
- **Increment 5**: US5 (people context & docs)

### Team Parallelization
- Developer A: US1 + shared history components
- Developer B: US2 maintenance workflows
- Developer C: US4 demo onboarding (after foundation)
- Developer D: US3 numbering + US5 documentation 

Coordinate merges after each phase checkpoint, ensuring tests and bundle checks run before integration.
