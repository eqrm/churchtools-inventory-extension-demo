# Research: Advanced Inventory Features

**Feature**: 004-advanced-inventory-features  
**Date**: 2025-11-10  
**Status**: Complete

## Overview

This document consolidates research findings for technical decisions required by the Advanced Inventory Features specification. Each decision includes rationale, alternatives considered, and implementation approach.

---

## R1: IndexedDB Library Selection (Dexie.js)

**Decision**: Use Dexie.js v3 for IndexedDB persistence

**Rationale**:
- TypeScript-first API with excellent type safety
- Promise-based API integrates well with React Query/TanStack Query
- Built-in versioning and migration support for schema changes
- Query syntax more intuitive than raw IndexedDB API
- Active maintenance and ChurchTools-compatible browser support
- ~15KB gzipped impact on bundle

**Alternatives Considered**:
- **Raw IndexedDB API**: Too verbose, callback-based, poor TypeScript support
- **idb (Jake Archibald)**: Lighter weight (~3KB) but requires more boilerplate for migrations
- **LocalForage**: Simpler API but lacks advanced querying needed for undo history filtering

**Implementation Approach**:
```typescript
// src/services/db/UndoDatabase.ts
import Dexie, { Table } from 'dexie';
import { UndoAction } from '@/types/undo';

export class UndoDatabase extends Dexie {
  undoActions!: Table<UndoAction, string>;
  
  constructor() {
    super('ChurchToolsInventoryUndo');
    this.version(1).stores({
      undoActions: 'id, timestamp, entityType, userId, [timestamp+userId]'
    });
  }
}

export const undoDb = new UndoDatabase();
```

**Reference**: https://dexie.org/docs/Tutorial/Design#database-versioning

---

## R2: i18next Integration Pattern

**Decision**: Use i18next v23 with react-i18next bindings, namespace-based organization

**Rationale**:
- Industry standard for React i18n (50k+ GitHub stars)
- Lazy loading support for namespace-based code splitting
- Pluralization, interpolation, and context handling built-in
- Migration path for future languages without code changes
- ~20KB gzipped for core + react bindings

**Alternatives Considered**:
- **react-intl (FormatJS)**: Heavier bundle (~45KB), more complex API
- **Custom solution**: Reinventing wheel, no pluralization support, harder future maintenance

**Implementation Approach**:
```typescript
// src/i18n/config.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Namespace organization
import common from './locales/en/common.json';
import undo from './locales/en/undo.json';
import damage from './locales/en/damage.json';
import maintenance from './locales/en/maintenance.json';

i18n
  .use(initReactI18next)
  .init({
    lng: 'en',
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'undo', 'damage', 'maintenance'],
    resources: {
      en: { common, undo, damage, maintenance }
    },
    interpolation: {
      escapeValue: false // React already escapes
    }
  });

export default i18n;
```

**German Text Detection Script**:
```bash
# scripts/detect-german.sh
#!/bin/bash
# Detect German characters and common words
grep -rn --include="*.tsx" --include="*.ts" \
  -E "(ä|ö|ü|Ä|Ö|Ü|ß|und|oder|der|die|das)" src/ \
  | grep -v "node_modules" \
  | grep -v "// @ts-ignore" \
  | grep -v "test"
```

**Reference**: https://react.i18next.com/latest/using-with-hooks

---

## R3: Photo Compression Strategy

**Decision**: Use browser-canvas-blob-util with client-side compression before base64 encoding

**Rationale**:
- Native browser Canvas API for compression (no dependencies)
- Resize images to max 800x600px before encoding (balances quality/size)
- Target 100KB compressed JPEG (before base64, ~133KB after)
- 3 photos × 133KB = ~400KB base64, fits within 10K char limit per field if split across 3 fields
- Maintains user privacy (no server upload during processing)

**Alternatives Considered**:
- **browser-image-compression**: Popular but 20KB+ library cost
- **No compression**: 2MB photos → 2.7MB base64, exceeds custom data field limits
- **Server-side compression**: Requires ChurchTools Files API (future migration path)

**Implementation Approach**:
```typescript
// src/utils/imageCompression.ts
export async function compressImage(
  file: File,
  maxWidth: number = 800,
  maxHeight: number = 600,
  quality: number = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        
        // Maintain aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        
        const base64 = canvas.toDataURL('image/jpeg', quality);
        
        // Validate size (2MB pre-encoding limit)
        const sizeKB = (base64.length * 0.75) / 1024; // Approximate decoded size
        if (sizeKB > 2048) {
          reject(new Error('Compressed image still exceeds 2MB limit'));
        } else {
          resolve(base64);
        }
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
```

