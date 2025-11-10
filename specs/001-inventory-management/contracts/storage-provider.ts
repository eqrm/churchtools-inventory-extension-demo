/**
 * Storage Provider Interface
 * 
 * This is the core abstraction layer for all data operations in the inventory system.
 * Implementations can target ChurchTools Custom Modules API, offline IndexedDB, or
 * future backend systems.
 * 
 * @module contracts/storage-provider
 */

import type {
  Asset,
  AssetCreate,
  AssetUpdate,
  AssetFilters,
  AssetCategory,
  AssetTypeCreate,
  AssetTypeUpdate,
  Booking,
  BookingCreate,
  BookingUpdate,
  BookingFilters,
  Kit,
  KitCreate,
  KitUpdate,
  MaintenanceRecord,
  MaintenanceRecordCreate,
  MaintenanceSchedule,
  MaintenanceScheduleCreate,
  StockTakeSession,
  StockTakeSessionCreate,
  ChangeHistoryEntry,
  SavedView,
  SavedViewCreate,
  PersonInfo
} from './entities'

/**
 * Core storage provider interface
 * All methods return Promises to support both sync and async implementations
 */
export interface IStorageProvider {
  // ============================================================================
  // Asset Categories
  // ============================================================================
  
  /**
   * Get all asset categories
   * @returns Array of all categories
   */
  getAssetTypes(): Promise<AssetCategory[]>
  
  /**
   * Get a single category by ID
   * @param id - Category ID
   * @returns Category or null if not found
   */
  getAssetType(id: string): Promise<AssetCategory | null>
  
  /**
   * Create a new asset category
   * @param category - Category data without ID
   * @returns Created category with generated ID
   */
  createAssetType(category: AssetTypeCreate): Promise<AssetCategory>
  
  /**
   * Update an existing category
   * @param id - Category ID
   * @param category - Partial category data to update
   * @returns Updated category
   */
  updateAssetType(id: string, category: AssetTypeUpdate): Promise<AssetCategory>
  
  /**
   * Delete a category
   * Note: Should fail if assets exist in this category
   * @param id - Category ID
   */
  deleteAssetType(id: string): Promise<void>
  
  // ============================================================================
  // Assets
  // ============================================================================
  
  /**
   * Get assets with optional filtering
   * @param filters - Optional filter criteria
   * @returns Array of matching assets
   */
  getAssets(filters?: AssetFilters): Promise<Asset[]>
  
  /**
   * Get a single asset by ID
   * @param id - Asset ID
   * @returns Asset or null if not found
   */
  getAsset(id: string): Promise<Asset | null>
  
  /**
   * Get an asset by its asset number (barcode/QR code)
   * @param assetNumber - Asset number (e.g., "SOUND-001")
   * @returns Asset or null if not found
   */
  getAssetByNumber(assetNumber: string): Promise<Asset | null>
  
  /**
   * Create a new asset
   * Generates asset number if not provided
   * Creates barcode/QR code data
   * @param asset - Asset data without ID
   * @returns Created asset with generated ID and asset number
   */
  createAsset(asset: AssetCreate): Promise<Asset>
  
  /**
   * Create multiple child assets from a parent
   * Used for bulk asset creation (e.g., 10 identical microphones)
   * @param parentAsset - Parent asset data
   * @param quantity - Number of child assets to create
   * @returns Array of created assets (parent + children)
   */
  createMultiAsset(parentAsset: AssetCreate, quantity: number): Promise<Asset[]>
  
  /**
   * Update an existing asset
   * @param id - Asset ID
   * @param asset - Partial asset data to update
   * @returns Updated asset
   */
  updateAsset(id: string, asset: AssetUpdate): Promise<Asset>
  
  /**
   * Delete an asset
   * Note: Should update status to 'destroyed' rather than hard delete for audit trail
   * @param id - Asset ID
   */
  deleteAsset(id: string): Promise<void>
  
  /**
   * Search assets by name, manufacturer, model, or asset number
   * @param query - Search query string
   * @returns Array of matching assets
   */
  searchAssets(query: string): Promise<Asset[]>
  
  // ============================================================================
  // Bookings
  // ============================================================================
  
  /**
   * Get bookings with optional filtering
   * @param filters - Optional filter criteria
   * @returns Array of matching bookings
   */
  getBookings(filters?: BookingFilters): Promise<Booking[]>
  
  /**
   * Get a single booking by ID
   * @param id - Booking ID
   * @returns Booking or null if not found
   */
  getBooking(id: string): Promise<Booking | null>
  
