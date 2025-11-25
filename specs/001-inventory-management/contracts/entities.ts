/**
 * Core Entity Type Definitions
 * 
 * This file contains all TypeScript type definitions for entities in the
 * inventory management system. These types are used throughout the application
 * for strong type safety.
 * 
 * @module contracts/entities
 */

// ============================================================================
// Base Types
// ============================================================================

/**
 * ISO 8601 timestamp string
 * @example "2025-10-18T14:30:00Z"
 */
export type ISOTimestamp = string

/**
 * ISO 8601 date string
 * @example "2025-10-18"
 */
export type ISODate = string

/**
 * UUID string
 * @example "550e8400-e29b-41d4-a716-446655440000"
 */
export type UUID = string

// ============================================================================
// Asset Category
// ============================================================================

export interface AssetCategory {
  id: UUID
  name: string
  icon?: string
  customFields: CustomFieldDefinition[]
  createdBy: string
  createdByName: string
  createdAt: ISOTimestamp
  lastModifiedBy: string
  lastModifiedByName: string
  lastModifiedAt: ISOTimestamp
}

export type AssetTypeCreate = Omit<
  AssetCategory,
  'id' | 'createdBy' | 'createdByName' | 'createdAt' | 'lastModifiedBy' | 'lastModifiedByName' | 'lastModifiedAt'
>

export type AssetTypeUpdate = Partial<Omit<AssetCategory, 'id' | 'createdBy' | 'createdByName' | 'createdAt'>>

export interface CustomFieldDefinition {
  id: UUID
  name: string
  type: CustomFieldType
  required: boolean
  options?: string[]
  validation?: {
    min?: number
    max?: number
    pattern?: string
    minLength?: number
    maxLength?: number
  }
  helpText?: string
}

export type CustomFieldType =
  | 'text'
  | 'number'
  | 'select'
  | 'multi-select'
  | 'date'
  | 'checkbox'
  | 'long-text'
  | 'url'
  | 'person-reference'

export type CustomFieldValue = string | number | boolean | string[]

// ============================================================================
// Asset
// ============================================================================

export interface Asset {
  id: UUID
  assetNumber: string
  name: string
  manufacturer?: string
  model?: string
  description?: string
  category: {
    id: UUID
    name: string
  }
  status: AssetStatus
  location?: string
  inUseBy?: {
    personId: string
    personName: string
    since: ISOTimestamp
  }
  isParent: boolean
  parentAssetId?: UUID
  childAssetIds?: UUID[]
  barcode: string
  qrCode: string
  customFieldValues: Record<string, CustomFieldValue>
  createdBy: string
  createdByName: string
  createdAt: ISOTimestamp
  lastModifiedBy: string
  lastModifiedByName: string
  lastModifiedAt: ISOTimestamp
  // Computed properties (not stored)
  isAvailable?: boolean
  currentBooking?: UUID
  nextMaintenance?: ISODate
}

export type AssetStatus =
  | 'available'
  | 'in-use'
  | 'broken'
  | 'in-repair'
  | 'installed'
  | 'sold'
  | 'destroyed'

export type AssetCreate = Omit<
  Asset,
  | 'id'
  | 'assetNumber'
  | 'barcode'
  | 'qrCode'
  | 'createdBy'
  | 'createdByName'
  | 'createdAt'
  | 'lastModifiedBy'
  | 'lastModifiedByName'
  | 'lastModifiedAt'
  | 'isAvailable'
  | 'currentBooking'
  | 'nextMaintenance'
> & {
  assetNumber?: string  // Optional: will be generated if not provided
  prefix?: string       // Optional: prefix for asset number generation
}

export type AssetUpdate = Partial<Omit<Asset, 'id' | 'assetNumber' | 'createdBy' | 'createdByName' | 'createdAt'>>

export interface AssetFilters {
  assetTypeId?: UUID
  status?: AssetStatus | AssetStatus[]
  location?: string
  parentAssetId?: UUID
  isParent?: boolean
  search?: string
  customFields?: Record<string, any>
}

// ============================================================================
// Booking
// ============================================================================

export interface Booking {
  id: UUID
  asset: {
    id: UUID
    assetNumber: string
    name: string
  }
  kit?: {
    id: UUID
    name: string
  }
  startDate: ISODate
  endDate: ISODate
  purpose: string
  notes?: string
  status: BookingStatus
  requestedBy: string
  requestedByName: string
  approvedBy?: string
  approvedByName?: string
  checkedOutAt?: ISOTimestamp
  checkedOutBy?: string
  checkedOutByName?: string
  checkedInAt?: ISOTimestamp
  checkedInBy?: string
  checkedInByName?: string
  conditionOnCheckOut?: ConditionAssessment
  conditionOnCheckIn?: ConditionAssessment
  damageReported?: boolean
  damageNotes?: string
  createdAt: ISOTimestamp
  lastModifiedAt: ISOTimestamp
}