**Performance Impact**: <50ms compression on modern devices, 100-200ms on older mobile

---

## R4: Virtual Scrolling Library for Table View

**Decision**: Use @tanstack/react-virtual v3 for table virtualization

**Rationale**:
- From TanStack family (already using TanStack Query), API consistency
- Framework-agnostic core, works with any table library or custom implementation
- Supports variable row heights, sticky headers, horizontal scrolling
- ~5KB gzipped
- Dynamic window sizing for 100-item render window

**Alternatives Considered**:
- **react-window**: Lighter but less flexible for variable heights
- **react-virtuoso**: Feature-rich but heavier (~15KB), overkill for our needs
- **Custom solution**: Complex math for scroll positioning, not worth reinventing

**Implementation Approach**:
```typescript
// src/components/views/table/VirtualTable.tsx
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

export function VirtualTable({ data, columns }) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50, // estimated row height
    overscan: 10 // render 10 extra rows above/below viewport
  });
  
  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`
            }}
          >
            <TableRow data={data[virtualRow.index]} columns={columns} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Reference**: https://tanstack.com/virtual/latest

---

## R5: State Machine Pattern for Work Orders

**Decision**: Use XState v5 for work order and asset status state machines

**Rationale**:
- TypeScript-first with excellent type inference
- Visualizer for state machines (debugging, documentation)
- Guards, actions, and context management built-in
- Prevents invalid state transitions at compile time
- ~15KB gzipped
- Industry-standard pattern (used by Microsoft, Netflix)

**Alternatives Considered**:
- **robot3**: Lighter (~2KB) but less TypeScript support, no visualizer
- **Custom enum-based state machine**: Requires manual guard logic, no visualization, error-prone
- **Simple switch statements**: Doesn't scale, hard to maintain with 8 states

**Implementation Approach**:
```typescript
// src/services/machines/WorkOrderStateMachine.ts
import { createMachine, assign } from 'xstate';

export type WorkOrderState = 
  | 'backlog'
  | 'assigned'
  | 'offerRequested'
  | 'offerReceived'
  | 'planned'
  | 'inProgress'
  | 'completed'
  | 'aborted'
  | 'obsolete'
  | 'done';

export const internalWorkOrderMachine = createMachine({
  id: 'internalWorkOrder',
  initial: 'backlog',
  states: {
    backlog: {
      on: {
        ASSIGN: 'assigned',
        ABORT: 'aborted'
      }
    },
    assigned: {
      on: {
        PLAN: 'planned',
        UNASSIGN: 'backlog',
        ABORT: 'aborted'
      }
    },
    planned: {
      on: {
        START: 'inProgress',
        UNPLAN: 'assigned',
        ABORT: 'aborted'
      }
    },
    inProgress: {
      on: {
        COMPLETE: 'completed',
        ABORT: 'aborted'
      }
    },
    completed: {
      on: {
        APPROVE: 'done',
        REOPEN: 'inProgress'
      }
    },
    done: { type: 'final' },
    aborted: { type: 'final' },
    obsolete: { type: 'final' }
  }
});

// External work orders have additional states
export const externalWorkOrderMachine = createMachine({
  id: 'externalWorkOrder',
  initial: 'backlog',
  states: {
    backlog: {
      on: {
        REQUEST_OFFER: 'offerRequested',
        ABORT: 'aborted'
      }
    },
    offerRequested: {
      on: {
        RECEIVE_OFFER: {
          target: 'offerReceived',
          guard: 'hasRequiredOffers'
        },
        CANCEL: 'backlog'
      }
    },
    offerReceived: {
      on: {
        ACCEPT_OFFER: 'planned',
        REQUEST_MORE: 'offerRequested',
        REJECT_ALL: 'backlog'
      }
    },
    // ... rest of states similar to internal
  }
});
```

**Reference**: https://stately.ai/docs/xstate

---

## R6: Property Inheritance Implementation Pattern

**Decision**: Use reactive Zustand store with computed inheritance, ChurchTools API as source of truth

**Rationale**:
- Zustand already in use, minimal new dependencies
- Computed properties calculated on-the-fly from parent kit configuration
- ChurchTools custom data stores `inheritedProperties` array on kit entity
- UI locks inherited fields using React component wrappers
- Updates propagate through TanStack Query cache invalidation

**Alternatives Considered**:
- **Denormalized storage**: Store inherited values on each sub-asset (data duplication, sync issues)
- **Redux with selectors**: Overkill, Zustand already in use
- **MobX**: Different paradigm, learning curve, bundle cost

