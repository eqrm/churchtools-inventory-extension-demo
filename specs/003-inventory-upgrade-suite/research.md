# Phase 0 Research – Inventory Upgrade Suite

## Decision 1: Shared history timeline component
- **Decision**: Implement a reusable `<HistoryTimeline>` component that accepts an entity identifier, entity type, and TanStack Query hooks for data retrieval, returning Mantine `Timeline` + grouped badges for actions.
- **Rationale**: Provides a single rendering path for bookings, assets, and maintenance events, reducing duplication and ensuring identical UX patterns.
- **Alternatives considered**:
  - Separate bespoke history components per feature (rejected: higher maintenance and inconsistent UX).
  - Embedding history inside each page via inline tables (rejected: harder to scan chronologically and less visual parity).

## Decision 2: Quantity-based booking allocation strategy
- **Decision**: Extend booking creation flow with a quantity selector that validates availability via cached asset hierarchy; auto-assign the first X available child assets at submit time and surface shortages with actionable copy.
- **Rationale**: Keeps workflow lightweight and deterministic without requiring users to pick specific items; leverages existing asset availability queries.
- **Alternatives considered**:
  - Creating a new API to reserve assets before submission (rejected: adds backend dependency and potential stale holds).
  - Allowing overbooking with admin reconciliation later (rejected: conflicts with prevention goals in spec).

## Decision 3: Maintenance plan staging & calendar holds
- **Decision**: Model maintenance plans with explicit `stage` values (draft, planned, completed) and store per-asset completion flags; publish calendar entries using a dedicated “maintenance” booking type and release holds immediately for completed assets.
- **Rationale**: Aligns with clarification outcome, avoids conflicting bookings, and keeps calendar overlays distinguishable for permissions in future releases.
- **Alternatives considered**:
  - Single-stage maintenance records (rejected: fails requirement for planning and partial completion).
  - Delaying calendar holds until completion (rejected: bookings could conflict during maintenance window).

## Decision 4: Demo data seeding & reset tooling
- **Decision**: Create a deterministic seeding routine that populates IndexedDB/ChurchTools module records with generated UUIDs, synthetic names, and asset templates; tag seeded records for safe deletion and expose developer actions in settings (dev mode only).
- **Rationale**: Meets onboarding requirement without touching live ChurchTools data; tagging simplifies selective cleanup.
- **Alternatives considered**:
  - Importing remote sample data (rejected: violates offline/no-external-call requirement).
  - Storing seed state only in memory (rejected: demo must persist across sessions).

## Decision 5: Storage provider reuse & performance guardrails
- **Decision**: Memoize the ChurchTools storage provider instance via module-level singleton and ensure migrations re-use it; audit bundle via `vite-bundle-visualizer` to keep gzip <200 KB and lazy-load maintenance dashboard tables.
- **Rationale**: Eliminates duplicate initialization overhead noted in spec and protects performance budget gate.
- **Alternatives considered**:
  - Retaining separate instances for migrations/hooks (rejected: unnecessary network/auth overhead).
  - Eager-loading all maintenance components (rejected: risks bundle expansion and slower initial paint).
