/**
 * Storage Provider Interface
 * 
 * This is the core abstraction layer for all data operations in the inventory system.
 * Implementations currently target the ChurchTools Custom Modules API and can be
 * adapted for future backend systems.
 * 
 * @module contracts/storage-provider
 */

import type {
  Asset,
  AssetCreate,
  AssetUpdate,
  AssetFilters,
  AssetType,
  AssetTypeCreate,
  AssetTypeUpdate,
  AssetGroup,
  AssetGroupCreate,
  AssetGroupUpdate,
  AssetGroupFilters,
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
  MaintenanceCalendarHold,
  StockTakeSession,
  StockTakeSessionCreate,
  StockTakeStatus,
  ChangeHistoryEntry,
  SavedView,
  SavedViewCreate,
  PersonInfo,
  UUID
} from './entities'
import type { AssetModel, AssetModelCreate, AssetModelUpdate } from './model'
import type {
  AssignmentCreateInput,
  AssignmentRecord,
  AssignmentTargetType,
  AssignmentUpdateInput,
} from './assignment'
import type {
  DamageReportCreateInput,
  DamageRepairInput,
  DamageReportRecord,
} from './damage'
import type { MasterDataEntity, MasterDataItem } from './masterData'

export interface GroupBookingCreate {
  groupId: UUID
  assetIds: UUID[]
  booking: Omit<BookingCreate, 'asset' | 'kit' | 'quantity' | 'allocatedChildAssets'>
  stopOnError?: boolean
}

export interface GroupBookingResult {
  successes: Array<{ assetId: UUID; booking: Booking }>
  failures: Array<{ assetId: UUID; error: string }>
}

/**
 * Core storage provider interface
 * All methods return Promises to support both sync and async implementations
 */
export interface IStorageProvider {
  // ============================================================================
  // Asset Types
  // ============================================================================
  
  /**
   * Get all asset types
   * @returns Array of all asset types
   */
  getAssetTypes(): Promise<AssetType[]>
  
  /**
   * Get a single asset type by ID
   * @param id - Asset type ID
   * @returns Asset type or null if not found
   */
  getAssetType(id: string): Promise<AssetType | null>
  
  /**
   * Create a new asset type
   * @param assetType - Asset type data without ID
   * @returns Created asset type with generated ID
   */
  createAssetType(assetType: AssetTypeCreate): Promise<AssetType>
  
  /**
   * Update an existing asset type
   * @param id - Asset type ID
   * @param assetType - Partial asset type data to update
   * @returns Updated asset type
   */
  updateAssetType(id: string, assetType: AssetTypeUpdate): Promise<AssetType>
  
  /**
   * Delete an asset type
   * Note: Should fail if assets exist for this type
   * @param id - Asset type ID
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
   * T282 - E2: Regenerate barcode for an asset
   * Archives old barcode and generates new one with timestamp or custom barcode
   * @param id - Asset ID
   * @param reason - Optional reason for regeneration
   * @param customBarcode - Optional custom barcode (if not provided, auto-generates)
   * @returns Updated asset with new barcode
   */
  regenerateAssetBarcode(id: string, reason?: string, customBarcode?: string): Promise<Asset>
  
  /**
   * Search assets by name, manufacturer, model, or asset number
   * @param query - Search query string
   * @returns Array of matching assets
   */
  searchAssets(query: string): Promise<Asset[]>
  
  // ============================================================================
  // Asset Groups
  // ============================================================================

  /**
   * List asset groups with optional filtering
   */
  getAssetGroups(filters?: AssetGroupFilters): Promise<AssetGroup[]>

  /**
   * Get a single asset group by ID
   */
  getAssetGroup(id: string): Promise<AssetGroup | null>

  /**
   * Create a new asset group definition
   */
  createAssetGroup(data: AssetGroupCreate): Promise<AssetGroup>

  /**
   * Update an existing asset group
   */
  updateAssetGroup(id: string, data: AssetGroupUpdate): Promise<AssetGroup>

  /**
   * Delete an asset group, optionally reassigning members
   */
  deleteAssetGroup(id: string, options?: { reassignAssets?: boolean }): Promise<void>

  /**
   * Associate an asset with a group
   */
  addAssetToGroup(assetId: string, groupId: string): Promise<Asset>

  /**
   * Remove an asset from its group
   */
  removeAssetFromGroup(assetId: string): Promise<Asset>

  /**
   * Remove all members while keeping the group definition
   */
  dissolveAssetGroup(id: string): Promise<AssetGroup>

  /**
   * Regenerate the barcode for an asset group using the shared reassignment flow
   */
  regenerateAssetGroupBarcode(id: string, reason?: string, customBarcode?: string): Promise<AssetGroup>

  /**
   * Move an asset from its current group to another group
   */
  reassignAssetToGroup(assetId: string, targetGroupId: string): Promise<Asset>

