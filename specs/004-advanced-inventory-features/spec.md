# Feature Specification: Advanced Inventory Features

**Feature Branch**: `004-advanced-inventory-features`  
**Created**: 2025-11-10  
**Status**: Draft  
**Input**: Add advanced inventory features including undo store, damage tracking, asset assignment system, fixed kits with inheritance, asset models, tagging, Notion-like data views, CAFM/CMMS maintenance management, i18n support, and settings versioning with export/import

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Undo Recent Changes (Priority: P1)

As an inventory manager, I want to undo my recent actions so I can quickly recover from mistakes without manually reverting changes or contacting support.

**Why this priority**: Accidental edits and deletions are the most common user errors. Providing undo functionality prevents data loss and reduces frustration, making the system more trustworthy and user-friendly.

**Independent Test**: Create an asset, edit its properties, then click the undo button in the UI. Verify the asset returns to its previous state and the undo history shows the reverted action.

**Acceptance Scenarios**:

1. **Given** I have edited an asset's name, **When** I click "Undo" in the undo section, **Then** the asset name reverts to its previous value and the undo history shows the reversal.
2. **Given** I have created a new asset, **When** I click "Undo", **Then** the asset is deleted and removed from the asset list.
3. **Given** I log out and log back in within 24 hours, **When** I view the undo history, **Then** my previous actions from before logout are still visible and undoable.
4. **Given** 25 hours have passed since an action, **When** I view the undo history, **Then** that action is no longer available for undo.

---

### User Story 2 - Track Asset Damage and Repairs (Priority: P1)

As a facilities coordinator, I want to document damage reports with photos and notes so I can track asset condition over time and maintain a complete repair history.

**Why this priority**: Damage tracking is critical for asset lifecycle management, insurance claims, and maintenance planning. Without it, organizations lose visibility into asset condition and repair costs.

**Independent Test**: Mark an asset as broken, upload damage photos, add repair notes, then mark it as repaired. Verify the complete repair history is visible on the asset detail page.

**Acceptance Scenarios**:

1. **Given** I am viewing an asset, **When** I toggle "Mark as Broken" and add a damage report with description and photos, **Then** the asset status changes to "Broken" and the damage report is saved.
2. **Given** an asset has multiple damage reports, **When** I view the Repair History tab, **Then** all reports are displayed in chronological order with timestamps, photos, and descriptions.
3. **Given** an asset is marked as broken, **When** I add a repair note and toggle "Mark as Repaired", **Then** the asset status changes to "Available" and the repair is recorded in the history.
4. **Given** I am adding a damage report, **When** I upload 3 photos, **Then** all photos are stored and displayed in the report.

---

### User Story 3 - Assign Assets to People or Groups (Priority: P1)

As an inventory coordinator, I want to assign assets to specific users or groups so I can track who is responsible for each asset and when it was checked out.

**Why this priority**: Asset assignment is fundamental for accountability and utilization tracking. Organizations need to know who has what equipment at all times.

**Independent Test**: Search for a person using ChurchTools search, assign an asset to them, verify the assignment history records the checkout date, then check in the asset and verify the check-in date is recorded.

**Acceptance Scenarios**:

1. **Given** I am viewing an asset, **When** I search for a person in the "Assigned to" field and select them, **Then** the asset is assigned to that person and the status changes to "In Use".
2. **Given** an asset is assigned to a user, **When** I change the status to "Broken", **Then** a confirmation popup asks if I want to unassign the asset.
3. **Given** I assign an asset to a ChurchTools group, **When** I view the asset, **Then** the group name is displayed in the assignment field.
4. **Given** an asset has been assigned and checked in multiple times, **When** I view the Assignment History tab, **Then** all assignments with checkout and check-in dates are displayed.

---

### User Story 4 - Create Fixed Kits with Property Inheritance (Priority: P2)

As an equipment manager, I want to create fixed kits where sub-assets inherit the kit's location and status so I can manage equipment sets as a single unit while tracking individual components.

**Why this priority**: Many organizations manage equipment in sets (e.g., camera kit with lenses, tripod). Property inheritance ensures consistency and reduces manual updates across related assets.

