# Quickstart Guide: Advanced Inventory Features

**Feature**: 004-advanced-inventory-features  
**Branch**: `004-advanced-inventory-features`  
**Date**: 2025-11-10

## Prerequisites

- Node.js 18+ and npm 9+
- ChurchTools instance for testing (development or staging environment)
- VS Code with recommended extensions:
  - ESLint
  - TypeScript and JavaScript Language Features
  - Vitest

## Initial Setup

```bash
# 1. Ensure you're on the feature branch
git checkout 004-advanced-inventory-features

# 2. Install dependencies (including new libraries)
npm install

# New dependencies added:
# - dexie@^3.2.4 (IndexedDB ORM)
# - i18next@^23.7.6 (internationalization)
# - react-i18next@^13.5.0 (React bindings for i18next)
# - @tanstack/react-virtual@^3.0.1 (virtual scrolling)
# - xstate@^5.5.0 (state machines)
# - @dnd-kit/core@^6.1.0 (drag-and-drop)

# 3. Start development server
npm run dev

# 4. Open in browser
# http://localhost:5173 (standalone mode)
# OR embed in ChurchTools using module settings
```

## Project Structure

```
specs/004-advanced-inventory-features/
├── spec.md              # Feature specification
├── plan.md              # Implementation plan (this phase)
├── research.md          # Technical research findings
├── data-model.md        # Entity schemas and relationships
├── contracts/           # Service interface contracts
│   └── SERVICE_CONTRACTS.md
└── quickstart.md        # This file

src/
├── components/          # React components
│   ├── undo/           # NEW: Undo functionality
│   ├── damage/         # NEW: Damage tracking
│   ├── assignment/     # NEW: Asset assignment
│   ├── kits/           # NEW: Fixed kits with inheritance
│   ├── models/         # NEW: Asset models (templates)
│   ├── tags/           # NEW: Tagging system
│   ├── views/          # NEW: Data views (table/gallery/kanban/calendar)
│   ├── dashboard/      # NEW: Dashboard widgets
│   ├── maintenance/    # NEW: CAFM/CMMS
│   └── settings/       # NEW: Settings versioning
├── services/           # Business logic
│   ├── UndoService.ts
│   ├── PhotoStorageService.ts
│   ├── DamageService.ts
│   ├── AssignmentService.ts
│   ├── KitService.ts
│   ├── PropertyInheritanceService.ts
│   ├── AssetModelService.ts
│   ├── TagService.ts
│   ├── DataViewService.ts
│   ├── MaintenanceService.ts
│   ├── WorkOrderStateMachine.ts
│   └── SettingsVersionService.ts
├── stores/             # Zustand state management
├── hooks/              # React hooks
├── types/              # TypeScript definitions
└── utils/              # Utility functions
```

## Development Workflow

### Phase 1: TDD for Critical Services (Start Here)

Following Constitution Principle V (Test Driven Development), implement critical services using RED-GREEN-REFACTOR:

#### 1. UndoService (P1 - Critical)

```bash
# 1. RED: Write failing tests
cat > src/tests/services/UndoService.test.ts << 'EOF'
import { describe, it, expect, beforeEach } from 'vitest';
import { UndoService } from '@/services/UndoService';
import { undoDb } from '@/services/db/UndoDatabase';

describe('UndoService', () => {
  let service: UndoService;
  
  beforeEach(async () => {
    await undoDb.undoActions.clear();
    service = new UndoService(undoDb);
  });
  
  it('should record a create action', async () => {
    const actionId = await service.recordAction({
      entityType: 'asset',
      entityId: 'asset-123',
      actionType: 'create',
      beforeState: null,
      afterState: { name: 'New Asset' },
      description: 'Created asset'
    });
    
    expect(actionId).toBeDefined();
    const action = await undoDb.undoActions.get(actionId);
    expect(action?.entityId).toBe('asset-123');
  });
  
  it('should undo a create action by deleting the entity', async () => {
    // Test implementation
  });
  
  // ... more tests
});
EOF

# 2. Run tests (should FAIL)
npm test src/tests/services/UndoService.test.ts

# 3. GREEN: Implement minimal code to pass
cat > src/services/UndoService.ts << 'EOF'
// Implementation here
EOF

# 4. Run tests again (should PASS)
npm test src/tests/services/UndoService.test.ts

# 5. REFACTOR: Improve code quality
# 6. Commit tests FIRST, then implementation
git add src/tests/services/UndoService.test.ts
git commit -m "test: Add UndoService RED tests"
git add src/services/UndoService.ts
git commit -m "feat: Implement UndoService (GREEN)"
```

