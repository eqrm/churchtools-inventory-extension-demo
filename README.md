# ChurchTools Inventory Extension

A production-ready ChurchTools module that delivers end-to-end inventory management: booking lifecycle timelines, maintenance orchestration, configurable numbering, and consistent people context across every view.

## Highlights
- **Booking traceability** – shared history timeline, quantity-aware allocator, and unified participant avatars across list, detail, and form flows.
- **Maintenance plans** – stage-based planning with calendar holds, completion drawer, and technician summaries per asset.
- **Numbering transparency** – dashboard warning, prefix defaults persisted in local storage, and live previews in asset/category forms.
- **People context** – `PersonAvatar` powers consistent initials/avatars for bookings, assets, and maintenance, backed by cached lookups.

## Getting Started
### Prerequisites
- Node.js 20.x (or the version defined in `.nvmrc`)
- ChurchTools API access with module key (`VITE_KEY`) and base URL (`VITE_BASE_URL`)

### Installation
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and update the required variables.
4. Start the development server:
   ```bash
   npm run dev
   ```
   The app runs on http://localhost:5173. Configure ChurchTools CORS to allow the origin (HTTPS recommended for Safari).

### Dev Container Support
The repo ships with a VS Code dev container. Open the project in VS Code, run **Reopen in Container**, and the environment (Node, npm, TypeScript, ESLint) is provisioned automatically with `npm install` on boot.

## Configuration
| Variable        | Description                                                   |
|-----------------|---------------------------------------------------------------|
| `VITE_KEY`      | Module key provided by ChurchTools (e.g. `inventory`)         |
| `VITE_BASE_URL` | Base URL for your ChurchTools instance (e.g. `https://example.church.tools`) |

All other configuration is derived from runtime state (TanStack Query caches, local storage, and ChurchTools module metadata).

## Scripts
| Command                  | Purpose                                                       |
|--------------------------|---------------------------------------------------------------|
| `npm run dev`            | Start Vite dev server with hot reload                         |
| `npm run build`          | Create production build (TypeScript + Vite)                   |
| `npm run preview`        | Preview production build locally                              |
| `npm run lint`           | Run ESLint across `src/` and tests                             |
| `npm test`               | Execute Vitest unit suites (history, booking, maintenance, etc.) |
| `npm run analyze:bundle` | Generate bundle visualization (`dist/bundle-analysis.html`)   |
| `npm run deploy`         | Build and package the extension into `releases/`              |

## Feature Overview
### Booking Lifecycle
- Overview/history tabs reuse `HistoryTimeline` for instant audit trails.
- Quantity allocator auto-assigns child assets and surfaces shortages before submission.
- `BookingParticipants` and list columns render shared `PersonAvatar` entries.

### Maintenance Orchestration
- Zustand store tracks plan state (`draft`, `planned`, `completed`) with validation guards.
- Calendar holds publish via ChurchTools provider helpers and release automatically on completion.
- `MaintenanceTeamList` summarises technicians and outstanding assets alongside the completion table.

### Numbering Transparency
- Dashboard warning card directs admins to prefix configuration when sequences are missing.
- Prefix panel persists module + per-person defaults in local storage and surfaces live previews.
- Asset/category forms read shared helpers to keep generated numbers predictable.

## Documentation
- `docs/implementation-notes.md` – consolidated engineering decisions and module responsibilities.
- `docs/user-guide.md` – end-user walkthrough of primary flows.
- `docs/components.md` – component catalog with props and usage patterns.
- `docs/forum-post-de.md` – German community announcement draft summarising release status and roadmap.

## Quality Gates
Before committing or releasing, ensure the quality triad passes:
```bash
npm run lint
npm test
npm run build
```
For performance budgeting, run `npm run analyze:bundle` and keep gzip output < 200 KB.

## Community & Roadmap
Work is planned and tracked with Speckit artifacts under `specs/003-inventory-upgrade-suite/`. Upcoming iterations target granular permission checks and ChurchTools Files API integration for asset imagery. Feedback is welcome—open an issue or join the conversation in the ChurchTools forum.

## Support
Questions about the ChurchTools API or extension hosting? Visit the ChurchTools Forum: https://forum.church.tools.