**Independent Test**: Create a fixed kit with 3 sub-assets, change the kit's location, verify all sub-assets automatically update to the new location, then disassemble the kit and verify sub-assets can be edited independently.

**Acceptance Scenarios**:

1. **Given** I create a fixed kit with 3 sub-assets and enable location inheritance, **When** I change the kit's location, **Then** all sub-assets automatically update to match the kit's location.
2. **Given** a sub-asset in a fixed kit is marked as broken, **When** I view the kit, **Then** the kit status shows "Incomplete" with a note about the broken sub-asset.
3. **Given** I try to edit a sub-asset's inherited property directly, **When** I click the location field, **Then** it is locked with a tooltip indicating it inherits from the kit.
4. **Given** I disassemble a fixed kit, **When** the disassembly completes, **Then** all sub-assets become editable independently and the kit records a disassembly date.

---

### User Story 5 - Use AssetModel Templates (Priority: P2)

As a procurement specialist, I want to create AssetModel templates so I can quickly create new assets with pre-filled specifications for common equipment types.

**Why this priority**: AssetModel templates streamline data entry for recurring purchases and ensure consistency in asset specifications across similar equipment.

**Independent Test**: Create an AssetModel for "Dell Latitude 5510" with manufacturer and default warranty period, then create 3 assets from this model and verify they inherit the model's properties.

**Acceptance Scenarios**:

1. **Given** I create an AssetModel with manufacturer "Dell" and warranty "24 months", **When** I create an asset from this model, **Then** the asset inherits these properties with the option to override them.
2. **Given** an AssetModel has tags applied, **When** I create an asset from the model, **Then** the asset automatically receives those tags as inherited tags.
3. **Given** I edit an AssetModel's tags, **When** I save the changes, **Then** a confirmation prompt shows the number of existing assets that will be updated.

---

### User Story 6 - Organize with Tags and Visual Inheritance (Priority: P2)

As an inventory user, I want to tag assets, kits, and models with custom labels so I can categorize and filter equipment by department, purpose, or other criteria.

**Why this priority**: Tagging provides flexible organization beyond rigid categories, enabling users to find equipment quickly using multiple classification schemes.

**Independent Test**: Create a tag "Production Equipment", apply it to a kit, verify sub-assets show the tag with an inheritance indicator, then try to remove the tag from a sub-asset and verify it's prevented.

**Acceptance Scenarios**:

1. **Given** I create a tag and apply it to a kit, **When** I view the kit's sub-assets, **Then** they display the tag with a visual indicator (icon/color) showing it's inherited.
2. **Given** a sub-asset has an inherited tag, **When** I try to remove it, **Then** the system prevents removal and displays a message indicating it's inherited from the kit.
3. **Given** I hover over an inherited tag, **When** the tooltip appears, **Then** it shows the source (e.g., "Inherited from Kit: Camera Setup").
4. **Given** I apply tags to an AssetModel, **When** I create assets from that model, **Then** those assets inherit the model's tags.

---

### User Story 7 - Browse Assets with Notion-like Views (Priority: P1)

As an inventory user, I want to view and filter assets using different layouts (table, gallery, kanban, calendar) with powerful filters so I can find equipment efficiently and visualize data in the most useful format.

**Why this priority**: Different tasks require different views. A flexible, filterable data list is essential for daily operations and replaces multiple purpose-built screens.

**Independent Test**: Create a saved filter for "Production Equipment in Warehouse A", switch between table and gallery view, verify the filter persists, then create a kanban view grouped by status.

**Acceptance Scenarios**:

1. **Given** I am viewing the asset list, **When** I select "Gallery" view, **Then** assets display as cards with thumbnails.
2. **Given** I create a filter "Status equals In Use", **When** I save it as "Active Assignments", **Then** the filter appears in my saved filters and can be reapplied with one click.
3. **Given** I switch to kanban view and group by status, **When** I drag an asset to a different column, **Then** its status updates automatically.
4. **Given** I create a relative date filter "Created in last 7 days", **When** tomorrow arrives, **Then** the filter automatically adjusts to include today and exclude 8 days ago.
5. **Given** I collapse an asset group in table view, **When** I navigate away and return, **Then** the group remains collapsed.

---

