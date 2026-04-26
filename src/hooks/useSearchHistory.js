import { useCallback, useState } from 'react'

const HISTORY_KEY  = 'frost-search-history'
const MAX_ENTRIES  = 10

function readHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]')
  } catch {
    return []
  }
}

function writeHistory(entries) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries))
}

export function useSearchHistory() {
  const [history, setHistory] = useState(readHistory)

  const addEntry = useCallback((query) => {
    const q = query.trim()
    if (!q || q.length < 2) return
    setHistory((prev) => {
      const deduped = [q, ...prev.filter((h) => h.toLowerCase() !== q.toLowerCase())]
      const next = deduped.slice(0, MAX_ENTRIES)
      writeHistory(next)
      return next
    })
  }, [])

  const removeEntry = useCallback((query) => {
    setHistory((prev) => {
      const next = prev.filter((h) => h !== query)
      writeHistory(next)
      return next
    })
  }, [])

  const clearAll = useCallback(() => {
    setHistory([])
    localStorage.removeItem(HISTORY_KEY)
  }, [])

  return { history, addEntry, removeEntry, clearAll }
}