  /**
   * Bulk-create assets assigned to a group
   */
  bulkCreateAssetsForGroup(groupId: string, count: number, baseData?: Partial<AssetCreate>): Promise<Asset[]>

  /**
   * Apply updates to all members of an asset group
   */
  bulkUpdateGroupMembers(
    groupId: string,
    update: AssetUpdate,
    options?: { clearOverrides?: boolean }
  ): Promise<Asset[]>

  /**
   * Get all assets that are members of a group
   */
  getGroupMembers(groupId: string): Promise<Asset[]>

  /**
   * Resolve the value for a field, considering group inheritance
   */
  resolveAssetFieldValue(
    assetId: string,
    fieldKey: string
  ): Promise<{ value: unknown; source: 'group' | 'local' | 'override' }>

  // ============================================================================
  // Master Data
  // ============================================================================

  /**
   * Retrieve master data items for a given entity (locations, manufacturers, models, maintenance companies)
   */
  getMasterDataItems(entity: MasterDataEntity): Promise<MasterDataItem[]>

  /**
   * Create a new master data entry with the provided name
   */
  createMasterDataItem(entity: MasterDataEntity, name: string): Promise<MasterDataItem>

  /**
   * Update the name of a master data item
   */
  updateMasterDataItem(entity: MasterDataEntity, id: string, name: string): Promise<MasterDataItem>

  /**
   * Delete a master data entry
   */
  deleteMasterDataItem(entity: MasterDataEntity, id: string): Promise<void>

  /**
   * Manage module-level default prefix preference
   */
  setModuleDefaultPrefixId(prefixId: string | null): Promise<void>
  getModuleDefaultPrefixId(): Promise<string | null>

  /**
   * Manage personal default prefix preference for a given ChurchTools person
   */
  getPersonDefaultPrefixId(personId: string): Promise<string | null>
  setPersonDefaultPrefixId(personId: string, prefixId: string | null): Promise<void>

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
   * Create bookings for multiple assets within a group using shared booking data
   */
  createGroupBooking(request: GroupBookingCreate): Promise<GroupBookingResult>
  
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
   * Delete a booking record entirely
   * @param id - Booking ID
   */
  deleteBooking(id: string): Promise<void>
  
  /**
   * Check out an asset (start booking)
   * Updates booking status to 'active' and asset status to 'in-use'
   * @param bookingId - Booking ID
   * @param conditionAssessment - Optional condition check on checkout
   * @returns Updated booking
   */
  checkOut(bookingId: string, conditionAssessment?: unknown): Promise<Booking>
  
  /**
   * Check in an asset (complete booking)
   * Updates booking status to 'completed' and asset status to 'available'
   * @param bookingId - Booking ID
   * @param conditionAssessment - Condition check on checkin
   * @returns Updated booking
   */
  checkIn(bookingId: string, conditionAssessment: unknown): Promise<Booking>
  
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
  // Asset Models
  // ============================================================================

  /**
   * Get all asset model templates
   */
  getAssetModels(): Promise<AssetModel[]>

  /**
   * Get a single asset model by ID
   */
  getAssetModel(id: string): Promise<AssetModel | null>

  /**
   * Create a new asset model template
   */
  createAssetModel(data: AssetModelCreate): Promise<AssetModel>

  /**
   * Update an existing asset model
   */
  updateAssetModel(id: string, data: AssetModelUpdate): Promise<AssetModel>

  /**
   * Delete an asset model template
   */
  deleteAssetModel(id: string): Promise<void>

  // ============================================================================
  // Maintenance
  // ============================================================================
  
  /**
   * Get maintenance records, optionally filtered by asset
   * @param assetId - Optional asset ID to filter records
   * @returns Array of maintenance records
   */
  getMaintenanceRecords(assetId?: string): Promise<MaintenanceRecord[]>
  
  /**
   * Get a single maintenance record by ID
   * @param id - Record ID
   * @returns Maintenance record or null if not found
   */
  getMaintenanceRecord(id: string): Promise<MaintenanceRecord | null>
  
  /**
   * Create a maintenance record
   * Updates asset's next maintenance due date if schedule exists
   * @param record - Maintenance record data without ID
   * @returns Created maintenance record
   */
  createMaintenanceRecord(record: MaintenanceRecordCreate): Promise<MaintenanceRecord>
  
  /**
   * Update a maintenance record
   * @param id - Record ID
   * @param record - Partial record data to update
   * @returns Updated maintenance record
   */
  updateMaintenanceRecord(id: string, record: Partial<MaintenanceRecord>): Promise<MaintenanceRecord>

  /**
   * Delete a maintenance record (cleanup tooling)
   * @param id - Record ID
   */
  deleteMaintenanceRecord(id: string): Promise<void>
  