### User Story 8 - View Dashboard Widgets (Priority: P3)

As an inventory manager, I want to see a dashboard with key metrics and alerts so I can quickly assess asset status and upcoming maintenance without navigating through multiple screens.

**Why this priority**: Dashboards provide at-a-glance visibility but are lower priority than core CRUD operations and filtering capabilities.

**Independent Test**: Open the dashboard and verify widgets display correct data: assigned assets count, broken assets count, maintenance due this week.

**Acceptance Scenarios**:

1. **Given** I have 5 assigned assets, **When** I view the "My Assigned Assets" widget, **Then** it displays a count of 5 with a link to the full list.
2. **Given** 3 assets are marked as broken, **When** I view the "Assets Needing Attention" widget, **Then** it shows 3 broken assets.
3. **Given** maintenance is due for 2 assets next week, **When** I view the "Upcoming Maintenance" widget, **Then** it displays those 2 assets with due dates.

---

### User Story 9 - Manage Maintenance Companies and Rules (Priority: P2)

As a facilities manager, I want to define maintenance rules for assets, kits, models, or tags so I can automate recurring maintenance scheduling and track service providers.

**Why this priority**: Preventive maintenance extends asset life and reduces downtime. Automated scheduling ensures maintenance isn't forgotten.

**Independent Test**: Create a maintenance company "AC Experts", create a rule "Inspect all AC units every 6 months", verify the rule applies to tagged assets and generates upcoming maintenance alerts.

**Acceptance Scenarios**:

1. **Given** I create a maintenance company with contact details and SLA, **When** I create a maintenance rule, **Then** I can select that company as the service provider.
2. **Given** I create a rule "Inspect laptops every 12 months", **When** I tag 5 laptops with "IT Equipment", **Then** the rule automatically applies to all 5 assets.
3. **Given** an asset matches 2 maintenance rules with overlapping schedules, **When** I view the asset's maintenance tab, **Then** both rules are highlighted with a conflict warning.
4. **Given** a maintenance rule is set to start January 1, **When** the calendar reaches that date, **Then** a work order is created automatically.

---

### User Story 10 - Create and Track Work Orders (Priority: P2)

As a maintenance coordinator, I want to create work orders for internal staff or external contractors so I can schedule, track progress, and record completion of maintenance tasks.

**Why this priority**: Work orders are essential for maintenance management but build on the foundation of assets and rules.

**Independent Test**: Create an internal work order for 3 assets, assign it to a staff member, transition through states (Backlog → Assigned → In Progress → Completed → Done), verify state transitions follow the correct flow.

**Acceptance Scenarios**:

1. **Given** I create an internal work order and assign it to "John Doe", **When** I transition the state to "In Progress", **Then** the state changes and the transition is recorded in the history.
2. **Given** I create an external work order, **When** I request offers from 2 companies, **Then** the state changes to "Offer Received" when both companies submit offers.
3. **Given** a work order includes 5 assets, **When** I mark 3 as completed, **Then** the work order shows partial completion (3/5 assets done).
4. **Given** I try to transition a work order from "Backlog" to "Completed", **When** the system validates the transition, **Then** it's blocked as an invalid state jump.
5. **Given** I set an approval responsible for a work order, **When** it reaches "Completed" state, **Then** the assigned approver receives a notification indicator.

---

### User Story 11 - Manage Settings with Version History (Priority: P3)

As a system administrator, I want to export/import extension settings as JSON and rollback to previous versions so I can migrate configurations between environments and recover from misconfigurations.

**Why this priority**: Settings management is important for multi-environment setups but lower priority than user-facing features.

**Independent Test**: Export current settings to JSON, modify scanner prefix settings, then import the exported JSON and verify settings rollback to the previous state.

**Acceptance Scenarios**:

1. **Given** I have configured scanner settings and prefixes, **When** I click "Export Settings", **Then** a JSON file downloads containing all settings.
2. **Given** I import a settings JSON file, **When** the import completes, **Then** all settings match the imported configuration and a new version is saved in history.
3. **Given** I have made 3 settings changes over the past week, **When** I view settings history, **Then** all 3 versions are listed with timestamps and change summaries.
4. **Given** I select a previous version from history, **When** I click "Rollback", **Then** all settings revert to that version and a new history entry records the rollback.

