# Implementation Plan: Inventory Upgrade Suite

**Branch**: `003-inventory-upgrade-suite` | **Date**: 2025-10-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-inventory-upgrade-suite/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Expand the ChurchTools inventory extension to unify documentation, enforce English UI, extend booking and maintenance flows (including grouped maintenance stages and shared history timelines), seed demo data, cache the ChurchTools storage provider, and refresh public docs/community messaging. Technical execution will enhance React/Vite front-end modules, extend TanStack Query hooks, augment IndexedDB caching (Dexie), and integrate ChurchTools APIs with stricter lifecycle and availability controls.

## Technical Context

**Language/Version**: TypeScript 5.x (strict) with JSX/TSX
**Primary Dependencies**: React 18, Vite 5, Mantine 7, TanStack Query 5, Dexie 4, ChurchTools client SDK, mantine-datatable
**Storage**: ChurchTools Custom Modules (remote) + IndexedDB (Dexie) for offline cache
**Testing**: Vitest + Testing Library for UI; manual QA across Chrome/Safari/Firefox; eslint for static analysis
**Target Platform**: Web (ChurchTools embedded module via Vite bundle)
**Project Type**: Single-page web extension (frontend only)
**Performance Goals**: Bundle <200 KB gzipped, first meaningful paint <1s (3G), UI interactions <100ms, avoid redundant API calls via caching
**Constraints**: Offline-capable demo data, ChurchTools API rate limits, maintain compatibility with `/ccm/${VITE_KEY}` hosting path, adhere to ChurchTools UX patterns
**Scale/Scope**: Supports medium-sized congregations (~5–20 admins, thousands of assets/bookings), multiple maintenance plans and history streams

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Type Safety**: TypeScript strict mode already enforced; new work will maintain explicit typing and avoid `any`.
- [x] **UX Consistency**: Plan aligns with Mantine/ChurchTools component usage; research will document specific pattern references.
- [x] **Code Quality**: ESLint + formatting in place; plan includes modular hooks/components and doc consolidation.
- [x] **Performance Budget**: Existing bundle ~150 KB gzipped; research will model impact of new assets and enforce lazy loading for heavy flows.
- [x] **Testing Strategy**: Manual QA matrix defined; automated tests planned for booking quantity logic and maintenance plan reducers.
- [x] **Environment Config**: Uses `.env` for VITE_KEY/VITE_BASE_URL; storage provider caching will avoid new secrets.

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

src/
ios/ or android/
### Source Code (repository root)

```
src/
├── components/
│   ├── assets/
│   ├── bookings/
│   ├── maintenance/
│   ├── common/
│   └── settings/
├── hooks/
├── pages/
├── services/
├── state/
├── utils/
└── main.ts

scripts/
└── package.js

tests/
├── e2e/        (Playwright placeholder)
└── unit/       (Vitest suites)

coverage/       (nyc/vitest reports)
.specify/        (automation templates)
```

**Structure Decision**: Maintain single-frontend structure rooted in `src/`, extending existing `components/maintenance`, `components/bookings`, and `hooks/` directories; leverage `tests/unit` for new Vitest suites and keep packaging logic in `scripts/package.js` unchanged.

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |

## Phase 0 – Outline & Research

### Research tasks (completed)
- Consolidate shared history timeline approach across assets, bookings, and maintenance.
- Validate quantity-based booking allocation without new backend reservations.
- Define maintenance plan staging and calendar hold strategy per clarification.
- Design deterministic demo data seeding and reset flow for offline environments.
- Confirm storage provider memoization plan and performance safeguards to protect bundle budget.

Documentation: [research.md](./research.md)

### Key findings
- Adopt a reusable `<HistoryTimeline>` component consuming TanStack Query hooks to render consistent timelines.
- Perform quantity validation client-side using cached hierarchies, auto-assigning available child assets while surfacing shortages immediately.
- Track maintenance stages explicitly (`draft`, `planned`, `completed`) and publish maintenance-specific calendar holds released upon completion.
- Provide deterministic IndexedDB seeding with tagged records and developer-only reset controls to support demos.
- Memoize the ChurchTools storage provider and audit bundles with `vite-bundle-visualizer`, pairing with lazy loading for heavy maintenance views.

### Outstanding questions / follow-up
- None. All identified unknowns addressed; defer additional implementation nuances to Phase 1 design artifacts.