  /**
   * Get bookings for a specific asset
   * @param assetId - Asset ID
   * @param dateRange - Optional date range filter
   * @returns Array of bookings for the asset
   */
  getBookingsForAsset(assetId: string, dateRange?: { start: string; end: string }): Promise<Booking[]>
  
  /**
   * Check if an asset is available for a date range
   * @param assetId - Asset ID
   * @param startDate - Start date (ISO 8601)
   * @param endDate - End date (ISO 8601)
   * @returns True if available, false if booked
   */
  isAssetAvailable(assetId: string, startDate: string, endDate: string): Promise<boolean>
  
  /**
   * Create a new booking
   * Validates availability before creating
   * @param booking - Booking data without ID
   * @returns Created booking with generated ID
   * @throws Error if asset is not available
   */
  createBooking(booking: BookingCreate): Promise<Booking>
  
  /**
   * Update a booking
   * @param id - Booking ID
   * @param booking - Partial booking data to update
   * @returns Updated booking
   */
  updateBooking(id: string, booking: BookingUpdate): Promise<Booking>
  
  /**
   * Cancel a booking
   * @param id - Booking ID
   * @param reason - Optional cancellation reason
   */
  cancelBooking(id: string, reason?: string): Promise<void>
  
  /**
   * Check out an asset (start booking)
   * Updates booking status to 'active' and asset status to 'in-use'
   * @param bookingId - Booking ID
   * @param conditionAssessment - Optional condition check on checkout
   * @returns Updated booking
   */
  checkOut(bookingId: string, conditionAssessment?: any): Promise<Booking>
  
  /**
   * Check in an asset (complete booking)
   * Updates booking status to 'completed' and asset status to 'available'
   * @param bookingId - Booking ID
   * @param conditionAssessment - Condition check on checkin
   * @returns Updated booking
   */
  checkIn(bookingId: string, conditionAssessment: any): Promise<Booking>
  
  // ============================================================================
  // Kits
  // ============================================================================
  
  /**
   * Get all equipment kits
   * @returns Array of all kits
   */
  getKits(): Promise<Kit[]>
  
  /**
   * Get a single kit by ID
   * @param id - Kit ID
   * @returns Kit or null if not found
   */
  getKit(id: string): Promise<Kit | null>
  
  /**
   * Create a new kit
   * @param kit - Kit data without ID
   * @returns Created kit with generated ID
   */
  createKit(kit: KitCreate): Promise<Kit>
  
  /**
   * Update a kit
   * @param id - Kit ID
   * @param kit - Partial kit data to update
   * @returns Updated kit
   */
  updateKit(id: string, kit: KitUpdate): Promise<Kit>
  
  /**
   * Delete a kit
   * @param id - Kit ID
   */
  deleteKit(id: string): Promise<void>
  
  /**
   * Check if a kit is available for a date range
   * For fixed kits: checks all bound assets
   * For flexible kits: checks if sufficient assets available in pools
   * @param kitId - Kit ID
   * @param startDate - Start date (ISO 8601)
   * @param endDate - End date (ISO 8601)
   * @returns Availability information
   */
  isKitAvailable(kitId: string, startDate: string, endDate: string): Promise<{
    available: boolean
    unavailableAssets?: string[]  // Asset IDs that are booked
    reason?: string
  }>
  
  // ============================================================================
  // Maintenance
  // ============================================================================
  
  /**
   * Get maintenance records for an asset
   * @param assetId - Asset ID
   * @returns Array of maintenance records
   */
  getMaintenanceRecords(assetId: string): Promise<MaintenanceRecord[]>
  
  /**
   * Create a maintenance record
   * Updates asset's next maintenance due date if schedule exists
   * @param record - Maintenance record data without ID
   * @returns Created maintenance record
   */
  createMaintenanceRecord(record: MaintenanceRecordCreate): Promise<MaintenanceRecord>
  
  /**
   * Get maintenance schedule for an asset
   * @param assetId - Asset ID
   * @returns Maintenance schedule or null if not configured
   */
  getMaintenanceSchedule(assetId: string): Promise<MaintenanceSchedule | null>
  
  /**
   * Create or update maintenance schedule for an asset
   * @param schedule - Maintenance schedule data
   * @returns Created/updated maintenance schedule
   */
  setMaintenanceSchedule(schedule: MaintenanceScheduleCreate): Promise<MaintenanceSchedule>
  
  /**
   * Get all assets with overdue maintenance
   * @returns Array of assets requiring maintenance
   */
  getOverdueMaintenance(): Promise<Asset[]>
  
