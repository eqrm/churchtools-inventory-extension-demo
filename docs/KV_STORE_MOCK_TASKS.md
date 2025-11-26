# KV Store Mock Backend Implementation

## Phase 1: MSW Handlers
- [x] 1.1 Create `src/tests/mocks/kv-store-handlers.ts` with in-memory state
- [x] 1.2 Implement GET `/custommodules` handler
- [x] 1.3 Implement POST `/custommodules` handler
- [x] 1.4 Implement GET `/custommodules/:moduleId/customdatacategories` handler
- [x] 1.5 Implement POST `/custommodules/:moduleId/customdatacategories` handler
- [x] 1.6 Implement PUT `/custommodules/:moduleId/customdatacategories/:categoryId` handler
- [x] 1.7 Implement DELETE `/custommodules/:moduleId/customdatacategories/:categoryId` handler
- [x] 1.8 Implement GET `/custommodules/:moduleId/customdatacategories/:categoryId/customdatavalues` handler
- [x] 1.9 Implement POST `.../customdatavalues` handler
- [x] 1.10 Implement PUT `.../customdatavalues/:valueId` handler
- [x] 1.11 Implement DELETE `.../customdatavalues/:valueId` handler

## Phase 2: Mock State Manager
- [x] 2.1 Create `src/tests/mocks/kv-store-state.ts`
- [x] 2.2 Implement `reset()` method
- [x] 2.3 Implement `seedModule()`, `seedCategory()`, `seedValue()` helpers
- [x] 2.4 Implement inspection methods: `getModules()`, `getCategories()`, `getValues()`
- [x] 2.5 Export singleton + integrate with handlers

## Phase 3: Server Integration
- [x] 3.1 Update `src/tests/mocks/handlers.ts` to include KV store handlers
- [x] 3.2 Update `src/tests/mocks/server.ts` if needed
- [x] 3.3 Add error handlers for KV store endpoints

## Phase 4: Unit Tests for kv-store.ts
- [x] 4.1 Create `src/tests/kv-store.test.ts`
- [x] 4.2 Test `getModule()` returns existing module
- [x] 4.3 Test `getOrCreateModule()` creates if not exists
- [x] 4.4 Test `getCustomDataCategories()` returns list
- [x] 4.5 Test `getCustomDataCategory()` finds by shorty
- [x] 4.6 Test `createCustomDataCategory()` creates and returns
- [x] 4.7 Test `updateCustomDataCategory()` updates existing
- [x] 4.8 Test `deleteCustomDataCategory()` removes category + values
- [x] 4.9 Test `getCustomDataValues()` returns parsed values
- [x] 4.10 Test `createCustomDataValue()` creates value
- [x] 4.11 Test `updateCustomDataValue()` updates value
- [x] 4.12 Test `deleteCustomDataValue()` removes value
- [x] 4.13 Test error handling (404, 500)

## Phase 5: Integration Tests
Note: Full UI integration tests would require refactoring the app's test infrastructure.
Instead, we created `src/tests/integration/masterData-kvstore.test.ts` which tests the
KV store → churchtoolsClient → MSW handlers data flow.

- [x] 5.1 Create `src/tests/integration/masterData-kvstore.test.ts`
- [x] 5.2 Test: Create master data category → verify in mock backend
- [x] 5.3 Test: Create master data values → verify creation and read back
- [x] 5.4 Test: Update master data values → verify updates persist
- [x] 5.5 Test: Delete master data values → verify removal from backend
- [x] 5.6 Test: Multiple categories in same module (manufacturers, locations, models)
- [x] 5.7 Test: Error handling (category not found, duplicate shorty)
- [ ] 5.8 (Future) MasterDataSettings.integration.test.tsx with full React component testing
- [x] 5.9 Added `/whoami` mock handler for user context

## Phase 6: Integration Scenarios
- [x] 6.1 Test full settings workflow: create category → add values → read back
- [x] 6.2 Test cascade delete: deleting category removes all child values
- [x] 6.3 Test concurrent operations don't corrupt staten