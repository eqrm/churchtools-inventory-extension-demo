/**
 * Person Search Service Implementation
 * Feature: 002-bug-fixes-ux-improvements (FR-008, FR-009, US2)
 * Purpose: Search ChurchTools person records with caching
 * 
 * Implements: contracts/person-search.ts
 */

import { churchtoolsClient } from '@churchtools/churchtools-client'

// ==================== Types ====================

export type ChurchToolsDomainType = 'person' | 'group'

export interface PersonSearchRequest {
  query: string
  limit?: number
  includeAvatars?: boolean
  domainTypes?: ChurchToolsDomainType[]
}

export interface PersonSearchResult {
  id: string
  firstName: string
  lastName: string
  email?: string
  avatarUrl?: string
  displayName: string
  type: ChurchToolsDomainType
  groupType?: string
}

export interface PersonSearchResponse {
  results: PersonSearchResult[]
  totalCount: number
  fromCache: boolean
  query: string
}

export interface PersonSearchError {
  code: 'SEARCH_FAILED' | 'INVALID_QUERY' | 'NETWORK_ERROR' | 'UNAUTHORIZED'
  message: string
  details?: unknown
}

interface ChurchToolsSearchRaw {
  title?: string
  domainType?: ChurchToolsDomainType
  domainIdentifier?: string
  apiUrl?: string
  frontendUrl?: string | null
  imageUrl?: string | null
  domainAttributes?: {
    firstName?: string
    lastName?: string
    guid?: string
    isArchived?: boolean
    dateOfDeath?: string | null
    name?: string
    groupType?: string
  }
  firstName?: string
  lastName?: string
  name?: string
  id?: number | string
  guid?: string
  displayName?: string
  avatarUrl?: string | null
  email?: string | null
  infos?: string[]
}

interface CachedPerson {
  person: PersonSearchResult
  cachedAt: Date
  expiresAt: Date
}

export interface PersonCacheConfig {
  memoryTTL: number
  storageTTL: number
  maxMemoryEntries: number
}

// ==================== Service Interface ====================

export interface IPersonSearchService {
  search(request: PersonSearchRequest): Promise<PersonSearchResponse>
  getPersonById(personId: string): Promise<PersonSearchResult>
  clearCache(): void
  warmCache(personIds: string[]): Promise<void>
}

// ==================== Implementation ====================

/**
 * Default cache configuration
 */
const DEFAULT_CONFIG: PersonCacheConfig = {
  memoryTTL: 5 * 60 * 1000,      // 5 minutes
  storageTTL: 24 * 60 * 60 * 1000, // 24 hours
  maxMemoryEntries: 100
}

/**
 * PersonSearchService - ChurchTools person search with two-level caching
 */
export class PersonSearchService implements IPersonSearchService {
  private memoryCache: Map<string, CachedPerson> = new Map()
  private config: PersonCacheConfig

  constructor(config: Partial<PersonCacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.startCacheCleanup()
  }

  /**
   * Search for persons in ChurchTools
   * T033: ChurchTools API integration
   */
  async search(request: PersonSearchRequest): Promise<PersonSearchResponse> {
    const {
      query,
      limit = 10,
      domainTypes = ['person']
    } = request

    // Validate query
    if (!query || query.trim().length < 2) {
      throw this.createError(
        'INVALID_QUERY',
        'Search query must be at least 2 characters'
      )
    }

    try {
      // T035: Check memory cache first
      // T033: Call ChurchTools API
      // Note: churchtoolsClient automatically adds /api prefix, so use '/search' not '/api/search'
      // Build query string manually - churchtoolsClient.get() doesn't accept separate params object
      const queryParams = new URLSearchParams({
        query,
        limit: limit.toString()
      })

      domainTypes.forEach((domain) => {
        queryParams.append('domain_types[]', domain)
      })

      const queryString = queryParams.toString()
      
      // churchtoolsClient.get() automatically unwraps the response, so we get the array directly
      const responseData = await churchtoolsClient.get<ChurchToolsSearchRaw[]>(
        `/search?${queryString}`
      )

      // T037: Transform results
      const transformedResults = responseData.map((raw) => this.transformSearchResult(raw))

      const seen = new Set<string>()
      const results = transformedResults.filter((result) => {
        const key = `${result.type}:${result.id ?? result.displayName}`
        if (seen.has(key)) {
          return false
        }
        seen.add(key)
        return true
      })

      // T035: Cache results in memory
      results.forEach((person) => {
        this.setMemoryCache(person.id, person)
      })

      // T036: Cache results in localStorage
      results.forEach((person) => {
        this.setStorageCache(person.id, person)
      })

      return {
        results,
        totalCount: responseData.length,
        fromCache: false,
        query
      }
    } catch (error) {
      throw this.handleError(error)
    }
  }

