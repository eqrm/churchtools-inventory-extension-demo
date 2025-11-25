# Implementation Notes – ChurchTools Inventory Extension

## Overview
- React 18 + TypeScript 5 project bundled with Vite 5 and Mantine UI 7
- TanStack Query powers data fetching; Zustand stores keep client state (e.g. maintenance plan, demo metadata)
- IndexedDB (Dexie) caches prefixes, demo metadata, and person defaults for offline resilience
- ChurchTools storage provider is memoized to avoid duplicate API clients and instrumentation tracks single instantiation

## Demo & Onboarding
- First-run modal (`DemoDataModal`) offers deterministic demo data seeding backed by `demoSeeder` and tagged entities for clean resets
- Developer settings expose gated controls (`DeveloperToolsCard`) to reseed or clear demo data in dev mode only (`environment/flags`)
- Demo metadata persists inside Dexie (`demoMetadataStore`) to prevent re-seeding loops and store dismissal timestamps
- Unit coverage (`tests/unit/demo/demoSeeder.test.ts`) ensures tagging, reseeding, and cleanup remain deterministic

## Numbering Transparency
- Auto-number helper (`services/assets/autoNumbering.ts`) centralises fallback logic, person preference reads/writes, and preview formatting
- Dashboard warning card surfaces missing prefixes while settings panel (`PrefixSettingsPanel`) persists module + personal defaults to Dexie/local storage
- Category form and asset form consume shared helpers to present live previews and persist personal choices during asset creation

## People Context Consistency
- Shared `PersonAvatar` component normalises avatar rendering, initials fallback, and cached lookups via `PersonSearchService`
- Booking screens reuse `BookingParticipants`, DataTable cell renderers, and form summaries to keep avatar/name presentation aligned
- Asset details include `AssetAssignmentList` (created by, last modified, in-use) while maintenance plans summarise technicians through `MaintenanceTeamList`
- Legacy `PersonDisplay` now delegates to `PersonAvatar` to avoid duplicate fetching logic and preserve name-only rendering

## Maintenance Flow Enhancements
- Maintenance plans tracked in Zustand store with stage gating (draft → planned → completed) and per-asset completion metadata
- Calendar holds are synchronised via `maintenanceCalendar` helpers during stage transitions and schedule edits
- Completion drawer logs outcomes, enforces state machine rules, and the table highlights status via badges and shared team list summary

## Documentation & Communication Assets
- `docs/implementation-notes.md` (this file) consolidates architectural decisions and module responsibilities for quick onboarding
- README highlights feature set, demo flows, and bundle/testing guardrails; German forum draft summarises release narratives and roadmap
- Performance guard: `npm run analyze:bundle` records bundle deltas; QA gates require lint, build, and vitest before release tagging

## Known Follow-Ups
- Granular permissions still pending (future release) – booking “on behalf of” currently unrestricted
- Photos remain disabled to respect CustomData size caps; future integration will pivot to ChurchTools Files API
- Accessibility audit outstanding for new people components and onboarding modal (tracked in `/docs/testing/accessibility.md` once executed)