#### 2. PropertyInheritanceService (P2 - Important)

```bash
# Follow same TDD pattern for property inheritance
npm test src/tests/services/PropertyInheritanceService.test.ts
```

#### 3. WorkOrderStateMachine (P2 - Important)

```bash
# State machine logic is complex, TDD required
npm test src/tests/services/WorkOrderStateMachine.test.ts
```

#### 4. PhotoStorageService (P1 - Critical)

```bash
# Photo compression and storage abstraction
npm test src/tests/services/PhotoStorageService.test.ts
```

### Phase 2: UI Components (After Services)

Once services are implemented and tested, build UI components:

```bash
# 1. Create component with Mantine UI
cat > src/components/undo/UndoHistory.tsx << 'EOF'
import { Stack, Button, Text } from '@mantine/core';
import { useUndoHistory } from '@/hooks/useUndo';

export function UndoHistory() {
  const { history, undoAction } = useUndoHistory();
  
  return (
    <Stack>
      {history.map(action => (
        <Button key={action.id} onClick={() => undoAction(action.id)}>
          Undo: {action.description}
        </Button>
      ))}
    </Stack>
  );
}
EOF

# 2. Test in browser
npm run dev
```

### Phase 3: Integration Testing

```bash
# Test full workflows manually in ChurchTools embedded mode
# 1. Deploy to ChurchTools test instance
npm run build
npm run deploy

# 2. Test user stories from spec.md:
# - Create asset, undo creation
# - Add damage report with photos
# - Assign asset to user
# - Create kit with inheritance
# etc.
```

## Code Quality Checks

```bash
# Run before committing
npm run lint          # ESLint check
npm run type-check    # TypeScript compilation
npm test              # Vitest unit tests
npm run test:coverage # Test coverage report

# All must pass for PR approval
```

## Data Model Reference

See `data-model.md` for complete entity schemas. Quick reference:

```typescript
// IndexedDB entities (client-side only)
- UndoAction          // 24-hour retention
- DataView (cache)    // Synced to ChurchTools
- SettingsVersion     // 90-day retention

// ChurchTools Custom Data entities
- DamageReport
- Assignment
- FixedKit
- AssetModel
- Tag
- MaintenanceCompany
- MaintenanceRule
- WorkOrder
- SettingsVersion (source of truth)
```

## Key Implementation Patterns

### 1. Undo Recording

```typescript
// Record action in service method
async function updateAsset(id: string, data: Partial<Asset>) {
  const before = await assetService.get(id);
  const after = await assetService.update(id, data);
  
  await undoService.recordAction({
    entityType: 'asset',
    entityId: id,
    actionType: 'update',
    beforeState: before,
    afterState: after,
    description: `Updated ${before.name}`
  });
  
  return after;
}
```

### 2. Property Inheritance

```typescript
// Check if property is inherited
const { inherited, source } = await inheritanceService.isPropertyInherited(
  assetId,
  'location'
);

if (inherited) {
  // Show locked field with tooltip: "Inherited from Kit: {source}"
  return <LockedInput value={value} source={source} />;
}
```

### 3. State Machine Validation

```typescript
// Validate transition before updating
const { allowed, reason, allowedStates } = stateMachine.canTransition(
  workOrder,
  'completed'
);

if (!allowed) {
  showError(`Cannot transition: ${reason}. Allowed: ${allowedStates.join(', ')}`);
  return;
}

await stateMachine.transition(workOrder.id, 'completed');
```