export type BookingStatus =
  | 'pending'
  | 'approved'
  | 'active'
  | 'completed'
  | 'overdue'
  | 'cancelled'

export interface ConditionAssessment {
  rating: 'excellent' | 'good' | 'fair' | 'poor' | 'damaged'
  notes?: string
  photos?: string[]
}

export type BookingCreate = Omit<
  Booking,
  | 'id'
  | 'status'
  | 'approvedBy'
  | 'approvedByName'
  | 'checkedOutAt'
  | 'checkedOutBy'
  | 'checkedOutByName'
  | 'checkedInAt'
  | 'checkedInBy'
  | 'checkedInByName'
  | 'createdAt'
  | 'lastModifiedAt'
>

export type BookingUpdate = Partial<Omit<Booking, 'id' | 'createdAt'>>

export interface BookingFilters {
  assetId?: UUID
  kitId?: UUID
  status?: BookingStatus | BookingStatus[]
  requestedBy?: string
  dateRange?: {
    start: ISODate
    end: ISODate
  }
}

// ============================================================================
// Equipment Kit
// ============================================================================

export interface Kit {
  id: UUID
  name: string
  description?: string
  type: KitType
  boundAssets?: {
    assetId: UUID
    assetNumber: string
    name: string
  }[]
  poolRequirements?: {
    assetTypeId: UUID
    categoryName: string
    quantity: number
    filters?: Record<string, any>
  }[]
  createdBy: string
  createdByName: string
  createdAt: ISOTimestamp
  lastModifiedBy: string
  lastModifiedByName: string
  lastModifiedAt: ISOTimestamp
}

export type KitType = 'fixed' | 'flexible'

export type KitCreate = Omit<
  Kit,
  'id' | 'createdBy' | 'createdByName' | 'createdAt' | 'lastModifiedBy' | 'lastModifiedByName' | 'lastModifiedAt'
>

export type KitUpdate = Partial<Omit<Kit, 'id' | 'createdBy' | 'createdByName' | 'createdAt'>>

// ============================================================================
// Maintenance
// ============================================================================

export interface MaintenanceRecord {
  id: UUID
  asset: {
    id: UUID
    assetNumber: string
    name: string
  }
  type: MaintenanceType
  date: ISODate
  performedBy: string
  performedByName: string
  description: string
  notes?: string
  cost?: number
  photos?: string[]
  documents?: string[]
  nextDueDate?: ISODate
  createdAt: ISOTimestamp
  lastModifiedAt: ISOTimestamp
}

export type MaintenanceType =
  | 'inspection'
  | 'cleaning'
  | 'repair'
  | 'calibration'
  | 'testing'
  | 'compliance'
  | 'other'

export type MaintenanceRecordCreate = Omit<
  MaintenanceRecord,
  'id' | 'createdAt' | 'lastModifiedAt'
>

export interface MaintenanceSchedule {
  id: UUID
  assetId: UUID
  scheduleType: ScheduleType
  intervalDays?: number
  intervalMonths?: number
  intervalYears?: number
  intervalHours?: number
  intervalBookings?: number
  fixedDate?: ISODate
  reminderDaysBefore: number
  lastPerformed?: ISODate
  nextDue?: ISODate
  isOverdue?: boolean
  createdAt: ISOTimestamp
  lastModifiedAt: ISOTimestamp
}

export type ScheduleType =
  | 'time-based'
  | 'usage-based'
  | 'event-based'
  | 'fixed-date'

export type MaintenanceScheduleCreate = Omit<
  MaintenanceSchedule,
  'id' | 'lastPerformed' | 'nextDue' | 'isOverdue' | 'createdAt' | 'lastModifiedAt'
>

// ============================================================================
// Stock Take
// ============================================================================

