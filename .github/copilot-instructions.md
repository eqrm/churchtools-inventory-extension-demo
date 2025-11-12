# churchtools-inventory-extension Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-10-18

## Active Technologies
- TypeScript 5.x with strict mode enabled (001-inventory-management)
- TypeScript 5.x with strict mode enabled + React 18, Vite 5, ChurchTools Custom Modules API, IndexedDB (Dexie.js for offline) (002-bug-fixes-ux-improvements)
- ChurchTools Custom Modules API (data categories/values), IndexedDB (offline cache), Base64 photos (current) → ChurchTools Files API (future) (002-bug-fixes-ux-improvements)
- TypeScript 5.x with strict mode enabled + React 18, Vite 5, Mantine UI v7, TanStack Query v5, Zustand v4, i18next v23 (to be added), Dexie.js v3 (to be added for IndexedDB) (004-advanced-inventory-features)
- ChurchTools Custom Modules API (primary persistence), IndexedDB via Dexie.js (undo history, data views, settings cache), Base64 photos in custom data fields with migration path to ChurchTools Files API (004-advanced-inventory-features)

## Project Structure
```
backend/
frontend/
tests/
```

## Commands
npm test && npm run lint

## Code Style
TypeScript 5.x with strict mode enabled: Follow standard conventions

## Recent Changes
- 004-advanced-inventory-features: Added TypeScript 5.x with strict mode enabled + React 18, Vite 5, Mantine UI v7, TanStack Query v5, Zustand v4, i18next v23 (to be added), Dexie.js v3 (to be added for IndexedDB)
- 002-bug-fixes-ux-improvements: Added TypeScript 5.x with strict mode enabled + React 18, Vite 5, ChurchTools Custom Modules API, IndexedDB (Dexie.js for offline)
- 001-inventory-management: Added [if applicable, e.g., PostgreSQL, CoreData, files or N/A]

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
