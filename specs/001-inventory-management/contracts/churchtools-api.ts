/**
 * ChurchTools API Client Types
 * 
 * This file defines the interface and types for interacting with the
 * ChurchTools API, specifically focusing on the Custom Modules API endpoints
 * and person/user management.
 * 
 * @module contracts/churchtools-api
 */

import type {
  Person,
  CustomModule,
  CustomDataCategory,
  CustomDataValue,
  PersonInfo
} from './entities'

// ============================================================================
// ChurchTools API Client Interface
// ============================================================================

/**
 * ChurchTools API Client
 * Wrapper around ChurchTools REST API with type safety
 */
export interface IChurchToolsAPIClient {
  /**
   * Base URL for the ChurchTools instance
   */
  baseUrl: string
  
  /**
   * Generic HTTP methods
   */
  get<T>(endpoint: string, params?: Record<string, any>): Promise<T>
  post<T>(endpoint: string, data: any): Promise<T>
  put<T>(endpoint: string, data: any): Promise<T>
  patch<T>(endpoint: string, data: any): Promise<T>
  delete(endpoint: string): Promise<void>
  
  /**
   * Get current logged-in user
   * GET /whoami
   */
  getCurrentUser(): Promise<PersonInfo>
  
  /**
   * Get person information by ID
   * GET /persons/{personId}
   * @param personId - Person ID
   */
  getPersonInfo(personId: string): Promise<PersonInfo>
  
  /**
   * Search for people
   * GET /persons?search={query}
   * @param query - Search query
   */
  searchPeople(query: string): Promise<PersonInfo[]>
  
  /**
   * Get all custom modules
   * GET /custommodules
   */
  getModules(): Promise<CustomModule[]>
  
  /**
   * Get a specific custom module by ID
   * GET /custommodules/{moduleId}
   * @param moduleId - Module ID
   */
  getModule(moduleId: string): Promise<CustomModule>
  
  /**
   * Get a custom module by its key
   * GET /custommodules/{key}
   * @param key - Module key (e.g., "churchtools-inventory")
   */
  getModuleByKey(key: string): Promise<CustomModule>
  
  /**
   * Get all data categories for a module
   * GET /custommodules/{moduleId}/customdatacategories
   * @param moduleId - Module ID
   */
  getDataCategories(moduleId: string): Promise<CustomDataCategory[]>
  
  /**
   * Create a new data category
   * POST /custommodules/{moduleId}/customdatacategories
   * @param moduleId - Module ID
   * @param category - Category data
   */
  createDataCategory(moduleId: string, category: CreateDataCategoryRequest): Promise<CustomDataCategory>
  
  /**
   * Update a data category
   * PUT /custommodules/{moduleId}/customdatacategories/{assetTypeId}
   * @param moduleId - Module ID
   * @param assetTypeId - Category ID
   * @param category - Updated category data
   */
  updateDataCategory(
    moduleId: string,
    assetTypeId: string,
    category: UpdateDataCategoryRequest
  ): Promise<CustomDataCategory>
  
  /**
   * Delete a data category
   * DELETE /custommodules/{moduleId}/customdatacategories/{assetTypeId}
   * @param moduleId - Module ID
   * @param assetTypeId - Category ID
   */
  deleteDataCategory(moduleId: string, assetTypeId: string): Promise<void>
  
  /**
   * Get all data values in a category
   * GET /custommodules/{moduleId}/customdatacategories/{assetTypeId}/customdatavalues
   * @param moduleId - Module ID
   * @param assetTypeId - Category ID
   */
  getDataValues(moduleId: string, assetTypeId: string): Promise<CustomDataValue[]>
  
  /**
   * Get a specific data value
   * GET /custommodules/{moduleId}/customdatacategories/{assetTypeId}/customdatavalues/{valueId}
   * @param moduleId - Module ID
   * @param assetTypeId - Category ID
   * @param valueId - Value ID
   */
  getDataValue(moduleId: string, assetTypeId: string, valueId: string): Promise<CustomDataValue>
  
  /**
   * Create a new data value
   * POST /custommodules/{moduleId}/customdatacategories/{assetTypeId}/customdatavalues
   * @param moduleId - Module ID
   * @param assetTypeId - Category ID
   * @param value - Value data
   */
  createDataValue(
    moduleId: string,
    assetTypeId: string,
    value: Record<string, any>
  ): Promise<CustomDataValue>
  
  /**
   * Update a data value
   * PUT /custommodules/{moduleId}/customdatacategories/{assetTypeId}/customdatavalues/{valueId}
   * @param moduleId - Module ID
   * @param assetTypeId - Category ID
   * @param valueId - Value ID
   * @param value - Updated value data
   */
  updateDataValue(
    moduleId: string,
    assetTypeId: string,
    valueId: string,
    value: Record<string, any>
  ): Promise<CustomDataValue>
  
