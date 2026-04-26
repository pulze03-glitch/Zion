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

  // Tracks the last known volume so we can restore it after muted-autoplay unmute
  const volumeRef = useRef(80)
  // True between loadVideoById call and first PLAYING event — player is muted for autoplay
  const mutedForAutoplayRef = useRef(false)
  // How many times we've already tried playVideo() after an immediate PAUSED (autoplay blocked)
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

    // `origin` is required for reliable postMessage communication between the
    // parent page and the YouTube iframe — especially in PWA / WebView contexts.
    // Guard against 'null' origins (file:// or some sandboxed PWA WKWebViews).
    const origin =
      window.location.origin && window.location.origin !== 'null'
        ? window.location.origin
        : undefined

    loadYouTubeScript()
      .then((YT) => {
        if (!isMounted || !containerRef.current || playerRef.current) return

        playerRef.current = new YT.Player(containerRef.current, {
          // The official IFrame API requires a viewport of at least 200x200.
          width: '256',
          height: '256',
          videoId: '',
          playerVars: {
            autoplay: 0,
            controls: 0,
            rel: 0,
            fs: 0,
            modestbranding: 1,
            playsinline: 1,  // required for inline play on iOS
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
                // If we muted the player before loading (to bypass mobile autoplay
                // restrictions), unmute now that playback has started. The unmute
                // happens synchronously in this event handler — inaudible to the user.
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
                // If PAUSED fires while we're still in muted-autoplay phase, the browser
                // blocked the load. Try playVideo() once — it may succeed if the user's
                // last touch gesture is still within the browser's activation window.
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
    // Mute BEFORE loadVideoById so the browser treats this as "muted autoplay",
    // which is universally permitted on mobile (iOS Safari, Android Chrome) even
    // without a fresh user gesture. We unmute immediately when PLAYING fires above.
    mutedForAutoplayRef.current = true
    try { playerRef.current.mute() } catch (_) {}
    playerRef.current.loadVideoById(videoId)
  }, [])

  const play = useCallback(() => {
    playerRef.current?.playVideo?.()
  }, [])

  const pause = useCallback(() => {
    // Cancel any pending muted-autoplay unmute so a manual pause stays paused
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
    // Don't touch the player's volume while it is muted for autoplay — the unmute
    // handler above will restore the correct volume when PLAYING fires.
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