---

### Edge Cases

- User attempts to undo an action after the 24-hour retention period → System displays message "Undo history only retained for 24 hours" and removes expired actions from the UI.
- Asset is broken while assigned to a user → System prompts whether to unassign the asset along with the status change.
- User tries to remove an inherited tag from a sub-asset → System prevents removal and displays tooltip "This tag is inherited from [Kit/Model name]. Remove it from the parent to update all children."
- Fixed kit has 5 sub-assets and 2 are broken → Kit status shows "Incomplete (2/5 components broken)" with details visible on hover.
- User creates a relative date filter "Created in last 30 days" → System recalculates the date range dynamically each time the filter is applied.
- Maintenance rule applies to 100+ assets → System displays warning "This rule will create 100+ work orders. Continue?" before saving.
- Two maintenance rules conflict with overlapping schedules for the same asset → UI highlights both rules in red with tooltip "Multiple rules scheduled for similar timeframe".
- Work order state transition is attempted from invalid state (e.g., Backlog → Done without intermediate steps) → System blocks the transition and displays allowed next states.
- User imports settings JSON with incompatible schema version → System validates schema, displays detailed error message, and prevents import.
- Asset is deleted while part of a fixed kit → System prevents deletion and prompts "Remove from kit before deleting" or offers to disassemble the kit.
- User searches for person in assignment field but person has no permission to use inventory → System allows assignment (permissions not enforced in this feature) but displays warning icon.
- Damage report upload includes 10 photos → System limits upload to first 3 photos and displays message "Maximum 3 photos per report".
- Undo action involves cascade delete (e.g., undo asset creation that had damage reports) → System restores parent asset and all associated child records atomically.

## Requirements *(mandatory)*

### Functional Requirements

**Undo Store**

- **FR-001**: System MUST record every user-triggered action (create, edit, delete, status change) in an undo history with timestamp, actor, entity type, entity ID, and before/after state.
- **FR-002**: System MUST persist undo history across user sessions in local storage or IndexedDB.
- **FR-003**: System MUST automatically purge undo history older than 24 hours.
- **FR-004**: UI MUST display an "Undo" section showing recent changes with ability to undo each action individually.
- **FR-005**: Undo operation MUST revert the entity to its previous state and record the undo action in the history.

**Data & Code Cleanup**

- **FR-006**: System MUST remove all asset type template functionality including UI, data schema, and workflows.
- **FR-007**: System MUST remove all offline database storage and synchronization logic.
- **FR-008**: System MUST remove all references to demo data except in test/migration scripts clearly marked as non-production.
- **FR-009**: Codebase MUST be audited for unused imports, functions, and components and cleaned up.

**Asset Damage Tracking**

- **FR-010**: Each asset MUST support unlimited timestamped damage reports.
- **FR-011**: Each damage report MUST include text description (required), multiple photos (optional, up to 3, max 2MB each before base64 encoding), and status (broken/repaired). Photos MUST be stored as base64-encoded strings in ChurchTools custom data fields with abstraction layer (PhotoStorageService) enabling future migration to ChurchTools Files API.
- **FR-012**: Asset detail page MUST display a "Mark as Broken" toggle that immediately updates asset status to "Broken".
- **FR-013**: Asset detail page MUST include a "Repair History" tab showing all damage reports in chronological order.
- **FR-014**: When marking an asset as repaired, system MUST prompt for repair notes and record repair date and user.

**Asset Assignment System**

- **FR-015**: Assets MUST support assignment to a single ChurchTools user or group at a time.
- **FR-016**: Assignment field MUST integrate with ChurchTools people/group search API for user selection.
- **FR-017**: System MUST record assignment history including checkout date, check-in date, and assigned user/group.
- **FR-018**: Asset status MUST automatically change to "In Use" when assigned.
- **FR-019**: When changing status of an assigned asset, system MUST display confirmation popup offering to unassign.
- **FR-020**: Asset detail page MUST include "Assignment History" tab showing all past and current assignments.

**State Machine for Asset Status**

