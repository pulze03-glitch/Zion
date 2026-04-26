/**
 * useLyrics
 *
 * Fetches lyrics from the free lyrics.ovh API whenever the song changes.
 * Cleans up common YouTube title noise before querying (e.g. "(Official Video)").
 */
import { useEffect, useRef, useState } from 'react'

function cleanTitle(title) {
  return title
    .replace(/\s*[\(\[]\s*(official\s*(video|audio|music\s*video|lyric[s]?|mv)|lyrics?|hd|4k|visualizer|explicit|live)[^\)\]]*[\)\]]/gi, '')
    .replace(/\s*(ft\.|feat\.)\s*[^,\n(]*/gi, '')
    .replace(/\s*-\s*(official\s*(video|audio|lyric[s]?)|lyrics?)\s*$/gi, '')
    .trim()
}

export function useLyrics(song) {
  const [state, setState] = useState({ lyrics: null, loading: false, error: null })
  const prevId = useRef(null)

  useEffect(() => {
    if (!song?.id) {
      setState({ lyrics: null, loading: false, error: null })
      prevId.current = null
      return
    }
    if (song.id === prevId.current) return
    prevId.current = song.id

    setState({ lyrics: null, loading: true, error: null })

    const artist = encodeURIComponent((song.artist || '').trim())
    const title  = encodeURIComponent(cleanTitle(song.title || ''))

    fetch(`https://api.lyrics.ovh/v1/${artist}/${title}`)
      .then((r) => {
        if (!r.ok) throw new Error('not_found')
        return r.json()
      })
      .then((data) => {
        if (data.lyrics) {
          setState({ lyrics: data.lyrics.trim(), loading: false, error: null })
        } else {
          setState({ lyrics: null, loading: false, error: 'No lyrics found.' })
        }
      })
      .catch((err) => {
        const msg = err.message === 'not_found' ? 'No lyrics found.' : 'Lyrics unavailable.'
        setState({ lyrics: null, loading: false, error: msg })
      })
  }, [song])

  return state
}