  /**
   * Get all assets with maintenance due within specified days
   * @param daysAhead - Number of days to look ahead
   * @returns Array of assets with upcoming maintenance
   */
  getUpcomingMaintenance(daysAhead: number): Promise<Asset[]>
  
  // ============================================================================
  // Stock Take
  // ============================================================================
  
  /**
   * Create a new stock take session
   * Loads expected assets based on scope
   * @param session - Stock take session data without ID
   * @returns Created session with loaded expected assets
   */
  createStockTakeSession(session: StockTakeSessionCreate): Promise<StockTakeSession>
  
  /**
   * Get a stock take session by ID
   * @param id - Session ID
   * @returns Session or null if not found
   */
  getStockTakeSession(id: string): Promise<StockTakeSession | null>
  
  /**
   * Add a scanned asset to a stock take session
   * @param sessionId - Session ID
   * @param assetId - Asset ID
   * @param scannedBy - Person ID
   * @param location - Optional location update
   * @returns Updated session
   */
  addStockTakeScan(
    sessionId: string,
    assetId: string,
    scannedBy: string,
    location?: string
  ): Promise<StockTakeSession>
  
  /**
   * Complete a stock take session
   * Generates discrepancy report
   * @param sessionId - Session ID
   * @returns Completed session with discrepancies
   */
  completeStockTakeSession(sessionId: string): Promise<StockTakeSession>
  
  /**
   * Cancel a stock take session
   * @param sessionId - Session ID
   */
  cancelStockTakeSession(sessionId: string): Promise<void>
  
  // ============================================================================
  // Change History / Audit Trail
  // ============================================================================
  
  /**
   * Get change history for an entity
   * @param entityType - Type of entity
   * @param entityId - Entity ID
   * @param limit - Optional limit on number of entries
   * @returns Array of change history entries
   */
  getChangeHistory(
    entityType: 'asset' | 'category' | 'booking' | 'kit' | 'maintenance' | 'stocktake',
    entityId: string,
    limit?: number
  ): Promise<ChangeHistoryEntry[]>
  
  /**
   * Record a change history entry
   * Note: This is typically called internally by other methods
   * @param entry - Change history entry data
   */
  recordChange(entry: Omit<ChangeHistoryEntry, 'id' | 'changedAt'>): Promise<void>
  
  // ============================================================================
  // Saved Views
  // ============================================================================
  
  /**
   * Get saved views for a user
   * Includes both user's own views and public views
   * @param userId - Person ID
   * @returns Array of saved views
   */
  getSavedViews(userId: string): Promise<SavedView[]>
  
  /**
   * Create a saved view
   * @param view - Saved view data without ID
   * @returns Created saved view
   */
  createSavedView(view: SavedViewCreate): Promise<SavedView>
  
  /**
   * Update a saved view
   * @param id - View ID
   * @param view - Partial view data to update
   * @returns Updated saved view
   */
  updateSavedView(id: string, view: Partial<SavedView>): Promise<SavedView>
  
  /**
   * Delete a saved view
   * @param id - View ID
   */
  deleteSavedView(id: string): Promise<void>
  
  // ============================================================================
  // User/Person Information
  // ============================================================================
  
  /**
   * Get the current logged-in user's information
   * @returns Current user's person info
   */
  getCurrentUser(): Promise<PersonInfo>
  
  /**
   * Get person information by ID
   * Should use caching to minimize API calls
   * @param personId - Person ID from ChurchTools
   * @returns Person information
   */
  getPersonInfo(personId: string): Promise<PersonInfo>
  
  /**
   * Search for people by name
   * Used for person-reference custom fields
   * @param query - Search query
   * @returns Array of matching people
   */
  searchPeople(query: string): Promise<PersonInfo[]>
}

/**
 * Storage provider factory
 * Returns the appropriate storage provider based on configuration
 */
export interface IStorageProviderFactory {
  /**
   * Create a storage provider instance
   * @param config - Configuration options
   * @returns Storage provider instance
   */
  createProvider(config: StorageProviderConfig): IStorageProvider
}

/**
 * Configuration for storage provider
 */
export interface StorageProviderConfig {
  /**
   * Provider type
   */
  type: 'churchtools' | 'offline' | 'mock'
  
  /**
   * ChurchTools-specific config
   */
  churchtools?: {
    moduleId: string              // Custom module ID
    baseUrl: string               // ChurchTools base URL
    apiClient: any                // ChurchTools API client instance
  }
  
  /**
   * Offline-specific config
   */
  offline?: {
    dbName: string                // IndexedDB database name
    version: number               // Schema version
  }
  
  /**
   * Mock-specific config (for testing)
   */
  mock?: {
    initialData?: any             // Pre-populated mock data
  }
}