- **FR-021**: Asset status MUST support exactly these states: Available, In Use, Broken, In Maintenance, Retired/Disposed.
- **FR-022**: UI MUST visually indicate assignment status and broken status on asset cards/rows.
- **FR-023**: System MUST record all status transitions in a history log with timestamp and user.

**Fixed Kits with Property Inheritance**

- **FR-024**: System MUST support creating fixed kits where sub-assets inherit specified properties (location, status, tags) from the parent kit.
- **FR-025**: Inherited properties on sub-assets MUST be locked (read-only) and display visual indicator of inheritance source.
- **FR-026**: When a sub-asset in a fixed kit is marked as broken, kit status MUST automatically change to "Incomplete".
- **FR-027**: Fixed kits MUST record assembly date and disassembly date.
- **FR-028**: Disassembling a kit MUST unlock all inherited properties on sub-assets and allow independent editing.
- **FR-029**: Kit detail page MUST clearly show which properties are inherited by sub-assets.

**AssetModel Templates**

- **FR-030**: System MUST support creating AssetModel entities as templates for asset type families.
- **FR-031**: AssetModel entities MUST define default values for common fields (manufacturer, warranty, specifications).
- **FR-032**: Creating an asset from an AssetModel MUST pre-populate fields with model defaults while allowing overrides.
- **FR-033**: AssetModel entities MUST NOT be used for flexible grouping or categorization (use tags for that purpose).

**Tagging System**

- **FR-034**: Assets, kits, and models MUST support multiple tags.
- **FR-035**: Tags applied to kits or models MUST automatically propagate to child assets as inherited tags.
- **FR-036**: Inherited tags MUST be visually distinguished from direct tags using icon, color, or badge.
- **FR-037**: Hovering over an inherited tag MUST display tooltip showing inheritance source (kit or model name).
- **FR-038**: System MUST prevent removal of inherited tags from child assets.
- **FR-039**: Changing tags on a kit or model MUST prompt user with summary of affected child assets before applying.

**Notion-like Data List Views**

- **FR-040**: Asset list MUST support multiple view types: table, gallery, kanban, calendar.
- **FR-041**: Users MUST be able to save named views with filters, sorts, and grouping configuration.
- **FR-042**: System MUST support powerful filtering including: text search, exact match, date ranges (absolute and relative), tag filtering, number ranges, empty/not empty checks. Invalid filter values (malformed dates, empty tag arrays, negative number ranges) MUST display a clear error message and prevent the filter from being saved or applied.
- **FR-043**: System MUST support grouping by one field with custom group ordering.
- **FR-044**: Collapsed/expanded state of groups MUST persist in user session.
- **FR-045**: Group collapse UI MUST use ChurchTools-standard chevron icons with smooth animation.
- **FR-046**: Kanban view MUST support drag-and-drop to update the field matching the current groupBy configuration. If grouped by status, dragging updates the status field; if grouped by location, dragging updates the location field. Dragging assets with inherited/locked properties MUST be prevented with a tooltip explanation.
- **FR-047**: Create-new button MUST allow choosing to create asset, kit, or model with asset as default.

**Dashboard Widgets**

- **FR-048**: Dashboard MUST display fixed set of widgets: My Assigned Assets, Assets Needing Attention, Upcoming Maintenance, Recent Activity Timeline, Utilization Stats, Overdue Work Orders.
- **FR-049**: Dashboard layout MUST be fixed and not customizable by users.
- **FR-050**: Each widget MUST display accurate real-time counts and link to filtered views for details.

**Maintenance Management (CAFM/CMMS)**

