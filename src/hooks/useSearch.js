import { useCallback, useEffect, useRef, useState } from 'react'
import { searchSongs } from '../services/youtube'
import { useDebouncedValue } from './useDebouncedValue'

const MIN_QUERY_LENGTH = 2

export function useSearch(options = {}) {
  const {
    autoSearch = true,
    minQueryLength = MIN_QUERY_LENGTH,
    resultLimit = 25,
    persistKey = null,
  } = options
  const [query, setQueryInternal] = useState(
    () => (persistKey ? (sessionStorage.getItem(persistKey) ?? '') : ''),
  )

  const setQuery = useCallback(
    (value) => {
      setQueryInternal(value)
      if (persistKey) sessionStorage.setItem(persistKey, value)
    },
    [persistKey],
  )
  const [activeQuery, setActiveQuery] = useState('')
  const [results, setResults] = useState([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const cacheRef = useRef(new Map())
  const controllerRef = useRef(null)
  const queryRef = useRef(query)
  const requestIdRef = useRef(0)
  const debouncedQuery = useDebouncedValue(query, 300)

  const resetSearch = useCallback(() => {
    controllerRef.current?.abort()
    setActiveQuery('')
    setResults([])
    setError('')
    setIsLoading(false)
  }, [])

  const runSearch = useCallback((rawQuery, { skipCache = false } = {}) => {
    const searchTerm = rawQuery.trim()
    if (searchTerm.length < minQueryLength) {
      resetSearch()
      return Promise.resolve([])
    }

    const cacheKey = `${searchTerm.toLowerCase()}::${resultLimit}`
    if (!skipCache) {
      const cached = cacheRef.current.get(cacheKey)
      if (cached) {
        setActiveQuery(searchTerm)
        setResults(cached)
        setError('')
        setIsLoading(false)
        return Promise.resolve(cached)
      }
    }

    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    requestIdRef.current += 1
    const requestId = requestIdRef.current

    setActiveQuery(searchTerm)
    setIsLoading(true)
    setError('')

    return searchSongs(searchTerm, {
      limit: resultLimit,
      signal: controller.signal,
    })
      .then((songs) => {
        if (requestId !== requestIdRef.current) return []
        cacheRef.current.set(cacheKey, songs)
        setResults(songs)
        return songs
      })
      .catch((requestError) => {
        if (requestError.name === 'AbortError' || requestId !== requestIdRef.current) {
          return []
        }
        setResults([])
        setError(requestError.message || 'Unable to search right now.')
        return []
      })
      .finally(() => {
        if (requestId === requestIdRef.current && !controller.signal.aborted) {
          setIsLoading(false)
        }
      })
  }, [minQueryLength, resetSearch, resultLimit])

  const submitSearch = useCallback(
    (overrideQuery) => runSearch(overrideQuery ?? query, { skipCache: true }),
    [query, runSearch],
  )

  useEffect(() => {
    queryRef.current = query
  }, [query])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      cacheRef.current.clear()

      const nextQuery = queryRef.current.trim()
      if (nextQuery.length < minQueryLength) {
        resetSearch()
        return
      }

      if (autoSearch) {
        void runSearch(nextQuery, { skipCache: true })
        return
      }

      setActiveQuery('')
      setResults([])
      setError('')
      setIsLoading(false)
    }, 0)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [autoSearch, minQueryLength, resetSearch, runSearch])

  useEffect(() => {
    if (!autoSearch) return undefined

    const timeoutId = setTimeout(() => {
      const searchTerm = debouncedQuery.trim()
      if (searchTerm.length < minQueryLength) {
        resetSearch()
        return
      }

      void runSearch(searchTerm)
    }, 0)

    return () => {
      clearTimeout(timeoutId)
      controllerRef.current?.abort()
    }
  }, [autoSearch, debouncedQuery, minQueryLength, resetSearch, runSearch])

  useEffect(() => {
    if (autoSearch) return

    const timeoutId = setTimeout(() => {
      const searchTerm = query.trim()
      if (searchTerm.length < minQueryLength) {
        resetSearch()
        return
      }

      if (activeQuery && activeQuery !== searchTerm) {
        controllerRef.current?.abort()
        setActiveQuery('')
        setResults([])
        setError('')
        setIsLoading(false)
      }
    }, 0)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [activeQuery, autoSearch, minQueryLength, query, resetSearch])

  useEffect(() => () => {
    controllerRef.current?.abort()
  }, [])

  return {
    query,
    setQuery,   // wrapped — also persists to sessionStorage when persistKey is set
    activeQuery,
    results,
    isLoading,
    error,
    submitSearch,
    canSearch: query.trim().length >= minQueryLength,
  }
}
