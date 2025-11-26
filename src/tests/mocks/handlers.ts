/**
 * MSW Mock Handlers
 * 
 * Mock HTTP handlers for ChurchTools API endpoints.
 * These intercept real API calls during tests and return mock data.
 */

import { http, HttpResponse } from 'msw';
import { kvStoreHandlers, kvStoreErrorHandlers } from './kv-store-handlers';

// Base URL for ChurchTools API (matches VITE_BASE_URL in .env)
const API_BASE_URL = 'https://eqrm.church.tools/api';
const TEST_MODULE_ID = 123;
const TEST_MODULE_KEY = 'testfkoinventorymanagement';

// Helper to wrap asset data in the Custom Modules API format
const createMockDataValue = (asset: Record<string, unknown>, categoryId: number) => ({
    id: asset['id'],
    dataCategoryId: categoryId,
    value: JSON.stringify(asset),
    sortKey: 0,
});

// Helper to wrap category data
const createMockCategory = (id: number, name: string, icon: string = 'box') => ({
    id,
    name,
    description: icon,
    data: JSON.stringify({ customFields: [] }),
    sortKey: 0,
});

/**
 * Default mock handlers for common API endpoints
 */
export const handlers = [
    // 1. Get Module ID by Key
    http.get(`${API_BASE_URL}/custommodules/${TEST_MODULE_KEY}`, () => {
        return HttpResponse.json({
            id: TEST_MODULE_ID,
            shorty: TEST_MODULE_KEY,
            name: 'Inventory Test',
            description: 'Test Module',
        });
    }),

    // 2. Get Data Categories (Asset Types)
    http.get(`${API_BASE_URL}/custommodules/${TEST_MODULE_ID}/customdatacategories`, () => {
        return HttpResponse.json([
            createMockCategory(1, 'Electronics', 'monitor'),
            createMockCategory(2, 'Furniture', 'chair'),
        ]);
    }),

    // Create Data Category
    http.post(`${API_BASE_URL}/custommodules/${TEST_MODULE_ID}/customdatacategories`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        const newCategory = createMockCategory(
            Math.floor(Math.random() * 1000),
            body['name'] as string,
            body['description'] as string
        );
        return HttpResponse.json(newCategory, { status: 201 });
    }),

    // 3. Get Data Values (Assets) for Electronics
    http.get(`${API_BASE_URL}/custommodules/${TEST_MODULE_ID}/customdatacategories/1/customdatavalues`, () => {
        const assets = [
            {
                id: 101,
                name: 'Test Item 1',
                assetNumber: 'CHT-001',
                status: 'available',
                assetType: { id: 1, name: 'Electronics', icon: 'monitor' },
                customFieldValues: {},
                barcode: 'CHT-001',
                qrCode: 'CHT-001',
            },
            {
                id: 102,
                name: 'Test Item 2',
                assetNumber: 'CHT-002',
                status: 'in_use',
                assetType: { id: 1, name: 'Electronics', icon: 'monitor' },
                customFieldValues: {},
                barcode: 'CHT-002',
                qrCode: 'CHT-002',
            },
        ];
        return HttpResponse.json(assets.map(a => createMockDataValue(a, 1)));
    }),

    // 4. Get Data Values (Assets) for Furniture
    http.get(`${API_BASE_URL}/custommodules/${TEST_MODULE_ID}/customdatacategories/2/customdatavalues`, () => {
        const assets = [
            {
                id: 201,
                name: 'Test Item 3',
                assetNumber: 'CHT-003',
                status: 'available',
                assetType: { id: 2, name: 'Furniture', icon: 'chair' },
                customFieldValues: {},
                barcode: 'CHT-003',
                qrCode: 'CHT-003',
            },
        ];
        return HttpResponse.json(assets.map(a => createMockDataValue(a, 2)));
    }),

    // 5. Create Data Value (Asset)
    http.post(`${API_BASE_URL}/custommodules/${TEST_MODULE_ID}/customdatacategories/:categoryId/customdatavalues`, async ({ request, params }) => {
        const categoryId = Number(params['categoryId']);
        const body = (await request.json()) as Record<string, unknown>;
        // Extract the inner value if it's wrapped
        const innerValue = typeof body['value'] === 'string' ? JSON.parse(body['value'] as string) : body;
        
        const newAsset = {
            id: Math.floor(Math.random() * 10000),
            ...innerValue,
        };
        
        return HttpResponse.json(createMockDataValue(newAsset, categoryId), { status: 201 });
    }),

    // 6. Update Data Value (Asset)
    http.put(`${API_BASE_URL}/custommodules/${TEST_MODULE_ID}/customdatacategories/:categoryId/customdatavalues/:valueId`, async ({ request, params }) => {
        const categoryId = Number(params['categoryId']);
        const valueId = Number(params['valueId']);
        const body = (await request.json()) as Record<string, unknown>;
        
        // The body might be the wrapper { dataCategoryId, value: "..." } or just the value depending on client
        // ChurchToolsAPIClient sends the wrapper usually? No, let's check.
        // updateDataValue sends `data`.
        
        // For simplicity, we just return what would be the updated object.
        // We assume the client sends the wrapper or the value.
        
        // If body has 'value' property that is a string, it's the wrapper.
        let assetData = {};
        if (body['value'] && typeof body['value'] === 'string') {
             assetData = JSON.parse(body['value'] as string);
        } else {
             assetData = body;
        }

        const updatedAsset = {
            id: valueId,
            ...assetData,
        };

        return HttpResponse.json(createMockDataValue(updatedAsset, categoryId));
    }),

    // Get persons (ChurchTools users)
    http.get(`${API_BASE_URL}/persons`, () => {
        return HttpResponse.json({
            data: [
                { id: 4618, firstName: 'Test', lastName: 'User 1' },
                { id: 6465, firstName: 'Test', lastName: 'User 2' },
            ],
        });
    }),

    // Get single person
    http.get(`${API_BASE_URL}/persons/:id`, ({ params }) => {
        const id = Number(params['id']);
        return HttpResponse.json({
            data: { id, firstName: 'Test', lastName: 'User' },
        });
    }),

    // Get current user (whoami)
    http.get(`${API_BASE_URL}/whoami`, () => {
        return HttpResponse.json({
            id: 1,
            firstName: 'Test',
            lastName: 'Admin',
            email: 'admin@example.com',
            imageUrl: null,
        });
    }),

    // Login
    http.post(`${API_BASE_URL}/login`, () => {
        return HttpResponse.json({
            data: {
                id: 1,
                status: 'success',
            }
        });
    }),

    // Include KV Store handlers
    ...kvStoreHandlers,
];

/**
 * Error handlers for testing error scenarios
 */
export const errorHandlers = {
    // ... (keep existing structure if needed, but updated for new paths)
    // For now, I'll leave this empty or minimal as we are fixing the happy path first
    networkError: http.get(`${API_BASE_URL}/custommodules/${TEST_MODULE_ID}/customdatacategories`, () => {
        return HttpResponse.error();
    }),
    
    kvStore: kvStoreErrorHandlers,
};