- **FR-051**: System MUST support maintaining a master list of maintenance companies with contact person, address, SLA, cost rates, and contract notes.
- **FR-052**: Maintenance companies MUST be separate entities not tied to ChurchTools contacts.
- **FR-053**: System MUST support creating maintenance rules that apply to assets, kits, models, or tags.
- **FR-054**: Maintenance rules MUST define work type, whether work is internal or contractor-based, service provider, interval (months/uses), and start date.
- **FR-055**: When multiple maintenance rules apply to the same asset with overlapping schedules, UI MUST highlight the conflict.
- **FR-056**: Work orders MUST support both one-time and recurring schedules.
- **FR-057**: Internal work orders MUST follow these states: Backlog, Assigned, Planned, In Progress, Completed, Aborted, Obsolete, Done.
- **FR-058**: External work orders MUST follow these states: Backlog, Offer Requested, Offer Received, Planned, In Progress, Completed, Aborted, Obsolete, Done.
- **FR-059**: External work orders MUST support receiving and tracking multiple offers from different companies.
- **FR-060**: Work orders MUST support scheduling multiple assets within a single order as separate line items.
- **FR-061**: Work orders MUST track per-asset completion status independently.
- **FR-062**: Work orders MUST support assignment/reassignment and cost tracking.
- **FR-063**: Work orders MUST allow setting an approval responsible person (defaults to creator).
- **FR-064**: Invoicing and file upload MUST be stubbed (UI present but non-functional) for future implementation.
- **FR-065**: Maintenance views MUST reuse abstract list UI components (table, kanban, calendar, timeline/Gantt).

**Localization & i18n**

- **FR-066**: All German text MUST be removed from codebase (UI labels, comments, error messages).
- **FR-067**: System MUST use i18n library (e.g., i18next) with English as the only supported language.
- **FR-068**: All user-facing strings MUST be defined in locale files (not hardcoded) to enable future multi-language support.

**Scanner Settings & Export/Import**

- **FR-069**: Scanner settings and all referenced resources (prefixes, manufacturers, models, locations) MUST be stored under a single ChurchTools settings category.
- **FR-070**: Settings MUST support versioning with ability to view history and rollback to previous versions.
- **FR-071**: Settings MUST be exportable as pure JSON file.
- **FR-072**: Settings MUST be importable from JSON file with schema validation.
- **FR-073**: Each settings change MUST create a new version entry with timestamp, user, and change summary.

### Key Entities

- **UndoAction**: Record of a user action with entity type, entity ID, action type (create/edit/delete/status change), timestamp, actor (user), before state (JSON), after state (JSON), undo status, created_entity_ids (array of all entity IDs created in compound actions for cascade undo).
- **DamageReport**: Timestamped report linked to an asset with text description, photo data (base64-encoded strings, max 3 photos at 2MB each pre-encoding), reported by (user), reported date, repair status, repair notes, repaired by (user), repaired date.
- **Assignment**: Record linking an asset to a ChurchTools user or group with checkout date, check-in date (null if currently assigned), assigned by (user).
- **FixedKit**: Kit entity with sub-asset references, inherited property configuration (which properties to inherit), assembly date, disassembly date, completeness status.
- **AssetModel**: Template for creating assets with model name, asset type, default field values, associated tags.
- **Tag**: Label with name, color, optional description, created by (user), created date.
- **MaintenanceCompany**: Service provider with name, contact person, address, SLA terms, hourly rate, contract notes.
- **MaintenanceRule**: Defines recurring or scheduled work with rule name, applies-to (asset/kit/model/tag IDs), work type, is-internal flag, assigned company (if external), interval type (months/uses), interval value, start date, next due date, lead_time_days (1-30, default 7).
- **WorkOrder**: Maintenance work order with order number, type (internal/external), state, asset schedule (list of assets with individual completion status), assigned to (user), assigned company (if external), offers (list of company offers with amounts), scheduled dates, actual dates, cost estimates, actual costs, approval responsible (user), invoices (stubbed).
- **DataView**: Saved view configuration with name, view type (table/gallery/kanban/calendar), filters (array of filter conditions), sorts, grouping configuration, owner (user).
- **SettingsVersion**: Snapshot of all extension settings with version number, timestamp, changed by (user), change summary, full settings JSON.

## Clarifications

1. **Photo Storage Strategy (FR-011)**: Damage report photos will initially be stored as base64-encoded strings in ChurchTools custom data fields with architecture designed for future migration to ChurchTools Files API. Implementation must include:
   - Photo size validation (max 2MB per photo before encoding to stay within ~10K character limit per custom data field after base64 encoding)
   - Abstraction layer (PhotoStorageService interface) to encapsulate storage mechanism
   - Feature flag or configuration option to switch between base64 and Files API storage
   - Clear migration path documented in code comments
   - Compression/resizing of photos before base64 encoding to optimize storage

