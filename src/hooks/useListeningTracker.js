import { useEffect, useRef } from 'react'
import { usePlayer } from '../context/usePlayer'
import { getSessions, saveSessions } from '../utils/statsCompute'

/**
 * Records listening sessions to localStorage.
 * Mount once at app root (AppShell). No UI output.
 */
export function useListeningTracker() {
  const { currentSong, isPlaying } = usePlayer()
  const sessionRef = useRef(null) // { song, songId, startTs }

  function flush(song, seconds) {
    if (!song || seconds < 4) return
    const sessions = getSessions()
    sessions.push({
      songId:    song.id,
      title:     song.title    || 'Unknown',
      artist:    song.artist   || 'Unknown',
      thumbnail: song.thumbnail || '',
      ts:        Date.now(),
      seconds:   Math.round(seconds),
    })
    saveSessions(sessions)
  }

  useEffect(() => {
    const songId = currentSong?.id

    // Song changed → flush old session
    if (sessionRef.current && sessionRef.current.songId !== songId) {
      const elapsed = (Date.now() - sessionRef.current.startTs) / 1000
      flush(sessionRef.current.song, elapsed)
      sessionRef.current = null
    }

    if (isPlaying && currentSong) {
      if (!sessionRef.current) {
        sessionRef.current = { song: currentSong, songId, startTs: Date.now() }
      }
    } else if (!isPlaying && sessionRef.current) {
      const elapsed = (Date.now() - sessionRef.current.startTs) / 1000
      flush(sessionRef.current.song, elapsed)
      sessionRef.current = null
    }
  }, [isPlaying, currentSong?.id]) // eslint-disable-line

  // Periodic flush every 30s so stats update while a song plays continuously
  useEffect(() => {
    const id = setInterval(() => {
      if (sessionRef.current) {
        const elapsed = (Date.now() - sessionRef.current.startTs) / 1000
        if (elapsed >= 4) {
          flush(sessionRef.current.song, elapsed)
          // Restart the session window so we don't double-count
          sessionRef.current = { ...sessionRef.current, startTs: Date.now() }
        }
      }
    }, 30_000)
    return () => clearInterval(id)
  }, []) // eslint-disable-line

  // Flush on unmount
  useEffect(() => () => {
    if (sessionRef.current) {
      const elapsed = (Date.now() - sessionRef.current.startTs) / 1000
      flush(sessionRef.current.song, elapsed)
      sessionRef.current = null
    }
  }, []) // eslint-disable-line
}
