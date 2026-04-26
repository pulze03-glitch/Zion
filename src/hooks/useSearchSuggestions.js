/**
 * useSearchSuggestions
 *
 * Fetches YouTube search autocomplete suggestions using Google's
 * public suggestion API (no API key required).
 *
 * Returns an array of up to 8 suggestion strings, or [] on error/empty query.
 */
import { useEffect, useState } from 'react'
import { useDebouncedValue } from './useDebouncedValue'

export function useSearchSuggestions(query) {
  const [suggestions, setSuggestions] = useState([])
  const debouncedQuery = useDebouncedValue(query, 200)

  useEffect(() => {
    const q = debouncedQuery.trim()
    if (q.length < 2) {
      setSuggestions([])
      return
    }

    const controller = new AbortController()

    fetch(
      `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(q)}`,
      { signal: controller.signal },
    )
      .then((r) => r.json())
      .then((data) => {
        // Response: ["query", ["suggestion1", "suggestion2", ...], ...]
        setSuggestions((data[1] ?? []).slice(0, 8))
      })
      .catch(() => {
        setSuggestions([])
      })

    return () => controller.abort()
  }, [debouncedQuery])

  return suggestions
}
