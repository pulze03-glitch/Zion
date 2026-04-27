import { useCallback, useEffect, useRef, useState } from 'react'

const YT_STATES = {
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
}

let scriptPromise

function loadYouTubeScript() {
  if (window.YT?.Player) {
    return Promise.resolve(window.YT)
  }

  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector(
      'script[src="https://www.youtube.com/iframe_api"]',
    )

    if (!existingScript) {
      const script = document.createElement('script')
      script.src = 'https://www.youtube.com/iframe_api'
      script.async = true
      script.onerror = () => reject(new Error('Unable to load YouTube IFrame API.'))
      document.head.appendChild(script)
    }

    const previousReady = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.()
      resolve(window.YT)
    }

    const pollingId = setInterval(() => {
      if (window.YT?.Player) {
        clearInterval(pollingId)
        resolve(window.YT)
      }
    }, 50)
  })

  return scriptPromise
}

export function useYouTubePlayer({
  containerRef: externalContainerRef,
  onReady,
  onPlaying,
  onPaused,
  onEnded,
  onTimeUpdate,
  onDurationUpdate,
  onError,
  onAutoplayBlocked,
}) {
  const internalContainerRef = useRef(null)
  const containerRef = externalContainerRef ?? internalContainerRef
  const playerRef = useRef(null)
  const pollRef = useRef(null)
  const callbacksRef = useRef({
    onReady,
    onPlaying,
    onPaused,
    onEnded,
    onTimeUpdate,
    onDurationUpdate,
    onError,
    onAutoplayBlocked,
  })
  const [isBootstrapped, setIsBootstrapped] = useState(false)

  const volumeRef = useRef(80)
  const mutedForAutoplayRef = useRef(false)
  const autoplayRetryRef = useRef(0)

  useEffect(() => {
    callbacksRef.current = {
      onReady,
      onPlaying,
      onPaused,
      onEnded,
      onTimeUpdate,
      onDurationUpdate,
      onError,
      onAutoplayBlocked,
    }
  }, [onReady, onPlaying, onPaused, onEnded, onTimeUpdate, onDurationUpdate, onError, onAutoplayBlocked])

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const lastTimeRef = useRef(-1)

  const startPolling = useCallback(() => {
    stopPolling()
    pollRef.current = setInterval(() => {
      const player = playerRef.current
      if (!player?.getCurrentTime || !player?.getDuration) return

      const time = player.getCurrentTime() || 0
      const duration = player.getDuration() || 0

      if (Math.abs(time - lastTimeRef.current) >= 0.9) {
        lastTimeRef.current = time
        callbacksRef.current.onTimeUpdate?.(time)
        callbacksRef.current.onDurationUpdate?.(duration)
      }
    }, 1000)
  }, [stopPolling])

  useEffect(() => {
    let isMounted = true

    const origin =
      window.location.origin && window.location.origin !== 'null'
        ? window.location.origin
        : undefined

    loadYouTubeScript()
      .then((YT) => {
        if (!isMounted || !containerRef.current || playerRef.current) return

        playerRef.current = new YT.Player(containerRef.current, {
          width: '256',
          height: '256',
          videoId: '',
          playerVars: {
            autoplay: 0,
            controls: 0,
            rel: 0,
            fs: 0,
            modestbranding: 1,
            playsinline: 1,
            enablejsapi: 1,
            ...(origin ? { origin } : {}),
          },
          events: {
            onReady: () => {
              callbacksRef.current.onReady?.()
              setIsBootstrapped(true)
            },
            onStateChange: (event) => {
              if (event.data === YT_STATES.PLAYING) {
                if (mutedForAutoplayRef.current) {
                  mutedForAutoplayRef.current = false
                  try {
                    playerRef.current?.unMute()
                    playerRef.current?.setVolume(volumeRef.current)
                  } catch (_) {}
                }
                callbacksRef.current.onPlaying?.()
                startPolling()
              } else if (event.data === YT_STATES.PAUSED) {
                if (mutedForAutoplayRef.current && autoplayRetryRef.current < 1) {
                  autoplayRetryRef.current += 1
                  setTimeout(() => {
                    if (mutedForAutoplayRef.current) {
                      playerRef.current?.playVideo?.()
                    }
                  }, 100)
                  return
                }
                mutedForAutoplayRef.current = false
                autoplayRetryRef.current = 0
                callbacksRef.current.onPaused?.()
                stopPolling()
              } else if (event.data === YT_STATES.ENDED) {
                stopPolling()
                callbacksRef.current.onEnded?.()
              }
            },
            onError: (event) => {
              callbacksRef.current.onError?.(event)
            },
            onAutoplayBlocked: () => {
              callbacksRef.current.onAutoplayBlocked?.()
            },
          },
        })
      })
      .catch((apiError) => {
        callbacksRef.current.onError?.({ message: apiError.message })
      })

    return () => {
      isMounted = false
      stopPolling()
      if (playerRef.current?.destroy) {
        playerRef.current.destroy()
      }
      playerRef.current = null
    }
  }, [containerRef, startPolling, stopPolling])

  const loadVideo = useCallback((videoId) => {
    if (!playerRef.current || !videoId) return
    lastTimeRef.current = -1
    autoplayRetryRef.current = 0
    mutedForAutoplayRef.current = true
    try { playerRef.current.mute() } catch (_) {}
    playerRef.current.loadVideoById(videoId)
  }, [])

  const play = useCallback(() => {
    playerRef.current?.playVideo?.()
  }, [])

  const pause = useCallback(() => {
    mutedForAutoplayRef.current = false
    playerRef.current?.pauseVideo?.()
  }, [])

  const seekTo = useCallback((seconds) => {
    if (!playerRef.current?.seekTo) return
    playerRef.current.seekTo(seconds, true)
  }, [])

  const setVolume = useCallback((volume) => {
    if (!playerRef.current?.setVolume) return
    volumeRef.current = volume
    if (mutedForAutoplayRef.current) return
    playerRef.current.setVolume(volume)
  }, [])

  return {
    isBootstrapped,
    loadVideo,
    play,
    pause,
    seekTo,
    setVolume,
  }
}