  /**
   * Get maintenance schedules, optionally filtered by asset
   * @param assetId - Optional asset ID to filter schedules
   * @returns Array of maintenance schedules
   */
  getMaintenanceSchedules(assetId?: string): Promise<MaintenanceSchedule[]>
  
  /**
   * Get maintenance schedule for an asset
   * @param assetId - Asset ID
   * @returns Maintenance schedule or null if not configured
   */
  getMaintenanceSchedule(assetId: string): Promise<MaintenanceSchedule | null>
  
  /**
   * Create a maintenance schedule
   * @param schedule - Maintenance schedule data
   * @returns Created maintenance schedule
   */
  createMaintenanceSchedule(schedule: MaintenanceScheduleCreate): Promise<MaintenanceSchedule>
  
  /**
   * Update a maintenance schedule
   * @param id - Schedule ID
   * @param schedule - Partial schedule data to update
   * @returns Updated maintenance schedule
   */
  updateMaintenanceSchedule(id: string, schedule: Partial<MaintenanceSchedule>): Promise<MaintenanceSchedule>
  
  /**
   * Delete a maintenance schedule
   * @param id - Schedule ID
   */
  deleteMaintenanceSchedule(id: string): Promise<void>
  
  /**
   * Get all maintenance schedules that are overdue
   * @returns Array of overdue maintenance schedules
   */
  getOverdueMaintenanceSchedules(): Promise<MaintenanceSchedule[]>
  
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

  /**
   * Retrieve maintenance calendar holds filtered by plan or asset.
   * @param filters Optional planId or assetId filters
   */
  getMaintenanceHolds(filters?: { planId?: string; assetId?: string; status?: 'active' | 'released' }): Promise<MaintenanceCalendarHold[]>

  /**
   * Create a maintenance calendar hold entry linked to a maintenance plan.
   * @param hold Hold metadata including associated booking identifier
   */
  createMaintenanceHold(
    hold: Omit<MaintenanceCalendarHold, 'id' | 'status' | 'createdAt' | 'releasedAt'> & { status?: 'active' | 'released' }
  ): Promise<MaintenanceCalendarHold>

  /**
   * Release an existing maintenance hold and optionally update metadata.
   * @param holdId Hold identifier
   * @param updates Optional updates (bookingId, holdColor, releasedAt)
   */
  releaseMaintenanceHold(
    holdId: string,
    updates?: Partial<Omit<MaintenanceCalendarHold, 'id' | 'planId' | 'assetId' | 'startDate' | 'endDate' | 'createdAt'>>
  ): Promise<MaintenanceCalendarHold>
  
  // ============================================================================
  // Damage Reports
  // ============================================================================

  /**
   * Get damage reports for a specific asset ordered by reportedAt descending
   */
  getDamageReports(assetId: UUID): Promise<DamageReportRecord[]>

  /**
   * Get a single damage report by its identifier
   */
  getDamageReport(reportId: UUID): Promise<DamageReportRecord | null>

  /**
   * Create a damage report record for an asset
   */
  createDamageReport(assetId: UUID, data: DamageReportCreateInput): Promise<DamageReportRecord>

  /**
   * Mark an existing damage report as repaired with notes and metadata
   */
  markDamageReportAsRepaired(reportId: UUID, repair: DamageRepairInput): Promise<DamageReportRecord>

  /**
   * Update damage report fields (internal use for undo/maintenance)
   */
  updateDamageReport(reportId: UUID, updates: Partial<DamageReportRecord>): Promise<DamageReportRecord>

  /**
   * Delete a damage report (reserved for undo scenarios)
   */
  deleteDamageReport(reportId: UUID): Promise<void>

  // ============================================================================
  // Assignments
  // ============================================================================

  /**
   * Get all assignments for an asset ordered by assignedAt descending
   */
  getAssignments(assetId: UUID): Promise<AssignmentRecord[]>

  /**
   * Get a single assignment by ID
   */
  getAssignment(assignmentId: UUID): Promise<AssignmentRecord | null>

  /**
   * Create assignment entry for an asset
   */
  createAssignment(assetId: UUID, data: AssignmentCreateInput): Promise<AssignmentRecord>

  /**
   * Update existing assignment entry
   */
  updateAssignment(assignmentId: UUID, updates: AssignmentUpdateInput): Promise<AssignmentRecord>

  /**
   * Delete assignment record (undo tooling)
   */
  deleteAssignment(assignmentId: UUID): Promise<void>

  /**
   * Get assignments for a target (person or group)
   */
  getAssignmentsForTarget(
    targetId: UUID,
    targetType: AssignmentTargetType,
    options?: { includeReturned?: boolean }
  ): Promise<AssignmentRecord[]>

  // ============================================================================
  // Stock Take
  // ============================================================================
  