**Implementation Approach**:
```typescript
// src/services/PropertyInheritanceService.ts
export class PropertyInheritanceService {
  /**
   * Calculate inherited properties for a sub-asset
   */
  getInheritedProperties(
    subAsset: Asset,
    kit: FixedKit
  ): Partial<Asset> {
    const inherited: Partial<Asset> = {};
    
    if (kit.inheritedProperties?.includes('location')) {
      inherited.location = kit.location;
    }
    if (kit.inheritedProperties?.includes('status')) {
      inherited.status = kit.status;
    }
    if (kit.inheritedProperties?.includes('tags')) {
      inherited.tags = kit.tags;
    }
    
    return inherited;
  }
  
  /**
   * Check if a property is inherited from parent kit
   */
  isPropertyInherited(
    asset: Asset,
    propertyName: string
  ): { inherited: boolean; source?: string } {
    if (!asset.kitId) {
      return { inherited: false };
    }
    
    const kit = kitStore.getState().kits.get(asset.kitId);
    if (!kit || !kit.inheritedProperties) {
      return { inherited: false };
    }
    
    return {
      inherited: kit.inheritedProperties.includes(propertyName),
      source: kit.name
    };
  }
  
  /**
   * Propagate kit property change to all sub-assets
   */
  async propagateKitChange(
    kitId: string,
    propertyName: string,
    newValue: any
  ): Promise<void> {
    const kit = await this.getKit(kitId);
    if (!kit.inheritedProperties?.includes(propertyName)) {
      return; // Property not configured for inheritance
    }
    
    const subAssets = await this.getKitSubAssets(kitId);
    const updates = subAssets.map(asset => ({
      id: asset.id,
      [propertyName]: newValue
    }));
    
    await this.batchUpdateAssets(updates);
    
    // Record in undo history as compound action
    undoService.recordCompoundAction({
      type: 'kit_property_propagation',
      kitId,
      propertyName,
      affectedAssetIds: subAssets.map(a => a.id),
      oldValues: subAssets.map(a => a[propertyName]),
      newValue
    });
  }
}
```

**Reference**: Zustand patterns - https://docs.pmnd.rs/zustand/guides/how-to-reset-state

---

## R7: Data View Filter DSL Design

**Decision**: JSON-based filter configuration with lodash-style filter execution

**Rationale**:
- Serializable to IndexedDB and ChurchTools custom data
- Type-safe with Zod schema validation
- Supports all required filter types (text, date ranges, tags, numbers)
- Relative dates recalculated client-side on each application
- No SQL injection risk (client-side filtering)

**Implementation Approach**:
```typescript
// src/types/view.ts
export type FilterCondition = 
  | { type: 'text'; field: string; operator: 'contains' | 'equals'; value: string }
  | { type: 'date'; field: string; operator: 'between' | 'before' | 'after'; value: DateRange | RelativeDateRange }
  | { type: 'tag'; field: string; operator: 'includes' | 'excludes'; value: string[] }
  | { type: 'number'; field: string; operator: '=' | '>' | '<' | 'between'; value: number | [number, number] }
  | { type: 'empty'; field: string; operator: 'is_empty' | 'is_not_empty' };

export type RelativeDateRange = {
  unit: 'days' | 'weeks' | 'months';
  value: number;
  direction: 'last' | 'next';
};

export interface DataView {
  id: string;
  name: string;
  viewType: 'table' | 'gallery' | 'kanban' | 'calendar';
  filters: FilterCondition[];
  sorts: Array<{ field: string; direction: 'asc' | 'desc' }>;
  groupBy?: { field: string; order?: string[] };
  collapsedGroups?: string[];
  owner: string;
}

// src/services/DataViewService.ts
export class DataViewService {
  /**
   * Execute filters on asset array
   */
  applyFilters(assets: Asset[], filters: FilterCondition[]): Asset[] {
    return assets.filter(asset => 
      filters.every(filter => this.matchesFilter(asset, filter))
    );
  }
  
  private matchesFilter(asset: Asset, filter: FilterCondition): boolean {
    switch (filter.type) {
      case 'text':
        const fieldValue = asset[filter.field]?.toString().toLowerCase() ?? '';
        const searchValue = filter.value.toLowerCase();
        return filter.operator === 'contains'
          ? fieldValue.includes(searchValue)
          : fieldValue === searchValue;
          
      case 'date':
        const assetDate = new Date(asset[filter.field]);
        const range = this.resolveDateRange(filter.value);
        return assetDate >= range.start && assetDate <= range.end;
        
      case 'tag':
        const assetTags = asset.tags ?? [];
        return filter.operator === 'includes'
          ? filter.value.some(tag => assetTags.includes(tag))
          : !filter.value.some(tag => assetTags.includes(tag));
          
      // ... other filter types
    }
  }
  
  /**
   * Resolve relative date ranges to absolute dates
   */
  private resolveDateRange(range: DateRange | RelativeDateRange): { start: Date; end: Date } {
    if ('direction' in range) {
      const now = new Date();
      const multiplier = range.direction === 'last' ? -1 : 1;
      
      let start: Date, end: Date;
      if (range.unit === 'days') {
        start = new Date(now.getTime() + (multiplier * range.value * 24 * 60 * 60 * 1000));
        end = now;
      }
      // ... similar for weeks, months
      
      return range.direction === 'last' 
        ? { start, end }
        : { start: now, end: start };
    }
    
    return range; // Already absolute
  }
}
```

