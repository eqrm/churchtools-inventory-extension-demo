/**
 * MSW Mock Handlers
 * 
 * Mock HTTP handlers for ChurchTools API endpoints.
 * These intercept real API calls during tests and return mock data.
 */

import { http, HttpResponse } from 'msw';
import type { InventoryItem, InventoryItemDetail } from '../../utils/inventory-types';
import {
    createMockInventoryItem,
    createMockInventoryItemDetail,
    createMockItemTemplate,
    createMockPerson,
} from '../utils/test-data-factory';

// Base URL for ChurchTools API (from test environment)
const API_BASE_URL = 'https://test.church.tools/api';

/**
 * Default mock handlers for common API endpoints
 */
export const handlers = [
    // Get all inventory items
    http.get(`${API_BASE_URL}/modules/testfkoinventorymanagement/items`, () => {
        return HttpResponse.json({
            data: [
                createMockInventoryItem({ id: 1, name: 'Test Item 1' }),
                createMockInventoryItem({ id: 2, name: 'Test Item 2' }),
                createMockInventoryItem({ id: 3, name: 'Test Item 3' }),
            ],
        });
    }),

    // Get single inventory item
    http.get(`${API_BASE_URL}/modules/testfkoinventorymanagement/items/:id`, ({ params }) => {
        const id = String(params['id'] ?? '1');
        return HttpResponse.json({
            data: createMockInventoryItemDetail({
                id: Number(id),
                name: `Test Item ${id}`,
            }),
        });
    }),

    // Create inventory item
    http.post(`${API_BASE_URL}/modules/testfkoinventorymanagement/items`, async ({ request }) => {
        const body = (await request.json()) as Partial<InventoryItem>;
        return HttpResponse.json({
            data: createMockInventoryItem({
                id: Math.floor(Math.random() * 10000),
                ...body,
            }),
        }, { status: 201 });
    }),

    // Update inventory item
    http.patch(`${API_BASE_URL}/modules/testfkoinventorymanagement/items/:id`, async ({ params, request }) => {
        const id = String(params['id'] ?? '1');
        const body = (await request.json()) as Partial<InventoryItemDetail>;
        return HttpResponse.json({
            data: createMockInventoryItemDetail({
                id: Number(id),
                ...body,
            }),
        });
    }),

    // Delete inventory item
    http.delete(`${API_BASE_URL}/modules/testfkoinventorymanagement/items/:id`, () => {
        return new HttpResponse(null, { status: 204 });
    }),

    // Get all templates
    http.get(`${API_BASE_URL}/modules/testfkoinventorymanagement/templates`, () => {
        return HttpResponse.json({
            data: [
                createMockItemTemplate({ id: 1, name: 'Electronics' }),
                createMockItemTemplate({ id: 2, name: 'Furniture' }),
            ],
        });
    }),

    // Get single template
    http.get(`${API_BASE_URL}/modules/testfkoinventorymanagement/templates/:id`, ({ params }) => {
        const id = String(params['id'] ?? '1');
        return HttpResponse.json({
            data: createMockItemTemplate({
                id: Number(id),
                name: `Template ${id}`,
            }),
        });
    }),

    // Get persons (ChurchTools users)
    http.get(`${API_BASE_URL}/persons`, () => {
        return HttpResponse.json({
            data: [
                createMockPerson({ id: 4618, firstName: 'Test', lastName: 'User 1' }),
                createMockPerson({ id: 6465, firstName: 'Test', lastName: 'User 2' }),
            ],
        });
    }),

    // Get single person
    http.get(`${API_BASE_URL}/persons/:id`, ({ params }) => {
        const id = String(params['id'] ?? '1');
        return HttpResponse.json({
            data: createMockPerson({ id: Number(id) }),
        });
    }),
];

/**
 * Error handlers for testing error scenarios
 */
export const errorHandlers = {
    // 404 Not Found
    notFound: http.get(`${API_BASE_URL}/modules/testfkoinventorymanagement/items/:id`, () => {
        return HttpResponse.json(
            { error: 'Not found' },
            { status: 404 }
        );
    }),

    // 401 Unauthorized
    unauthorized: http.get(`${API_BASE_URL}/modules/testfkoinventorymanagement/items`, () => {
        return HttpResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        );
    }),

    // 500 Internal Server Error
    serverError: http.get(`${API_BASE_URL}/modules/testfkoinventorymanagement/items`, () => {
        return HttpResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }),

    // Network error
    networkError: http.get(`${API_BASE_URL}/modules/testfkoinventorymanagement/items`, () => {
        return HttpResponse.error();
    }),
};
