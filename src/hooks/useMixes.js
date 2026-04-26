/**
 * useMixes
 *
 * Derives mix definitions from recents, and provides a `playMix(mix)` function
 * that searches YouTube for songs matching the mix query, then starts playback.
 */
import { useMemo, useRef, useState } from 'react'
import { detectMixes } from '../utils/detectMixes'
import { searchSongs } from '../services/youtube'
import { useLibrary } from '../context/useLibrary'
import { usePlayer } from '../context/usePlayer'

export function useMixes() {
  const { recents } = useLibrary()
  const { playFromList } = usePlayer()
  const [loadingId, setLoadingId] = useState(null)
  const [errorId, setErrorId]     = useState(null)
  const controllerRef = useRef(null)

  const mixes = useMemo(() => detectMixes(recents), [recents])

  async function playMix(mix) {
    if (loadingId === mix.id) return
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller

    setLoadingId(mix.id)
    setErrorId(null)

    try {
      const songs = await searchSongs(mix.query, { limit: 20, signal: controller.signal })
      if (controller.signal.aborted) return
      if (songs.length === 0) throw new Error('No results found.')
      playFromList(songs, 0)
    } catch (err) {
      if (err.name === 'AbortError') return
      setErrorId(mix.id)
    } finally {
      if (!controller.signal.aborted) setLoadingId(null)
    }
  }

  return { mixes, playMix, loadingId, errorId }
}
