/**
 * Integration Tests: MasterData + KV Store Backend
 * 
 * Tests that the MasterDataService correctly uses the ChurchTools
 * KV Store API for CRUD operations on master data entities.
 * 
 * These tests use MSW to mock the KV Store backend and verify
 * the full data flow from service layer to API.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach, vi } from 'vitest';
import { churchtoolsClient } from '@churchtools/churchtools-client';
import { kvStoreState, resetMockServer, startMockServer, stopMockServer } from '../mocks/server';
import {
    createCustomDataCategory,
    createCustomDataValue,
    deleteCustomDataValue,
    getCustomDataCategories,
    getCustomDataValues,
    updateCustomDataValue,
} from '../../utils/kv-store';
import type { CustomModuleDataCategoryCreate } from '../../utils/ct-types';

/** Helper type for master data value payload */
interface MasterDataPayload {
    name: string;
    createdBy?: number;
    createdByName?: string;
    createdAt?: string;
}

describe('MasterData KV Store Integration', () => {
    beforeAll(() => {
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
        vi.stubEnv('VITE_KEY', 'testfkoinventorymanagement');
        
        // Seed the module for all tests
        kvStoreState.seedModule({
            id: 1,
            name: 'Test Inventory',
            shorty: 'testfkoinventorymanagement',
            description: 'Test module',
            sortKey: 100,
        });
    });

    /** Helper to create category payload */
    function categoryPayload(name: string, shorty: string, description: string): CustomModuleDataCategoryCreate {
        return {
            customModuleId: 1,
            name,
            shorty,
            description,
        };
    }

    // ────────────────────────────────────────────────
    //  SCENARIO: Master Data Category Lifecycle
    // ────────────────────────────────────────────────

    describe('Master Data Category Lifecycle', () => {
        it('creates a category for manufacturers', async () => {
            // Create a master data category for manufacturers
            const category = await createCustomDataCategory(
                categoryPayload('__Manufacturers__', 'manufacturers_001', 'System category for manufacturers'),
                1
            );

            expect(category).toBeDefined();
            expect(category.name).toBe('__Manufacturers__');
            expect(category.shorty).toBe('manufacturers_001');
        });

        it('lists categories after creation', async () => {
            // Seed a category
            kvStoreState.seedCategory({
                id: 10,
                customModuleId: 1,
                name: '__Locations__',
                shorty: 'locations_001',
                description: 'Locations category',
                data: '',
            });

            const categories = await getCustomDataCategories(1);
            
            expect(categories).toHaveLength(1);
            expect(categories[0].name).toBe('__Locations__');
        });
    });

    // ────────────────────────────────────────────────
    //  SCENARIO: Master Data Value CRUD
    // ────────────────────────────────────────────────

    describe('Master Data Value CRUD', () => {
        let categoryId: number;

        beforeEach(() => {
            // Seed a category for values - use fixed ID 100
            kvStoreState.seedCategory({
                id: 100,
                customModuleId: 1,
                name: '__Manufacturers__',
                shorty: 'manufacturers_001',
                description: 'Manufacturers category',
                data: '',
            });
            categoryId = 100;
        });

        it('creates a master data value (manufacturer entry)', async () => {
            const payload: MasterDataPayload = {
                name: 'Apple',
                createdBy: 1,
                createdByName: 'Test Admin',
                createdAt: new Date().toISOString(),
            };

            // createCustomDataValue takes { dataCategoryId, value } as payload
            await createCustomDataValue(
                {
                    dataCategoryId: categoryId,
                    value: JSON.stringify(payload),
                },
                1
            );

            // Verify by reading back
            const values = await getCustomDataValues<MasterDataPayload>(categoryId, 1);
            expect(values).toHaveLength(1);
            expect(values[0].name).toBe('Apple');
        });

        it('reads all values for a category', async () => {
            // Seed some values
            kvStoreState.seedValue({
                id: 200,
                dataCategoryId: categoryId,
                value: JSON.stringify({ name: 'Dell' }),
            });
            kvStoreState.seedValue({
                id: 201,
                dataCategoryId: categoryId,
                value: JSON.stringify({ name: 'HP' }),
            });

            const values = await getCustomDataValues<MasterDataPayload>(categoryId, 1);
            
            expect(values).toHaveLength(2);
            expect(values.map(v => v.name)).toContain('Dell');
            expect(values.map(v => v.name)).toContain('HP');
        });

        it('updates a master data value', async () => {
            // Seed a value
            kvStoreState.seedValue({
                id: 300,
                dataCategoryId: categoryId,
                value: JSON.stringify({ name: 'Lenovo' }),
            });

            // updateCustomDataValue signature: (dataCategoryId, valueId, payload, moduleId)
            await updateCustomDataValue(
                categoryId,
                300,
                { value: JSON.stringify({ name: 'Lenovo (Updated)' }) },
                1
            );

            // Verify by reading back
            const values = await getCustomDataValues<MasterDataPayload>(categoryId, 1);
            const updatedValue = values.find(v => v.id === 300);
            expect(updatedValue?.name).toBe('Lenovo (Updated)');
        });

        it('deletes a master data value', async () => {
            // Seed values
            kvStoreState.seedValue({
                id: 400,
                dataCategoryId: categoryId,
                value: JSON.stringify({ name: 'ToDelete' }),
            });
            kvStoreState.seedValue({
                id: 401,
                dataCategoryId: categoryId,
                value: JSON.stringify({ name: 'ToKeep' }),
            });

            // deleteCustomDataValue signature: (dataCategoryId, valueId, moduleId)
            await deleteCustomDataValue(categoryId, 400, 1);

            const values = await getCustomDataValues<MasterDataPayload>(categoryId, 1);
            expect(values).toHaveLength(1);
            expect(values[0].name).toBe('ToKeep');
        });
    });

    // ────────────────────────────────────────────────
    //  SCENARIO: Multi-Entity Master Data
    // ────────────────────────────────────────────────

    describe('Multi-Entity Master Data', () => {
        it('supports multiple master data categories in same module', async () => {
            // Create manufacturers category
            const manufacturersCategory = await createCustomDataCategory(
                categoryPayload('__Manufacturers__', 'manufacturers_001', 'Manufacturers'),
                1
            );

            // Create locations category
            const locationsCategory = await createCustomDataCategory(
                categoryPayload('__Locations__', 'locations_001', 'Locations'),
                1
            );

            // Create models category
            const modelsCategory = await createCustomDataCategory(
                categoryPayload('__Models__', 'models_001', 'Models'),
                1
            );

            // Verify all categories exist
            const categories = await getCustomDataCategories(1);
            expect(categories).toHaveLength(3);

            const categoryNames = categories.map(c => c.name);
            expect(categoryNames).toContain('__Manufacturers__');
            expect(categoryNames).toContain('__Locations__');
            expect(categoryNames).toContain('__Models__');

            // Add values to each
            await createCustomDataValue(
                { dataCategoryId: manufacturersCategory.id, value: JSON.stringify({ name: 'Sony' }) },
                1
            );
            await createCustomDataValue(
                { dataCategoryId: locationsCategory.id, value: JSON.stringify({ name: 'Office A' }) },
                1
            );
            await createCustomDataValue(
                { dataCategoryId: modelsCategory.id, value: JSON.stringify({ name: 'Camera Pro X' }) },
                1
            );

            // Verify each category has its own values
            const manufacturers = await getCustomDataValues<MasterDataPayload>(manufacturersCategory.id, 1);
            const locations = await getCustomDataValues<MasterDataPayload>(locationsCategory.id, 1);
            const models = await getCustomDataValues<MasterDataPayload>(modelsCategory.id, 1);

            expect(manufacturers).toHaveLength(1);
            expect(manufacturers[0].name).toBe('Sony');
            expect(locations).toHaveLength(1);
            expect(locations[0].name).toBe('Office A');
            expect(models).toHaveLength(1);
            expect(models[0].name).toBe('Camera Pro X');
        });
    });

    // ────────────────────────────────────────────────
    //  SCENARIO: Error Handling
    // ────────────────────────────────────────────────

    describe('Error Handling', () => {
        it('handles category not found when adding values', async () => {
            // Try to add value to non-existent category
            await expect(
                createCustomDataValue(
                    { dataCategoryId: 99999, value: JSON.stringify({ name: 'Test' }) },
                    1
                )
            ).rejects.toThrow();
        });

        it('handles duplicate category shorty', async () => {
            // Create first category
            await createCustomDataCategory(
                categoryPayload('First', 'duplicate_shorty', 'First'),
                1
            );

            // Try to create duplicate
            await expect(
                createCustomDataCategory(
                    categoryPayload('Second', 'duplicate_shorty', 'Second'),
                    1
                )
            ).rejects.toThrow();
        });
    });
});
