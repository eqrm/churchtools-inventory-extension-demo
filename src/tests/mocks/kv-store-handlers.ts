/**
 * MSW Mock Handlers for ChurchTools KV Store API
 * 
 * Mock HTTP handlers for the Custom Modules API endpoints.
 * These intercept real API calls during tests and return mock data.
 * 
 * Note: The churchtoolsClient expects responses in { data: ... } format
 * for mutation endpoints (POST, PUT) to properly extract data.
 */

import { http, HttpResponse } from 'msw';
import type {
    CustomModuleCreate,
    CustomModuleDataCategoryCreate,
    CustomModuleDataValueCreate,
    CustomModuleDataCategory,
    CustomModuleDataValue,
} from '../../utils/ct-types';
import { kvStoreState } from './kv-store-state';

// Base URL for ChurchTools API (from test environment)
const API_BASE_URL = 'https://test.church.tools/api';

/**
 * KV Store Mock Handlers
 */
export const kvStoreHandlers = [
    // ────────────────────────────────────────────────
    //  CUSTOM MODULE ENDPOINTS
    // ────────────────────────────────────────────────

    /**
     * GET /custommodules - Get all custom modules
     * Note: GET endpoints return arrays directly (churchtoolsClient handles this)
     */
    http.get(`${API_BASE_URL}/custommodules`, () => {
        const modules = kvStoreState.getModules();
        return HttpResponse.json(modules);
    }),

    /**
     * POST /custommodules - Create a new custom module
     */
    http.post(`${API_BASE_URL}/custommodules`, async ({ request }) => {
        const body = await request.json() as CustomModuleCreate;
        
        // Validate required fields
        if (!body.name || !body.shorty) {
            return HttpResponse.json(
                { error: 'Name and shorty are required' },
                { status: 400 }
            );
        }

        // Check for duplicate shorty
        const existing = kvStoreState.getModuleByShorty(body.shorty);
        if (existing) {
            return HttpResponse.json(
                { error: `Module with shorty "${body.shorty}" already exists` },
                { status: 409 }
            );
        }

        const module = kvStoreState.createModule(body);
        return HttpResponse.json({ data: module }, { status: 201 });
    }),

    // ────────────────────────────────────────────────
    //  CUSTOM DATA CATEGORY ENDPOINTS
    // ────────────────────────────────────────────────

    /**
     * GET /custommodules/:moduleId/customdatacategories - Get all categories for a module
     */
    http.get(`${API_BASE_URL}/custommodules/:moduleId/customdatacategories`, ({ params }) => {
        const moduleId = Number(params['moduleId']);
        
        if (!kvStoreState.moduleExists(moduleId)) {
            return HttpResponse.json(
                { error: `Module ${moduleId} not found` },
                { status: 404 }
            );
        }

        const categories = kvStoreState.getCategories(moduleId);
        return HttpResponse.json(categories);
    }),

    /**
     * POST /custommodules/:moduleId/customdatacategories - Create a new category
     */
    http.post(`${API_BASE_URL}/custommodules/:moduleId/customdatacategories`, async ({ params, request }) => {
        const moduleId = Number(params['moduleId']);
        const body = await request.json() as CustomModuleDataCategoryCreate;
        
        if (!kvStoreState.moduleExists(moduleId)) {
            return HttpResponse.json(
                { error: `Module ${moduleId} not found` },
                { status: 404 }
            );
        }

        // Validate required fields
        if (!body.name || !body.shorty) {
            return HttpResponse.json(
                { error: 'Name and shorty are required' },
                { status: 400 }
            );
        }

        // Check for duplicate shorty within module
        const existing = kvStoreState.getCategoryByShorty(moduleId, body.shorty);
        if (existing) {
            return HttpResponse.json(
                { error: `Category with shorty "${body.shorty}" already exists in module ${moduleId}` },
                { status: 409 }
            );
        }

        const category = kvStoreState.createCategory({
            ...body,
            customModuleId: moduleId,
        });
        return HttpResponse.json({ data: category }, { status: 201 });
    }),

    /**
     * PUT /custommodules/:moduleId/customdatacategories/:categoryId - Update a category
     */
    http.put(`${API_BASE_URL}/custommodules/:moduleId/customdatacategories/:categoryId`, async ({ params, request }) => {
        const moduleId = Number(params['moduleId']);
        const categoryId = Number(params['categoryId']);
        const body = await request.json() as Partial<CustomModuleDataCategory>;
        
        if (!kvStoreState.moduleExists(moduleId)) {
            return HttpResponse.json(
                { error: `Module ${moduleId} not found` },
                { status: 404 }
            );
        }

        if (!kvStoreState.categoryExists(categoryId)) {
            return HttpResponse.json(
                { error: `Category ${categoryId} not found` },
                { status: 404 }
            );
        }

        if (!kvStoreState.categoryBelongsToModule(categoryId, moduleId)) {
            return HttpResponse.json(
                { error: `Category ${categoryId} does not belong to module ${moduleId}` },
                { status: 400 }
            );
        }

        const updated = kvStoreState.updateCategory(categoryId, body);
        return HttpResponse.json({ data: updated });
    }),

    /**
     * DELETE /custommodules/:moduleId/customdatacategories/:categoryId - Delete a category
     */
    http.delete(`${API_BASE_URL}/custommodules/:moduleId/customdatacategories/:categoryId`, ({ params }) => {
        const moduleId = Number(params['moduleId']);
        const categoryId = Number(params['categoryId']);
        
        if (!kvStoreState.moduleExists(moduleId)) {
            return HttpResponse.json(
                { error: `Module ${moduleId} not found` },
                { status: 404 }
            );
        }

        if (!kvStoreState.categoryExists(categoryId)) {
            return HttpResponse.json(
                { error: `Category ${categoryId} not found` },
                { status: 404 }
            );
        }

        if (!kvStoreState.categoryBelongsToModule(categoryId, moduleId)) {
            return HttpResponse.json(
                { error: `Category ${categoryId} does not belong to module ${moduleId}` },
                { status: 400 }
            );
        }

        kvStoreState.deleteCategory(categoryId);
        return new HttpResponse(null, { status: 204 });
    }),

    // ────────────────────────────────────────────────
    //  CUSTOM DATA VALUE ENDPOINTS
    // ────────────────────────────────────────────────

    /**
     * GET /custommodules/:moduleId/customdatacategories/:categoryId/customdatavalues - Get all values
     */
    http.get(`${API_BASE_URL}/custommodules/:moduleId/customdatacategories/:categoryId/customdatavalues`, ({ params }) => {
        const moduleId = Number(params['moduleId']);
        const categoryId = Number(params['categoryId']);
        
        if (!kvStoreState.moduleExists(moduleId)) {
            return HttpResponse.json(
                { error: `Module ${moduleId} not found` },
                { status: 404 }
            );
        }

        if (!kvStoreState.categoryExists(categoryId)) {
            return HttpResponse.json(
                { error: `Category ${categoryId} not found` },
                { status: 404 }
            );
        }

        if (!kvStoreState.categoryBelongsToModule(categoryId, moduleId)) {
            return HttpResponse.json(
                { error: `Category ${categoryId} does not belong to module ${moduleId}` },
                { status: 400 }
            );
        }

        const values = kvStoreState.getValues(categoryId);
        return HttpResponse.json(values);
    }),

    /**
     * POST /custommodules/:moduleId/customdatacategories/:categoryId/customdatavalues - Create a value
     */
    http.post(`${API_BASE_URL}/custommodules/:moduleId/customdatacategories/:categoryId/customdatavalues`, async ({ params, request }) => {
        const moduleId = Number(params['moduleId']);
        const categoryId = Number(params['categoryId']);
        const body = await request.json() as CustomModuleDataValueCreate;
        
        if (!kvStoreState.moduleExists(moduleId)) {
            return HttpResponse.json(
                { error: `Module ${moduleId} not found` },
                { status: 404 }
            );
        }

        if (!kvStoreState.categoryExists(categoryId)) {
            return HttpResponse.json(
                { error: `Category ${categoryId} not found` },
                { status: 404 }
            );
        }

        if (!kvStoreState.categoryBelongsToModule(categoryId, moduleId)) {
            return HttpResponse.json(
                { error: `Category ${categoryId} does not belong to module ${moduleId}` },
                { status: 400 }
            );
        }

        // Validate required fields
        if (body.value === undefined || body.value === null) {
            return HttpResponse.json(
                { error: 'Value is required' },
                { status: 400 }
            );
        }

        const value = kvStoreState.createValue({
            ...body,
            dataCategoryId: categoryId,
        });
        return HttpResponse.json({ data: value }, { status: 201 });
    }),

    /**
     * PUT /custommodules/:moduleId/customdatacategories/:categoryId/customdatavalues/:valueId - Update a value
     */
    http.put(`${API_BASE_URL}/custommodules/:moduleId/customdatacategories/:categoryId/customdatavalues/:valueId`, async ({ params, request }) => {
        const moduleId = Number(params['moduleId']);
        const categoryId = Number(params['categoryId']);
        const valueId = Number(params['valueId']);
        const body = await request.json() as Partial<CustomModuleDataValue>;
        
        if (!kvStoreState.moduleExists(moduleId)) {
            return HttpResponse.json(
                { error: `Module ${moduleId} not found` },
                { status: 404 }
            );
        }

        if (!kvStoreState.categoryExists(categoryId)) {
            return HttpResponse.json(
                { error: `Category ${categoryId} not found` },
                { status: 404 }
            );
        }

        if (!kvStoreState.categoryBelongsToModule(categoryId, moduleId)) {
            return HttpResponse.json(
                { error: `Category ${categoryId} does not belong to module ${moduleId}` },
                { status: 400 }
            );
        }

        if (!kvStoreState.valueExists(valueId)) {
            return HttpResponse.json(
                { error: `Value ${valueId} not found` },
                { status: 404 }
            );
        }

        if (!kvStoreState.valueBelongsToCategory(valueId, categoryId)) {
            return HttpResponse.json(
                { error: `Value ${valueId} does not belong to category ${categoryId}` },
                { status: 400 }
            );
        }

        const updated = kvStoreState.updateValue(valueId, body);
        return HttpResponse.json({ data: updated });
    }),

    /**
     * DELETE /custommodules/:moduleId/customdatacategories/:categoryId/customdatavalues/:valueId - Delete a value
     */
    http.delete(`${API_BASE_URL}/custommodules/:moduleId/customdatacategories/:categoryId/customdatavalues/:valueId`, ({ params }) => {
        const moduleId = Number(params['moduleId']);
        const categoryId = Number(params['categoryId']);
        const valueId = Number(params['valueId']);
        
        if (!kvStoreState.moduleExists(moduleId)) {
            return HttpResponse.json(
                { error: `Module ${moduleId} not found` },
                { status: 404 }
            );
        }

        if (!kvStoreState.categoryExists(categoryId)) {
            return HttpResponse.json(
                { error: `Category ${categoryId} not found` },
                { status: 404 }
            );
        }

        if (!kvStoreState.categoryBelongsToModule(categoryId, moduleId)) {
            return HttpResponse.json(
                { error: `Category ${categoryId} does not belong to module ${moduleId}` },
                { status: 400 }
            );
        }

        if (!kvStoreState.valueExists(valueId)) {
            return HttpResponse.json(
                { error: `Value ${valueId} not found` },
                { status: 404 }
            );
        }

        if (!kvStoreState.valueBelongsToCategory(valueId, categoryId)) {
            return HttpResponse.json(
                { error: `Value ${valueId} does not belong to category ${categoryId}` },
                { status: 400 }
            );
        }

        kvStoreState.deleteValue(valueId);
        return new HttpResponse(null, { status: 204 });
    }),
];

/**
 * Error handlers for testing error scenarios with KV store endpoints
 */
export const kvStoreErrorHandlers = {
    /**
     * Simulate 500 Internal Server Error on module endpoint
     */
    serverError: http.get(`${API_BASE_URL}/custommodules`, () => {
        return HttpResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }),

    /**
     * Simulate network error
     */
    networkError: http.get(`${API_BASE_URL}/custommodules`, () => {
        return HttpResponse.error();
    }),

    /**
     * Simulate 401 Unauthorized
     */
    unauthorized: http.get(`${API_BASE_URL}/custommodules`, () => {
        return HttpResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        );
    }),
};