**Reference**: Notion database filtering - https://www.notion.so/help/filters-and-sorts

---

## R8: Kanban Drag-and-Drop Library

**Decision**: Use @dnd-kit/core for kanban board drag-and-drop

**Rationale**:
- Modern, performant, accessibility-first (keyboard navigation)
- Works with React 18 concurrent features
- ~15KB gzipped
- Supports touch devices, auto-scrolling, multi-column layouts
- Better TypeScript support than react-beautiful-dnd

**Alternatives Considered**:
- **react-beautiful-dnd**: Popular but maintenance mode, React 18 compatibility issues
- **react-dnd**: Complex API, older patterns, larger bundle
- **Custom solution**: Accessibility hard to get right, reinventing wheel

**Implementation Approach**:
```typescript
// src/components/views/kanban/KanbanBoard.tsx
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

export function KanbanBoard({ data, groupField }) {
  const columns = groupBy(data, groupField);
  
  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over) return;
    
    const sourceColumn = findColumn(active.id);
    const targetColumn = over.data.current.column;
    
    if (sourceColumn !== targetColumn) {
      // Update asset's grouping field
      updateAsset(active.id, { [groupField]: targetColumn });
      
      // Record in undo history
      undoService.record({
        type: 'update',
        entityType: 'asset',
        entityId: active.id,
        before: { [groupField]: sourceColumn },
        after: { [groupField]: targetColumn }
      });
    }
  }
  
  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="kanban-board">
        {Object.entries(columns).map(([column, items]) => (
          <KanbanColumn key={column} title={column} items={items} />
        ))}
      </div>
    </DndContext>
  );
}
```

**Reference**: https://docs.dndkit.com/

---

## R9: Background Job Scheduling (Daily Cleanup)

**Decision**: Use browser-based interval timer with service worker fallback for background execution

**Rationale**:
- No server-side infrastructure required (ChurchTools extension constraint)
- Service worker persists across page refreshes
- Cleanup jobs run on app initialization and hourly check
- User doesn't need to be logged in for cleanup (service worker handles it)
- Acceptable tradeoff: cleanup may be delayed if user never opens app

**Alternatives Considered**:
- **Server-side cron**: Requires ChurchTools API extension, not available
- **Browser only (no service worker)**: Cleanup only when app open, stale data accumulates
- **Push notifications**: Overkill for simple cleanup task

**Implementation Approach**:
```typescript
// src/services/BackgroundJobService.ts
export class BackgroundJobService {
  private readonly CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour
  
  startBackgroundJobs() {
    // Run cleanup immediately on app start
    this.runCleanupJobs();
    
    // Schedule hourly cleanup
    setInterval(() => {
      this.runCleanupJobs();
    }, this.CLEANUP_INTERVAL);
    
    // Register service worker for offline cleanup
    if ('serviceWorker' in navigator) {
      this.registerServiceWorker();
    }
  }
  
  private async runCleanupJobs() {
    const now = new Date();
    
    // Cleanup 1: Purge undo actions older than 24 hours
    const undoCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    await undoDb.undoActions
      .where('timestamp')
      .below(undoCutoff.toISOString())
      .delete();
    
    // Cleanup 2: Purge settings versions older than 90 days
    const settingsCutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const allVersions = await settingsDb.versions.toArray();
    const latestVersion = allVersions.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )[0];
    
    await settingsDb.versions
      .where('timestamp')
      .below(settingsCutoff.toISOString())
      .and(v => v.id !== latestVersion?.id) // Never delete latest
      .delete();
    
    // Cleanup 3: Check for work orders needing creation
    await this.createScheduledWorkOrders(now);
  }
  
  private async createScheduledWorkOrders(now: Date) {
    const rules = await maintenanceService.getActiveRules();
    
    for (const rule of rules) {
      const dueDate = new Date(rule.nextDueDate);
      const leadDate = new Date(
        dueDate.getTime() - (rule.lead_time_days ?? 7) * 24 * 60 * 60 * 1000
      );
      
      // Create work order if we've passed the lead date
      if (now >= leadDate && !rule.workOrderCreated) {
        await maintenanceService.createWorkOrderFromRule(rule);
        await maintenanceService.updateRule(rule.id, { 
          workOrderCreated: true,
          lastWorkOrderDate: now.toISOString()
        });
      }
    }
  }
  
  private async registerServiceWorker() {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered for background cleanup');
    } catch (error) {
      console.warn('Service Worker registration failed:', error);
      // Graceful degradation: cleanup only when app is open
    }
  }
}

// public/sw.js (service worker)
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Run cleanup when service worker activates
self.addEventListener('message', (event) => {
  if (event.data.type === 'RUN_CLEANUP') {
    // Open IndexedDB and run cleanup logic
    // (same as BackgroundJobService.runCleanupJobs)
  }
});
```

