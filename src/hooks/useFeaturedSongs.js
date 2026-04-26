import { useCallback, useEffect, useRef, useState } from 'react'
import { getFeaturedSongs } from '../services/youtube'

export function useFeaturedSongs() {
  const [songs, setSongs] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const requestIdRef = useRef(0)
  const controllerRef = useRef(null)

  const load = useCallback(() => {
    requestIdRef.current += 1
    const requestId = requestIdRef.current

    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller

    setIsLoading(true)
    setError('')

    getFeaturedSongs(controller.signal)
      .then((result) => {
        if (requestId !== requestIdRef.current) return
        // Shuffle client-side so each page load feels different even with a cache hit
        const shuffled = [...result]
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
        }
        setSongs(shuffled)
      })
      .catch((err) => {
        if (err.name === 'AbortError' || requestId !== requestIdRef.current) return
        setSongs([])
        setError(err.message || 'Could not load featured songs.')
      })
      .finally(() => {
        if (requestId === requestIdRef.current && !controller.signal.aborted) {
          setIsLoading(false)
        }
      })
  }, [])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      load()
    }, 0)

    return () => {
      clearTimeout(timeoutId)
      controllerRef.current?.abort()
    }
  }, [load])

  return { songs, isLoading, error, reload: load }
}