  /**
   * Delete a data value
   * DELETE /custommodules/{moduleId}/customdatacategories/{assetTypeId}/customdatavalues/{valueId}
   * @param moduleId - Module ID
   * @param assetTypeId - Category ID
   * @param valueId - Value ID
   */
  deleteDataValue(moduleId: string, assetTypeId: string, valueId: string): Promise<void>
}

// ============================================================================
// Request/Response Types
// ============================================================================

export interface CreateDataCategoryRequest {
  name: string
  [key: string]: any
}

export interface UpdateDataCategoryRequest {
  name?: string
  [key: string]: any
}

// ============================================================================
// API Error Handling
// ============================================================================

export class ChurchToolsAPIError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public endpoint: string,
    public details?: any
  ) {
    super(`ChurchTools API Error: ${status} ${statusText} at ${endpoint}`)
    this.name = 'ChurchToolsAPIError'
  }
}

export interface ErrorResponse {
  message: string
  errors?: Array<{
    field: string
    message: string
  }>
}

// ============================================================================
// Configuration
// ============================================================================

export interface ChurchToolsAPIConfig {
  /**
   * ChurchTools instance base URL
   * @example "https://example.church.tools"
   */
  baseUrl: string
  
  /**
   * Optional: Custom headers to include in requests
   */
  headers?: Record<string, string>
  
  /**
   * Optional: Request timeout in milliseconds
   * @default 30000
   */
  timeout?: number
  
  /**
   * Optional: Enable debug logging
   * @default false
   */
  debug?: boolean
}

// ============================================================================
// Person Caching
// ============================================================================

/**
 * Person cache entry with timestamp for cache invalidation
 */
export interface PersonCacheEntry {
  person: PersonInfo
  cachedAt: number
  expiresAt: number
}

/**
 * Person cache interface for optimizing repeated person lookups
 */
export interface IPersonCache {
  /**
   * Get person from cache
   * @param personId - Person ID
   * @returns Cached person info or null if not cached or expired
   */
  get(personId: string): PersonCacheEntry | null
  
  /**
   * Set person in cache
   * @param personId - Person ID
   * @param person - Person info
   * @param ttl - Time to live in milliseconds (optional)
   */
  set(personId: string, person: PersonInfo, ttl?: number): void
  
  /**
   * Clear specific person from cache
   * @param personId - Person ID
   */
  remove(personId: string): void
  
  /**
   * Clear entire cache
   */
  clear(): void
  
  /**
   * Cleanup expired entries
   */
  cleanup(): void
}

// ============================================================================
// Batch Operations
// ============================================================================

/**
 * Batch request for creating multiple data values at once
 */
export interface BatchCreateDataValuesRequest {
  moduleId: string
  assetTypeId: string
  values: Record<string, any>[]
}

/**
 * Batch update request
 */
export interface BatchUpdateDataValuesRequest {
  moduleId: string
  assetTypeId: string
  updates: Array<{
    valueId: string
    value: Record<string, any>
  }>
}

/**
 * Batch delete request
 */
export interface BatchDeleteDataValuesRequest {
  moduleId: string
  assetTypeId: string
  valueIds: string[]
}

// ============================================================================
// Query Builders
// ============================================================================

/**
 * Query builder for filtering data values
 */
export interface DataValueQuery {
  filters?: Array<{
    field: string
    operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in'
    value: any
  }>
  sort?: {
    field: string
    direction: 'asc' | 'desc'
  }
  pagination?: {
    page: number
    limit: number
  }
}

// ============================================================================
// Webhook Types (for future real-time updates)
// ============================================================================

/**
 * Webhook event types
 */
export type WebhookEventType =
  | 'data-value.created'
  | 'data-value.updated'
  | 'data-value.deleted'
  | 'data-category.created'
  | 'data-category.updated'
  | 'data-category.deleted'

/**
 * Webhook payload
 */
export interface WebhookPayload {
  event: WebhookEventType
  moduleId: string
  assetTypeId?: string
  valueId?: string
  timestamp: string
  data: any
}

// ============================================================================
// Rate Limiting
// ============================================================================

/**
 * Rate limit information from API responses
 */
export interface RateLimitInfo {
  limit: number
  remaining: number
  reset: number  // Unix timestamp
}

/**
 * Rate limiter interface for handling API rate limits
 */
export interface IRateLimiter {
  /**
   * Check if a request can be made
   * @returns True if within rate limit, false otherwise
   */
  canMakeRequest(): boolean
  
  /**
   * Record a request
   */
  recordRequest(): void
  
  /**
   * Update rate limit info from response headers
   * @param info - Rate limit info
   */
  updateLimits(info: RateLimitInfo): void
  
  /**
   * Wait until rate limit resets
   * @returns Promise that resolves when rate limit resets
   */
  waitForReset(): Promise<void>
}
