# Feature Specification: Inventory Upgrade Suite

**Feature Branch**: `003-inventory-upgrade-suite`  
**Created**: 2025-10-24  
**Status**: Draft  
**Input**: Merge docs, enforce English UI, expand booking & maintenance flows, provide demo data, optimize storage usage, update public documentation.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Booking lifecycle trace (Priority: P1)

As an inventory coordinator, I want every booking to capture its lifecycle with an instantly accessible history so I can audit who created, confirmed, or fulfilled a reservation without leaving the booking page.

**Why this priority**: Booking accuracy is critical for day-to-day operations; missing accountability causes double bookings and strained resources.

**Independent Test**: Open any booking, switch between Overview and History tabs, verify the timeline logs events (create, confirm, release) and that new actions append entries without reloading the app.

**Acceptance Scenarios**:

1. **Given** a new booking created by Person A, **When** the booking opens, **Then** the Overview tab is visible by default and the History tab lists “Person A created booking at <timestamp>”.
2. **Given** Person B confirms the booking, **When** the booking reloads, **Then** the History tab appends “Person B confirmed booking at <timestamp>” while the component reused from asset history renders identical styles.
3. **Given** a user initiates booking creation, **When** the form loads, **Then** the “Booking for” field defaults to the creator and the requested quantity control allocates available sub-items or blocks submission if demand exceeds supply.

---

### User Story 2 - Multi-asset maintenance orchestration (Priority: P1)

As a facilities manager, I need to plan, schedule, and complete maintenance for groups of assets with linked companies so I can reserve equipment, avoid booking conflicts, and close work with proper documentation.

**Why this priority**: Maintenance downtime directly affects asset availability; planning must prevent accidental bookings and provide traceability for audits.

**Independent Test**: Create a maintenance plan for multiple assets, progress it through Draft → Planned → Completed, confirm asset calendars show maintenance holds, and verify partial completion per asset.

**Acceptance Scenarios**:

1. **Given** a Draft maintenance plan, **When** I assign assets AC1–AC10, maintenance company “AC Experts”, and interval rules, **Then** the plan stores the association and displays the company from master data.
2. **Given** the plan state is Planned with a start/end window, **When** I check affected asset calendars or attempt a booking, **Then** a maintenance hold booking appears in a distinct color and regular bookings are blocked for that range.
3. **Given** maintenance concludes, **When** I mark only AC1–AC5 as completed with notes and leave AC6–AC10 pending, **Then** the plan records partial completion and the history tab in the asset view reflects the update using the shared history component.

---

### User Story 3 - Configuration transparency for numbering (Priority: P2)

As a configuration admin, I want clear signals when prefixes or automatic numbering need attention so new assets inherit correct identifiers without manual tracking.

**Why this priority**: Misconfigured prefixes produce duplicate or unreadable asset numbers, complicating logistics and reporting.

**Independent Test**: Remove prefix data, visit the dashboard to see the warning and link, adjust default prefix in settings, and verify new categories auto-generate asset numbers according to the selected prefix.

**Acceptance Scenarios**:

1. **Given** no prefixes exist, **When** I open the dashboard, **Then** an info panel explains the missing setup and links me directly to Prefix Settings.
2. **Given** I set a default prefix in settings, **When** I create a category with automatic naming, **Then** the asset number incorporates the default prefix while storing my preference in the person cache for future sessions.

---

### User Story 4 - Guided demo onboarding (Priority: P2)

As a new user, I want the app to offer demo data on first launch so I can explore every feature without affecting real congregational records, and remove samples later without losing real data.

**Why this priority**: Demo data accelerates adoption and reduces support overhead for trial users.

**Independent Test**: Launch the extension on a clean profile, accept demo data, confirm seeded categories/assets/bookings with initials-based avatars, then delete demo data and verify real entries remain.

**Acceptance Scenarios**:

1. **Given** the extension runs for the first time, **When** the popup appears and I accept seeding, **Then** demo categories (Electronics, Furniture, Work Tools, Appliances) with varied parent/child assets appear and no external communication triggers.
2. **Given** I open developer settings, **When** I press “Reset database” or “Re-seed demo data”, **Then** the system asks for confirmation and performs the action without touching manually created records.

---

### User Story 5 - Consistent people context & documentation (Priority: P3)

As a product steward, I need consistent person avatars and consolidated documentation so teams and stakeholders share a common understanding of decisions and can promote the extension publicly.

**Why this priority**: Visual cues reduce ambiguity in collaborative workflows and polished docs support community adoption.

**Independent Test**: Inspect any view listing people to confirm avatar icons load from cache, review merged implementation notes, updated README, and generated German forum post draft.

**Acceptance Scenarios**:

1. **Given** person data exists in cache with avatar references, **When** I view bookings, assets, or maintenance screens, **Then** names display alongside initials or stored icons without additional API calls.
2. **Given** the documentation folder contains multiple markdown files, **When** the cleanup completes, **Then** a single implementation-notes document remains with sections covering decisions, feedback, and known issues plus a README update and forum post draft.

### Edge Cases