  /**
   * Get all stock take sessions
   * @param filters - Optional filters (status, dateRange, etc.)
   * @returns Array of stock take sessions
   */
  getStockTakeSessions(filters?: { status?: StockTakeStatus }): Promise<StockTakeSession[]>
  
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

  /**
   * Delete a stock take session entirely
   * @param sessionId - Session ID
   */
  deleteStockTakeSession(sessionId: string): Promise<void>
  
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

  // ============================================================================
  // Asset Prefixes (E5 - Multiple Asset Prefixes)
  // ============================================================================

  /**
   * Get all asset prefixes
   * @returns Array of all asset prefixes
   */
  getAssetPrefixes(): Promise<import('./entities').AssetPrefix[]>

  /**
   * Get a single asset prefix by ID
   * @param id - Prefix ID
   * @returns Asset prefix
   */
  getAssetPrefix(id: string): Promise<import('./entities').AssetPrefix>

  /**
   * Create a new asset prefix
   * @param data - Prefix data without ID and sequence
   * @returns Created asset prefix
   */
  createAssetPrefix(
    data: import('./entities').AssetPrefixCreate
  ): Promise<import('./entities').AssetPrefix>

  /**
   * Update an existing asset prefix
   * @param id - Prefix ID
   * @param data - Partial prefix data to update
   * @returns Updated asset prefix
   */
  updateAssetPrefix(
    id: string,
    data: import('./entities').AssetPrefixUpdate
  ): Promise<import('./entities').AssetPrefix>

  /**
   * Delete an asset prefix
   * Note: Should fail if assets exist with this prefix
   * @param id - Prefix ID
   */
  deleteAssetPrefix(id: string): Promise<void>

  /**
   * Increment sequence number for a prefix
   * Called internally when creating an asset with this prefix
   * @param prefixId - Prefix ID
   * @returns New sequence number
   */
  incrementPrefixSequence(prefixId: string): Promise<number>

  // ============================================================================
  // Maintenance Companies, Rules, and Work Orders (T142)
  // ============================================================================

  /**
   * Get all maintenance companies
   */
  getMaintenanceCompanies(): Promise<import('./maintenance').MaintenanceCompany[]>

  /**
   * Get a single maintenance company by ID
   */
  getMaintenanceCompany(id: UUID): Promise<import('./maintenance').MaintenanceCompany | null>

  /**
   * Create a new maintenance company
   */
  createMaintenanceCompany(data: import('./maintenance').MaintenanceCompany): Promise<import('./maintenance').MaintenanceCompany>

  /**
   * Update an existing maintenance company
   */
  updateMaintenanceCompany(id: UUID, data: import('./maintenance').MaintenanceCompany): Promise<import('./maintenance').MaintenanceCompany>

  /**
   * Delete a maintenance company
   */
  deleteMaintenanceCompany(id: UUID): Promise<void>

  /**
   * Get all maintenance rules
   */
  getMaintenanceRules(): Promise<import('./maintenance').MaintenanceRule[]>

  /**
   * Get a single maintenance rule by ID
   */
  getMaintenanceRule(id: UUID): Promise<import('./maintenance').MaintenanceRule | null>

  /**
   * Create a new maintenance rule
   */
  createMaintenanceRule(data: import('./maintenance').MaintenanceRule): Promise<import('./maintenance').MaintenanceRule>

  /**
   * Update an existing maintenance rule
   */
  updateMaintenanceRule(id: UUID, data: import('./maintenance').MaintenanceRule): Promise<import('./maintenance').MaintenanceRule>

  /**
   * Delete a maintenance rule
   */
  deleteMaintenanceRule(id: UUID): Promise<void>

  /**
   * Get all work orders
   */
  getWorkOrders(): Promise<import('./maintenance').WorkOrder[]>

  /**
   * Get a single work order by ID
   */
  getWorkOrder(id: UUID): Promise<import('./maintenance').WorkOrder | null>

  /**
   * Create a new work order
   */
  createWorkOrder(data: import('./maintenance').WorkOrder): Promise<import('./maintenance').WorkOrder>

  /**
   * Update an existing work order
   */
  updateWorkOrder(id: UUID, data: import('./maintenance').WorkOrder): Promise<import('./maintenance').WorkOrder>

  /**
   * Delete a work order
   */
  deleteWorkOrder(id: UUID): Promise<void>
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
  type: 'churchtools' | 'mock'
  
  /**
   * ChurchTools-specific config
   */
  churchtools?: {
    moduleId: string              // Custom module ID
    baseUrl: string               // ChurchTools base URL
    apiClient: unknown            // ChurchTools API client instance
  }
  
  /**
   * Mock-specific config (for testing)
   */
  mock?: {
    initialData?: unknown         // Pre-populated mock data
  }
}