2. **Data View Pagination Strategy (FR-040 to FR-047)**: Adaptive pagination based on view type to optimize performance and UX:
   - Gallery view: 24 items per page with traditional pagination controls (predictable image loading, clear page boundaries)
   - Table view: Virtual scrolling with 100-item render window (smooth scrolling experience for large datasets)
   - Kanban view: 20 items per column with "Load More" button at column bottom (prevents excessive vertical scrolling)
   - Calendar view: No pagination (naturally bounded by date range, typically 1 month)

3. **Work Order Auto-Creation Timing (FR-059)**: Maintenance rules support configurable lead time (1-30 days before due date) stored in MaintenanceRule entity. Work orders are created at midnight (00:00:00 local time) on the calculated lead date (due_date - lead_time_days). Default lead time is 7 days if not specified. Background job runs daily at 00:05:00 to check for rules requiring work order creation.

4. **Undo Cascade Behavior for Kits (FR-001 to FR-005, FR-024)**: Undo actions are context-aware based on what was actually created/modified in the undoable action:
   - If kit creation workflow included creating new sub-assets (e.g., "Create kit with 6 new items"), undoing the kit creation also deletes all 6 sub-assets that were created as part of that action
   - If kit creation only linked existing assets (e.g., "Create kit from 6 existing assets"), undoing the kit creation only deletes the kit and unlinks the assets (assets remain)
   - UndoAction entity must store created_entity_ids array to track all entities created in a compound action
   - Undo UI must clearly indicate scope: "Undo: Create camera kit (will also delete 6 new assets)" vs "Undo: Create camera kit (6 linked assets will remain)"

5. **Settings Version Retention (FR-070, FR-073)**: Settings versions are automatically deleted after 90 days to prevent unbounded growth while maintaining sufficient audit history. Implementation details:
   - Retention period: 90 days from version creation timestamp
   - Cleanup job runs daily at 00:10:00 to purge expired versions
   - Most recent version is always preserved (never auto-deleted, even if >90 days old)
   - UI displays version age with warning indicator for versions approaching deletion (85-90 days old)
   - Export functionality allows archiving old versions before automatic deletion

### Assumptions

- ChurchTools API provides person/group search functionality that can be integrated for assignment.
- Undo history retention of 24 hours is acceptable for user workflows and storage constraints.
- Maximum 3 photos per damage report balances documentation needs with storage/performance.
- Fixed kit property inheritance applies only to location, status, and tags (not custom fields).
- Asset models are strictly templates and not dynamic groupings (tags serve that purpose).
- Work order state transitions follow a defined state machine that prevents invalid jumps.
- Settings versioning retains versions for 90 days with automatic cleanup (most recent version always preserved).
- Dashboard widget set is determined by product team and fixed for all users.
- CAFM/CMMS invoicing will be implemented in a future feature and is stubbed for now.
- i18n infrastructure is set up with English only, but localization files are structured for easy multi-language addition later.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can undo any action within 24 hours by clicking a single button, verified through usability testing with 5 users achieving 100% success rate.
- **SC-002**: Damage tracking reduces time to document asset condition by 50% compared to manual notes (measured by timing 10 users documenting damage before and after feature).
- **SC-003**: Asset assignment workflow (search person, assign, view history) completes in under 30 seconds for 90% of users.
- **SC-004**: Fixed kit property inheritance reduces data entry errors by 80% (measured by comparing manual updates vs. automated inheritance in test scenarios).
- **SC-005**: Data list views enable users to find specific assets 40% faster using filters compared to manual scrolling (measured with 10 users searching for assets matching specific criteria).
- **SC-006**: Dashboard widgets provide at-a-glance status that reduces clicks to access key information by 60% (measured by comparing dashboard usage vs. navigating through multiple screens).
- **SC-007**: Maintenance rule creation reduces recurring work order creation time from 5 minutes to under 1 minute per asset.
- **SC-008**: Work order state transitions follow correct flow 100% of the time with invalid transitions blocked (verified through automated tests).
- **SC-009**: Settings export/import completes successfully in under 10 seconds for configurations with 100+ assets.
- **SC-010**: All user-facing text displays in English with zero German strings remaining (verified through manual audit and automated text extraction).


