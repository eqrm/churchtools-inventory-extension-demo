/**
 * Reset Test Data Utility
 * 
 * This module provides utilities for destructive testing operations that reset
 * ChurchTools custom module data and categories. These operations are ONLY allowed
 * in test mode to prevent accidental data loss in development or production.
 * 
 * @module tests/utils/reset-test-data
 */

import { churchtoolsClient } from '@churchtools/churchtools-client';
import { getExtensionKey } from '../../utils/extensionKey';

/**
 * Error thrown when attempting destructive operations outside of test mode
 */
export class NotInTestModeError extends Error {
  constructor() {
    super(
      'Destructive test data operations are only allowed in test mode (VITEST=true). ' +
      'This safety check prevents accidental data loss in development or production environments.'
    );
    this.name = 'NotInTestModeError';
  }
}

/**
 * Validates that we are in test mode before allowing destructive operations
 * @throws {NotInTestModeError} If not in test mode
 */
function ensureTestMode(): string {
  const isTest = import.meta.env.VITEST === 'true' || import.meta.env.MODE === 'test';
  
  if (!isTest) {
    throw new NotInTestModeError();
  }

  // Double check the module key has 'test' prefix
  const moduleKey = getExtensionKey();
  if (!moduleKey.startsWith('test')) {
    throw new Error(
      `[Test Mode] Expected module key to start with "test" but received "${moduleKey}".`
    );
  }

  console.warn(
    `[DESTRUCTIVE OPERATION] Running in test mode with module key: ${moduleKey}. ` +
    `This will delete data from the custom module.`
  );

  return moduleKey;
}

interface Module {
  id: number;
  data?: Record<string, unknown>;
}

/**
 * Resets all custom module data for the test environment
 * 
 * This will delete ALL data stored in the ChurchTools custom module including:
 * - All categories
 * - All assets
 * - All bookings
 * - All maintenance records
 * - All stock take sessions
 * - All saved views
 * 
 * @throws {NotInTestModeError} If not in test mode
 * @returns Promise that resolves when reset is complete
 */
export async function resetCustomModuleData(): Promise<void> {
  const moduleKey = ensureTestMode();

  try {
    // Get the module ID
    const module = await churchtoolsClient.get<Module>(`/custommodules/${moduleKey}`);
    const moduleId = String(module.id);

    // Delete all module data by setting it to an empty object
    await churchtoolsClient.post(`/custommodules/${moduleKey}`, {
      data: {
        categories: [],
        assets: [],
        bookings: [],
        maintenanceRecords: [],
        maintenanceSchedules: [],
        stockTakeSessions: [],
        kits: [],
        savedViews: [],
        changeHistory: [],
        settings: {
          assetNumberPrefix: 'ASSET',
          locations: [],
        },
      },
    });

    console.warn(`[TEST DATA RESET] Successfully reset module data for ${moduleKey} (ID: ${moduleId})`);
  } catch (error) {
    console.error('[TEST DATA RESET] Failed to reset module data:', error);
    throw error;
  }
}

/**
 * Resets only the categories in the test custom module
 * 
 * This will delete all categories but preserve other data like assets, bookings, etc.
 * Useful for testing category-specific functionality.
 * 
 * @throws {NotInTestModeError} If not in test mode
 * @returns Promise that resolves when reset is complete
 */
export async function resetCategories(): Promise<void> {
  const moduleKey = ensureTestMode();

  try {
    // Get current data
    const module = await churchtoolsClient.get<Module>(`/custommodules/${moduleKey}`);
    const currentData: Record<string, unknown> = module.data || {};

    // Update with empty categories
    await churchtoolsClient.post(`/custommodules/${moduleKey}`, {
      data: {
        ...currentData,
        categories: [],
      },
    });

    console.warn(`[TEST DATA RESET] Successfully reset categories for ${moduleKey}`);
  } catch (error) {
    console.error('[TEST DATA RESET] Failed to reset categories:', error);
    throw error;
  }
}

/**
 * Resets only the assets in the test custom module
 * 
 * This will delete all assets but preserve categories, bookings, etc.
 * Useful for testing asset-specific functionality.
 * 
 * @throws {NotInTestModeError} If not in test mode
 * @returns Promise that resolves when reset is complete
 */