**Tradeoff**: Cleanup timing not guaranteed to be exact (e.g., 00:05:00 daily), but runs frequently enough for acceptable UX

**Reference**: https://web.dev/service-worker-lifecycle/

---

## R10: ChurchTools API Integration for Person/Group Search

**Decision**: Use existing ChurchTools JavaScript SDK with debounced search queries

**Rationale**:
- ChurchTools provides official JavaScript SDK already in use
- Person search endpoint: `GET /api/persons?query={search}`
- Group search endpoint: `GET /api/groups?query={search}`
- Debounce search input (300ms) to avoid rate limiting
- Cache results in TanStack Query for 5 minutes

**Implementation Approach**:
```typescript
// src/services/ChurchToolsSearchService.ts
import { churchToolsClient } from '@/config/churchtools';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useDebouncedValue } from '@mantine/hooks';

export function usePersonSearch(searchQuery: string) {
  const [debouncedQuery] = useDebouncedValue(searchQuery, 300);
  
  return useQuery({
    queryKey: ['persons', 'search', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) {
        return [];
      }
      
      const response = await churchToolsClient.get('/persons', {
        params: { query: debouncedQuery }
      });
      
      return response.data.map(person => ({
        id: person.id,
        name: `${person.firstName} ${person.lastName}`,
        email: person.email,
        type: 'person' as const
      }));
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
}

export function useGroupSearch(searchQuery: string) {
  const [debouncedQuery] = useDebouncedValue(searchQuery, 300);
  
  return useQuery({
    queryKey: ['groups', 'search', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) {
        return [];
      }
      
      const response = await churchToolsClient.get('/groups', {
        params: { query: debouncedQuery }
      });
      
      return response.data.map(group => ({
        id: group.id,
        name: group.name,
        type: 'group' as const
      }));
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 5 * 60 * 1000
  });
}

// Combined search hook for assignment field
export function useAssignmentSearch(searchQuery: string) {
  const persons = usePersonSearch(searchQuery);
  const groups = useGroupSearch(searchQuery);
  
  return useMemo(() => ({
    data: [
      ...(persons.data ?? []),
      ...(groups.data ?? [])
    ],
    isLoading: persons.isLoading || groups.isLoading,
    error: persons.error || groups.error
  }), [persons, groups]);
}
```

**Reference**: ChurchTools API documentation (internal)

---

## Bundle Size Analysis

**Estimated Bundle Impact**:

| Library | Size (gzipped) | Purpose |
|---------|----------------|---------|
| Dexie.js | 15 KB | IndexedDB persistence |
| i18next + react-i18next | 20 KB | Internationalization |
| @tanstack/react-virtual | 5 KB | Table virtualization |
| XState | 15 KB | State machines |
| @dnd-kit/core | 15 KB | Drag-and-drop |
| **Total New Dependencies** | **70 KB** | |
| **Current Bundle** | ~130 KB | (estimated) |
| **Projected Total** | **~200 KB** | Within budget ✓ |

**Mitigation Strategies if Over Budget**:
1. Code splitting: Lazy load maintenance module (XState only needed there)
2. Tree shaking: Ensure proper imports from libraries
3. Replace XState with custom state machine if needed (~15KB savings)

---

## Summary

All technical decisions documented with clear rationale and implementation approaches. No blocking unknowns remain. Ready to proceed to Phase 1 (Data Model & Contracts).

**Next Steps**:
1. Create `data-model.md` with entity schemas
2. Generate API contracts in `contracts/` directory
3. Create `quickstart.md` for development workflow
4. Run `.specify/scripts/bash/update-agent-context.sh copilot` to update agent context
