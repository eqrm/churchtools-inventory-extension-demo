/**
 * usePersonSearch Hook
 * Feature: 002-bug-fixes-ux-improvements (US2 - T038)
 * Purpose: React hook for person search with debouncing
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  personSearchService,
  type PersonSearchResult,
  type ChurchToolsDomainType,
} from '../services/person/PersonSearchService'

interface UsePersonSearchOptions {
  /** Minimum characters before searching (default: 2) */
  minChars?: number
  /** Debounce delay in milliseconds (default: 300) */
  debounceMs?: number
  /** Maximum results to fetch (default: 10) */
  limit?: number
  /** ChurchTools domain types to query (default: ['person']) */
  domainTypes?: ChurchToolsDomainType[]
}

interface UsePersonSearchResult {
  /** Search results */
  results: PersonSearchResult[]
  /** Whether search is in progress */
  loading: boolean
  /** Error message if search failed */
  error: string | null
  /** Function to execute search */
  search: (query: string) => void
  /** Function to clear results */
  clear: () => void
  /** Whether results are from cache */
  fromCache: boolean
}

/**
 * T034, T038: Hook for person search with debouncing and caching
 */
export function usePersonSearch(options: UsePersonSearchOptions = {}): UsePersonSearchResult {
  const {
    minChars = 2,
    debounceMs = 300,
    limit = 10,
    domainTypes = ['person']
  } = options

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PersonSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fromCache, setFromCache] = useState(false)

  const domainKey = useMemo(() => {
    const copy = [...domainTypes]
    copy.sort()
    return copy.join(',')
  }, [domainTypes])

  const normalizedDomainTypes = useMemo(() => {
    if (!domainKey) {
      return ['person'] as ChurchToolsDomainType[]
    }
    return domainKey.split(',').filter(Boolean) as ChurchToolsDomainType[]
  }, [domainKey])

  /**
   * T034: Debounced search effect
   */
  useEffect(() => {
    if (query.length < minChars) {
      setResults([])
      setError(null)
      setLoading(false)
      return
    }

    const executeSearch = async () => {
      setLoading(true)
      setError(null)

      try {
  const response = await personSearchService.search({ query, limit, domainTypes: normalizedDomainTypes })
        setResults(response.results)
        setFromCache(response.fromCache)
      } catch (err) {
        const message = err && typeof err === 'object' && 'message' in err
          ? err.message as string
          : 'Could not search for persons. Please try again.'
        setError(message)
        setResults([])
      } finally {
        setLoading(false)
      }
    }

    const timeoutId = setTimeout(executeSearch, debounceMs)
    return () => clearTimeout(timeoutId)
  }, [query, minChars, debounceMs, limit, domainKey, normalizedDomainTypes])

  const search = useCallback((newQuery: string) => setQuery(newQuery), [])
  const clear = useCallback(() => {
    setQuery('')
    setResults([])
    setError(null)
    setFromCache(false)
  }, [])

  return { results, loading, error, search, clear, fromCache }
}
