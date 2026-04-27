import { useCallback, useEffect, useRef, useState } from 'react'

export function useYouTubePlayer({
  onReady,
  onPlaying,
  onPaused,
  onEnded,
  onTimeUpdate,
  onDurationUpdate,
  onError,
  onAutoplayBlocked,
}) {
  const audioRef     = useRef(null)
  const callbacksRef = useRef({})
  const pollRef      = useRef(null)
  const volumeRef    = useRef(80)
  const [isBootstrapped, setIsBootstrapped] = useState(false)

  useEffect(() => {
    callbacksRef.current = {
      onReady, onPlaying, onPaused, onEnded,
      onTimeUpdate, onDurationUpdate, onError, onAutoplayBlocked,
    }
  }, [onReady, onPlaying, onPaused, onEnded, onTimeUpdate, onDurationUpdate, onError, onAutoplayBlocked])

  useEffect(() => {
    const audio = new Audio()
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
    audio.addEventListener('error',   () => { stopPoll(); callbacksRef.current.onError?.({ data: audio.error?.code }) })

    setIsBootstrapped(true)
    callbacksRef.current.onReady?.()

    return () => {
      stopPoll()
      audio.pause()
      audio.src = ''
    }
  }, [])

  const loadVideo = useCallback((videoId) => {
    const audio = audioRef.current
    if (!audio || !videoId) return
    audio.src = `/api/audio/${videoId}`
    audio.volume = volumeRef.current / 100
    audio.play().catch(() => callbacksRef.current.onAutoplayBlocked?.())
  }, [])

  const play = useCallback(() => {
    audioRef.current?.play().catch(() => {})
  }, [])

  const pause = useCallback(() => {
    audioRef.current?.pause()
  }, [])

  const seekTo = useCallback((seconds) => {
    if (audioRef.current && Number.isFinite(seconds)) {
      audioRef.current.currentTime = seconds
    }
  }, [])

  const setVolume = useCallback((volume) => {
    volumeRef.current = volume
    if (audioRef.current) audioRef.current.volume = volume / 100
  }, [])

  return { isBootstrapped, loadVideo, play, pause, seekTo, setVolume }
}
