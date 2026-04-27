import { useCallback, useEffect, useRef, useState } from 'react'

export function useNativeAudioPlayer({
  onReady, onPlaying, onPaused, onEnded,
  onTimeUpdate, onDurationUpdate, onError,
}) {
  const audioRef     = useRef(null)
  const callbacksRef = useRef({})
  const pollRef      = useRef(null)
  const volumeRef    = useRef(80)
  const [isBootstrapped, setIsBootstrapped] = useState(false)

  useEffect(() => {
    callbacksRef.current = { onReady, onPlaying, onPaused, onEnded, onTimeUpdate, onDurationUpdate, onError }
  }, [onReady, onPlaying, onPaused, onEnded, onTimeUpdate, onDurationUpdate, onError])

  useEffect(() => {
    const audio = new Audio()
    audio.preload = 'none'
    audioRef.current = audio

    const stopPoll = () => { clearInterval(pollRef.current); pollRef.current = null }
    const startPoll = () => {
      stopPoll()
      pollRef.current = setInterval(() => {
        callbacksRef.current.onTimeUpdate?.(audio.currentTime || 0)
        callbacksRef.current.onDurationUpdate?.(isFinite(audio.duration) ? audio.duration : 0)
      }, 1000)
    }

    audio.addEventListener('playing', () => { callbacksRef.current.onPlaying?.(); startPoll() })
    audio.addEventListener('pause',   () => { stopPoll(); callbacksRef.current.onPaused?.() })
    audio.addEventListener('ended',   () => { stopPoll(); callbacksRef.current.onEnded?.() })
    audio.addEventListener('error',   () => { stopPoll(); callbacksRef.current.onError?.({ data: audio.error?.code ?? 0 }) })

    setIsBootstrapped(true)
    callbacksRef.current.onReady?.()

    return () => { stopPoll(); audio.pause(); audio.src = '' }
  }, [])

  const loadVideo = useCallback((videoId) => {
    const audio = audioRef.current
    if (!audio || !videoId) return
    audio.pause()
    audio.src = `/api/audio/${videoId}`
    audio.volume = volumeRef.current / 100
    audio.load()
    audio.play().catch(() => {})
  }, [])

  const play    = useCallback(() => { audioRef.current?.play().catch(() => {}) }, [])
  const pause   = useCallback(() => { audioRef.current?.pause() }, [])
  const seekTo  = useCallback((s) => {
    if (audioRef.current && Number.isFinite(s)) audioRef.current.currentTime = s
  }, [])
  const setVolume = useCallback((v) => {
    volumeRef.current = v
    if (audioRef.current) audioRef.current.volume = v / 100
  }, [])

  return { isBootstrapped, loadVideo, play, pause, seekTo, setVolume }
}