- No prefixes configured but user lacks permission to edit settings → dashboard message must degrade gracefully with advisory text and disabled link.
- Booking quantity request exceeds available child assets → system blocks submission and surfaces exact availability.
- Maintenance plan overlaps an existing booking created before the plan → booking owner receives conflict notice and administrators can decide whether to cancel or reschedule.
- Demo data seeding attempted when real data already exists → prompt warns about mixing contexts and requires explicit confirmation.
- Person avatar fetch fails or image missing → show deterministic initials badge and keep cache entry without causing repeated fetch attempts.
- User declines demo data on first launch but later requests it from settings → system records dismissal and presents manual seeding option without re-showing the welcome popup.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST ensure all user-facing text (labels, buttons, notifications) displays in English and provide a review checklist to verify localized strings.
- **FR-002**: Categories with automatic naming MUST incorporate the configured asset number pattern, ensuring the asset number field populates correctly upon creation.
- **FR-003**: Dashboard MUST display an informational banner when no prefixes exist, including guidance text and a direct navigation control to Prefix Settings.
- **FR-004**: Prefix Settings MUST allow administrators to mark one prefix as the default and persist that preference in the person cache for individualized reuse.
- **FR-005**: Booking detail pages MUST present “Overview” and “History” tabs, with History reusing a shared timeline component.
- **FR-006**: Booking history MUST capture lifecycle events (create, approve/confirm, modify, cancel) with actor name, timestamp, and action summary.
- **FR-007**: The shared history component MUST support rendering for bookings, assets, and maintenance records with consistent formatting and filtering.
- **FR-008**: Asset detail pages MUST include a Maintenance History tab driven by the shared history component.
- **FR-009**: Booking creation and edit forms MUST default the “Booking for” field to the current user while allowing manual override.
- **FR-010**: Booking forms MUST support quantity-based reservations for parent assets, automatically allocating available child assets or communicating shortages before submission.
- **FR-011**: Newly created assets MUST default to “not bookable” status, requiring an explicit user opt-in to expose them for booking.
- **FR-012**: Wherever person references appear, the UI MUST render cached person icons or fallback initials badges without redundant network lookups.
- **FR-013**: Maintenance management MUST expose master data for maintenance companies, selectable within plan creation and edit flows.
- **FR-014**: Maintenance plans MUST support associating multiple assets and tracking completion per asset (completed, pending, partially completed states).
- **FR-015**: Maintenance plans MUST support distinct stages—Draft (define assets, interval, company), Planned (define start/end dates), and Completed (capture outcomes & notes).
- **FR-016**: During Planned windows, affected assets MUST automatically block regular bookings and surface maintenance holds in calendars using a unique booking type and color; assets marked as completed must immediately release their holds while pending assets remain blocked.
- **FR-017**: Maintenance completion UI MUST present a disabled file upload control with helper text explaining future capability without accepting files.
- **FR-018**: First-run experience MUST display a modal offering demo data, detailing contents and providing accept/decline options without contacting external services.
- **FR-019**: Demo data seeding MUST create representative categories, parent/child assets, bookings, and people with randomly generated names and initials-based avatars.
- **FR-020**: Users MUST be able to remove demo data via dedicated action that affects only seeded records and leaves manually created data untouched.
- **FR-021**: Developer settings MUST provide reset-database and re-seed-demo controls gated by confirmation prompts and restricted to development mode.
- **FR-022**: Documentation cleanup MUST consolidate existing docs into a single implementation-notes markdown file summarizing decisions, feedback, and issues.
- **FR-023**: Project README MUST describe current features, installation steps, and usage guidance reflecting new functionality.
- **FR-024**: Repository MUST include a short German-language forum post draft showcasing the extension’s capabilities for community outreach.
- **FR-025**: Application MUST reuse a single ChurchTools storage provider instance between migrations and runtime hooks to avoid duplicate initialization.

### Key Entities *(include if feature involves data)*

- **HistoryEvent**: Immutable record of actions linked to bookings, assets, or maintenance items; attributes include entity type, entity id, actor, action verb, timestamp, optional notes.
- **MaintenancePlan**: Aggregates targeted assets, maintenance company, interval rules, current stage, schedule window, per-asset completion status, and optional completion notes.
- **MaintenanceCompany**: Master data entry describing service providers with name, contact details, and applicable asset categories.
- **DemoDataset**: Metadata describing whether demo data is installed, seed timestamp, seeded entities, and ownership to support deletion without affecting real data.
- **PrefixConfiguration**: Stores available prefixes, default selection, and per-person default preference cached for auto-numbering.
- **PersonAvatarCache**: Map of person identifiers to avatar assets or generated initials with last refreshed timestamp.

### Assumptions

- Default prefix preference stored in the person cache is scoped per ChurchTools user and persists across sessions on the same account.
- Quantity-based bookings allocate only if sufficient child assets exist; otherwise the user must adjust quantity (system does not auto-overbook or split across dates).
- First-run detection relies on local storage/state within the extension and is reset only when the user explicitly clears app data.
- Maintenance hold bookings use existing calendar infrastructure and respect future permission models by tagging the new booking type, even though permissions are unchanged in this release.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of audited UI strings appear in English during QA review (no German text remains in visible UI or notifications).
- **SC-002**: Users can identify the full lifecycle of a booking in under 10 seconds by reading the History tab (validated via usability test with 5 users).
- **SC-003**: Maintenance plans prevent 100% of attempted conflicting bookings during planned windows in automated regression tests.
- **SC-004**: At least 80% of first-time users presented with the demo popup accept seeding during pilot testing, and 0 real user records are deleted when demo data is removed.
- **SC-005**: Shared storage provider initialization count is reduced to a single instantiation per session, confirmed by instrumentation logs.

## Clarifications

### Session 2025-10-24

- Q: How should maintenance holds behave when a multi-asset plan is partially completed? → A: Release holds immediately for completed assets while keeping holds on pending assets.