export async function resetAssets(): Promise<void> {
  const moduleKey = ensureTestMode();

  try {
    // Get current data
    const module = await churchtoolsClient.get<Module>(`/custommodules/${moduleKey}`);
    const currentData: Record<string, unknown> = module.data || {};

    // Update with empty assets
    await churchtoolsClient.post(`/custommodules/${moduleKey}`, {
      data: {
        ...currentData,
        assets: [],
        changeHistory: [], // Also clear change history since it references assets
      },
    });

    console.warn(`[TEST DATA RESET] Successfully reset assets for ${moduleKey}`);
  } catch (error) {
    console.error('[TEST DATA RESET] Failed to reset assets:', error);
    throw error;
  }
}

/**
 * Resets only the bookings in the test custom module
 * 
 * This will delete all bookings but preserve assets, categories, etc.
 * Useful for testing booking-specific functionality.
 * 
 * @throws {NotInTestModeError} If not in test mode
 * @returns Promise that resolves when reset is complete
 */
export async function resetBookings(): Promise<void> {
  const moduleKey = ensureTestMode();

  try {
    // Get current data
    const module = await churchtoolsClient.get<Module>(`/custommodules/${moduleKey}`);
    const currentData: Record<string, unknown> = module.data || {};

    // Update with empty bookings
    await churchtoolsClient.post(`/custommodules/${moduleKey}`, {
      data: {
        ...currentData,
        bookings: [],
      },
    });

    console.warn(`[TEST DATA RESET] Successfully reset bookings for ${moduleKey}`);
  } catch (error) {
    console.error('[TEST DATA RESET] Failed to reset bookings:', error);
    throw error;
  }
}

/**
 * Creates audio equipment test category
 */
function createAudioCategory() {
  return {
    id: 'cat-audio-001',
    name: 'Audio Equipment',
    icon: 'IconMicrophone',
    customFields: [
      {
        id: 'cf-audio-001',
        name: 'Connector Type',
        type: 'select' as const,
        options: ['XLR', 'TRS', 'TS', 'RCA', 'USB'],
        required: false,
      },
      {
        id: 'cf-audio-002',
        name: 'Impedance',
        type: 'text' as const,
        required: false,
      },
    ],
  };
}

/**
 * Creates video equipment test category
 */
function createVideoCategory() {
  return {
    id: 'cat-video-001',
    name: 'Video Equipment',
    icon: 'IconVideo',
    customFields: [
      {
        id: 'cf-video-001',
        name: 'Resolution',
        type: 'select' as const,
        options: ['720p', '1080p', '4K', '8K'],
        required: false,
      },
      {
        id: 'cf-video-002',
        name: 'Frame Rate',
        type: 'number' as const,
        required: false,
      },
    ],
  };
}

/**
 * Creates lighting equipment test category
 */
function createLightingCategory() {
  return {
    id: 'cat-lighting-001',
    name: 'Lighting Equipment',
    icon: 'IconBulb',
    customFields: [
      {
        id: 'cf-lighting-001',
        name: 'Wattage',
        type: 'number' as const,
        required: false,
      },
      {
        id: 'cf-lighting-002',
        name: 'Color Temperature',
        type: 'number' as const,
        required: false,
      },
    ],
  };
}

/**
 * Creates sample test categories
 * @returns Array of test categories
 */
function createTestCategories() {
  return [
    createAudioCategory(),
    createVideoCategory(),
    createLightingCategory(),
  ];
}

/**
 * Seeds the test custom module with sample data for testing
 * 
 * Creates a standard set of test data including:
 * - 3 categories (Audio, Video, Lighting)
 * - Sample custom fields
 * - Predefined locations
 * 
 * @throws {NotInTestModeError} If not in test mode
 * @returns Promise that resolves when seeding is complete
 */
export async function seedTestData(): Promise<void> {
  const moduleKey = ensureTestMode();

  try {
    const testData = {
      categories: createTestCategories(),
      assets: [],
      bookings: [],
      maintenanceRecords: [],
      maintenanceSchedules: [],
      stockTakeSessions: [],
      kits: [],
      savedViews: [],
      changeHistory: [],
      settings: {
        assetNumberPrefix: 'TEST',
        locations: ['Main Stage', 'Storage Room', 'Chapel', 'Youth Room'],
      },
    };

    await churchtoolsClient.post(`/custommodules/${moduleKey}`, {
      data: testData,
    });

    console.warn(`[TEST DATA SEED] Successfully seeded test data for ${moduleKey}`);
  } catch (error) {
    console.error('[TEST DATA SEED] Failed to seed test data:', error);
    throw error;
  }
}