  /**
   * Get a specific person by ID
   * T035-T036: Two-level cache lookup
   */
  async getPersonById(personId: string): Promise<PersonSearchResult> {
    try {
      // Check memory cache
      const cached = this.getFromMemoryCache(personId)
      if (cached) {
        return cached
      }

      // Check localStorage cache
      const storageCached = this.getFromStorageCache(personId)
      if (storageCached) {
        // Promote to memory cache
        this.setMemoryCache(personId, storageCached)
        return storageCached
      }

      // Fetch from API
      // Note: churchtoolsClient automatically adds /api prefix
      const response = await churchtoolsClient.get<ChurchToolsSearchRaw>(
        `/persons/${personId}`
      )

      const person = this.transformSearchResult(response)

      // Cache result
      this.setMemoryCache(personId, person)
      this.setStorageCache(personId, person)

      return person
    } catch (error) {
      throw this.handleError(error)
    }
  }

  /**
   * Clear all cached person data
   */
  clearCache(): void {
    // Clear memory cache
    this.memoryCache.clear()

    // Clear localStorage cache (all person_cache_* keys)
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('person_cache_')) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key))
  }

  /**
   * Pre-cache frequently used persons
   */
  async warmCache(personIds: string[]): Promise<void> {
    const promises = personIds.map(async (id) => {
      try {
        // Check if already cached
        if (this.getFromMemoryCache(id)) {
          return
        }
        await this.getPersonById(id)
      } catch {
        // Ignore errors during warm-up
      }
    })

    await Promise.all(promises)
  }

  // ==================== Private Methods ====================

  /**
   * T037: Transform ChurchTools person to our format
   */
  private transformSearchResult(raw: ChurchToolsSearchRaw): PersonSearchResult {
    const domainAttributes = raw.domainAttributes ?? {}
    const domainType: ChurchToolsDomainType = raw.domainType === 'group' ? 'group' : 'person'

    if (domainType === 'group') {
      const groupName = this.resolveGroupName(raw, domainAttributes)
      const resolvedId = this.resolveId(raw, domainAttributes, groupName)
      const avatarUrl = raw.imageUrl ?? raw.avatarUrl ?? undefined

      return {
        id: resolvedId ?? groupName,
        firstName: groupName,
        lastName: '',
        displayName: groupName,
        avatarUrl,
        type: 'group',
        groupType: domainAttributes.groupType ?? undefined
      }
    }

    const firstName = domainAttributes.firstName ?? raw.firstName ?? ''
    const lastName = domainAttributes.lastName ?? raw.lastName ?? ''

    const resolvedId = (() => {
      return this.resolveId(raw, domainAttributes, firstName, lastName)
    })()

    const displayName = (() => {
      if (raw.title && raw.title.trim()) return raw.title.trim()
      if (raw.displayName && raw.displayName.trim()) return raw.displayName.trim()
      const combined = [firstName, lastName].filter(Boolean).join(' ').trim()
      if (combined) return combined
      if (domainAttributes.guid) return domainAttributes.guid
      if (resolvedId) return resolvedId
      return 'Unknown Person'
    })()

    const avatarUrl = raw.imageUrl ?? raw.avatarUrl ?? undefined
    const email = raw.email ?? undefined

    return {
      id: resolvedId ?? displayName,
      firstName,
      lastName,
      email,
      avatarUrl: avatarUrl ?? undefined,
      displayName,
      type: 'person'
    }
  }

  private resolveId(
    raw: ChurchToolsSearchRaw,
    domainAttributes: ChurchToolsSearchRaw['domainAttributes'],
    firstName?: string,
    lastName?: string
  ): string | undefined {
    if (raw.domainIdentifier) return raw.domainIdentifier
    if (domainAttributes?.guid) return domainAttributes.guid
    if (raw.guid) return raw.guid
    if (typeof raw.id !== 'undefined' && raw.id !== null) return String(raw.id)
    if (raw.apiUrl) {
      const parts = raw.apiUrl.split('/')
      const tail = parts[parts.length - 1]
      if (tail) {
        return tail
      }
    }
    const combined = [firstName, lastName].filter(Boolean).join(' ').trim()
    if (combined) return combined
    return undefined
  }

  private resolveGroupName(
    raw: ChurchToolsSearchRaw,
    domainAttributes: ChurchToolsSearchRaw['domainAttributes']
  ): string {
    const candidates = [
      raw.title,
      raw.displayName,
      domainAttributes?.name,
      raw.name,
      domainAttributes?.guid,
      raw.domainIdentifier,
      raw.domainAttributes?.firstName,
    ]

    const resolved = candidates.find((value) => Boolean(value && value.toString().trim()))
    return resolved ? String(resolved).trim() : 'Unknown Group'
  }

  /**
   * T035: Get person from memory cache
   */
  private getFromMemoryCache(key: string): PersonSearchResult | null {
    const cached = this.memoryCache.get(key)
    if (!cached) {
      return null
    }

    // Check expiration
    if (new Date() > cached.expiresAt) {
      this.memoryCache.delete(key)
      return null
    }

    return cached.person
  }

  /**
   * T035: Set person in memory cache
   */
  private setMemoryCache(key: string, person: PersonSearchResult): void {
    // Enforce max entries (LRU eviction)
    if (this.memoryCache.size >= this.config.maxMemoryEntries) {
      const firstKey = this.memoryCache.keys().next().value
      if (firstKey) {
        this.memoryCache.delete(firstKey)
      }
    }

    const now = new Date()
    this.memoryCache.set(key, {
      person,
      cachedAt: now,
      expiresAt: new Date(now.getTime() + this.config.memoryTTL)
    })
  }

  /**
   * T036: Get person from localStorage cache
   */
  private getFromStorageCache(personId: string): PersonSearchResult | null {
    try {
      const key = `person_cache_${personId}`
      const item = localStorage.getItem(key)
      if (!item) {
        return null
      }

      const cached = JSON.parse(item) as CachedPerson
      
      // Parse dates (localStorage stores as strings)
      cached.expiresAt = new Date(cached.expiresAt)

      // Check expiration
      if (new Date() > cached.expiresAt) {
        localStorage.removeItem(key)
        return null
      }

      return cached.person
    } catch {
      return null
    }
  }

  /**
   * T036: Set person in localStorage cache
   */
  private setStorageCache(personId: string, person: PersonSearchResult): void {
    try {
      const key = `person_cache_${personId}`
      const now = new Date()
      const cached: CachedPerson = {
        person,
        cachedAt: now,
        expiresAt: new Date(now.getTime() + this.config.storageTTL)
      }
      localStorage.setItem(key, JSON.stringify(cached))
    } catch {
      // Ignore localStorage errors (quota exceeded, etc.)
    }
  }

  /**
   * T042: Handle API errors with friendly messages
   */
  private handleError(error: unknown): PersonSearchError {
    if (error instanceof Error) {
      // Network errors
      if (error.message.includes('fetch') || error.message.includes('network')) {
        return this.createError('NETWORK_ERROR', 'Could not connect to server. Please check your internet connection.')
      }

      // Parse HTTP errors from ChurchTools client
      const message = error.message.toLowerCase()
      if (message.includes('401') || message.includes('403') || message.includes('unauthorized')) {
        return this.createError('UNAUTHORIZED', 'Session expired. Please log in again.')
      }

      if (message.includes('400') || message.includes('bad request')) {
        return this.createError('INVALID_QUERY', 'Invalid search query. Please try different keywords.')
      }
    }

    return this.createError('SEARCH_FAILED', 'Could not search for persons. Please try again.', error)
  }

  /**
   * Create standardized error object
   */
  private createError(
    code: PersonSearchError['code'],
    message: string,
    details?: unknown
  ): PersonSearchError {
    return { code, message, details }
  }

  /**
   * Start periodic cache cleanup (remove expired entries)
   */
  private startCacheCleanup(): void {
    // Clean up memory cache every minute
    setInterval(() => {
      const now = new Date()
      const keysToDelete: string[] = []

      this.memoryCache.forEach((cached, key) => {
        if (now > cached.expiresAt) {
          keysToDelete.push(key)
        }
      })

      keysToDelete.forEach((key) => this.memoryCache.delete(key))
    }, 60 * 1000)
  }
}

/**
 * Singleton instance for easy import throughout the app
 */
export const personSearchService = new PersonSearchService()
