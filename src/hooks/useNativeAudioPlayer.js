import { useCallback, useEffect, useRef, useState } from 'react'

// Minimal silent WAV — used to unlock the iOS audio session on first user gesture.
const SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='

let _iosUnlocked = false

function unlockIOSAudio() {
  if (_iosUnlocked) return
  _iosUnlocked = true
  // Use a separate throwaway element — never touch the real player element here.
  // If we mutate the shared element's src the unlock .then() races with loadVideo
  // and restores src="" over the real track URL, silently killing playback.
  const tmp = new Audio(SILENT_WAV)
  tmp.volume = 0
  tmp.play().catch(() => {})
}

export function useNativeAudioPlayer({
  onReady, onPlaying, onPaused, onEnded,
  onTimeUpdate, onDurationUpdate, onError,
}) {
  const audioRef     = useRef(null)
  const callbacksRef = useRef({})
  const pollRef      = useRef(null)
  const volumeRef    = useRef(80)
  const lastDurRef   = useRef(0)
  const [isBootstrapped, setIsBootstrapped] = useState(false)

  useEffect(() => {
    callbacksRef.current = { onReady, onPlaying, onPaused, onEnded, onTimeUpdate, onDurationUpdate, onError }
  }, [onReady, onPlaying, onPaused, onEnded, onTimeUpdate, onDurationUpdate, onError])

  useEffect(() => {
    const audio = new Audio()
    audio.preload = 'none'
    // Attach to DOM — iOS WebKit requires a DOM-attached <audio> element for reliable
    // background (screen-locked) playback. A detached Audio() object gets suspended.
    audio.style.display = 'none'
    document.body.appendChild(audio)
    audioRef.current = audio

    const stopPoll = () => { clearInterval(pollRef.current); pollRef.current = null }
    const startPoll = () => {
      stopPoll()
      // 500ms interval for smoother progress bar; duration only dispatched on change
      pollRef.current = setInterval(() => {
        const t = audio.currentTime || 0
        const d = isFinite(audio.duration) ? audio.duration : 0
        callbacksRef.current.onTimeUpdate?.(t)
        if (d > 0 && d !== lastDurRef.current) {
          lastDurRef.current = d
          callbacksRef.current.onDurationUpdate?.(d)
        }
      }, 500)
    }

    audio.addEventListener('playing', () => { callbacksRef.current.onPlaying?.(); startPoll() })
    audio.addEventListener('pause',   () => { stopPoll(); callbacksRef.current.onPaused?.() })
    audio.addEventListener('ended',   () => { stopPoll(); callbacksRef.current.onEnded?.() })
    audio.addEventListener('error',   () => { stopPoll(); callbacksRef.current.onError?.({ data: audio.error?.code ?? 0 }) })

    // Unlock iOS audio session on the first user gesture so that subsequent
    // programmatic play() calls (including those triggered from React event
    // handlers) succeed without a NotAllowedError.
    const unlock = () => unlockIOSAudio()
    document.addEventListener('touchstart', unlock, { once: true, passive: true })
    document.addEventListener('mousedown',  unlock, { once: true, passive: true })

    setIsBootstrapped(true)
    callbacksRef.current.onReady?.()

    return () => {
      stopPoll()
      document.removeEventListener('touchstart', unlock)
      document.removeEventListener('mousedown',  unlock)
      audio.pause()
      audio.src = ''
      if (document.body.contains(audio)) document.body.removeChild(audio)
    }
  }, [])

  const loadVideo = useCallback((videoId) => {
    const audio = audioRef.current
    if (!audio || !videoId) return
    lastDurRef.current = 0  // reset so duration dispatch fires for the new track
    audio.pause()
    audio.src = `/api/audio/${videoId}`
    audio.volume = volumeRef.current / 100
    // Do NOT call audio.load() — play() starts loading automatically, and calling
    // load() before play() can break the iOS gesture chain (NotAllowedError).
    audio.play().catch((err) => {
      if (err?.name !== 'AbortError') {
        console.warn('[player] audio.play() rejected:', err?.name, err?.message)
      }
    })
  }, [])

  const play    = useCallback(() => {
    audioRef.current?.play().catch((err) => {
      if (err?.name !== 'AbortError') {
        console.warn('[player] play() rejected:', err?.name, err?.message)
      }
    })
  }, [])
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