### 4. Filter Execution

```typescript
// Apply saved view filters
const view = await dataViewService.getView(viewId);
let filtered = assets;

filtered = dataViewService.applyFilters(filtered, view.filters);
filtered = dataViewService.applySorts(filtered, view.sorts);

if (view.groupBy) {
  const grouped = dataViewService.groupAssets(filtered, view.groupBy);
  return <KanbanBoard groups={grouped} />;
}
```

## Debugging Tips

### IndexedDB Inspection

```bash
# Chrome DevTools → Application → IndexedDB → ChurchToolsInventoryUndo
# Check undo actions, data views, settings versions
```

### State Machine Visualization

```bash
# XState provides visualizer for state machines
# Visit: https://stately.ai/viz
# Paste state machine definition to see diagram
```

### Photo Compression Testing

```bash
# Test photo compression in console
const file = document.querySelector('input[type="file"]').files[0];
const compressed = await photoService.compressImage(file);
console.log('Original:', file.size, 'Compressed:', compressed.length);
```

## Common Issues & Solutions

### Issue: Bundle size exceeds 200 KB

**Solution**: Code split maintenance module

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          maintenance: ['xstate', '@/components/maintenance', '@/services/MaintenanceService']
        }
      }
    }
  }
});
```

### Issue: IndexedDB quota exceeded

**Solution**: Cleanup expired data more aggressively

```typescript
// Run cleanup on app init and hourly
await undoService.cleanupExpired();
await settingsVersionService.cleanupExpiredVersions();
```

### Issue: ChurchTools API rate limiting

**Solution**: Use TanStack Query caching

```typescript
export function useAssets() {
  return useQuery({
    queryKey: ['assets'],
    queryFn: fetchAssets,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000  // 10 minutes
  });
}
```

## Testing Checklist

Before marking feature complete:

- [ ] All TDD tests passing (RED-GREEN-REFACTOR cycle followed)
- [ ] ESLint no warnings/errors
- [ ] TypeScript compilation successful
- [ ] Bundle size < 200 KB gzipped
- [ ] Manual testing in standalone mode (all P1 user stories)
- [ ] Manual testing in ChurchTools embedded mode (all P1 user stories)
- [ ] German text audit complete (zero German strings)
- [ ] Performance profiling (virtual scrolling works for 100+ items)
- [ ] Accessibility check (keyboard navigation, screen reader labels)

## Useful Commands

```bash
# Development
npm run dev                    # Start dev server
npm run build                  # Production build
npm run preview                # Preview production build
npm run deploy                 # Package for ChurchTools

# Testing
npm test                       # Run all tests
npm run test:watch             # Watch mode
npm run test:coverage          # Coverage report
npm run test:ui                # Vitest UI

# Code Quality
npm run lint                   # ESLint
npm run lint:fix               # Auto-fix lint issues
npm run type-check             # TypeScript check
npm run format                 # Prettier format

# Utility
npm run detect-german          # Find German strings
npm run bundle-analyze         # Analyze bundle size
```

## Next Steps

1. **Start with TDD**: Implement UndoService following RED-GREEN-REFACTOR
2. **Build incrementally**: Complete P1 features before P2
3. **Test frequently**: Manual testing after each service/component
4. **Monitor bundle**: Check bundle size after adding dependencies
5. **Document progress**: Update `tasks.md` as features complete

## Resources

- [Spec (spec.md)](./spec.md) - Feature requirements
- [Data Model (data-model.md)](./data-model.md) - Entity schemas
- [Service Contracts (contracts/SERVICE_CONTRACTS.md)](./contracts/SERVICE_CONTRACTS.md) - API interfaces
- [Research (research.md)](./research.md) - Technical decisions
- [Constitution](/.specify/memory/constitution.md) - Development standards

## Support

- Check existing codebase patterns in `src/services/`, `src/components/`
- Review similar features (e.g., existing asset CRUD for reference)
- Constitution Principle V requires TDD for complex logic
- All user-facing strings must use i18next (no hardcoded English)
