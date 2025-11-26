/**
 * Unit Tests for KV Store
 * 
 * Tests the kv-store.ts utility functions using MSW mock handlers.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach, vi, beforeEach } from 'vitest';
import { server, kvStoreState, resetMockServer, startMockServer, stopMockServer } from './mocks/server';
import { churchtoolsClient } from '@churchtools/churchtools-client';
import {
    getModule,
    getOrCreateModule,
    getCustomDataCategories,
    getCustomDataCategory,
    createCustomDataCategory,
    updateCustomDataCategory,
    deleteCustomDataCategory,
    getCustomDataValues,
    createCustomDataValue,
    updateCustomDataValue,
    deleteCustomDataValue,
} from '../utils/kv-store';
import { http, HttpResponse } from 'msw';

const API_BASE_URL = 'https://test.church.tools/api';

describe('KV Store', () => {
    beforeAll(() => {
        // Configure churchtools client to use our test URL
        churchtoolsClient.setBaseUrl('https://test.church.tools');
        startMockServer();
    });

    afterAll(() => {
        stopMockServer();
    });

    afterEach(() => {
        resetMockServer();
    });

    beforeEach(() => {
        // Ensure VITE_KEY is set for tests
        vi.stubEnv('VITE_KEY', 'testfkoinventorymanagement');
    });

    // ────────────────────────────────────────────────
    //  MODULE TESTS (4.2-4.3)
    // ────────────────────────────────────────────────

    describe('getModule', () => {
        it('returns existing module when found', async () => {
            // Seed a module into the mock state
            kvStoreState.seedModule({
                id: 1,
                name: 'Test Inventory',
                shorty: 'testfkoinventorymanagement',
                description: 'Test module',
                sortKey: 100,
            });

            const module = await getModule('testfkoinventorymanagement');

            expect(module).toBeDefined();
            expect(module.id).toBe(1);
            expect(module.shorty).toBe('testfkoinventorymanagement');
            expect(module.name).toBe('Test Inventory');
        });

        it('throws error when module not found', async () => {
            // No module seeded - should throw
            await expect(getModule('nonexistent')).rejects.toThrow(
                'Module for extension key "nonexistent" not found.'
            );
        });

        it('uses VITE_KEY when no extensionkey provided', async () => {
            kvStoreState.seedModule({
                id: 2,
                name: 'Default Module',
                shorty: 'testfkoinventorymanagement',
                sortKey: 100,
            });

            const module = await getModule();

            expect(module.shorty).toBe('testfkoinventorymanagement');
        });
    });

    describe('getOrCreateModule', () => {
        it('returns existing module if found', async () => {
            kvStoreState.seedModule({
                id: 10,
                name: 'Existing Module',
                shorty: 'existingmodule',
                sortKey: 100,
            });

            const module = await getOrCreateModule(
                'existingmodule',
                'New Name',
                'New Description'
            );

            expect(module.id).toBe(10);
            expect(module.name).toBe('Existing Module'); // Original name preserved
        });

        it('creates new module if not exists', async () => {
            const module = await getOrCreateModule(
                'newmodule',
                'New Module Name',
                'New module description'
            );

            expect(module).toBeDefined();
            expect(module.shorty).toBe('newmodule');
            expect(module.name).toBe('New Module Name');
            expect(module.description).toBe('New module description');

            // Verify it was created in the state
            const storedModule = kvStoreState.getModuleByShorty('newmodule');
            expect(storedModule).toBeDefined();
        });
    });

    // ────────────────────────────────────────────────
    //  CATEGORY TESTS (4.4-4.8)
    // ────────────────────────────────────────────────

    describe('getCustomDataCategories', () => {
        it('returns list of categories for a module', async () => {
            const module = kvStoreState.seedModule({
                id: 1,
                shorty: 'testfkoinventorymanagement',
            });

            kvStoreState.seedCategory({
                id: 1,
                customModuleId: module.id,
                name: 'Settings',
                shorty: 'settings',
                description: 'User settings',
            });

            kvStoreState.seedCategory({
                id: 2,
                customModuleId: module.id,
                name: 'Cache',
                shorty: 'cache',
                description: 'Cached data',
            });

            const categories = await getCustomDataCategories(module.id);

            expect(categories).toHaveLength(2);
            expect(categories[0].shorty).toBe('settings');
            expect(categories[1].shorty).toBe('cache');
        });

        it('returns empty array when no categories exist', async () => {
            const module = kvStoreState.seedModule({
                id: 1,
                shorty: 'testfkoinventorymanagement',
            });

            const categories = await getCustomDataCategories(module.id);

            expect(categories).toHaveLength(0);
        });

        it('parses JSON data field correctly', async () => {
            const module = kvStoreState.seedModule({
                id: 1,
                shorty: 'testfkoinventorymanagement',
            });

            kvStoreState.seedCategory({
                id: 1,
                customModuleId: module.id,
                name: 'Config',
                shorty: 'config',
                data: JSON.stringify({ theme: 'dark', version: 1 }),
            });

            interface ConfigData {
                theme: string;
                version: number;
            }

            const categories = await getCustomDataCategories<ConfigData>(module.id);

            expect(categories[0].theme).toBe('dark');
            expect(categories[0].version).toBe(1);
        });
    });

    describe('getCustomDataCategory', () => {
        it('finds category by shorty', async () => {
            const module = kvStoreState.seedModule({
                id: 1,
                shorty: 'testfkoinventorymanagement',
            });

            kvStoreState.seedCategory({
                id: 1,
                customModuleId: module.id,
                name: 'Settings',
                shorty: 'settings',
            });

            kvStoreState.seedCategory({
                id: 2,
                customModuleId: module.id,
                name: 'Other',
                shorty: 'other',
            });

            const category = await getCustomDataCategory('settings');

            expect(category).toBeDefined();
            expect(category?.shorty).toBe('settings');
        });

        it('returns undefined when category not found', async () => {
            const module = kvStoreState.seedModule({
                id: 1,
                shorty: 'testfkoinventorymanagement',
            });

            kvStoreState.seedCategory({
                customModuleId: module.id,
                name: 'Settings',
                shorty: 'settings',
            });

            const category = await getCustomDataCategory('nonexistent');

            expect(category).toBeUndefined();
        });
    });

    describe('createCustomDataCategory', () => {
        it('creates and returns new category', async () => {
            const module = kvStoreState.seedModule({
                id: 1,
                shorty: 'testfkoinventorymanagement',
            });

            const category = await createCustomDataCategory(
                {
                    customModuleId: module.id,
                    name: 'New Category',
                    shorty: 'newcategory',
                    description: 'A new category',
                },
                module.id
            );

            expect(category).toBeDefined();
            expect(category.id).toBeDefined();
            expect(category.name).toBe('New Category');
            expect(category.shorty).toBe('newcategory');

            // Verify it was created in state
            const stored = kvStoreState.getCategoryByShorty(module.id, 'newcategory');
            expect(stored).toBeDefined();
        });
    });

    describe('updateCustomDataCategory', () => {
        it('updates existing category', async () => {
            const module = kvStoreState.seedModule({
                id: 1,
                shorty: 'testfkoinventorymanagement',
            });

            const category = kvStoreState.seedCategory({
                id: 1,
                customModuleId: module.id,
                name: 'Old Name',
                shorty: 'settings',
            });

            await updateCustomDataCategory(
                category.id,
                { name: 'New Name', description: 'Updated description' },
                module.id
            );

            // Verify the update in state
            const updated = kvStoreState.getCategoryById(category.id);
            expect(updated?.name).toBe('New Name');
            expect(updated?.description).toBe('Updated description');
        });
    });

    describe('deleteCustomDataCategory', () => {
        it('removes category and all child values', async () => {
            const module = kvStoreState.seedModule({
                id: 1,
                shorty: 'testfkoinventorymanagement',
            });

            const category = kvStoreState.seedCategory({
                id: 1,
                customModuleId: module.id,
                name: 'Settings',
                shorty: 'settings',
            });

            // Add some values to the category
            kvStoreState.seedValue({
                id: 1,
                dataCategoryId: category.id,
                value: JSON.stringify({ key: 'value1' }),
            });

            kvStoreState.seedValue({
                id: 2,
                dataCategoryId: category.id,
                value: JSON.stringify({ key: 'value2' }),
            });

            // Verify values exist
            expect(kvStoreState.getValues(category.id)).toHaveLength(2);

            await deleteCustomDataCategory(category.id, module.id);

            // Verify category was deleted
            expect(kvStoreState.getCategoryById(category.id)).toBeUndefined();

            // Verify values were cascade deleted
            expect(kvStoreState.getValues(category.id)).toHaveLength(0);
        });
    });

    // ────────────────────────────────────────────────
    //  VALUE TESTS (4.9-4.12)
    // ────────────────────────────────────────────────

    describe('getCustomDataValues', () => {
        it('returns parsed values for a category', async () => {
            const module = kvStoreState.seedModule({
                id: 1,
                shorty: 'testfkoinventorymanagement',
            });

            const category = kvStoreState.seedCategory({
                id: 1,
                customModuleId: module.id,
                shorty: 'settings',
            });

            kvStoreState.seedValue({
                id: 1,
                dataCategoryId: category.id,
                value: JSON.stringify({ key: 'theme', value: 'dark' }),
            });

            kvStoreState.seedValue({
                id: 2,
                dataCategoryId: category.id,
                value: JSON.stringify({ key: 'language', value: 'en' }),
            });

            interface SettingValue {
                key: string;
                value: string;
            }

            const values = await getCustomDataValues<SettingValue>(category.id, module.id);

            expect(values).toHaveLength(2);
            expect(values[0].key).toBe('theme');
            expect(values[0].value).toBe('dark');
            expect(values[1].key).toBe('language');
            expect(values[1].value).toBe('en');
        });

        it('returns empty array when no values exist', async () => {
            const module = kvStoreState.seedModule({
                id: 1,
                shorty: 'testfkoinventorymanagement',
            });

            const category = kvStoreState.seedCategory({
                id: 1,
                customModuleId: module.id,
                shorty: 'settings',
            });

            const values = await getCustomDataValues(category.id, module.id);

            expect(values).toHaveLength(0);
        });
    });

    describe('createCustomDataValue', () => {
        it('creates a new value', async () => {
            const module = kvStoreState.seedModule({
                id: 1,
                shorty: 'testfkoinventorymanagement',
            });

            const category = kvStoreState.seedCategory({
                id: 1,
                customModuleId: module.id,
                shorty: 'settings',
            });

            await createCustomDataValue(
                {
                    dataCategoryId: category.id,
                    value: JSON.stringify({ key: 'newSetting', value: 'testValue' }),
                },
                module.id
            );

            // Verify the value was created
            const values = kvStoreState.getValues(category.id);
            expect(values).toHaveLength(1);
            expect(JSON.parse(values[0].value)).toEqual({ key: 'newSetting', value: 'testValue' });
        });
    });

    describe('updateCustomDataValue', () => {
        it('updates an existing value', async () => {
            const module = kvStoreState.seedModule({
                id: 1,
                shorty: 'testfkoinventorymanagement',
            });

            const category = kvStoreState.seedCategory({
                id: 1,
                customModuleId: module.id,
                shorty: 'settings',
            });

            const value = kvStoreState.seedValue({
                id: 1,
                dataCategoryId: category.id,
                value: JSON.stringify({ key: 'oldValue' }),
            });

            await updateCustomDataValue(
                category.id,
                value.id,
                { value: JSON.stringify({ key: 'newValue' }) },
                module.id
            );

            // Verify the update
            const updated = kvStoreState.getValueById(value.id);
            expect(updated).toBeDefined();
            expect(JSON.parse(updated?.value ?? '{}')).toEqual({ key: 'newValue' });
        });
    });

    describe('deleteCustomDataValue', () => {
        it('removes a value', async () => {
            const module = kvStoreState.seedModule({
                id: 1,
                shorty: 'testfkoinventorymanagement',
            });

            const category = kvStoreState.seedCategory({
                id: 1,
                customModuleId: module.id,
                shorty: 'settings',
            });

            const value = kvStoreState.seedValue({
                id: 1,
                dataCategoryId: category.id,
                value: JSON.stringify({ key: 'toDelete' }),
            });

            // Verify it exists
            expect(kvStoreState.getValueById(value.id)).toBeDefined();

            await deleteCustomDataValue(category.id, value.id, module.id);

            // Verify it was deleted
            expect(kvStoreState.getValueById(value.id)).toBeUndefined();
        });
    });

    // ────────────────────────────────────────────────
    //  ERROR HANDLING TESTS (4.13)
    // ────────────────────────────────────────────────

    describe('Error Handling', () => {
        it('handles 404 error when module not found', async () => {
            // Use server.use to override the handler for this test
            server.use(
                http.get(`${API_BASE_URL}/custommodules`, () => {
                    return HttpResponse.json([]);
                })
            );

            await expect(getModule('nonexistent')).rejects.toThrow(
                'Module for extension key "nonexistent" not found.'
            );
        });

        it('handles 500 server error', async () => {
            server.use(
                http.get(`${API_BASE_URL}/custommodules`, () => {
                    return HttpResponse.json(
                        { error: 'Internal server error' },
                        { status: 500 }
                    );
                })
            );

            // The churchtoolsClient should throw on 500 errors
            await expect(getModule()).rejects.toThrow();
        });

        it('handles network error', async () => {
            server.use(
                http.get(`${API_BASE_URL}/custommodules`, () => {
                    return HttpResponse.error();
                })
            );

            await expect(getModule()).rejects.toThrow();
        });

        it('handles 404 when getting categories for non-existent module', async () => {
            // No module exists with id 9999
            await expect(getCustomDataCategories(9999)).rejects.toThrow();
        });

        it('handles 404 when getting values for non-existent category', async () => {
            const module = kvStoreState.seedModule({
                id: 1,
                shorty: 'testfkoinventorymanagement',
            });

            // No category with id 9999
            await expect(getCustomDataValues(9999, module.id)).rejects.toThrow();
        });
    });

    // ────────────────────────────────────────────────
    //  INTEGRATION SCENARIOS (6.1-6.3)
    // ────────────────────────────────────────────────

    describe('Integration Scenarios', () => {
        it('full workflow: create category → add values → read back', async () => {
            // Step 1: Create module
            const module = await getOrCreateModule(
                'fullworkflow',
                'Full Workflow Test',
                'Testing complete workflow'
            );

            expect(module.id).toBeDefined();

            // Step 2: Create category
            const category = await createCustomDataCategory(
                {
                    customModuleId: module.id,
                    name: 'Workflow Settings',
                    shorty: 'workflow-settings',
                    description: 'Settings for workflow test',
                },
                module.id
            );

            expect(category.id).toBeDefined();

            // Step 3: Add values
            await createCustomDataValue(
                {
                    dataCategoryId: category.id,
                    value: JSON.stringify({ key: 'setting1', value: 'value1' }),
                },
                module.id
            );

            await createCustomDataValue(
                {
                    dataCategoryId: category.id,
                    value: JSON.stringify({ key: 'setting2', value: 'value2' }),
                },
                module.id
            );

            // Step 4: Read back
            interface Setting {
                key: string;
                value: string;
            }

            const values = await getCustomDataValues<Setting>(category.id, module.id);

            expect(values).toHaveLength(2);
            expect(values.find(v => v.key === 'setting1')?.value).toBe('value1');
            expect(values.find(v => v.key === 'setting2')?.value).toBe('value2');
        });

        it('cascade delete: deleting category removes all child values', async () => {
            const module = kvStoreState.seedModule({
                id: 1,
                shorty: 'testfkoinventorymanagement',
            });

            const category = kvStoreState.seedCategory({
                customModuleId: module.id,
                shorty: 'cascade-test',
                name: 'Cascade Test',
            });

            // Add multiple values
            for (let i = 0; i < 5; i++) {
                kvStoreState.seedValue({
                    dataCategoryId: category.id,
                    value: JSON.stringify({ index: i }),
                });
            }

            // Verify values exist
            expect(kvStoreState.getValues(category.id)).toHaveLength(5);

            // Delete the category
            await deleteCustomDataCategory(category.id, module.id);

            // All values should be gone
            expect(kvStoreState.getValues(category.id)).toHaveLength(0);
            expect(kvStoreState.getCategoryById(category.id)).toBeUndefined();
        });

        it('concurrent operations do not corrupt state', async () => {
            const module = kvStoreState.seedModule({
                id: 1,
                shorty: 'testfkoinventorymanagement',
            });

            const category = kvStoreState.seedCategory({
                customModuleId: module.id,
                shorty: 'concurrent-test',
                name: 'Concurrent Test',
            });

            // Run multiple create operations concurrently
            const createPromises = Array.from({ length: 10 }, (_, i) =>
                createCustomDataValue(
                    {
                        dataCategoryId: category.id,
                        value: JSON.stringify({ index: i }),
                    },
                    module.id
                )
            );

            await Promise.all(createPromises);

            // All values should be created
            const values = await getCustomDataValues(category.id, module.id);
            expect(values).toHaveLength(10);

            // Each value should have a unique ID
            const ids = values.map(v => v.id);
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(10);
        });
    });
});
