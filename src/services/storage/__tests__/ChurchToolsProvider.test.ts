/**
 * Integration tests for ChurchToolsStorageProvider
 * 
 * These tests verify the integration between the storage provider
 * and the ChurchTools API client.
 * 
 * Note: These are integration tests that may require a test ChurchTools instance.
 * For CI/CD, consider using mocked API responses or a test server.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ChurchToolsStorageProvider } from '../ChurchToolsProvider';
import type { ChurchToolsAPIClient } from '../../api/ChurchToolsAPIClient';

// Mock ChurchTools API Client
const createMockAPIClient = (): ChurchToolsAPIClient => {
  // In-memory storage for mock data
  const categories: Map<string, Record<string, unknown>> = new Map();
  const dataValues: Map<string, Map<string, Record<string, unknown>>> = new Map(); // assetTypeId -> { dataValueId -> dataValue }
  let nextId = 1;

  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    getCurrentUser: vi.fn().mockResolvedValue({
      id: 'user-123',
      firstName: 'Test',
      lastName: 'User',
      name: 'Test User',
      email: 'test@example.com',
    }),
    getDataCategories: vi.fn().mockImplementation(async (moduleId) => {
      return Array.from(categories.values()).filter(cat => cat.customModuleId === Number(moduleId));
    }),
    getDataCategory: vi.fn().mockImplementation(async (moduleId, assetTypeId) => {
      return categories.get(assetTypeId) || null;
    }),
    createDataCategory: vi.fn().mockImplementation(async (moduleId, data) => {
      const id = String(nextId++);
      const category = {
        id,
        ...data,
        customModuleId: Number(moduleId),
      };
      categories.set(id, category);
      dataValues.set(id, new Map()); // Initialize empty data values for this category
      return category;
    }),
    updateDataCategory: vi.fn().mockImplementation(async (moduleId, assetTypeId, data) => {
      const existing = categories.get(assetTypeId);
      if (!existing) {
        throw new Error(`Category ${assetTypeId} not found`);
      }
      const updated = { ...existing, ...data };
      categories.set(assetTypeId, updated);
      return updated;
    }),
    deleteDataCategory: vi.fn().mockImplementation(async (moduleId, assetTypeId) => {
      if (!categories.has(assetTypeId)) {
        throw new Error(`Category ${assetTypeId} not found`);
      }
      categories.delete(assetTypeId);
      dataValues.delete(assetTypeId);
    }),
    getDataValues: vi.fn().mockImplementation(async (moduleId, assetTypeId) => {
      const categoryData = dataValues.get(assetTypeId);
      if (!categoryData) {
        return [];
      }
      return Array.from(categoryData.values());
    }),
    getDataValue: vi.fn().mockImplementation(async (moduleId, assetTypeId, dataValueId) => {
      const categoryData = dataValues.get(assetTypeId);
      if (!categoryData || !categoryData.has(dataValueId)) {
        throw new Error(`Data value ${dataValueId} not found`);
      }
      const value = categoryData.get(dataValueId);
      if (!value) {
        throw new Error(`Data value ${dataValueId} not found`);
      }
      return value;
    }),
    createDataValue: vi.fn().mockImplementation(async (moduleId, assetTypeId, data) => {
      if (!categories.has(assetTypeId)) {
        throw new Error(`Category ${assetTypeId} not found`);
      }
      const id = String(nextId++);
      const dataValue = {
        id,
        dataCategoryId: Number(assetTypeId),
        ...data,
      };
      let categoryData = dataValues.get(assetTypeId);
      if (!categoryData) {
        categoryData = new Map();
        dataValues.set(assetTypeId, categoryData);
      }
      categoryData.set(id, dataValue);
      return dataValue;
    }),
    updateDataValue: vi.fn().mockImplementation(async (moduleId, assetTypeId, dataValueId, data) => {
      const categoryData = dataValues.get(assetTypeId);
      if (!categoryData || !categoryData.has(dataValueId)) {
        throw new Error(`Data value ${dataValueId} not found`);
      }
      const existing = categoryData.get(dataValueId);
      if (!existing) {
        throw new Error(`Data value ${dataValueId} not found`);
      }
      const updated = { ...existing, ...data };
      categoryData.set(dataValueId, updated);
      return updated;
    }),
    deleteDataValue: vi.fn().mockImplementation(async (moduleId, assetTypeId, dataValueId) => {
      const categoryData = dataValues.get(assetTypeId);
      if (!categoryData || !categoryData.has(dataValueId)) {
        throw new Error(`Data value ${dataValueId} not found`);
      }
      categoryData.delete(dataValueId);
    }),
  } as unknown as ChurchToolsAPIClient;
};

describe('ChurchToolsStorageProvider Integration Tests', () => {
  let provider: ChurchToolsStorageProvider;
  let mockAPIClient: ChurchToolsAPIClient;
  const moduleId = 'test-module-123';

  beforeEach(() => {
    mockAPIClient = createMockAPIClient();
    provider = new ChurchToolsStorageProvider(moduleId, mockAPIClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Asset Categories', () => {
    it('should fetch all categories excluding change history', async () => {
      const mockCategories = [
        {
          id: 'cat-1',
          name: 'Audio Equipment',
          shorty: 'audio_123',
          data: JSON.stringify([
            { id: 'field-1', name: 'Brand', type: 'text', required: false },
          ]),
        },
        {
          id: 'cat-2',
          name: '__ChangeHistory__',
          shorty: 'history',
          data: null,
        },
      ];

      vi.mocked(mockAPIClient.getDataCategories).mockResolvedValue(mockCategories);

      const categories = await provider.getAssetTypes();

      expect(categories).toHaveLength(1);
      expect(categories[0].name).toBe('Audio Equipment');
      expect(categories[0].customFields).toHaveLength(1);
      expect(mockAPIClient.getDataCategories).toHaveBeenCalledWith(moduleId);
    });

    it.skip('should create category with custom fields', async () => {
      const mockCreatedCategory = {
        id: 'cat-new',
        name: 'Video Equipment',
        shorty: 'video_456',
        data: JSON.stringify([
          { id: 'field-1', name: 'Resolution', type: 'select', required: true, options: ['HD', '4K'] },
        ]),
      };

      vi.mocked(mockAPIClient.createDataCategory).mockResolvedValue(mockCreatedCategory);

      const categoryData = {
        name: 'Video Equipment',
        icon: 'Camera',
        customFields: [
          {
            id: 'field-1',
            name: 'Resolution',
            type: 'select' as const,
            required: true,
            options: ['HD', '4K'],
          },
        ],
      };

      const category = await provider.createAssetType(categoryData);

      expect(category.name).toBe('Video Equipment');
      expect(category.customFields).toHaveLength(1);
      expect(category.customFields[0].name).toBe('Resolution');
      expect(mockAPIClient.createDataCategory).toHaveBeenCalled();
    });

    it('should delete empty category', async () => {
      vi.mocked(mockAPIClient.getDataValues).mockResolvedValue([]);
      vi.mocked(mockAPIClient.deleteDataCategory).mockResolvedValue(undefined);

      await provider.deleteAssetType('cat-1');

      expect(mockAPIClient.deleteDataCategory).toHaveBeenCalledWith(moduleId, 'cat-1');
    });

    it.skip('should throw error when deleting category with assets', async () => {
      vi.mocked(mockAPIClient.getDataValues).mockResolvedValue([
        { id: 'asset-1', data: {} },
      ]);

      await expect(provider.deleteAssetType('cat-1')).rejects.toThrow(
        'Cannot delete category with existing assets'
      );
    });
  });

  describe('Assets', () => {
    it.skip('should fetch all assets with filters', async () => {
      const mockAssets = [
        {
          id: 'asset-1',
          data: JSON.stringify({
            assetTypeId: 'cat-1',
            name: 'Camera A',
            assetNumber: '00001',
            status: 'available',
            location: 'Storage Room A',
          }),
        },
        {
          id: 'asset-2',
          data: JSON.stringify({
            assetTypeId: 'cat-1',
            name: 'Camera B',
            assetNumber: '00002',
            status: 'in-use',
            location: 'Storage Room B',
          }),
        },
      ];

      vi.mocked(mockAPIClient.getDataValues).mockResolvedValue(mockAssets);

      const assets = await provider.getAssets({ assetTypeId: 'cat-1' });

      expect(assets).toHaveLength(2);
      expect(assets[0].name).toBe('Camera A');
      expect(assets[1].name).toBe('Camera B');
    });

    it.skip('should create asset with auto-generated number', async () => {
      const mockCreatedAsset = {
        id: 'asset-new',
        data: JSON.stringify({
          assetTypeId: 'cat-1',
          name: 'New Camera',
          assetNumber: '00003',
          status: 'available',
          customFields: {},
        }),
      };

      vi.mocked(mockAPIClient.createDataValue).mockResolvedValue(mockCreatedAsset);
      vi.mocked(mockAPIClient.getDataValues).mockResolvedValue([]);

      const assetData = {
        category: { id: 'cat-1', name: 'Test Category' },
        name: 'New Camera',
        description: 'A test camera',
        manufacturer: 'Test Manufacturer',
        model: 'Test Model',
        status: 'available' as const,
        location: 'Test Location',
        bookable: true,
        isParent: false,
        customFieldValues: {},
      };

      const asset = await provider.createAsset(assetData);

      expect(asset.name).toBe('New Camera');
      expect(asset.assetNumber).toBe('00003');
      expect(mockAPIClient.createDataValue).toHaveBeenCalled();
    });

    it.skip('should update asset and invalidate cache', async () => {
      const mockUpdatedAsset = {
        id: 'asset-1',
        data: JSON.stringify({
          assetTypeId: 'cat-1',
          name: 'Updated Camera',
          assetNumber: '00001',
          status: 'broken',
        }),
      };

      vi.mocked(mockAPIClient.updateDataValue).mockResolvedValue(mockUpdatedAsset);

      const asset = await provider.updateAsset('asset-1', {
        status: 'broken',
      });

      expect(asset.status).toBe('broken');
      expect(mockAPIClient.updateDataValue).toHaveBeenCalledWith(
        moduleId,
        expect.any(String),
        'asset-1',
        expect.any(Object)
      );
    });

    it('should prevent deleting parent asset with children', async () => {
      const mockParentAsset = {
        id: 'asset-parent',
        data: JSON.stringify({
          isParent: true,
          childAssetIds: ['child-1', 'child-2'],
        }),
      };

      vi.mocked(mockAPIClient.getDataValue).mockResolvedValue(mockParentAsset);

      // Assuming EdgeCaseError is thrown
      await expect(provider.deleteAsset('asset-parent')).rejects.toThrow();
    });
  });

  describe('Bookings', () => {
    it('should fetch all bookings with filters', async () => {
      const mockBookings = [
        {
          id: 'booking-1',
          data: JSON.stringify({
            assetId: 'asset-1',
            startDate: '2025-10-25T09:00:00Z',
            endDate: '2025-10-25T17:00:00Z',
            status: 'approved',
            bookedBy: 'user-123',
            purpose: 'Sunday Service',
          }),
        },
      ];

      vi.mocked(mockAPIClient.getDataValues).mockResolvedValue(mockBookings);

      const bookings = await provider.getBookings({ status: 'approved' });

      expect(bookings).toHaveLength(1);
      expect(bookings[0].purpose).toBe('Sunday Service');
    });

    it.skip('should create booking and check availability', async () => {
      const mockCreatedBooking = {
        id: 'booking-new',
        data: JSON.stringify({
          assetId: 'asset-1',
          startDate: '2025-10-26T09:00:00Z',
          endDate: '2025-10-26T17:00:00Z',
          status: 'pending',
          bookedBy: 'user-123',
          purpose: 'Event',
        }),
      };

      vi.mocked(mockAPIClient.createDataValue).mockResolvedValue(mockCreatedBooking);
      vi.mocked(mockAPIClient.getDataValues).mockResolvedValue([]); // No conflicting bookings

      const bookingData = {
        assetId: 'asset-1',
        startDate: '2025-10-26T09:00:00Z',
        endDate: '2025-10-26T17:00:00Z',
        bookedById: 'user-123',
        bookingForId: 'user-123',
        bookingMode: 'date-range' as const,
        requestedBy: 'user-123',
        requestedByName: 'Test User',
        purpose: 'Event',
      };

      const booking = await provider.createBooking(bookingData);

      expect(booking.purpose).toBe('Event');
      expect(booking.status).toBe('pending');
    });

    it.skip('should check in booking with damage report', async () => {
      const mockBooking = {
        id: 'booking-1',
        data: JSON.stringify({
          assetId: 'asset-1',
          status: 'active',
        }),
      };

      const mockUpdatedBooking = {
        id: 'booking-1',
        data: JSON.stringify({
          assetId: 'asset-1',
          status: 'completed',
          checkedInAt: new Date().toISOString(),
        }),
      };

      vi.mocked(mockAPIClient.getDataValue).mockResolvedValue(mockBooking);
      vi.mocked(mockAPIClient.updateDataValue).mockResolvedValue(mockUpdatedBooking);

      const booking = await provider.checkIn('booking-1', {
        rating: 'damaged',
        notes: 'Lens scratched',
        photos: ['data:image/jpeg;base64,...'],
      });

      expect(booking.status).toBe('completed');
      // Verify maintenance record was created
      expect(mockAPIClient.createDataValue).toHaveBeenCalled();
    });
  });

  describe('Stock Take Sessions', () => {
    it('should create stock take session', async () => {
      const mockSession = {
        id: 'session-new',
        data: JSON.stringify({
          name: 'Q4 2025 Audit',
          startedBy: 'user-123',
          status: 'in-progress',
          scannedAssets: [],
        }),
      };

      vi.mocked(mockAPIClient.createDataValue).mockResolvedValue(mockSession);

      const sessionData = {
        status: 'active' as const,
        startDate: new Date().toISOString(),
        scope: { type: 'all' as const },
        conductedBy: 'user-123',
        conductedByName: 'Test User',
      };

      const session = await provider.createStockTakeSession(sessionData);

      expect(session.status).toBe('active');
      expect(session.scannedAssets).toEqual([]);
    });

    it('should add scan to session and detect duplicates', async () => {
      const mockSession = {
        id: 'session-1',
        data: JSON.stringify({
          scannedAssets: [
            {
              assetId: 'asset-1',
              scannedAt: '2025-10-21T10:00:00Z',
              scannedBy: 'user-123',
            },
          ],
        }),
      };

      vi.mocked(mockAPIClient.getDataValue).mockResolvedValue(mockSession);

      // Attempt to scan already-scanned asset
      await expect(
        provider.addStockTakeScan('session-1', 'asset-1', 'user-123')
      ).rejects.toThrow(); // Should throw EdgeCaseError with duplicate scan info
    });

    it.skip('should complete session and generate report', async () => {
      const mockSession = {
        id: 'session-1',
        data: JSON.stringify({
          status: 'in-progress',
          scannedAssets: [
            { assetId: 'asset-1', scannedAt: new Date().toISOString() },
          ],
        }),
      };

      const mockUpdatedSession = {
        id: 'session-1',
        data: JSON.stringify({
          status: 'completed',
          completedAt: new Date().toISOString(),
          foundCount: 1,
          missingCount: 0,
        }),
      };

      vi.mocked(mockAPIClient.getDataValue).mockResolvedValue(mockSession);
      vi.mocked(mockAPIClient.updateDataValue).mockResolvedValue(mockUpdatedSession);

      const session = await provider.completeStockTakeSession('session-1');

      expect(session.status).toBe('completed');
      expect(session.scannedAssets).toHaveLength(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      vi.mocked(mockAPIClient.getDataCategories).mockRejectedValue(
        new Error('Network error')
      );

      await expect(provider.getAssetTypes()).rejects.toThrow('Network error');
    });

    it('should handle not found errors', async () => {
      vi.mocked(mockAPIClient.getDataValue).mockResolvedValue(null);

      await expect(provider.getAsset('non-existent')).rejects.toThrow(
        'Asset with ID non-existent not found'
      );
    });

    it.skip('should handle malformed data gracefully', async () => {
      const mockMalformedAsset = {
        id: 'asset-bad',
        data: 'not valid json',
      };

      vi.mocked(mockAPIClient.getDataValues).mockResolvedValue([mockMalformedAsset]);

      // Should either skip malformed data or throw clear error
      await expect(provider.getAssets()).rejects.toThrow();
    });
  });

  describe('Performance', () => {
    it.skip('should batch API calls efficiently', async () => {
      const mockAssets = Array.from({ length: 100 }, (_, i) => ({
        id: `asset-${i}`,
        data: JSON.stringify({
          name: `Asset ${i}`,
          assetNumber: String(i).padStart(5, '0'),
        }),
      }));

      vi.mocked(mockAPIClient.getDataValues).mockResolvedValue(mockAssets);

      const assets = await provider.getAssets();

      expect(assets).toHaveLength(100);
      // Should only call API once, not 100 times
      expect(mockAPIClient.getDataValues).toHaveBeenCalledTimes(1);
    });
  });
});