export interface StockTakeSession {
  id: UUID
  startDate: ISOTimestamp
  completedDate?: ISOTimestamp
  status: StockTakeStatus
  scope: {
    type: 'all' | 'category' | 'location' | 'custom'
    assetTypeIds?: UUID[]
    locations?: string[]
    assetIds?: UUID[]
  }
  expectedAssets: {
    assetId: UUID
    assetNumber: string
    name: string
    location?: string
  }[]
  scannedAssets: {
    assetId: UUID
    assetNumber: string
    scannedAt: ISOTimestamp
    scannedBy: string
    scannedByName: string
    location?: string
    condition?: string
  }[]
  missingAssets?: {
    assetId: UUID
    assetNumber: string
    name: string
    lastKnownLocation?: string
  }[]
  unexpectedAssets?: {
    assetId: UUID
    assetNumber: string
    name: string
  }[]
  conductedBy: string
  conductedByName: string
  notes?: string
  createdAt: ISOTimestamp
  lastModifiedAt: ISOTimestamp
}

export type StockTakeStatus =
  | 'active'
  | 'completed'
  | 'cancelled'

export type StockTakeSessionCreate = Omit<
  StockTakeSession,
  | 'id'
  | 'expectedAssets'
  | 'scannedAssets'
  | 'missingAssets'
  | 'unexpectedAssets'
  | 'createdAt'
  | 'lastModifiedAt'
>

// ============================================================================
// Change History / Audit Trail
// ============================================================================

export interface ChangeHistoryEntry {
  id: UUID
  entityType: 'asset' | 'category' | 'booking' | 'kit' | 'maintenance' | 'stocktake'
  entityId: UUID
  entityName?: string
  action: ChangeAction
  fieldName?: string
  oldValue?: string
  newValue?: string
  changedBy: string
  changedByName: string
  changedAt: ISOTimestamp
  ipAddress?: string
  userAgent?: string
}

export type ChangeAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'status-changed'
  | 'booked'
  | 'checked-out'
  | 'checked-in'
  | 'maintenance-performed'
  | 'scanned'

// ============================================================================
// Saved Views
// ============================================================================

export interface SavedView {
  id: UUID
  name: string
  ownerId: string
  ownerName: string
  isPublic: boolean
  viewMode: ViewMode
  filters: ViewFilter[]
  sortBy?: string
  sortDirection?: 'asc' | 'desc'
  groupBy?: string
  visibleColumns?: string[]
  createdAt: ISOTimestamp
  lastModifiedAt: ISOTimestamp
}

export type ViewMode =
  | 'table'
  | 'gallery'
  | 'calendar'
  | 'kanban'
  | 'list'

export interface ViewFilter {
  field: string
  operator: FilterOperator
  value: any
  logic?: 'AND' | 'OR'
}

export type FilterOperator =
  | 'equals'
  | 'not-equals'
  | 'contains'
  | 'not-contains'
  | 'starts-with'
  | 'ends-with'
  | 'greater-than'
  | 'less-than'
  | 'is-empty'
  | 'is-not-empty'
  | 'in'
  | 'not-in'

export type SavedViewCreate = Omit<
  SavedView,
  'id' | 'createdAt' | 'lastModifiedAt'
>

// ============================================================================
// Person/User Information
// ============================================================================

export interface PersonInfo {
  id: string
  firstName: string
  lastName: string
  name: string
  email?: string
  avatarUrl?: string
  phoneNumber?: string
}

// ============================================================================
// ChurchTools API Types
// ============================================================================

/**
 * ChurchTools Person entity from /whoami or /persons/{id}
 */
export interface Person {
  id: number
  firstName: string
  lastName: string
  email?: string
  imageUrl?: string
  phoneNumber?: string
  // ... other fields from ChurchTools API
}

/**
 * ChurchTools Custom Module entity
 */
export interface CustomModule {
  id: number
  key: string
  name: string
  description?: string
  // ... other fields
}

/**
 * ChurchTools Custom Data Category entity
 */
export interface CustomDataCategory {
  id: number
  name: string
  moduleId: number
  // ... other fields
}

/**
 * ChurchTools Custom Data Value entity
 */
export interface CustomDataValue {
  id: number
  assetTypeId: number
  [key: string]: any  // Dynamic properties based on category
}

// ============================================================================
// API Response Types
// ============================================================================

export interface APIResponse<T> {
  data: T
  meta?: {
    count?: number
    pagination?: {
      current: number
      total: number
      limit: number
    }
  }
}

export interface APIError {
  message: string
  code?: string
  status?: number
  details?: any
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Pagination parameters for list queries
 */
export interface PaginationParams {
  page?: number
  limit?: number
  offset?: number
}

/**
 * Sort parameters for list queries
 */
export interface SortParams {
  sortBy?: string
  sortDirection?: 'asc' | 'desc'
}

/**
 * Combined query parameters
 */
export interface QueryParams extends PaginationParams, SortParams {
  search?: string
  filters?: Record<string, any>
}
